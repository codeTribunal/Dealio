INTERNAL ONLY. Never publish.

# Security
Audience: internal
Last updated: 2026-07-03
Verified against: 64a177a

---

Scope: the backend Fastify API is the security boundary for all four surfaces (web owner panel, web admin panel, Flutter owner app, Telegram bot service). This document covers authentication, tenant isolation, secret handling, rate limiting, auditing, impersonation, and the compliance machinery, plus the currently open gaps. Source of record is `docs/internal/FUNCTIONALITY_INVENTORY.md` sections A.3, B, and G; every load-bearing claim below is re-cited to code.

## 1. Authentication matrix

Four independent auth mechanisms exist. They do not share secrets or transports.

| Actor | Credential | Transport | Attached by | Verified at | Lifetime |
|---|---|---|---|---|---|
| Owner | JWT signed with `JWT_SECRET` | `Authorization: Bearer` | Web axios interceptor from JS-readable cookie `crm_token` (web/lib/api.ts:30-36); Flutter Dio `AuthInterceptor` (app/lib/core/api/auth_interceptor.dart:12-18) | `authenticate` preHandler runs `request.jwtVerify()` (backend/src/middleware/auth.ts:3-9) | `JWT_EXPIRES_IN`, default 30d (backend/src/plugins/jwt.ts:11) |
| Admin | JWT signed with `ADMIN_JWT_SECRET` under the `admin` JWT namespace | httpOnly cookie `admin_session` (secure in prod, sameSite strict, `path:/api/v1/admin`) plus mandatory CSRF header `x-requested-with: dealio-admin` on every mutating request | Web dedicated axios instance, `withCredentials:true` (web/lib/adminApi.ts:8-13) | `requireAdmin` (cookie first, Bearer fallback, then AdminUser re-loaded from DB, backend/src/middleware/adminAuth.ts:26-58); `requireSuperAdmin` (:60-65); CSRF via global `adminCsrfGuard` onRequest hook (:18-24, wired index.ts:67) | maxAge 8h (backend/src/routes/admin.ts:284-297; adminJwt.ts:6-13) |
| Bot service | Shared secret `BOT_MANAGER_SECRET` | Header `x-bot-secret`, both directions | All four bot clients (bot/src/lib/api.ts:48-55; platform/api.ts:7-14; jobs/reminders.ts:8-15; index.ts:26-33) and backend to manager calls (backend/src/lib/botManager.ts:10-15) | `timingSafeEqual` compare on `/bot/*` (backend/src/routes/bot.ts:17-26), `/internal/*` (internal.ts:9-18), and the bot manager Express endpoints (bot/src/index.ts:345-354) | secret, no expiry |
| Capability token holder | Random unguessable token, token IS the whole authorization | In the URL path or request body | n/a (link recipient) | ICS feed `GET /calendar/:token.ics` (backend/src/routes/calendar.ts:11-13); single-use proposal `acceptToken` matched then nulled atomically (proposals.ts:61-90); one-time enrollment LinkToken deep link (auth.ts:89-91) | ICS: until revoked. Proposal acceptToken: single use. LinkToken: 10-min TTL |

Owner OTP is delivered over Telegram, not SMS. `POST /auth/login/request` makes the backend itself DM a crypto-secure 6-digit code (HMAC-SHA256 hash stored, never plaintext) to the user's bound Telegram chat via `PLATFORM_BOT_TOKEN`; 5-min TTL, 5 attempts, single-use, rate 5/10min per phone, constant-time compare, anti-enumeration generic 200 (backend/src/routes/auth.ts:214-277; services/otp.ts:25-99; lib/authCodes.ts:16-62). A verified code yields the 30d owner JWT. (CLAUDE.md's `POST /auth/request-otp` plus fixed `1234` dev code does not exist in this codebase.)

## 2. Tenant isolation

Every owner route funnels through one chokepoint, `getBusinessOrFail(request, reply)`, which resolves the business strictly by the `ownerId` taken from the verified JWT, so a handler can only ever touch its own tenant's rows.

```ts
// caller idiom, repeated on ~every owner route
const business = await getBusinessOrFail(request, reply);
if (!business) return;   // response already sent; halt the handler
```

