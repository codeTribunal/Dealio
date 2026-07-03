# Data Compliance Audit — Dealio CRM

**Purpose:** Ground-truth, evidence-based picture of personal data actually collected, stored, transmitted and exposed by the code, to support a privacy policy, public offer, and pd.gov.uz state database registration under Uzbekistan's Law on Personal Data (ZRU-547).

**Method:** Read-only static inspection of `backend/`, `bot/`, `web/`, `app/`, and `.env.example`/config files. Every claim cites `file:line`. "NOT FOUND IN CODE" means no supporting evidence exists. No secret values are printed (key names only). **Code is the source of truth over any spec.**

**Date:** 2026-07-01 · **Scope:** entire monorepo · **Nature:** audit only, no remediation.

> **Executive note — the three showstoppers:** (1) **end customers are given no consent step, policy link, or lawful-basis capture anywhere in the bot** before their Telegram identity, name, and phone are stored; (2) **tenant records are soft-deleted only** (a `deletedAt` flag with restore endpoints), which does not satisfy ZRU-547 "destruction"; (3) **all data processors are hosted outside Uzbekistan** and customers never consent to cross-border transfer. Data-protection *measures* (encryption, tenant isolation, auth) are otherwise strong. PostHog is **not present** in any surface.

---

## 1. Personal data inventory

Free-text fields able to hold arbitrary personal data are marked **FREE-TEXT** (high privacy risk).

| Field | Model / storage | Subject | Collected where | Evidence |
|---|---|---|---|---|
| phone | `User.phone` (unique) | Owner | web/app (enrollment) | schema.prisma:104 |
| email | `User.email` | Owner | web/app (optional) | schema.prisma:115 |
| newsletterConsent / newsletterConsentAt | `User` | Owner | web/app (settings) | schema.prisma:110-119 |
| telegramChatId | `User.telegramChatId` | Owner | bot (platform-bot auth) | schema.prisma:108 |
| name | `Business.name` | Owner | web/app | schema.prisma:12 |
| address | `Business.address` | Owner | web/app (pickup/appt location) | schema.prisma:17 |
| cardNumber | `Business.cardNumber` | Owner | web/app (payment settings) | schema.prisma:33 |
| cardHolderName | `Business.cardHolderName` | Owner | web/app | schema.prisma:34 |
| ownerTelegramChatId | `Business.ownerTelegramChatId` | Owner | bot (notifications) | schema.prisma:36 |
| fcmToken | `Business.fcmToken` | Owner (device) | app (push registration) | schema.prisma:37 |
| botTokenEncrypted / botTokenIv / botTokenTag | `Business` | Owner (bot secret) | bot integration | schema.prisma:48-50 |
| telegramUserId | `Customer.telegramUserId` | **Customer** | bot | schema.prisma:143 |
| telegramUsername | `Customer.telegramUsername` | **Customer** | bot | schema.prisma:144 |
| name | `Customer.name` | **Customer** | bot/web/app | schema.prisma:145 |
| phone | `Customer.phone` | **Customer** | bot/web/app | schema.prisma:146 |
| birthday | `Customer.birthday` | **Customer** | bot/web/app (custom field) | schema.prisma:147 |
| **notes** | `Customer.notes` **FREE-TEXT** | **Customer** | web/app (owner annotation) | schema.prisma:148 |
| **customFields** (JSON) | `Customer.customFields` **FREE-TEXT** | **Customer** | bot/web/app | schema.prisma:149 |
| languagePreference | `Customer.languagePreference` | **Customer** | bot/web/app | schema.prisma:152 |
| **deliveryAddress** | `Order.deliveryAddress` **FREE-TEXT** | **Customer** | bot/web/app (checkout) | schema.prisma:203 |
| **notes** | `Order.notes` **FREE-TEXT** | **Customer** | bot/web/app (customer note) | schema.prisma:205 |
| **internalNotes** | `Order.internalNotes` **FREE-TEXT** | Business (staff) | web/app | schema.prisma:206 |
| **customAnswers** (JSON) | `Order.customAnswers` **FREE-TEXT** | **Customer** | checkout | schema.prisma:207 |
| paymentProofFileId | `Order.paymentProofFileId` | **Customer** (screenshot) | bot | schema.prisma:214 |
| paymentProofUrl | `Order.paymentProofUrl` | **Customer** | backend (future R2) | schema.prisma:219 |
| **notes** | `Appointment.notes` **FREE-TEXT** | **Customer** | web/app | schema.prisma:318 |
| name / telegramHandle | `Staff` | Staff | web/app | schema.prisma:264-265 |
| **note** | `Reminder.note` **FREE-TEXT** | Business/Customer ref | web/app | schema.prisma:404 |
| **value** | `CustomerFieldValue.value` **FREE-TEXT** | **Customer** | bot/web/app | schema.prisma:461 |
| **reason** | `BlockedSlot.reason` **FREE-TEXT** | Business | web/app | schema.prisma:299 |
| ipAddress / userAgent | `ConsentRecord` | Owner | web/app (consent form) | schema.prisma:132-133 |
| email | `AdminUser.email` | Platform admin | internal | schema.prisma:494 |
| action / **metadata** (JSON) / ipAddress | `AuditLog` **FREE-TEXT metadata** | Admin | backend | schema.prisma:509-513 |
| phone / chatId | `OtpCode.phone`, `LinkToken.phone`, `LinkToken.chatId` | Owner | backend (auth code delivery) | schema.prisma (OtpCode ~413-426; LinkToken) |

