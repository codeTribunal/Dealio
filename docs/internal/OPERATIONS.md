# Operations Runbook

Audience: internal
Last updated: 2026-07-03
Verified against: 64a177a

---

Scope: how to bring the four surfaces up locally, how they reach production, the configuration surface per package, the background schedulers, and the human-safety and rollback practices around destructive production actions. Sources: FUNCTIONALITY_INVENTORY.md sections A, B, H; DEPLOY_NOTES.md; docker-compose.yml; backend/package.json; bot/package.json; web/package.json; app/run-dev.ps1; app/build-release.md. Commands below were checked against those files.

Related audits: [Data compliance](audits/DATA_COMPLIANCE_AUDIT.md), [Redis session](audits/REDIS_SESSION_AUDIT.md), [Deletion](audits/DELETION_AUDIT.md), [Admin](../ADMIN_AUDIT.md), [Authorization](../AUTHORIZATION_AUDIT.md).

---

## 1. Local dev bring-up

### 1.1 Infrastructure (Docker)

One command starts both stateful dependencies (docker-compose.yml:5-26):

```
docker compose up -d
```

| Container | Image | Host port | Container port | Consumed by | Evidence |
|---|---|---|---|---|---|
| dealio-postgres | postgres:16 | 5433 | 5432 | backend `DATABASE_URL` | docker-compose.yml:6-17 |
| dealio-redis | redis:7 | 6379 | 6379 | bot session store `REDIS_URL` | docker-compose.yml:19-26 |

Local Postgres credentials are `dealio` / `dealio`, database `dealio_dev`, so the backend connection string is `postgresql://dealio:dealio@localhost:5433/dealio_dev` (docker-compose.yml:2,11-15). Data persists across container recreation in the named volumes `dealio_pgdata` and `dealio_redisdata` (docker-compose.yml:28-30). Redis is bot-session-only; if `REDIS_URL` is unset the bot falls back to in-memory sessions with a warning (H.2; bot/src/index.ts:44-56).

### 1.2 Backend env

Copy `backend/.env.example` to `backend/.env` and fill the required secrets (backend/.env.example:1-26). The backend refuses to boot if `JWT_SECRET`, `ADMIN_JWT_SECRET`, or `OTP_HASH_SECRET` is missing or a known placeholder (validateEnv.ts, min length 16, no fallback defaults), and `BOT_TOKEN_ENCRYPTION_KEY` is validated at import in lib/crypto.ts (must be 64 hex chars). Point `DATABASE_URL` at the localhost:5433 stack above. Note `backend/.env.example` is missing the live push key `FCM_SERVICE_ACCOUNT_JSON` and still lists the dead `FCM_SERVER_KEY` (H.1, H.4); push is a silent no-op when the service account is unset.

### 1.3 Migrate and seed

From `backend/`:

```
npm run prisma:migrate      # = prisma migrate dev  (backend/package.json:10)
```

`prisma migrate dev` applies committed migrations and then runs the seed hook automatically. The seed hook is `tsx prisma/seed.ts` (backend/package.json:16-18), so it can also be run standalone:

```
npx prisma db seed
```

The seed is localhost-guarded: it reads `DATABASE_URL` and `process.exit(1)` if the string does not contain `localhost`, and a missing URL also refuses (backend/prisma/seed.ts:24-28). It provisions a dev owner, a dev admin, and a fixed dev login code (seed.ts:30-33; values are committed dev-only literals, see H.5).

### 1.4 Run order

Start the surfaces in this order (each later surface expects the earlier ones to be up):

| Step | Surface | Command | Port | Evidence |
|---|---|---|---|---|
| 1 | Backend API | `npm run dev` (from `backend/`) | 3000 | backend/package.json:7; index.ts:114 |
| 2 | Bot service | `npm run dev` (from `bot/`) | manager HTTP 3002 (code default) | bot/package.json:7; bot/src/index.ts:437 |
| 3 | Web (owner + admin + public) | `npm run dev` (from `web/`) | 3001 | web/package.json:6 |
| 4 | Flutter app | `./run-dev.ps1` (from `app/`) | bridges device localhost:3000 | app/run-dev.ps1:21-28 |

`app/run-dev.ps1` locates `adb` under the Android SDK, sets `adb reverse tcp:3000 tcp:3000` so the device's `localhost:3000` tunnels to the PC backend over USB, then runs `flutter run` (app/run-dev.ps1:15-28). The app defaults to `http://localhost:3000/api/v1` (app/lib/core/config/app_config.dart), which the tunnel bridges; re-run the script after unplugging or rebooting the device.

Port-drift caveat: the bot manager port default in code is 3002 (bot/src/index.ts:437; backend target `BOT_SERVICE_URL` default `http://localhost:3002`, botManager.ts:8), but both `.env.example` files set 3003 (backend/.env.example:12; H.1). Keep the bot's `BOT_MANAGER_PORT` and the backend's `BOT_SERVICE_URL` in agreement or backend-to-bot hot-start calls will not connect.

