# Developer Setup

Audience: developer
Last updated: 2026-07-03
Verified against: 64a177a

---

Zero to running for a new hire. The repo has four surfaces that run as separate processes against one Postgres and one Redis: `backend/` (Fastify API), `bot/` (Grammy Telegram service), `web/` (Next.js owner panel, admin panel, and public pages), and `app/` (Flutter owner app). You do not need all four to work on one of them, but the app and bot both talk to the backend, so start the backend first.

### Ports at a glance

| Surface | Port | Source |
|---|---|---|
| Backend API | 3000 | `PORT` default in backend/src/index.ts:114; backend/.env.example:7 |
| Web (owner + admin + public) | 3001 | `next dev --port 3001` (web/package.json:6) |
| Bot manager HTTP | 3003 in the example file, 3002 as the code default | `BOT_MANAGER_PORT` (bot/.env.example:4; bot/src/index.ts:437) |
| Postgres (Docker) | host `5433` to container `5432` | docker-compose.yml:14-15 |
| Redis (Docker) | 6379 | docker-compose.yml:23-24 |
| Flutter app target | backend at `API_BASE_URL`, default `http://localhost:3000/api/v1` | app/lib/core/config/app_config.dart:9-12 |

The bot's primary work is Telegram long polling; its HTTP port only matters for backend to bot hot-start calls. Note the code default (3002) and the example file (3003) disagree; keep `BOT_MANAGER_PORT` in bot/.env and `BOT_SERVICE_URL` in backend/.env consistent with each other.

---

## 1. Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | Node 22 LTS recommended | No `engines` field in any package.json and no `.nvmrc` exists (verified), so this is a recommendation, not a hard pin. It derives from `@types/node ^22` in backend/package.json:34 and bot/package.json:22. `web/` pins `@types/node ^20` (web/package.json:22), so Node 22 covers all three. |
| Flutter SDK | `>=3.19.0` | app/pubspec.yaml:6 |
| Dart SDK | `>=3.3.0 <4.0.0` | app/pubspec.yaml:5 (bundled with Flutter) |
| Docker Desktop | any current | Runs the Postgres and Redis stack from docker-compose.yml |

Windows and WSL note: repo development happens on Windows with PowerShell, and the Flutter run helper `app/run-dev.ps1` is a PowerShell script. The three Node surfaces (backend, bot, web) run fine on WSL, macOS, or Linux with the same npm commands; only the Flutter on-device helper is Windows-specific, and it just wraps two `adb` calls plus `flutter run` (see section 7), so translate it by hand on other platforms.

---

## 2. Clone

```
git clone <repo-url> uzbek-crm
cd uzbek-crm
```

The working directory in this environment is `C:\Users\asadjon\Documents\uzbek-crm`. CLAUDE.md notes an intended folder rename to `dealio`, but the repo folder is still `uzbek-crm` today.

---

## 3. Create environment files

Copy the two tracked examples, then create the web file by hand (there is no `web/.env.example`; web/lib/api.ts reads a single key). The app takes no dotenv file at all; it is configured only through `--dart-define` (see H.3 of the inventory).

```
cp backend/.env.example backend/.env
cp bot/.env.example bot/.env
# web has no example; create it:
printf 'NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1\n' > web/.env.local
```

### SECURITY WARNING: rotate the committed bot secrets

`bot/.env.example` ships with real looking secret values, not blanks: a Telegram bot token on bot/.env.example:1 (`BOT_TOKEN`) and a 64 hex shared secret on bot/.env.example:3 (`BOT_MANAGER_SECRET`). Do not reuse them. Generate fresh values for your `bot/.env`, and if any of these ever reached a shared or production environment, revoke the bot token via BotFather and rotate `BOT_MANAGER_SECRET`. By contrast `backend/.env.example` correctly leaves its secrets blank.

### Backend keys to fill (backend/.env)

Required to boot. The server fails fast at startup if any of these are missing or a known placeholder; there is no dev fallback (backend/src/lib/validateEnv.ts:15-67; backend/src/lib/crypto.ts:8-21):