**Anonymization field:** `Customer.anonymizedAt` (schema.prisma:157) — set by the admin anonymize path, which genuinely scrubs personal fields (see §5).
**Models with NO direct PD:** Product, Service, Milestone, Invoice, OrderItem, StaffService, DeviceToken (device id only), SentReminder, UsageLog, PlatformSettings. `OtpCode` stores a **hash**, never the plaintext code.

---

## 2. Collection points and consent

### (a) Bot — END CUSTOMER: consent is **NEVER** captured

- **/start → language picker** is the first interaction (bot/src/handlers/commands.ts:72-80). Selecting a language fires the `setlang:` callback (commands.ts:83-104), which calls `setCustomerLanguage()` (bot/src/lib/api.ts:119-128, POST `/api/v1/bot/set-language`) with **`ctx.from.id` (Telegram user id), `ctx.from.username`, `ctx.from.first_name`** — persisted immediately.
- **Checkout** collects and stores the customer's **name + phone** via `upsertCustomer()` (bot/src/scenes/checkout.ts:117-123), fed from the `awaiting_name`/`awaiting_phone` steps.
- **Booking** does the same via `upsertCustomer()` (bot/src/scenes/booking.ts:354-362).
- Grep across `bot/src` for `consent | policy | privacy | offerta | oferta | terms`: **NOT FOUND** — there is **no consent gate and no policy/privacy link anywhere in the customer bot flow**.

> **Conclusion (customers): consent is NEVER obtained.** Telegram id/username/first_name are stored at the language pick; name/phone at checkout/booking — all before (indeed, without) any consent or notice.

### (b) Owner onboarding — consent **BEFORE** storage (at enrollment)

- Web onboarding step 4 shows **two explicit checkboxes** (web/app/onboarding/page.tsx:412-441): a general privacy-policy consent (`generalConsent`) and a **cross-border transfer** consent (`crossBorderConsent`). "Verify & launch" is disabled unless both are checked (line 446-449); `handleVerifyAndLaunch()` passes both to `enrollVerify()` (lines 131-170).
- Backend `/auth/enroll/verify` **mandates** both: `if (generalConsent !== true || crossBorderConsent !== true) return 400 'Consent is required to continue'` (backend/src/routes/auth.ts:126-131). On success it persists a `ConsentRecord` (auth.ts:171-180) with `policyVersion`, `ipAddress`, `userAgent`. The `User` row (with phone) is written after this (auth.ts:159-189).
- Returning **login** shows no consent form (web/app/login/page.tsx), but the backend re-gates on policy version: `/auth/login/verify` returns **403 CONSENT_REQUIRED** if the user lacks consent for `CURRENT_POLICY_VERSION` and doesn't re-supply it (auth.ts:306-324).

> **Conclusion (owners): consent BEFORE storage at first enrollment, re-checked on policy-version change.** Caveat: the owner's **phone is transmitted to Telegram to deliver the enrollment/login code and written to `OtpCode`/`LinkToken` at the *start* step, which precedes the step-4 checkbox** — worth confirming for strict "before any processing" compliance.

---

## 3. Third-party processors and data egress

### (a) PostHog — **NOT FOUND IN CODE** (all surfaces)
No `posthog` / `posthog-js` / `posthog-node` / `posthog_flutter` dependency in any `package.json` or `pubspec.yaml`; no init, autocapture, session replay, `identify()`, or `capture()` call in bot, web, app, or backend. **There is no product analytics/tracking pipeline.**

