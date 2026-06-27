# Dealio — Deploy Notes

Operational steps for a production launch. Some items here are **manual** and
cannot be done in code.

---

## Firebase / FCM — MANUAL STEP REQUIRED (push notifications)

`app/android/app/google-services.json` now has `package_name: uz.dealio.crm`, but
its `project_id` (`uzb-crm`), `mobilesdk_app_id`, and `api_key` still belong to
the **original** Firebase Android app (registered under `com.example.uzbek_crm`).
Until a Firebase app for the new package exists, **FCM registration will fail**
and push notifications will not be delivered.

**You must do this by hand in the Firebase console (do NOT hand-edit keys):**

1. Firebase console → project **`uzb-crm`** → **Add app → Android**, with package
   name **`uz.dealio.crm`**.
2. **Download** the fresh `google-services.json` that Firebase generates for it.
3. **Replace** `app/android/app/google-services.json` with that downloaded file.
4. **Rebuild** the app (`flutter build apk` / appbundle).

No code change can substitute for this — the keys must come from Firebase.

---

## Required production environment variables

The backend **refuses to boot** if the signing/hashing secrets are missing or set
to a known placeholder (see `backend/src/lib/validateEnv.ts` and `lib/crypto.ts`).
Set ALL of these in the production environment (e.g. Railway/host config — never
commit real values):

| Variable | Required | Notes |
|---|---|---|
| `JWT_SECRET` | ✅ | Owner token signing. Strong random, e.g. `openssl rand -hex 32`. No fallback. |
| `ADMIN_JWT_SECRET` | ✅ | Admin-panel token signing. Strong random, **distinct** from `JWT_SECRET`. No fallback. |
| `OTP_HASH_SECRET` | ✅ | Keyed HMAC for OTP codes. Strong random; **no longer** falls back to `JWT_SECRET`. |
| `BOT_TOKEN_ENCRYPTION_KEY` | ✅ | AES-256-GCM key, exactly **64 hex chars (32 bytes)**. Validated in `lib/crypto.ts`. |
| `DATABASE_URL` | ✅ | Neon Postgres connection string. |
| `OWNER_APP_URL` | ✅ in prod | Owner web origin. **If unset, CORS rejects the real owner web origin** (only `localhost` is allowed otherwise). |
| `ADMIN_APP_URL` | ✅ in prod | Admin web origin. **If unset, CORS rejects the real admin web origin.** |
| `PORT` | optional | Defaults to `3000`; the server listens on `0.0.0.0`. |

> Generate each secret independently. Do not reuse one value across variables.

### Database migrations on release

Run Prisma migrate deploy against the production (Neon) database on each release:

```
cd backend
npx prisma migrate deploy
```

(Use `migrate deploy`, not `migrate dev`, in production — it applies committed
migrations without prompting or generating new ones.)
