# Deletion Machinery Audit — Dealio

**Scope:** Exact mechanics of (A) the deletion inventory, (B) a business owner deleting their own account, and (C) a customer requesting erasure of their personal data — for a ZRU-547 (Uzbekistan Law on Personal Data) compliance filing and privacy-policy accuracy.
**Type:** Read-only inspection. No code was modified. Every claim cites `file:line`.
**Source of truth:** the **code** (the `CLAUDE.md` documented Prisma schema is stale — it has no `deletedAt` columns and documents a `Message` model that **does not exist** in `backend/prisma/schema.prisma`).
**Date:** 2026-07-02.

## Headline answers
- **Owner self-service account/business deletion: does NOT exist** (backend, web, and app all searched — NOT_FOUND). Only a platform **super-admin** can hard-delete a whole business (`adminData.ts:559`).
- **Customer erasure-on-request: exists** — triggerable by the **customer** (Telegram bot `/deletedata`) and by a **super-admin**; **NOT** by the business owner (owner can only soft-delete a customer). Both real paths converge on one function `anonymizeCustomer(id)`.
- **Erasure is irreversible where it runs** (anonymize overwrites in place; business-erase hard-deletes) — but it is **incomplete**: R2 payment-proof images, Projects/Milestones/Invoices, and already-sent notifications are never touched.
- **No `onDelete` rules exist anywhere** in the schema; no scheduled purge/retention job exists.

---

## PART A — Deletion mechanism inventory