### (b) Processors actually present

| Processor | Personal data that reaches it | Evidence | Outside UZ? |
|---|---|---|---|
| **Firebase Cloud Messaging** (Google, US) | Push **titles/bodies containing customer names + order/project amounts + order numbers**; FCM device tokens | backend `firebase-admin` (package.json:27); app `firebase_messaging` (pubspec.yaml:40-41); push bodies at bot.ts:390, 451, 1008; init push.ts:1-33 / fcm.ts:1-28; google-services.json project `uzb-crm` | ✅ Yes |
| **Telegram Bot API** (intl) | Owner **OTP login codes** (auth.ts:248-253, telegram.ts:7); business notifications with **customer names + amounts** (bot.ts:459, 996-1000); customer messages; Telegram chat/user ids | api.telegram.org via native fetch | ✅ Yes |
| **Postgres (Neon via Railway, US/EU)** | Everything in §1 at rest | `DATABASE_URL` (backend/.env.example:1; DEPLOY_NOTES.md:41) | ✅ Yes |
| **Redis (Railway, US)** | Cart / in-flight checkout session data (customer-linked) | `REDIS_URL` (bot/.env.example:8) | ✅ Yes |
| **Cloudflare R2** (intl) | **Payment-proof images** linked to customer/order/business | `@aws-sdk/client-s3` (package.json:17); r2.ts:50-75; `R2_*` env | ✅ Yes |
| **SMS/OTP gateway** | — | **NOT FOUND** — OTP is delivered **only via Telegram**; no Eskiz/Playmobile/Twilio; code is real (HMAC-hashed), no dev "1234" fallback (otp.ts:25-47) | n/a |
| **Vercel** | — | **NOT FOUND** — Next.js app, no Vercel-specific config | n/a |

**Config key names only (no values):**
`backend/.env.example`: `DATABASE_URL, FCM_SERVER_KEY, FCM_SERVICE_ACCOUNT_JSON, R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET, R2_PUBLIC_URL, PLATFORM_BOT_TOKEN, PLATFORM_BOT_USERNAME, OTP_HASH_SECRET, BOT_TOKEN_ENCRYPTION_KEY, JWT_SECRET, ADMIN_JWT_SECRET`.
`bot/.env.example`: `REDIS_URL, PLATFORM_BOT_TOKEN, BOT_TOKEN, BACKEND_URL, BOT_MANAGER_SECRET`.
`web`: `NEXT_PUBLIC_API_URL`. `app/android/.../google-services.json`: `project_id, mobilesdk_app_id, api_key, storage_bucket`.

> **Finding:** 100% of data processors are hosted outside Uzbekistan. Customer PD (name, phone, address, order details) is sent to US/international services with no UZ-local alternative, and **customer names appear in FCM push bodies and Telegram message text** (not silent data payloads).

---

## 4. Superadmin / cross-tenant access

- **Cross-tenant read is by design for admins.** `GET /admin/businesses`, `GET /admin/businesses/:id`, and `GET /admin/search?type=business|customer|all` intentionally span all tenants (admin.ts:185, 223, 676; documented admin.ts:670-673). Tenant-data reads/edits (`adminData.ts` GET/PATCH customers/orders/appointments/projects) resolve the owning `businessId` from the record and are `requireAdmin`; destructive ops are `requireSuperAdmin`.
- **Impersonation:** `POST /admin/businesses/:id/impersonate` mints a **15-minute** owner JWT with `isImpersonation:true, impersonatedBy` (admin.ts:375, 390-396). A guard blocks all `DELETE` and `PATCH …/payment` during impersonation (middleware/impersonation.ts:23-59); impersonation **bypasses suspension for reads** (businessFromUser.ts:40-46).
- **Audit logging: PRESENT and immutable.** `AuditLog` model (schema.prisma:505-518); `writeAuditLog()` (lib/audit.ts:10-20). Logged actions include impersonate, plan change, suspend/unsuspend, tenant-record edits, soft-delete/restore, **anonymize**, and **business erase** (admin.ts:301-404; adminData.ts:362-665). `AuditLog` is explicitly **not** soft-deletable and **survives account erasure** (adminData.ts:593-596). `GET /admin/audit` (admin.ts:447) lets any admin read the log. **Gap:** there is **no audit log of an *owner* reading/exporting their own customers' PD** — only admin actions are logged.
- **Bot tokens are NOT exposed to admins.** No admin route decrypts or returns `botToken*`; all admin business selects use `SAFE_BUSINESS_SELECT` which omits the token fields (grep of admin.ts/adminData.ts for `botToken|getBotToken|decryptBotToken`: **NOT FOUND**). Decryption occurs only in bot-context internal paths (getBotToken.ts).
- Cross-tenant isolation for **owners** is enforced and even tested (`backend/test/cross-tenant.test.ts:42-96`: Business B gets 404 on Business A records).

