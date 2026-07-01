# Admin Panel Audit — Dealio

**Scope:** The `/admin` surface across backend (`admin.ts`, `adminData.ts`) and web (`web/app/admin/**`) — completeness, security, and gaps.
**Type:** Read-only inspection. No code was modified. Every claim cites `file:line`. No secret values printed.
**Date:** 2026-07-02.

## Headline
- Admin auth is a **fully separate JWT** — an owner token can **never** reach an admin route (CONFIRMED). Decrypted bot tokens and full card numbers are **never** returned to any admin endpoint (CONFIRMED).
- All 40 admin routes are gated by `requireAdmin`/`requireSuperAdmin`; every mutating route is audit-logged **except** login.
- Top security gaps: **no admin-login account lockout**, **admin JWT in a non-httpOnly JS-readable cookie**, and **impersonation reachable by the SUPPORT role**.
- All planned admin screens exist except a full admin-user management UI; the referenced `MULTITENANT_SAAS_PLAN.md` does not exist in the repo. Broad observability gaps (bot status, stuck payments, usage-vs-limit, consent state) — much of it recorded in the DB but never surfaced.

---

## Section 1 — Admin auth & access

- **Separate admin JWT** — `@fastify/jwt` registered under `namespace: 'admin'` with secret `ADMIN_JWT_SECRET`, decorators `adminVerify`/`adminSign` ([adminJwt.ts:9](backend/src/plugins/adminJwt.ts#L9)); `requireSecret` fails boot if the secret is missing/short/placeholder. Distinct from the owner JWT plugin ([index.ts:67-68](backend/src/index.ts#L67)). **VERIFIED.**
- **`requireAdmin`** ([adminAuth.ts:9](backend/src/middleware/adminAuth.ts#L9)) awaits `request.adminVerify()` then **re-loads the `AdminUser` from DB** by `payload.adminUserId`, 401 if missing. **`requireSuperAdmin`** ([adminAuth.ts:26](backend/src/middleware/adminAuth.ts#L26)) runs `requireAdmin` then requires `adminUser.role === 'SUPER_ADMIN'` (role read from the fresh DB row, so a demoted admin can't escalate with a stale token). **VERIFIED.**
- **Owner JWT can NEVER reach an admin route — CONFIRMED.** Owner tokens are signed with `JWT_SECRET`; `adminVerify()` uses `ADMIN_JWT_SECRET`, so verification throws → 401; even if signatures matched, there is no `AdminUser` row for `payload.adminUserId` → 401 "Admin not found". No `/admin` route uses the owner `authenticate()` preHandler.
- **Roles:** `enum AdminRole { SUPER_ADMIN, SUPPORT }` (default `SUPPORT`) ([schema.prisma:541](backend/prisma/schema.prisma#L541), AdminUser.role `@default(SUPPORT)` :503). There is no `ADMIN` value; the web type matches (`adminApi.ts:55`).
- **First super-admin seeding:** `backend/scripts/create-admin.ts` — `bcrypt.hash(password, 12)`, role hardcoded `SUPER_ADMIN`, idempotent, requires `ADMIN_PASSWORD` ([create-admin.ts:22](backend/scripts/create-admin.ts#L22)). Runtime `POST /admin/users` also uses `bcrypt.hash(password, 12)` ([admin.ts:501](backend/src/routes/admin.ts#L501)). No Prisma seed file creates admins. **VERIFIED (bcrypt cost 12).**
- **Login hardening:** rate-limited **10/hour per IP** ([admin.ts:89](backend/src/routes/admin.ts#L89)); **NO per-account lockout** — `AdminUser` has no `failedLoginAttempts`/`lockedUntil`, the handler only does findUnique→bcrypt.compare→update `lastLoginAt` ([admin.ts:98-107](backend/src/routes/admin.ts#L98)). The rate-limit key is client-supplied `x-forwarded-for` ([rateLimit.ts:10-11](backend/src/plugins/rateLimit.ts#L10) with `trustProxy:true` index.ts:48), so an attacker rotating/spoofing IPs bypasses the per-IP cap. **MISSING (lockout).**
- **Session expiry:** admin JWT `expiresIn` defaults to **8h** (`ADMIN_JWT_EXPIRES_IN`, [admin.ts:111](backend/src/routes/admin.ts#L111)). Logout is **stateless** (returns `{success:true}` only, [admin.ts:122](backend/src/routes/admin.ts#L122)) — no server-side revocation/blocklist, so a stolen token is valid until expiry.
- **Web token storage — GAP.** Stored via `js-cookie` in a **non-httpOnly, JS-readable** cookie `crm_admin_token` ([adminApi.ts:10](web/lib/adminApi.ts#L10)), `sameSite:'strict'`, **not `Secure`-flagged**, ~8h; decoded client-side by `getAdminRole()` (`adminApi.ts:377-387`); attached as `Authorization: Bearer` by an axios interceptor (`adminApi.ts:30-36`). Exposed to any XSS on the web origin.
- **CSRF — MISSING.** No `@fastify/csrf-protection` anywhere ([index.ts:65](backend/src/index.ts#L65)). Mitigated (not eliminated) by Bearer-header auth (not an ambient cookie the server trusts), a CORS allowlist, and `SameSite=strict`.
- **Panel location:** routes under `/admin/**` in the **same Next.js app**; route protection is **client-side only** (`AdminLayout` `useEffect`, [AdminLayout.tsx:31](web/components/admin/AdminLayout.tsx#L31)). CORS exposes a distinct `ADMIN_APP_URL` origin (`cors.ts:12`) so it *can* be deployed at its own domain, but there is no separate-subdomain enforcement in code.

---

## Section 2 — Every admin route (exhaustive: 40)

Gate legend: `RA` = requireAdmin, `RSA` = requireSuperAdmin. All mutations are audit-logged except where flagged.

### admin.ts
| Method Path | Gate | Reads/Mutates | Audit | Line |
|---|---|---|---|---|
| POST /admin/auth/login | public (10/hr) | reads AdminUser, bcrypt-compare; **mutates `lastLoginAt`** | **NO** (LOW) | 85 |
| POST /admin/auth/logout | RA | none (stateless) | n/a | 122 |
| GET /admin/dashboard | RA | reads platform-wide counts | no (read) | 129 |
| GET /admin/businesses | RA | list all businesses (SAFE select; owner phone) | no (read) | 194 |
| GET /admin/businesses/:id | RA | one business detail + usage + recent | no (read) | 232 |
| PATCH /admin/businesses/:id/plan | RSA | plan + planExpiresAt | CHANGE_PLAN | 287 |
| POST /admin/businesses/:id/suspend | RSA | suspendedAt + reason (>=10 chars) | SUSPEND_BUSINESS | 324 |
| POST /admin/businesses/:id/unsuspend | RSA | clears suspend (no reason) | UNSUSPEND_BUSINESS | 356 |
| POST /admin/businesses/:id/impersonate | **RA** | mints 15-min owner token | IMPERSONATE_BUSINESS | 384 |
| GET /admin/platform-settings | RA | global cardPaymentsEnabled | no (read) | 427 |
| PATCH /admin/platform-settings | RSA | cardPaymentsEnabled | UPDATE_PLATFORM_SETTINGS | 434 |
| GET /admin/audit | RA | paginated AuditLog | no (read) | 456 |
| GET /admin/users | RSA | all AdminUser rows | no (read) | 483 |
| POST /admin/users | RSA | create AdminUser (bcrypt 12) | CREATE_ADMIN_USER | 492 |
| PATCH /admin/users/:id | RSA | change role (not own) | UPDATE_ADMIN_ROLE | 521 |
| GET /admin/legal-docs | RSA | legal versions | no (read) | 559 |
| POST /admin/legal-docs/:docType/publish | RSA | publish legal version | PUBLISH_LEGAL_VERSION | 580 |

### adminData.ts
| Method Path | Gate | Reads/Mutates | Audit | Line |
|---|---|---|---|---|
| GET /admin/businesses/:id/customers | RA | tenant customers (opt. deleted) | no (read) | 108 |
| GET /admin/businesses/:id/orders | RA | tenant orders | no (read) | 146 |
| GET /admin/businesses/:id/appointments | RA | tenant appointments | no (read) | 181 |
| GET /admin/businesses/:id/projects | RA | tenant projects | no (read) | 217 |
| GET /admin/customers/:id | RA | one customer (unscoped) incl telegram ids | no (read) | 249 |
| GET /admin/orders/:id | RA | one order (unscoped) — see Section 4 leak | no (read) | 295 |
| GET /admin/appointments/:id | RA | one appointment (unscoped) | no (read) | 309 |
| GET /admin/projects/:id | RA | one project (unscoped) | no (read) | 324 |
| PATCH /admin/customers/:id | **RA** | edit any tenant customer PII | EDIT_TENANT_RECORD | 343 |
| PATCH /admin/orders/:id | **RA** | edit any tenant order status/payment | EDIT_TENANT_RECORD | 374 |
| PATCH /admin/appointments/:id | **RA** | edit any tenant appointment | EDIT_TENANT_RECORD | 403 |
| PATCH /admin/projects/:id | **RA** | edit any tenant project money fields | EDIT_TENANT_RECORD | 432 |
| DELETE /admin/{customers,orders,appointments,projects}/:id | RSA | soft-delete (deletedAt) | SOFT_DELETE_* | 482 |
| POST /admin/{...}/:id/restore | RSA | clear deletedAt | RESTORE_* | 502 |
| POST /admin/customers/:id/anonymize | RSA | irreversible PII scrub | ANONYMIZE_CUSTOMER | 530 |
| POST /admin/businesses/:id/erase | RSA | irreversible hard-delete business+owner | ERASE_BUSINESS | 559 |
| GET /admin/search | RA | cross-tenant business+customer search | no (read) | 638 |

**Flags:**
- **Not audit-logged mutation:** `POST /admin/auth/login` writes `lastLoginAt` but is not audit-logged ([admin.ts:104](backend/src/routes/admin.ts#L104)). LOW.
- **SUPPORT-reachable sensitive writes:** the four `PATCH /admin/{entity}/:id` edit routes and `POST .../impersonate` are `requireAdmin`, so a **SUPPORT** admin can edit any tenant's customer PII / order-and-payment status / project money fields across all businesses, and impersonate any owner — a lower bar than suspend/plan/delete (all `requireSuperAdmin`). Audit-logged, but broad by role. (adminData.ts:343-432, admin.ts:384.)
- **SUPPORT-reachable cross-tenant PII reads:** all `GET` list/detail/search routes are `requireAdmin`, exposing cross-tenant customer PII (names/phones/telegram ids) to SUPPORT (read-only, by design).

---

## Section 3 — Admin panel pages (web)

Nine pages under `web/app/admin/**`, all on `AdminLayout` (client-side guard only), calling `web/lib/adminApi.ts`:

| Page | Shows / calls | Gating |
|---|---|---|
| `login/page.tsx` | admin login | public |
| `page.tsx` (dashboard) | business/plan counts, recent signups/suspensions → `GET /admin/dashboard` | any admin ([page.tsx:27](web/app/admin/page.tsx#L27)) |
| `businesses/page.tsx` | paginated list + search/plan/status filters → `GET /admin/businesses` | any admin |
| `businesses/[id]/page.tsx` | detail + suspend/unsuspend/plan/impersonate/erase + `BusinessDataManager` | any admin (view/actions client-side) |
| `audit/page.tsx` | paginated AuditLog → `GET /admin/audit` | any admin |
| `users/page.tsx` | **read-only LIST** of admin users → `GET /admin/users` | nav superadmin-gated |
| `settings/page.tsx` | platform card-payments flag → GET/PATCH `/admin/platform-settings` | toggle superadmin-only; SUPPORT read-only |
| `legal/page.tsx` | legal versions + publish → GET/POST `/admin/legal-docs` | publish superadmin-only |
| `search/page.tsx` | cross-tenant search → `GET /admin/search` | any admin |
| `components/admin/BusinessDataManager.tsx` | tenant CRUD tabs (edit/delete/restore/anonymize) | embedded in detail |

**Planned-screen comparison** (the task's list; the referenced **`MULTITENANT_SAAS_PLAN.md` does NOT exist** in the repo — MISSING doc, confirmed by `git ls-files '*.md'`):
- Dashboard — **EXISTS**; Businesses list — **EXISTS**; Business detail — **EXISTS**; Plan management — **EXISTS**; Suspend/unsuspend — **EXISTS** (suspend reason min 10 chars enforced client-side, `[id]/page.tsx:362`); Impersonation — **EXISTS** (writes 15-min owner token to `crm_token`, opens app); Audit log — **EXISTS**; Admin user management — **PARTIAL/GAP**: only a **read-only list** — there is no create/edit/delete admin-user UI in the web panel, though the backend routes (`POST`/`PATCH /admin/users`) exist ([users/page.tsx:12](web/app/admin/users/page.tsx#L12)).
- All route protection is **client-side only** (`AdminLayout.tsx:31`) — UX, not security; the backend gates are the real control.

---

## Section 4 — Impersonation & sensitive actions

- **Impersonation token TTL:** hard **15 minutes** (900 s), baked into the JWT; response echoes `expiresAt` ([admin.ts:404](backend/src/routes/admin.ts#L404), :417). Minted as an **owner** JWT (`JWT_SECRET`) carrying `isImpersonation:true`, `impersonatedBy`. **VERIFIED.**
- **Single-business scoping:** token carries `userId: business.ownerId`; owner routes resolve the business from `userId` via `getBusinessOrFail`, and `Business.ownerId` is `@unique` ([businessFromUser.ts:32](backend/src/lib/businessFromUser.ts#L32), schema.prisma:38), so the session is confined to that one business. **VERIFIED.**
- **Write-fencing:** `isImpersonationBlocked` denies every `DELETE` and any `PATCH` ending in `/payment`, enforced by the global `impersonationGuard` preHandler ([impersonation.ts:23](backend/src/middleware/impersonation.ts#L23), registered index.ts:58). **VERIFIED.** **GAP:** it is a URL-suffix **deny-list** — a future non-`DELETE`, non-`/payment` destructive/money route (e.g. a refund POST, invoice mark-paid, milestone payment) would not be fenced ([impersonation.ts:25](backend/src/middleware/impersonation.ts#L25)).
- **Audit trail:** `IMPERSONATE_BUSINESS` logged on every mint with admin id, target, IP ([admin.ts:407](backend/src/routes/admin.ts#L407)); AuditLog is append-only.
- **GAP:** impersonation is `requireAdmin`, so a **SUPPORT** admin can impersonate any non-suspended owner, and **no reason is captured** (contrast suspend's mandatory reason) ([admin.ts:386](backend/src/routes/admin.ts#L386)).
- **Decrypted bot token — never returned. VERIFIED.** Every business-returning admin route uses `SAFE_BUSINESS_SELECT` (only `botUsername`; omits `botTokenEncrypted/Iv/Tag`) ([admin.ts:21](backend/src/routes/admin.ts#L21)). Grep of admin.ts/adminData.ts for `getBotToken|decrypt|botToken*` → no matches.
- **Full card number — never returned. VERIFIED.** `cardNumber`/`cardHolderName` are not in `SAFE_BUSINESS_SELECT` and not selected anywhere in admin routes; `/admin/search` selects only `{id,name,plan,suspendedAt,owner.phone}` (adminData.ts:674).
- **GAP — payment-proof pointers leak to admin:** `GET /admin/orders/:id` uses a Prisma `include` with no field-level `select` on the order, so the body includes **all** Order scalars, incl. `paymentProofFileId` and `paymentProofUrl` ([adminData.ts:297](backend/src/routes/adminData.ts#L297)) — the schema comment says `paymentProofFileId` is "never returned raw to clients" (schema.prisma:220-225). MEDIUM.
- **Suspend:** `requireSuperAdmin`, reason `>=10` chars, `SUSPEND_BUSINESS` logged with `{reason}`. **VERIFIED** ([admin.ts:326](backend/src/routes/admin.ts#L326)).
- **Plan change:** `requireSuperAdmin`, `CHANGE_PLAN` logged with `{oldPlan,newPlan,note}`; note is **optional** (no mandatory justification) ([admin.ts:289](backend/src/routes/admin.ts#L289), :57). VERIFIED (note optional = minor).
- **Unsuspend — GAP:** `requireSuperAdmin` and logged (`UNSUSPEND_BUSINESS`), but **captures no reason** ([admin.ts:357](backend/src/routes/admin.ts#L357)).

---

## Section 5 — What the admin panel cannot do / observability gaps

**(A) Operator capabilities the panel LACKS:**
- **Platform metrics/health — GAP.** Dashboard is business/plan counts only; no MRR/revenue, aggregate order/appointment volume, latency, or queue depth. `GET /health` (index.ts:100) is not surfaced ([admin.ts:129](backend/src/routes/admin.ts#L129)).
- **Per-business usage vs limit — GAP.** `GET /admin/businesses/:id` fetches `usageThisMonth` (admin.ts:249) but the web detail page never renders it (typed `unknown`, [businesses/[id]/page.tsx:34](web/app/admin/businesses/[id]/page.tsx#L34)); it shows lifetime counts, no usage-vs-plan-limit.
- **Error visibility — MISSING.** No route/page exposes application errors/failed jobs; errors go only to `request.log`.
- **Bot status (live/down) — MISSING.** The bot manager exposes `GET /internal/status` ([bot/src/index.ts:426](bot/src/index.ts#L426)) but the backend only calls `start-bot`/`stop-bot`; no admin proxy or page reads bot status.
- **Failed-payment / stuck-order visibility — MISSING.** No cross-business view of paid-but-unconfirmed or stale orders; `Order.paymentProof*` fields are never selected by any admin list ([adminData.ts:146](backend/src/routes/adminData.ts#L146)).
- **Consent / legal-version status per user — MISSING.** Admin can bump the in-force legal version but cannot see who has/hasn't re-consented; `Customer.consentedAt/consentVersion`, `ConsentRecord`, `User.newsletterConsent` are not read by any admin route ([admin.ts:559](backend/src/routes/admin.ts#L559)).
- **Deletion/erase request queue — MISSING.** Erasure is manual/immediate (super-admin anonymize/erase); there is no `DeletionRequest` model or admin queue. A customer bot self-erase (`/deletedata`) anonymizes silently with no admin-visible record beyond the audit line ([adminData.ts:530](backend/src/routes/adminData.ts#L530)).

**(B) Recorded in DB but NOT surfaced in admin:**
- `UsageLog` — fetched once but not rendered; no history/aggregate ([schema.prisma:526](backend/prisma/schema.prisma#L526)).
- `ConsentRecord` (owner GDPR consent w/ IP/UA/version) — only referenced by the erase cascade ([schema.prisma:125](backend/prisma/schema.prisma#L125)).
- Per-customer consent fields — omitted from admin customer reads ([schema.prisma:157](backend/prisma/schema.prisma#L157)).
- `SentReminder` (delivery ledger) — unsurfaced ([schema.prisma:73](backend/prisma/schema.prisma#L73)).
- `DeviceToken`/`fcmToken` (push registration) — unsurfaced; operator can't diagnose "owner not getting notified" ([schema.prisma:90](backend/prisma/schema.prisma#L90)).
- `Order.paymentProof*` — recorded, not shown as a proof indicator ([schema.prisma:220](backend/prisma/schema.prisma#L220)).
- `BlockedSlot` / `Milestone` / `Invoice` — no cross-business or overdue-invoice view ([schema.prisma:297](backend/prisma/schema.prisma#L297)).
- `AdminUser.lastLoginAt` — shown, but no session/activity monitoring or failed-login visibility; owner `User` has no `lastLoginAt` at all ([schema.prisma:504](backend/prisma/schema.prisma#L504)).
- `LinkToken` / `OtpCode` — no visibility into stuck enrollments / failed owner logins ([schema.prisma:419](backend/prisma/schema.prisma#L419)).

---

## Section 6 — Findings (prioritized)

| Severity | Finding | file:line |
|---|---|---|
| **HIGH** | No per-account **lockout** on admin login; only 10/hr per-IP, and the rate-limit key is spoofable `x-forwarded-for` | admin.ts:98; rateLimit.ts:10 |
| **HIGH** | Admin JWT stored in a **non-httpOnly, JS-readable** cookie (XSS token theft) | web/lib/adminApi.ts:10 |
| **HIGH** | **Impersonation reachable by SUPPORT** role (`requireAdmin`), not `requireSuperAdmin` — a support admin can assume any owner | admin.ts:386 |
| MEDIUM | Four `PATCH /admin/{entity}/:id` edit routes are `requireAdmin` — SUPPORT can edit tenant PII / payment status / project money across all businesses | adminData.ts:343-432 |
| MEDIUM | `GET /admin/orders/:id` returns `paymentProofFileId`/`paymentProofUrl` (schema says never raw to clients) | adminData.ts:297 |
| MEDIUM | No CSRF middleware (mitigated by Bearer-not-cookie auth + CORS + SameSite) | index.ts:65 |
| MEDIUM | Impersonation write-fence is a URL-suffix **deny-list** (future money/destructive routes not covered) | impersonation.ts:25 |
| MEDIUM | Admin token cookie not `Secure`-flagged (can send over http) | web/lib/adminApi.ts:11 |
| MEDIUM | No server-side admin token revocation; logout is stateless (stolen token valid ~8h) | admin.ts:122 |
| LOW | `POST /admin/auth/login` mutates `lastLoginAt` but is not audit-logged (login events unaudited) | admin.ts:104 |
| LOW | Unsuspend captures no reason in audit metadata (suspend does) | admin.ts:357 |
| LOW | Plan-change justification note is optional | admin.ts:57 |
| LOW | `requireSuperAdmin` does not short-circuit after `requireAdmin` sends 401 (benign; Fastify ignores the second send) | adminAuth.ts:27 |
| MISSING (screen) | No admin-user create/edit/delete UI (backend routes exist; web is list-only) | web/app/admin/users/page.tsx:12 |
| MISSING (doc) | Referenced `MULTITENANT_SAAS_PLAN.md` does not exist in the repo | (repo root / docs) |
| MISSING (obs) | Bot status, failed-payment/stuck-order queue, error visibility, consent/legal-version-per-user, erase-request queue, per-business usage-vs-limit | see Section 5 |
| **VERIFIED** | Owner JWT can never reach an admin route (separate JWT + DB re-check) | adminJwt.ts:9; adminAuth.ts:9 |
| **VERIFIED** | Decrypted bot token / full card number never returned to any admin endpoint | admin.ts:21 |
| **VERIFIED** | Every mutating admin route is audit-logged (except login); AuditLog append-only | admin.ts / adminData.ts |
| **VERIFIED** | Impersonation: 15-min TTL, single-business scoped, write-fenced, audit-logged | admin.ts:404; impersonation.ts:23 |
| **VERIFIED** | Suspend gated (RSA) + logged + mandatory reason; seeding uses bcrypt cost 12 | admin.ts:326; create-admin.ts:22 |

_No remediation is proposed here (inspection only, per the task). No secret values are printed._