Internally it does `prisma.business.findUnique({ where: { ownerId: userId } })` where `userId` comes from `request.user` (the JWT payload), returns 404 if the user has no business, and returns 403 `ACCOUNT_SUSPENDED` if the business is suspended, exempting admin impersonation sessions for read access (backend/src/lib/businessFromUser.ts:23-49). Because the WHERE clause is always `ownerId = <caller's own id>`, cross-tenant reads and writes on the owner API are structurally impossible; there is no path where a route accepts an attacker-supplied businessId to scope the query. The `authenticate` preHandler appears ~111 times across 18 route files and `getBusinessOrFail` is the suspension-and-tenancy gate on nearly every one (see FUNCTIONALITY_INVENTORY.md sections B.2 through B.8 for the per-route "GBOF@N" map). The standalone `middleware/checkSuspended.ts` is dead code with zero imports; suspension is enforced via `getBusinessOrFail` on owner routes and inline `suspendedAt` checks on bot routes.

Bot routes do NOT use owner JWTs. Their tenant scoping is `botUsername` in the URL path plus the one global `x-bot-secret` (backend/src/routes/bot.ts:29-36); see section 8 for the intra-tenant gaps this leaves open.

## 3. Bot token encryption

Each business's Telegram bot token is encrypted at rest with AES-256-GCM and stored as a triple of columns: `botTokenEncrypted`, `botTokenIv`, `botTokenTag` (schema.prisma:56-58). The IV is a fresh 12-byte random value per encryption, and the GCM auth tag is retained for decrypt-time integrity verification (backend/src/lib/crypto.ts:29-43). The key is `BOT_TOKEN_ENCRYPTION_KEY`, required to be 64 hex characters (32 bytes); crypto.ts validates this at module import and throws if the variable is missing or the decoded length is not 32 bytes, so the process cannot boot with a bad key (crypto.ts:8-21). Decrypt failure (wrong key or tampered ciphertext) throws a generic error and never returns partial plaintext (crypto.ts:45-63). Decryption happens server-side only; the plaintext token is handed to the bot manager over the internal `x-bot-secret` channel (backend/src/routes/internal.ts:50-80) and is never exposed to any owner or admin client.

## 4. Rate limiting

Global limit is 100 requests per minute per IP (backend/src/plugins/rateLimit.ts:6-9). The real client IP is derived correctly because the app sets `trustProxy: 1`, meaning exactly one Railway edge hop is trusted (backend/src/index.ts:51-53); this prevents both spoofing (more than one hop is not trusted) and mis-keying (the proxy IP is not used). Per-route overrides tighten the sensitive paths:

| Path group | Override | Evidence |
|---|---|---|
| `POST /auth/enroll/start` | 10 / 10min | backend/src/routes/auth.ts:79-85 |
| `POST /auth/enroll/verify`, `POST /auth/login/verify` | 20 / 10min | auth.ts:127-129, 287-289 |
| `POST /auth/login/request` | 5 / 10min, keyed by phone | auth.ts:217-226 |
| `POST /admin/auth/login` | 10 / hr (plus DB account lockout) | admin.ts:231-233, 258-274 |
| `/bot/*` | 600 / min, keyed `bot:<botUsername>:<telegramUserId>` | bot.ts:121-140 |
| `GET /proposals/:id`, `GET /invoices/:id` | 60 / hr | proposals.ts:9, 96 |
| `POST /proposals/:id/accept` | 10 / hr | proposals.ts:61 |
| `GET /calendar/:token.ics` | 60 / hr | calendar.ts:11-13 |

The store is in-memory (no Redis on the backend), so limits are per-process and reset on restart.

## 5. Audit log

Admin mutations write append-only rows to the `AuditLog` model (`action`, `targetType`, `targetId`, `metadata`, `ipAddress`; schema.prisma:547-560) via `writeAuditLog` (backend/src/lib/audit.ts). Confirmed call sites in admin.ts cover plan changes, suspend/unsuspend, impersonation, platform-settings, user create/update, legal-doc publish, cancel-deletion, and purge (admin.ts:691, 723, 755, 795, 830, 897, 929, 1033, 1088, 1106); adminData.ts writes audited diffs on the four tenant-entity PATCH/DELETE/restore/anonymize/erase paths. Notable gaps that are still open:

- Admin LOGIN is NOT audit-logged. The `POST /admin/auth/login` handler (admin.ts:227-302) contains no `writeAuditLog` call; the first audit write in the file is at admin.ts:691. Successful and failed admin logins leave no AuditLog trail (only the DB lockout counter moves).
- There is no audit log of owner reads of customer PII, and no owner-side action log at all.

## 6. Impersonation