---

## 5. Deletion and retention — CRITICAL

### Soft- vs hard-delete by model
- **SOFT-DELETE ONLY (row remains, `deletedAt` flag, restorable):** `Customer, Order, Appointment, Project, Service, Product, Staff, Milestone, BusinessCustomField, CustomerStage, CheckoutQuestion`. Owner delete endpoints set `deletedAt` and expose **restore** (e.g. customers.ts:414-434 `softDelete('customer', …)` + `POST /customers/:id/restore`; orders.ts:269-277; appointments.ts:324-332; services.ts:141-151; products.ts:75-87; staff.ts:140-152; softDelete service `services/softDelete.ts:20-105`). Admin soft-delete + restore: adminData.ts:480-520; admin can list soft-deleted rows via `includeDeleted=true` (adminData.ts:112).
- **HARD-DELETE (irreversible):** only two paths, both **super-admin only**:
  - `POST /admin/customers/:id/anonymize` (adminData.ts:530-589) — genuinely scrubs `name→'Deleted customer'`, `phone/telegramUserId/telegramUsername/notes/birthday→null`, `customFields→DbNull`, deletes `CustomerFieldValue`/`CustomerTag`, nulls order `deliveryAddress`/`customAnswers`; sets `anonymizedAt`; no restore.
  - `POST /admin/businesses/:id/erase` (adminData.ts:597-668) — cascade hard-delete of the whole business + `User` + `ConsentRecord`/`OtpCode`/`LinkToken` etc. in one transaction. **`AuditLog` survives** and its metadata retains `ownerPhoneLast4` (adminData.ts:663) — a residual PII linkage.

### Self-service deletion / consent withdrawal
- **Customer:** has no login → **cannot** view, correct, delete, or withdraw. The owner can only *soft*-delete a customer.
- **Owner:** **no** self-service account deletion (no `/business/erase` or `/user/delete` for owners); can only edit email + newsletter consent (`PATCH /user/email-consent`). **No path to withdraw a recorded `ConsentRecord`** (grep: **NOT FOUND**).

### Retention / purge
- Only scheduled job is the 15-min **owner reminders** loop (index.ts:110-118; jobs/ownerReminders.ts), which *creates* `SentReminder` rows and never purges. **No TTL/cron purge** exists for `OtpCode`, `LinkToken` (both retain phone numbers after `consumedAt`), `SentReminder`, `DeviceToken`, `ConsentRecord`, or `UsageLog` — all accumulate until account erase.

> **COMPLIANCE GAP (ZRU-547 "destruction = recovery impossible"):** every soft-delete-only model (Customer, Order, Appointment, Project, Service, Product, Staff, Milestone, …) fails the standard — data is hidden but restorable. Irreversible erasure exists **only** as admin-only anonymize/erase, with **no subject- or owner-triggered path**, and **no expiry** for auth tokens/reminders holding PII.

---

## 6. Data protection measures in place

- **Encryption at rest (secrets):** business bot tokens use **AES-256-GCM** (12-byte random IV + auth tag) — `encryptBotToken`/`decryptBotToken` (lib/crypto.ts:2-63); `BOT_TOKEN_ENCRYPTION_KEY` must be 64 hex chars or the server refuses to boot. No other field-level encryption (**NOT FOUND**); card number / customer PII are stored plaintext in Postgres.
- **Auth:** `@fastify/jwt` with a **required** `JWT_SECRET` (plugins/jwt.ts), 30-day tokens; `validateEnv.ts:1-67` fail-fast requires `JWT_SECRET, ADMIN_JWT_SECRET, OTP_HASH_SECRET` (≥16 chars, placeholder denylist). OTP verify uses `timingSafeEqual` (authCodes.ts:61).
- **Tenant isolation:** single chokepoint `getBusinessOrFail()` (businessFromUser.ts:23-49); every spot-checked owner route scopes by `businessId` and returns 404 cross-tenant — orders.ts:51/108/125/155/212, customers.ts:76/153/193, products.ts:27/41, appointments.ts:56/140, projects.ts:64/125, staff.ts:52/102, blocked-slots.ts:26. **No ownership gap found** in the routes inspected.
- **Rate limiting:** global 100/60s (`@fastify/rate-limit`, plugins/rateLimit.ts); stricter auth caps — enroll/start 10, login/request 5 codes/10min, verify 20, plus max 5 failed verify attempts (auth.ts:67-276; authCodes.ts:22-26).
- **Input validation/sanitization:** zod `safeParse` on endpoints; free-text length caps (Customer/Appointment/Project notes ≤2000, message ≤4096, product desc ≤1000); recursive SQL/XSS detector `detectMaliciousInput()` (middleware/inputSanitizer.ts) + security headers + Helmet CSP (middleware/security.ts, plugins/helmet.ts).