| Key | Role |
|---|---|
| `DATABASE_URL` | Prisma datasource. For the Docker stack use `postgresql://dealio:dealio@localhost:5433/dealio_dev` (docker-compose.yml:2). |
| `JWT_SECRET` | Owner JWT signing. Min length 16, non-placeholder. |
| `ADMIN_JWT_SECRET` | Admin-panel JWT signing. Must be distinct from `JWT_SECRET`. |
| `OTP_HASH_SECRET` | HMAC key for auth codes. |
| `BOT_TOKEN_ENCRYPTION_KEY` | AES-256-GCM key for stored bot tokens. Must be exactly 64 hex chars (validated at import in crypto.ts:8-21). |

Also present in the example and used by code (fill as needed): `BOT_MANAGER_SECRET` (must match the value in bot/.env), `PLATFORM_BOT_TOKEN` and `PLATFORM_BOT_USERNAME` (owner auth via the central Telegram bot; login-code delivery is skipped if the token is unset), `JWT_EXPIRES_IN` (default 30d), `ADMIN_JWT_EXPIRES_IN` (default 8h), `BOT_SERVICE_URL`, `OWNER_APP_URL`, `ADMIN_APP_URL` (CORS allowlist), `PORT`, `NODE_ENV`.

Drift to be aware of (inventory H.4): `BACKEND_URL` in the backend example is unused by backend code; `FCM_SERVER_KEY` is dead. The live push key `FCM_SERVICE_ACCOUNT_JSON` (firebase-admin service account JSON) is missing from the example; add it manually only if you need push notifications. Push is a silent no-op when it is unset (backend/src/lib/push.ts:6-10), so you can skip it for most local work.

### Bot keys to fill (bot/.env)

Used by bot code: `BACKEND_URL` (default `http://localhost:3000`), `BOT_MANAGER_SECRET` (must match backend/.env), `REDIS_URL` (session store; falls back to in-memory with a warning if unset, so optional for quick local runs), `PLATFORM_BOT_TOKEN` (starts the platform owner-auth bot; disabled if unset), `BOT_MANAGER_PORT`, `PRIVACY_POLICY_URL` (consent-gate link; omitted if unset). For the Docker Redis, set `REDIS_URL=redis://localhost:6379` (docker-compose.yml:3).

Drift (inventory H.4): `BOT_TOKEN`, `BOT_SERVICE_URL`, and `NODE_ENV` in the bot example are unused legacy leftovers.

### Web keys to fill (web/.env.local)

`NEXT_PUBLIC_API_URL` (required; base URL for both the owner and admin API clients, web/lib/api.ts:26 and web/lib/adminApi.ts:9). Optional: `NEXT_PUBLIC_APP_URL` (owner-app URL used by the admin impersonation tab, falls back to `http://localhost:3001`), `NODE_ENV`.

---

## 4. Start the infrastructure (Docker)

From the repo root:

```
docker compose up -d
```

This starts `dealio-postgres` on host port 5433 and `dealio-redis` on 6379, with data persisted in named volumes across restarts (docker-compose.yml). The local Postgres credentials are `dealio` / `dealio`, database `dealio_dev` (docker-compose.yml:11-13). These match the `DATABASE_URL` shown in section 3.

---

## 5. Backend: install, generate, migrate, seed

```
cd backend
npm install
npm run prisma:generate    # prisma generate (backend/package.json:11)
npm run prisma:migrate     # prisma migrate dev (backend/package.json:10)
npx prisma db seed         # runs the seed hook: tsx prisma/seed.ts
```