`POST /admin/businesses/:id/impersonate` is superadmin-only, refuses suspended businesses, and requires a reason of 10 to 500 characters (backend/src/routes/admin.ts:769-793, 784, 94-96). It mints a normal owner JWT that additionally carries `isImpersonation: true` and expires in 15 minutes (:787-793), and it writes an AuditLog row (:795). The token is write-fenced by `impersonationGuard`, a global preHandler (wired index.ts:63) that self-verifies the bearer as an owner token and, when `isImpersonation` is true, blocks every state-changing method with a deny-by-default allow-list that is currently empty, so only GET/HEAD/OPTIONS pass and any newly added write route is fenced automatically (backend/src/middleware/impersonation.ts:20-68). Impersonation is thus read-only in practice. `getBusinessOrFail` separately exempts impersonation from the suspension 403 so support can still read a suspended account (businessFromUser.ts:38-46). Bot payment routes cannot be reached with an impersonation token because they authenticate with the shared bot secret, never an owner JWT (impersonation.ts:16-18).

## 7. Consent and deletion machinery

Owner enrollment records explicit consent (general processing plus cross-border transfer) into `ConsentRecord` with policy version, IP, and user agent (schema.prisma:143-155; auth.ts enroll flow). Legal document versions are DB-backed via `LegalDocument`; a superadmin publish bumps the in-force version, stamps a sha256 content hash, and forces re-consent (admin.ts:983-1049). The bot consent gate fires before any personal-data write and re-gates when the live PRIVACY version changes (bot/src/lib/consent.ts).

Customer erasure is irreversible de-identification in a single transaction (`anonymizeCustomer`), scrubbing PII, order/appointment free-text, payment-proof file ids, and consent fields, and stamping `anonymizedAt`; it is the shared implementation behind both the admin anonymize route and the bot `/deletedata` flow (backend/src/services/anonymizeCustomer.ts:113-226).

Owner self-serve account deletion opens a 30-day purge window with immediate suspension (`POST /business/request-deletion`, business.ts:243-304); a background `runDeletionPurge()` sweep runs at boot and every 24h, calling `eraseBusinessCascade` on due businesses (backend/src/jobs/deletionPurge.ts; index.ts:137-141). Reactivation before the window closes is possible (`POST /business/reactivate`).

Deeper analysis and the open compliance items live in the audit reports:

- Data and consent compliance: `docs/internal/audits/DATA_COMPLIANCE_AUDIT.md`
- Deletion, purge, and onDelete rules: `docs/internal/audits/DELETION_AUDIT.md`
- Redis session storage and TTL: `docs/internal/audits/REDIS_SESSION_AUDIT.md`
- Admin panel hardening: `docs/ADMIN_AUDIT.md`
- Authorization and IDOR: `docs/AUTHORIZATION_AUDIT.md`

Note: the audit reports are dated 2026-07-01/02 and several of their findings are already fixed in code; treat them alongside FUNCTIONALITY_INVENTORY.md section J.5, which reconciles each audit against current code.

## 8. Known constraints (open items)

These are real gaps at commit 64a177a. None are speculative; each is code-cited.

- Bot intra-tenant identity gaps. `POST /bot/cancel-appointment` (backend/src/routes/bot.ts:805-856) and `POST /bot/milestone-review` (bot.ts:1023-1098) do not verify that the requesting Telegram user owns the appointment or milestone being acted on. The `x-bot-secret` authenticates the bot service, and `botUsername` scopes to a tenant, but within one business a customer could act on another customer's entity. This matches AUTHORIZATION_AUDIT findings B1/B2 (FUNCTIONALITY_INVENTORY.md section J.5.28).
- No server-side admin token revocation. The `admin_session` JWT is valid for its full 8h; there is no allow-list or blocklist, so logout is client-side only and a leaked admin token stays usable until expiry (admin.ts:284-297; ADMIN_AUDIT reconciliation, section J.5.29).
- No TTL purge for auth artifacts. Rows in `OtpCode`, `LinkToken`, `SentReminder`, `DeviceToken`, `ConsentRecord`, and `UsageLog` are never swept; they accumulate indefinitely (DELETION_AUDIT reconciliation, section J.5.30).
- Owner JWT is stored in a JS-readable cookie on web (`crm_token`, web/lib/auth.ts:12), so it is exfiltratable via XSS, in contrast to the admin httpOnly `admin_session`. This asymmetry is intentional but is a real exposure difference (section J.4.20).
- Tracked secrets in `bot/.env.example`. The file commits what appear to be a real Telegram bot token (`BOT_TOKEN`, bot/.env.example:1) and a real 64-hex `BOT_MANAGER_SECRET` (:3). If the secret matches production it grants all `x-bot-secret` internal endpoints. Revoke the bot token via BotFather, rotate the manager secret, and blank both in the example file (section J.2.5; backend/.env.example correctly leaves secrets blank).