> Data-protection *engineering* is strong and defense-in-depth. The compliance gaps are **legal/process** (consent, erasure, localization), not weak security controls.

---

## 7. Compliance gap summary (ZRU-547)

| Obligation | Required by law | Current state in code | Severity | Evidence |
|---|---|---|---|---|
| Lawful basis / consent at collection — **customers** | Consent (or other basis) before processing PD | No consent gate, notice, or policy link anywhere in the bot; Telegram id/username/name/phone stored on first contact | **BLOCKER** | commands.ts:83-104; checkout.ts:117-123; booking.ts:354-362 |
| Lawful basis / consent — **owners** | Consent before processing | Enrollment gates on generalConsent + crossBorderConsent; `ConsentRecord` persisted; re-checked on policy version | LOW (present) | onboarding/page.tsx:412-449; auth.ts:126-131,171-180 |
| Owner phone processed before step-4 consent | No processing before basis | Phone sent to Telegram + written to `OtpCode`/`LinkToken` at enroll/**start**, before the step-4 checkbox | MEDIUM | auth.ts (enroll/start); schema OtpCode/LinkToken |
| Destruction on request (recovery impossible) | Irreversible deletion | Tenant data SOFT-delete only + restore; irreversible only via admin-only anonymize/erase | **BLOCKER** | softDelete.ts; customers.ts:414-434; adminData.ts:480-520,530-668 |
| Consent-withdrawal path | Subject may withdraw | No endpoint to revoke `ConsentRecord`; customers have no login | **HIGH** | NOT FOUND IN CODE |
| Subject rights: access / correction | Provide & correct on request | Owner can edit *their* customers; no self-service access/correction for the end-customer subject; no owner data-export | **HIGH** | customers.ts (owner CRUD); NOT FOUND (subject/export) |
| Purpose limitation / minimization | Only necessary PD, disclosed purpose | Customer **name in FCM push bodies + Telegram text**; unbounded FREE-TEXT fields (notes/customAnswers/customFields) | MEDIUM | bot.ts:390,451,459; schema free-text fields |
| Third-party disclosure — PostHog | Disclose processors | **PostHog absent** — nothing to disclose; but FCM/Telegram/Neon/R2/Redis must be disclosed in the policy | LOW | §3(a) NOT FOUND; §3(b) |
| Cross-border storage / data localization (pd.gov.uz) | UZ residents' PD in UZ; transfer needs basis | **All** processors outside UZ (Neon/Redis US, R2 intl, Firebase US, Telegram intl); owners consent to cross-border, **customers never do** | **BLOCKER** | .env.example (DATABASE_URL/R2_*/FCM); onboarding crossBorderConsent (owners only) |
| Audit logging | Log PD access | Admin actions logged in immutable `AuditLog`; **no log of owner access/export** of customer PD | MEDIUM | audit.ts:10-20; admin.ts/adminData.ts; NOT FOUND (owner-access log) |
| Designated data-protection responsible person | Appoint + register | No such concept in code (organizational, expected) | NOT FOUND IN CODE (org action) | NOT FOUND IN CODE |
| Technical security of PD | Adequate measures | Strong: AES-256-GCM tokens, required JWT secrets, tenant isolation, rate limits, zod + sanitizer, headers | Adequate (LOW) | crypto.ts:2-63; jwt.ts; businessFromUser.ts:23-49; rateLimit.ts; inputSanitizer.ts |

**Legend:** BLOCKER = must fix before registration/launch · HIGH = required for a defensible posture · MEDIUM = important · LOW = minor/informational.

---

*Audit only. Remediation is out of scope and intentionally not proposed here. All findings are traceable to the cited `file:line`; where evidence was absent, "NOT FOUND IN CODE" is stated rather than assumed.*