- `npm run prisma:generate` regenerates the Prisma client after any schema change.
- `npm run prisma:migrate` maps to `prisma migrate dev`, which applies pending migrations and, because a seed hook is configured (backend/package.json:16-18), also runs the seed automatically. Run the seed explicitly with `npx prisma db seed` if you only want to reseed.
- The seed refuses to run against anything but localhost: it exits with an error if `DATABASE_URL` does not contain `localhost` (backend/prisma/seed.ts:24-28). It is idempotent, recreating the dev business on every run.
- The seed also creates a dev owner (phone `+998901234567`), a dev admin (`dev@dealio.uz`), and a fixed 6-digit LOGIN code `123456` valid for 24h (backend/prisma/seed.ts:5-14, 30-33). The real auth flow has no dev bypass, so the seed writes that code row itself. Note this is `123456`, not the `1234` mentioned in CLAUDE.md (codes are validated as exactly 6 digits, so `1234` is impossible). Local login: `POST /auth/login/request { phone: "+998901234567" }` then `POST /auth/login/verify { phone, code: "123456", generalConsent: true, crossBorderConsent: true }`.

---

## 6. Run each surface

Each Node surface needs its own `npm install` the first time. Run these in separate terminals.

```
# Backend  ->  http://localhost:3000  (tsx watch src/index.ts)
cd backend && npm run dev

# Bot      ->  Telegram long polling + manager HTTP on BOT_MANAGER_PORT
cd bot && npm install && npm run dev

# Web      ->  http://localhost:3001  (next dev --port 3001)
cd web && npm install && npm run dev

# App      ->  see section 7
```

Sanity check the backend with `GET http://localhost:3000/health` (backend/src/index.ts:112). The web app serves owner UI at `/`, the admin panel at `/admin/*` (same Next.js app), and public pages such as `/privacy`.

---

## 7. Run the Flutter app on a physical device

The app defaults to `http://localhost:3000/api/v1` (app/lib/core/config/app_config.dart:9-12). On a USB-connected phone, `localhost` is the phone, not your PC, so you bridge it with `adb reverse`. `app/run-dev.ps1` does exactly this and then runs `flutter run`:

```
cd app
./run-dev.ps1
```

What the helper does (app/run-dev.ps1):
- Locates `adb` in the Android SDK platform-tools (it is not on PATH; the script uses `$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe`, run-dev.ps1:15-16).
- Runs `adb reverse tcp:3000 tcp:3000`, so the device's `localhost:3000` routes to the PC's `localhost:3000` over the cable, independent of Wi-Fi, LAN IP, and the firewall (run-dev.ps1:22). Re-run after unplugging or rebooting the phone; the reverse tunnel resets.
- Runs `flutter run` (which also does `flutter pub get` implicitly).

Generic equivalent without the helper:

```
adb reverse tcp:3000 tcp:3000
flutter devices                       # list attached devices and their ids
flutter run -d <device-id> --dart-define=API_BASE_URL=http://localhost:3000/api/v1
```

The `--dart-define` above is shown for completeness; in plain local dev over `adb reverse` it is optional, because the default already targets `http://localhost:3000/api/v1`. Override it when pointing at a LAN IP, emulator, tunnel, or a deployed backend.

### Release build

The pinned release command (app/build-release.md:40) is:

```
flutter build appbundle --release --dart-define=API_BASE_URL=<prod api>/api/v1
```

Release builds have two hard prerequisites that fail the build on purpose if missing, rather than shipping a broken binary:
- `--dart-define=API_BASE_URL` is required. A release binary without it throws `RELEASE BUILD MISCONFIGURED` at startup instead of silently using the localhost default (app/lib/core/config/app_config.dart:28-39).
- A configured upload keystore via `app/android/key.properties`. Without it the build fails with `RELEASE SIGNING NOT CONFIGURED` (app/build-release.md:33-34). Debug and profile builds (`flutter run`) are unaffected by both guards.

---

## See also

- Configuration surface and env-var drift: `docs/internal/FUNCTIONALITY_INVENTORY.md` section H.
- Tracked-secret and data-handling findings: `docs/internal/audits/DATA_COMPLIANCE_AUDIT.md`.
- Bot Redis session behavior: `docs/internal/audits/REDIS_SESSION_AUDIT.md`.
- Deletion and purge lifecycle: `docs/internal/audits/DELETION_AUDIT.md`.
- Admin panel and authorization: `docs/ADMIN_AUDIT.md`, `docs/AUTHORIZATION_AUDIT.md`.