---

## 2. Deploy flow

| Surface | Target | Mechanism | Verified? |
|---|---|---|---|
| Backend API | Railway | Auto-deploy from GitHub | Practice per DEPLOY_NOTES.md; no Railway config file in repo |
| Bot service | Railway | Auto-deploy from GitHub | Same |
| Web | Vercel (intended) | Assumed Vercel deploy | UNVERIFIED: no `vercel.json` in repo (Glob returned none). Treat as intended-but-unconfirmed |
| Flutter app | Google Play | Manual release build + upload | app/build-release.md:38-57 |

### 2.1 Database migrations on release

Run against the production (Neon) Postgres on every release, from `backend/` (DEPLOY_NOTES.md:48-58):

```
npx prisma migrate deploy
```

Use `migrate deploy`, not `migrate dev`, in production: it applies committed migrations without prompting or generating new ones and does not run the seed. This is a production-impacting step (see section 5). Take a database backup first (section 6).

### 2.2 Release APK / AAB

Per app/build-release.md, the release build hard-fails by design if prerequisites are missing rather than shipping a silent dev fallback. The pinned command (app/build-release.md:38-46):

```
flutter build appbundle --release --dart-define=API_BASE_URL=<prod api>/api/v1
```

- `API_BASE_URL` is required for release: a release binary started without it throws `RELEASE BUILD MISCONFIGURED` at startup rather than shipping the localhost default (app/build-release.md:49-53; app/lib/core/config/app_config.dart).
- Signing requires `app/android/key.properties` (gitignored). Without it the build fails with `RELEASE SIGNING NOT CONFIGURED`; that is the guard, not a bug (app/build-release.md:20-35). The upload keystore is the only way to sign Play updates, so back it up off-machine before the first upload (app/build-release.md:15-19).
- Output: `build/app/outputs/bundle/release/app-release.aab`, uploaded in Play Console (app/build-release.md:55-57).

### 2.3 FCM manual step (still required)

Push notifications will not deliver until a Firebase Android app for package `uz.dealio.crm` exists. The committed `app/android/app/google-services.json` still carries the original app's `project_id`, `mobilesdk_app_id`, and `api_key`, so FCM registration fails as-is (DEPLOY_NOTES.md:8-24). Fix it by hand in the Firebase console (do not hand-edit keys):

1. Firebase console, project `uzb-crm`, Add app, Android, package name `uz.dealio.crm`.
2. Download the fresh `google-services.json`.
3. Replace `app/android/app/google-services.json` with it.
4. Rebuild the app.

No code change substitutes for this; the keys must come from Firebase.

---

## 3. Environment variables per package

Key names only. "Secret" = holds a credential or signing/encryption key that must not be logged or committed. Details and validation from FUNCTIONALITY_INVENTORY.md section H.

### 3.1 Backend (H.1)

| Key | Secret? | Notes |
|---|---|---|
| DATABASE_URL | yes | Prisma datasource; seed requires `localhost` |
| JWT_SECRET | yes | Owner JWT; boot-validated, no fallback |
| JWT_EXPIRES_IN | no | Default 30d |
| ADMIN_JWT_SECRET | yes | Admin JWT; boot-validated; distinct from JWT_SECRET |
| ADMIN_JWT_EXPIRES_IN | no | Default 8h |
| OTP_HASH_SECRET | yes | HMAC key for auth codes; boot-validated |
| BOT_TOKEN_ENCRYPTION_KEY | yes | AES-256-GCM, 64 hex chars; validated at import |
| BOT_MANAGER_SECRET | yes | Shared `x-bot-secret`, both directions |
| BOT_SERVICE_URL | no | Bot-manager base URL; default localhost:3002 |
| OWNER_APP_URL | no | CORS allowlist; required in prod or CORS rejects owner web |
| ADMIN_APP_URL | no | CORS allowlist; required in prod or CORS rejects admin web |
| PLATFORM_BOT_USERNAME | no | Enrollment deep-link handle |
| PLATFORM_BOT_TOKEN | yes | Platform bot token for login-code DMs |
| FCM_SERVER_KEY | yes | Dead code (zero importers); ignore |
| FCM_SERVICE_ACCOUNT_JSON | yes | Firebase Admin service account; missing from .env.example; silent no-op if unset |
| NODE_ENV | no | Log level, secure cookie flag, Prisma logging |
| PORT | no | Listen port; default 3000; binds 0.0.0.0 |