**Soft-delete (`deletedAt` flag, restorable)** via `softDelete()` / `restore()` ([softDelete.ts:70](backend/src/services/softDelete.ts#L70), [:83](backend/src/services/softDelete.ts#L83)) — `updateMany({where:{id,businessId,deletedAt}}, data:{deletedAt})`, only the `deletedAt` field changes:

| Model | deletedAt? | schema line |
|---|---|---|
| Customer | yes (+ `anonymizedAt`) | schema.prisma:139 |
| Product | yes | 178 |
| Order | yes | 199 |
| Service | yes | 250 |
| Staff | yes | 266 |
| Appointment | yes | 311 |
| Project | yes | 339 |
| Milestone | yes (`softDeleteMilestone`, **no restore**, softDelete.ts:96) | 364 |
| BusinessCustomField | yes | 447 |
| CustomerStage | yes | 472 |
| CheckoutQuestion | yes | 486 |

**No `deletedAt` — not soft-deletable at all:** Business (10), User (102), OrderItem (239), Invoice (380), CustomerTag (393), Reminder (404), CustomerFieldValue (461), DeviceToken (90), SentReminder (73), BlockedSlot (297), ConsentRecord (125), OtpCode (419), LinkToken (437), AdminUser (498), AuditLog (511), UsageLog (526), LegalDocument (559), PlatformSettings (571), StaffService (288).

**`Message` model: NOT_FOUND** — `CLAUDE.md` documents a `Message { body String }`, but the live schema has no such model (customer/owner free-text lives in `Customer.notes`, `Order.notes`/`internalNotes`, `Appointment.notes`, `Order.timeline[].note`, not a Message table).

### Erasure / anonymization functions (exact behaviour)

| Function | file:line | Row survives? | Reversible? | What it does |
|---|---|---|---|---|
| `softDelete` | softDelete.ts:70 | yes | **yes** (`restore`) | sets `deletedAt = now` only |
| `restore` | softDelete.ts:83 | yes | — | sets `deletedAt = null` |
| `softDeleteMilestone` | softDelete.ts:96 | yes | no restore exists | sets milestone `deletedAt` via parent project |
| `anonymizeCustomer(id)` | anonymizeCustomer.ts:72 | **yes (Customer kept, PII overwritten)** | **NO** | see Part C |
| `POST /admin/customers/:id/anonymize` | adminData.ts:530 | yes | no | super-admin; delegates to `anonymizeCustomer` (:539) |
| `POST /bot/customers/erase` | bot.ts:292 | yes | no | customer-initiated; delegates to `anonymizeCustomer` (:310) |
| `POST /admin/businesses/:id/erase` | adminData.ts:559 | **no (rows removed)** | **NO** | super-admin true hard-delete of the whole business + owner |

`anonymizeCustomer` hard-deletes `CustomerFieldValue` + `CustomerTag` (`deleteMany`, anonymizeCustomer.ts:75-76); everything else it touches is overwritten in place. The business-erase hard-deletes ~26 tables (Part B).

---

## PART B — Owner account deletion

**1. Self-service owner deletion path: NOT_FOUND.** Searched exhaustively:
- `business.ts` (read in full, 214-445): only `app.delete` is `DELETE /business/calendar-token` ([business.ts:403](backend/src/routes/business.ts#L403)) which nulls `calendarToken`. **No `DELETE /business`.**
- `user.ts` (1-87): only two PATCH consent routes. **No `DELETE /user`.**
- `auth.ts`: enrollment/login only. No delete/deactivate.
- Web Settings ([web/app/settings/page.tsx](web/app/settings/page.tsx)) and `web/lib/api.ts`: no delete-account/danger-zone; `api.ts` has `deleteCustomer/Order/Appointment/Staff/Service/Product` + `disableCalendarSync` but **no `deleteBusiness`/`deleteAccount`**.
- Flutter Settings ([app/lib/features/settings/settings_screen.dart](app/lib/features/settings/settings_screen.dart)) + `api_service.dart`: grep for `deleteAccount`/`deleteBusiness`/`closeAccount` → no matches.

The **only** whole-business delete is `POST /admin/businesses/:id/erase`, gated by `requireSuperAdmin` ([adminData.ts:559](backend/src/routes/adminData.ts#L559)) — **not reachable by an owner token**. Everything below describes that admin path (labelled admin-only), since no owner path exists.

**2. Cascade (admin erase only).** One all-or-nothing `prismaUnscoped.$transaction` (timeout 30 s), child→parent hard `deleteMany`/`delete` ([adminData.ts:577-607](backend/src/routes/adminData.ts#L577)): `orderItems → invoices → milestones → orders → appointments → projects → staffServices → blockedSlots → customerFieldValues → customerTags → reminders → sentReminders → deviceTokens → usageLogs → checkoutQuestions → businessCustomFields → customers → customerStages → services → staff → products → **business.delete** (:601) → consentRecords → otpCodes → linkTokens → **user.delete** (:607)`. Soft-deleted rows are included (runs unscoped, no `deletedAt` filter).
- **Encrypted bot token** (`botTokenEncrypted/Iv/Tag` on Business): removed only by the `tx.business.delete` row deletion (:601) — **not scrubbed/overwritten before delete**.
- **Running bot instance: NOT stopped.** `POST /internal/stop-bot` (bot/src/index.ts:398) is only called by `restartBusinessBot()` on bot-token change; the erase never calls it. The in-memory bot in `activeBots` keeps polling with a now-orphaned token. `FOUND — gap`.
- **Redis session: NOT cleared.** No Redis call in the erase path.
- **Cloudflare R2: NOT cleared.** `r2.ts` has **only `PutObjectCommand`** — no delete capability anywhere ([r2.ts](backend/src/lib/r2.ts) — full file, upload-only). Payment-proof images orphaned permanently.

**3. Owner PII.** In the admin erase, owner PII **is truly deleted** (User row incl. `phone`; Business row incl. `cardNumber`/`cardHolderName`). The `ERASE_BUSINESS` audit row keeps only `ownerPhone.slice(-4)` + per-table counts ([adminData.ts:618-627](backend/src/routes/adminData.ts#L618)). **But there is no owner-invokable equivalent — an owner acting alone can neither erase nor flag their own PII.**

**4. Referential integrity.** The schema declares **zero** `onDelete` rules (repo-wide grep for `onDelete` → no matches; all 36 `@relation` lines are `(fields, references)` only). Required FKs therefore default to **Restrict/NoAction** — a naive `Business.delete()` or `User.delete()` would **fail with an FK violation** while children exist. The admin erase only succeeds because it manually deletes all children first. No **required** child can be orphaned (non-null FK + Restrict). The only relations that would `SetNull` (Prisma default for optional FKs) are `Customer.currentStage → CustomerStage` (schema.prisma:151), `Appointment.staff → Staff` (:320), `BlockedSlot.staff → Staff` (:302).

**5. Reversibility.** Admin business-erase is **irreversible** (hard `deleteMany`/`delete`, no restore; header comment adminData.ts:554-555 "Irreversible"). Owner self-deletion: **N/A — does not exist.**

---

## PART C — Customer data deletion

**1. Who can trigger it, from where:**
- **The customer themselves (bot):** `/deletedata` command or the `delete_data` menu, confirmed by a `delete_confirm` tap ([bot/src/handlers/commands.ts:298-306](bot/src/handlers/commands.ts#L298)) → `eraseCustomer()` ([bot/src/lib/api.ts:110](bot/src/lib/api.ts#L110)) → `POST /bot/customers/erase` ([bot.ts:292](backend/src/routes/bot.ts#L292), gated by `verifyBotSecret`), which calls `anonymizeCustomer(customer.id)` (:310).
- **Platform super-admin:** `POST /admin/customers/:id/anonymize` ([adminData.ts:530](backend/src/routes/adminData.ts#L530), `requireSuperAdmin`) → same `anonymizeCustomer(id)` (:539). Web caller `web/lib/adminApi.ts` `anonymizeCustomer`.
- **The business owner: CANNOT.** Owner `DELETE /customers/:id` is a recoverable **soft-delete** only (`softDelete('customer',…)`, [customers.ts:414](backend/src/routes/customers.ts#L414)) with `POST /customers/:id/restore` (:426). `customers.ts` imports only `{ softDelete, restore }` and never calls `anonymizeCustomer`. **NOT_FOUND** for owner-driven erasure.

**2. What `anonymizeCustomer(id)` does** (one `prismaUnscoped.$transaction`, [anonymizeCustomer.ts:72-133](backend/src/services/anonymizeCustomer.ts#L72)):
- **Customer row — KEPT, PII overwritten** (`update`, not delete, :114-131): `name → 'Deleted customer'`, `phone → null`, `telegramUserId → null`, `telegramUsername → null`, `notes → null` (owner free-text), `birthday → null`, `customFields → DbNull`, `consentedAt/consentVersion → null`, `anonymizedAt → now`. `deletedAt` is **not** set. **NOT scrubbed:** `currentStageId`, `languagePreference`, `lastInteractionAt`, `createdAt`, `businessId`.
- **Orders — rows KEPT, PII fields nulled** (`updateMany`, :81-89): `deliveryAddress`, `customAnswers`, `notes`, `internalNotes → null`; `timeline` stripped per-entry to `{status, at, by}` (drops free-text `note`, :101-111). Retained: `orderNumber`, `total`, dates, statuses. **NOT scrubbed: `Order.paymentProof*` fields — the payment-screenshot reference (and the R2 image itself) survives.**
- **OrderItems — untouched** (no customer PII; schema.prisma:239).
- **Appointments — rows KEPT, only `notes` nulled** (:92-95). Times/price/status retained.
- **Projects / Milestones / Invoices — NOT touched.** They survive **still linked to the anonymized `customerId`**; `Project.description`/`name`/`paymentTerms` (potential free-text) and `Invoice.lineItems` (Json) are left intact. `FOUND — gap`.
- **CustomerFieldValue + CustomerTag — HARD-deleted** (`deleteMany`, :75-76).
- **Messages — N/A** (no Message model).
- **`telegramUserId`/`telegramUsername` — nulled** (:118) — also the idempotency mechanism (the `(businessId, telegramUserId)` lookup stops matching).

**3. Referential integrity.** The Customer row is **kept** (anonymize, not deleted), so no FK breaks. If it *were* hard-deleted, the required `Order.customer`/`Appointment.customer`/`Project.customer` FKs (Restrict, Part B4) would **block** it.

**4. Redis / notifications on erasure.**
- **Redis: NOT cleared.** `anonymizeCustomer`/the bot erase route make no Redis call. A customer's bot session (`customerId`, `lang`, and any in-flight `checkout` name/phone) is cleared only by flow completion or the **24 h Redis TTL** (bot `RedisAdapter ttl:86400`, per `REDIS_SESSION_AUDIT.md` in this folder) — so residual session PII can linger up to 24 h after erasure.
- **Notifications: already sent, not recalled.** FCM push bodies and `data.customerName`, plus Telegram owner-notification text, embed the customer's name — e.g. [bot.ts:469](backend/src/routes/bot.ts#L469), [:527-542](backend/src/routes/bot.ts#L527) (`"${order.customer.name} says they paid…"`, `customerName`), [:788-852](backend/src/routes/bot.ts#L788) (appointment booked/cancelled), [:1070-1152](backend/src/routes/bot.ts#L1070) (milestone/proposal), [:1202](backend/src/routes/bot.ts#L1202) (`"💬 ${customer.name}: ${text}"` — name **and** the free-text message). These are transmitted to Google FCM and Telegram before erasure and are not recallable.

**5. Reversibility.** **IRREVERSIBLE** for the scrubbed fields — PII is overwritten/nulled in place, originals not copied anywhere, no restore endpoint for anonymize (`softDelete.ts restore()` only reverses `deletedAt`, which anonymize does not use). Bot route is idempotent (already-anonymized → `{erased:true, idempotent:true}` without re-scrub, bot.ts:308). **Caveat:** the *un-scrubbed* data (Projects, `paymentProof*`, R2 images, sent notifications) remains fully recoverable/readable — those PII were never destroyed.

---

## PART D — Where deleted data lingers regardless of case

| Vector | Persists? | Evidence |
|---|---|---|
| **Cloudflare R2** (payment-proof images) | **Yes, forever** — no delete capability exists | [r2.ts](backend/src/lib/r2.ts) is upload-only (`PutObjectCommand`); no `DeleteObjectCommand`, no delete function; no path removes objects on customer/business deletion |
| **Redis session** (customerId, lang, in-flight checkout name/phone) | Until 24 h TTL | erase paths make no Redis call; only the bot `RedisAdapter ttl:86400` expires it (`REDIS_SESSION_AUDIT.md`) |
| **FCM / Telegram notification payloads** | Yes (already transmitted) | customer name in push body + `data.customerName` + Telegram text, bot.ts:469/527-542/788-852/1070-1152/1202 |
| **Logs (stdout)** | Yes (in log storage) | bot logs incoming update text `text "${ctx.message.text.slice(0,48)}"` — customer-typed content incl. possible name/phone during a flow ([bot/src/index.ts:105-113](bot/src/index.ts#L105)) |
| **AuditLog** | Yes (immutable, deliberately kept through erase) | but **PII-light**: admin actions store plan/reason/role/setting only ([admin.ts:310-545](backend/src/routes/admin.ts#L310)); `ERASE_BUSINESS` stores `ownerPhone.slice(-4)` + counts; `ANONYMIZE_CUSTOMER` stores `businessId` + scrubbed-field **names**. No raw names / full phone are logged. |
| **Postgres soft-deleted rows** (`deletedAt` set) | Yes, indefinitely | no purge job (Part E) — a soft-deleted Customer/Order/etc. keeps all its PII in the row forever |

---

## PART E — Retention exceptions

**NOT_FOUND — no automatic retention or scheduled purge logic exists.** The only `setInterval` in the backend is the owner-reminder job (`runOwnerReminders`, every 15 min, [backend/src/index.ts:116](backend/src/index.ts#L116)) — it sends reminders, it does **not** purge. No `cron`/`node-cron`/`purge`/`retention`/`cleanup` job hard-deletes old soft-deleted rows anywhere. The only TTL in the whole system is the bot's 24 h Redis session TTL. There is **no documented accounting/legal retention exception**: the customer-anonymize *keeps* Order rows (scrubbed) — a de-facto "retain for accounting" behaviour — but it is not labelled, configurable, or time-bounded retention logic, and it leaves Projects/paymentProof un-scrubbed.

---

## PART F — ZRU-547 gap summary

| # | Obligation | Required by law | Current state | Severity | file:line |
|---|---|---|---|---|---|
| 1 | Owner can erase own account + PII | Data subject can request destruction of their data | **No owner-invokable deletion of any kind exists**; only a platform super-admin can erase a business | **BLOCKER** | business.ts:214-445, user.ts, adminData.ts:559 |
| 2 | Customer erasure on request | Data subject (and on request) can obtain destruction | Exists for the **customer** (bot `/deletedata`) and **super-admin**; **not** owner-driven | **LOW** (path exists) / MEDIUM (owner can't act for a customer who asks in person) | bot.ts:292, adminData.ts:530, customers.ts:414 |
| 3 | Erasure is irreversible (not soft-delete) | "Destruction" must make recovery impossible | Owner-facing customer delete is a **restorable soft-delete**; true anonymize/hard-delete is admin/customer-only; the default owner "delete" is reversible | **HIGH** | customers.ts:414/426, softDelete.ts:70/83 |
| 4 | No un-erased data after a deletion request | Destruction must be complete | Customer anonymize **leaves** Projects/Milestones/Invoices, `Order.paymentProof*`, and R2 images intact and still linked | **HIGH** | anonymizeCustomer.ts:72-133; r2.ts |
| 5 | PII cleared from R2 on deletion | Destruction across all stores | **R2 has no delete path** — payment-proof images persist forever after any erase | **HIGH** | r2.ts (upload-only) |
| 6 | PII cleared from Redis / notifications | Destruction across all stores | Redis session not cleared on erase (expires ≤24 h via TTL); sent FCM/Telegram payloads embed names and are not recallable | **MEDIUM** | bot/src/index.ts:47 (TTL), bot.ts:469-1202 |
| 7 | Bot token / running bot torn down on business erase | Credentials destroyed on account deletion | Encrypted token deleted with the row, but the **running bot is never stopped** (keeps polling) and there is no owner path to trigger any of it | **MEDIUM** | adminData.ts:559-607; bot/src/index.ts:398 |
| 8 | FK integrity on deletion | No dangling/orphaned data | No `onDelete` rules → naive deletes are **blocked** (Restrict); admin erase hand-orders children→parent; anonymize keeps the Customer row so no break | **LOW** (integrity holds; brittleness noted) | schema.prisma (no `onDelete` anywhere) |
| 9 | Retention exceptions documented | Lawful basis + period for any retained data | **No retention/purge logic and no documented retention policy**; soft-deleted rows kept indefinitely | **MEDIUM** | (NOT_FOUND — Part E) |

_No remediation is proposed here (inspection only, per the task). No secret values are printed._