Scripts/tests only: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` (scripts/create-admin.ts), `TEST_DATABASE_URL` (test harness, aborts on Railway-looking hosts). See H.1.

### 3.2 Bot (H.2)

| Key | Secret? | Notes |
|---|---|---|
| BACKEND_URL | no | Backend base; default localhost:3000 |
| BOT_MANAGER_SECRET | yes | Outbound header and inbound manager verification; also accepted by `/register_owner` |
| REDIS_URL | yes | Session store; in-memory fallback with warning if unset |
| PLATFORM_BOT_TOKEN | yes | Starts the platform bot; disabled if unset |
| BOT_MANAGER_PORT | no | Manager HTTP port; default 3002 |
| PRIVACY_POLICY_URL | no | Consent-gate link; omitted if unset |

### 3.3 Web and app (H.3)

| Key | Package | Secret? | Notes |
|---|---|---|---|
| NEXT_PUBLIC_API_URL | web | no | API base for owner + admin clients; public by design |
| NEXT_PUBLIC_APP_URL | web | no | Owner-app URL for impersonation tab; fallback localhost:3001 |
| NODE_ENV | web | no | Gates design pages to 404 in prod |
| API_BASE_URL (dart-define) | app | no | API base; release build throws without it |

TRACKED-SECRET warning: a real-format Telegram `BOT_TOKEN` and a literal `BOT_MANAGER_SECRET` are committed in `bot/.env.example` (H.5). If either matches production, revoke/rotate. Real values belong only in host config (Railway), never in tracked files.

---

## 4. Scheduler status

All three are plain intervals (no cron library) and have no `NODE_ENV` guard, so they run in every environment including local dev once the process is up (A.5; B.14).

| Job | Schedule | Wired at | Runs in | Manual trigger | What it does |
|---|---|---|---|---|---|
| `runOwnerReminders()` | Boot, then every 15 min | index.ts:126-130 | Backend | None | Per-business owner reminders by mode; exactly-once dedup via `SentReminder`; delivers via both Telegram and FCM `sendPushToAll` (backend/src/jobs/ownerReminders.ts) |
| `runDeletionPurge()` | Boot, then every 24 h | index.ts:137-141 | Backend | `POST /admin/purge-deletions` (superadmin) | Finds `PENDING_DELETION` past `deletionScheduledAt`, best-effort stops the bot, then `eraseBusinessCascade`; failures retried next sweep (backend/src/jobs/deletionPurge.ts) |
| `runReminderJob(bot, botUsername)` | Bot start, then every 1 h | bot/src/index.ts:306-307; reminders.ts:137-151 | Bot (per business bot) | None | Pulls `GET /bot/due-reminders` (24 to 25 h window), sends localized customer reminders, marks sent, registers CANCEL reply handler |

---

## 5. Team safety ritual (required human confirmation gate)

This is a required operating practice, not something the code enforces. Any production-impacting step must pass an explicit, out-of-band human confirmation gate before it runs. Applies to at least:

- Production DB migration (`npx prisma migrate deploy` against Neon; section 2.1).
- Business erase (`POST /admin/businesses/:id/erase`) and the deletion purge (`POST /admin/purge-deletions`), both of which hard-delete via `eraseBusinessCascade` and are irreversible.
- Any admin destructive action: superadmin suspend, plan change, hard delete/restore of tenant data, anonymize, impersonation.

The gate: before executing, the operator states aloud or in writing exactly what will run, against which environment, and a second person acknowledges. Treat a spoken or written confirmation phrase (for example, the operator says `CONFIRM PROD <action> ON <environment>` and a teammate replies with an explicit acknowledgement) as a hard precondition. If no second human has acknowledged, do not execute. Nothing about this is automated: the schedulers and admin endpoints will happily run destructive work with no second check, which is exactly why the human gate exists.

Note that `POST /admin/businesses/:id/erase` does NOT stop a running bot (B.11, section J of the inventory); the automated purge path does attempt a best-effort stop first (deletionPurge.ts), the manual admin erase does not. Plan for the bot process separately when erasing by hand.

---

## 6. Rollback and backups

### 6.1 Back up before destructive prod actions

Take a fresh database backup (Neon snapshot or `pg_dump`) immediately before any of:

- `npx prisma migrate deploy` (section 2.1).
- Business erase (`POST /admin/businesses/:id/erase`).
- Deletion purge (`POST /admin/purge-deletions`).

These operations either alter schema or hard-delete rows through `eraseBusinessCascade`; there is no application-level undo. A pre-action backup is the only recovery path.

### 6.2 Rollback basics

- Code (backend/bot on Railway): roll back by redeploying the previous known-good GitHub commit. Railway auto-deploys from GitHub, so reverting or re-pointing the deployed commit is the rollback.
- Database: Prisma `migrate deploy` has no down-migration workflow here. To undo a bad migration, restore from the pre-migration backup (6.1). Do not attempt to hand-edit committed migrations after they have been applied to prod.
- Web: since the Vercel setup is unconfirmed in-repo (section 2), confirm the actual host's rollback control (Vercel deployment promotion/rollback) before relying on it.
- App: a shipped AAB cannot be pulled back from installed devices; roll forward with a new build. Keep the upload keystore (app/build-release.md:15-19) safe so a corrective release can be signed.
- Reminder: FCM push depends on the manual Firebase console step (section 2.3); a rollback that reverts `google-services.json` re-breaks push. Keep the corrected file out of band.
