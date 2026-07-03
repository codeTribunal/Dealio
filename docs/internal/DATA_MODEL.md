# Data Model

Audience: internal
Last updated: 2026-07-03
Verified against: 64a177a

---

Source of truth: `backend/prisma/schema.prisma` (the live working-tree file, 710 lines). PostgreSQL datasource (schema.prisma:5-8), `prisma-client-js` generator (schema.prisma:1-3). Cross-checked against FUNCTIONALITY_INVENTORY.md section C.

All line citations in this document are `backend/prisma/schema.prisma:NN` unless another path is given. The colon-number shorthand (for example `:243`) refers to that same file.

WARNING, read this before trusting the relations: the 36 explicit `onDelete` rules described in section 2 exist ONLY in the uncommitted working tree. At HEAD `64a177a` the committed schema has ZERO `onDelete` rules (verified: `git show HEAD:backend/prisma/schema.prisma | grep -c onDelete` returns 0; the working tree returns 36). See section 2 for the full caveat.

---

## 1. Models

30 models. `deletedAt` soft-delete columns appear on 11 of them (listed at the end of this section).

| Model | Lines | Purpose | Notable fields |
|---|---|---|---|
| Business | 10-85 | The tenant. One business per owner. | `mode` is a scalar `Mode @default(SERVICES)` (was `Mode[]`; PRODUCTS is dormant, :18-20); `address` shared pickup/appointment location (:15-17); `calendarToken @unique` ICS capability token (:23); `workingHours Json?` keyed "0".."6" in Asia/Tashkent (:24-27); `bufferMinutes @default(0)` (:29); `cardNumber`/`cardHolderName` P2P card (:30-34); `reminderSettings Json?` (:35); `ownerTelegramChatId` (:36); `fcmToken` legacy single token (:37); subscription `plan`/`planExpiresAt`/`suspendedAt`/`suspendedReason` (:42-45); deletion lifecycle `deletionState`/`deletionRequestedAt`/`deletionScheduledAt` (:51-53); ENCRYPTED BOT-TOKEN TRIPLE `botTokenEncrypted`/`botTokenIv`/`botTokenTag` AES-256-GCM (:56-58); `@@index([deletionState, deletionScheduledAt])` (:80); GIN trigram index on `name` (:84). No `deletedAt` (business erase is a hard cascade). |
| SentReminder | 87-102 | Exactly-once dedup ledger for OWNER reminders. | `entityType`/`entityId`/`reminderKind` free-form strings; `@@unique([businessId, entityType, entityId, reminderKind])` (:99). |
| DeviceToken | 104-114 | FCM push tokens, one row per owner device. | `token`; `@@unique([businessId, token])` (:112). |
| User | 116-141 | Owner account. Phone identity plus Telegram auth binding plus email/newsletter consent. | `phone @unique` (:118); Telegram binding `telegramChatId`/`telegramVerifiedAt` (:122-123); owner email cluster `email`/`newsletterConsent @default(false)`/`newsletterConsentAt`/`emailPromptDismissedAt`/`emailPromptDismissCount` (:129-133), SEPARATE from GDPR ConsentRecord; GIN trigram index on `phone` (:140). |
| ConsentRecord | 143-155 | Owner enrollment consent audit rows (GDPR-style). | `generalConsent`, `crossBorderConsent`, `policyVersion`, `ipAddress`, `userAgent` (:147-152). |
| Customer | 157-199 | End-customer of a business, reached via the bot. | `telegramUserId`/`telegramUsername` (:161-162); `birthday` (:165); `customFields Json?` (:167); `currentStageId` CRM pipeline (:168); `languagePreference Language?` NULLABLE, no default (:170); FIRST-CONTACT CONSENT `consentedAt`/`consentVersion` (:171-176); SOFT-DELETE `deletedAt` (:177); `anonymizedAt` irreversible GDPR erasure marker (:178-181); `@@unique([businessId, telegramUserId])` (:193); 3 GIN trigram indexes on name/phone/telegramUsername (:196-198). |
| Product | 201-220 | Sellable product. | `photos String[]` are URL strings (:208); `stockQty`/`unlimited` (:209-210); `variants Json?` (:211); SOFT-DELETE `deletedAt` (:214). |
| Order | 222-260 | Customer order. | `orderNumber` per-business sequential (:228); `customAnswers Json?` (:236); `idempotencyKey` (:237); PAYMENT-PROOF FIELDS `paymentProofFileId` Telegram file_id of the screenshot, never returned raw (:239-243), `paymentProofAt` (:244), `paymentProofUrl` reserved for a FUTURE R2 archival job and NOT written today (:245-248); `timeline Json[]` (:250); SOFT-DELETE `deletedAt` (:251); `@@unique([businessId, orderNumber])` (:256) and `@@unique([businessId, idempotencyKey])` (:257). |
| OrderItem | 262-271 | Order line item. | `quantity`, `price`, `variant Json?` (:268-270). No timestamps, no soft delete. |
| Service | 273-287 | Bookable service. | `durationMinutes`, `price` (:278-279); SOFT-DELETE `deletedAt` (:281). No `updatedAt`. |
| Staff | 289-309 | Staff member. | `telegramHandle` (:294); `workingHours Json?` retained but does NOT currently drive per-staff availability (:295-300); `daysOff DateTime[]` (:301); SOFT-DELETE `deletedAt` (:302). |
| StaffService | 311-318 | Many-to-many staff to service. | Composite primary key `@@id([staffId, serviceId])` (:317). |
| BlockedSlot | 320-335 | Owner-blocked time windows. | `staffId` nullable, null means WHOLE-BUSINESS block (:324); `startTime`/`endTime`/`reason` (:329-331); `@@index([businessId, startTime])` (:334). |
| Appointment | 337-363 | Service booking. | `startTime`/`endTime`/`price` (:347-349); `paymentType ServicePaymentType @default(AT_APPOINTMENT)` (:351); `status AppointmentStatus @default(REQUESTED)` (:353); `reminderSent @default(false)` (:354); SOFT-DELETE `deletedAt` (:355); indexes on customerId/businessId/startTime (:360-362). |
| Project | 365-393 | Freelance project. | `paymentTerms` (:373); `totalPrice` (:374); `status ProjectStatus @default(PROPOSAL_SENT)` (:377); `acceptToken @unique` SINGLE-USE proposal-accept capability token, nulled on use, never exposed on public reads (:378-382); SOFT-DELETE `deletedAt` (:383); indexes on businessId/customerId (:391-392). |
| Milestone | 395-409 | Project milestone. | `dueDate`, `amount`, `status MilestoneStatus @default(PENDING)` (:400-402); SOFT-DELETE `deletedAt` (:403); `@@index([projectId])` (:408). |
| Invoice | 411-422 | Project invoice. | `invoiceNumber @unique` (:415); `lineItems Json[]` (:416); `status InvoiceStatus @default(UNPAID)` (:419). No `updatedAt`, no soft delete. |
| CustomerTag | 424-433 | Customer labels. | `label`, `color @default("#6366F1")` (:430-431). Hard delete only. |
| Reminder | 435-445 | Owner's manual follow-up note on a customer. | `note`, `dueDate`, `done @default(false)` (:441-443). No soft delete. |
| OtpCode | 450-463 | Short-lived one-time codes for owner auth via the platform bot. | `codeHash` HASH ONLY, never plaintext (:448, :455); `purpose` "ENROLL" or "LOGIN" (:456); `userId` nullable during enrollment (:452); `attempts`/`expiresAt`/`consumedAt` (:457-459); `@@index([phone, purpose])` (:462). |
| LinkToken | 468-476 | One-time deep-link token for first-time enrollment. | `token @unique` random hex in the `t.me/<bot>?start=<token>` link (:470); `phone`/`chatId` filled progressively (:471-472); `consumedAt`/`expiresAt` (:473-474). |
| BusinessCustomField | 478-490 | Custom-field definitions for customers. | `fieldType FieldType @default(TEXT)` (:483); `order @default(0)` (:484); SOFT-DELETE `deletedAt` (:485). |
| CustomerFieldValue | 492-501 | Per-customer values for the custom fields. | `value String`; `@@unique([customerId, fieldId])` (:500). |
| CustomerStage | 503-515 | CRM pipeline stages. | `color @default("#6366F1")`, `order @default(0)` (:508-509); SOFT-DELETE `deletedAt` (:510). |
| CheckoutQuestion | 517-527 | Bot checkout questions. | `required @default(false)`, `order @default(0)` (:522-523); SOFT-DELETE `deletedAt` (:524). |
| AdminUser | 529-545 | Platform admin account. | `email @unique`, `passwordHash` (:531-532); `role AdminRole @default(SUPPORT)` (:534); brute-force lockout `failedLoginCount @default(0)`/`lockedUntil` (:539-540). |
| AuditLog | 547-560 | Admin action audit trail. | `action`/`targetType`/`targetId`/`metadata Json?`/`ipAddress` (:551-555); indexes on adminUserId and (targetType, targetId) (:558-559). |
| UsageLog | 562-575 | Per-business monthly usage counters. | `month String`; `orders`/`appointments`/`customers` counters (:566-569); `@@unique([businessId, month])` (:573). |
| LegalDocument | 604-618 | In-force VERSION of each legal doc (PRIVACY, OFFER). Document TEXT lives in `web/lib/legalConfig.ts`, not here. | `docType LegalDocType @unique` (:606); `version` (:607); `publishedByAdminId` PLAIN id, no FK (:609); `contentHash` sha256 hex of the in-code text at publish (:610-616). |
| PlatformSettings | 623-632 | Global singleton (`id = "singleton"`), NOT per-business. | `cardPaymentsEnabled Boolean @default(true)`, a platform-wide visibility flag only, removes no data when off (:626-629). |

Soft-delete `deletedAt` is present on 11 models: Customer, Product, Order, Service, Staff, Appointment, Project, Milestone, BusinessCustomField, CustomerStage, CheckoutQuestion. It is absent on: OrderItem, Invoice, CustomerTag, Reminder, and all platform/auth tables (Business, User, ConsentRecord, StaffService, BlockedSlot, SentReminder, DeviceToken, OtpCode, LinkToken, CustomerFieldValue, AdminUser, AuditLog, UsageLog, LegalDocument, PlatformSettings).

---

## 2. Relations and onDelete rules

Every relation in the working-tree file carries an explicit `onDelete`. No Prisma defaults remain. 36 relations, 36 rules.

CRITICAL CAVEAT (verified against HEAD): these explicit rules are an UNCOMMITTED working-tree change. Three facts hold at HEAD `64a177a`:

1. `schema.prisma` is MODIFIED in the working tree (`git status --short` shows `M backend/prisma/schema.prisma`). The committed HEAD version has ZERO `onDelete` rules; the working tree has 36 (verified by `grep -c onDelete`).
2. Both migrations that would apply these rules are UNTRACKED, not committed: `backend/prisma/migrations/20260702111521_add_ondelete_rules/` and `backend/prisma/migrations/20260702112336_blockedslot_staff_cascade/` (both show as `??` in `git status`).
3. Because the committed schema has no database-level cascade/restrict behavior, `eraseBusinessCascade` (backend/src/services/eraseBusiness.ts) still does a MANUAL FK-safe child-to-parent hard delete ordering by hand in a single transaction (see FUNCTIONALITY_INVENTORY.md section B.15). The manual ordering is load-bearing precisely because the committed schema cannot be relied on to cascade.

Ordering hazard noted in the inventory (section C.5): a fresh clone gets the two untracked FK-rule migrations missing while the two LATER `20260703*` migrations ARE committed, so `prisma migrate dev` will report drift against any DB that applied all four. Production apply state cannot be verified locally.

| Child.field | Parent | onDelete | Line | Rationale |
|---|---|---|---|---|
| Business.owner | User | Cascade | :39 | Deleting the owner removes the business. |
| SentReminder.business | Business | Cascade | :90 | Dedup ledger dies with the tenant. |
| DeviceToken.business | Business | Cascade | :107 | Push tokens die with the tenant. |
| ConsentRecord.user | User | Restrict | :146 | Consent audit rows must be explicitly cleared first. This is why the manual erase path deletes consentRecords before the User. |
| Customer.business | Business | Cascade | :160 | Customers die with the tenant. |
| Customer.currentStage | CustomerStage | SetNull | :169 | Deleting a stage un-assigns customers rather than deleting them. |
| Product.business | Business | Cascade | :204 | Products die with the tenant. |
| Order.business | Business | Cascade | :225 | Orders die with the tenant. |
| Order.customer | Customer | Restrict | :227 | A customer with transactional records cannot be hard-deleted. The anonymize path exists precisely to erase such customers while retaining de-identified orders. |
| OrderItem.order | Order | Cascade | :265 | Line items die with their order. |
| OrderItem.product | Product | Restrict | :267 | A product referenced by order lines cannot be hard-deleted. |
| Service.business | Business | Cascade | :276 | Services die with the tenant. |
| Staff.business | Business | Cascade | :292 | Staff die with the tenant. |
| StaffService.staff | Staff | Cascade | :313 | Join rows die with the staff member. |
| StaffService.service | Service | Cascade | :315 | Join rows die with the service. |
| BlockedSlot.business | Business | Cascade | :323 | Blocks die with the tenant. |
| BlockedSlot.staff | Staff | Cascade (deliberately NOT SetNull) | :328 | Comment at :325-327: `staffId = null` means a WHOLE-BUSINESS block, so nulling on staff delete would silently WIDEN a personal block to the entire business. A staff member's blocks die with them. This rule is the sole content of the `20260702112336_blockedslot_staff_cascade` migration. |
| Appointment.business | Business | Cascade | :340 | Appointments die with the tenant. |
| Appointment.customer | Customer | Restrict | :342 | Same as Order.customer: blocks hard-delete of a customer with bookings. |
| Appointment.service | Service | Restrict | :344 | A service referenced by appointments cannot be hard-deleted. |
| Appointment.staff | Staff | SetNull | :346 | Deleting a staff member un-assigns their appointments (staffId is nullable). |
| Project.business | Business | Cascade | :368 | Projects die with the tenant. |
| Project.customer | Customer | Restrict | :370 | Same as Order.customer: blocks hard-delete of a customer with projects. |
| Milestone.project | Project | Cascade | :398 | Milestones die with their project. |
| Invoice.project | Project | Cascade | :414 | Invoices die with their project. |
| CustomerTag.customer | Customer | Cascade | :427 | Tags die with the customer. |
| CustomerTag.business | Business | Cascade | :429 | Tags die with the tenant. |
| Reminder.customer | Customer | Cascade | :438 | Reminders die with the customer. |
| Reminder.business | Business | Cascade | :440 | Reminders die with the tenant. |
| BusinessCustomField.business | Business | Cascade | :481 | Field definitions die with the tenant. |
| CustomerFieldValue.customer | Customer | Cascade | :495 | Field values die with the customer. |
| CustomerFieldValue.field | BusinessCustomField | Cascade | :497 | Field values die with their field definition. |
| CustomerStage.business | Business | Cascade | :506 | Stages die with the tenant. |
| CheckoutQuestion.business | Business | Cascade | :520 | Questions die with the tenant. |
| AuditLog.adminUser | AdminUser | Restrict | :550 | The audit trail must survive. An admin cannot be deleted while audit rows reference them. |
| UsageLog.business | Business | Cascade | :565 | Usage counters die with the tenant. |

Bulk source: the `Cascade`/`Restrict`/`SetNull` rules above (all except the BlockedSlot.staff line) come from the untracked `20260702111521_add_ondelete_rules` migration.

Restrict rules together (ConsentRecord.user, Order.customer, Appointment.customer, Appointment.service, Project.customer, OrderItem.product, AuditLog.adminUser) exist to protect two things: audit/consent records that must outlive their referent, and transactional records that must be de-identified via anonymize rather than cascade-deleted with the customer.

No foreign key at all: `OtpCode.userId` (:452) and `LegalDocument.publishedByAdminId` (:609) are plain string ids, not relation fields.

---

## 3. Enums

15 enums.

| Enum | Values | Lines |
|---|---|---|
| AdminRole | SUPER_ADMIN, SUPPORT | 577-580 |
| DeletionState | ACTIVE, PENDING_DELETION | 586-589 |
| LegalDocType | PRIVACY, OFFER | 594-597 |
| Mode | PRODUCTS, SERVICES, FREELANCE | 634-638 |
| Language | UZBEK, RUSSIAN, ENGLISH | 640-644 |
| DeliveryMethod | PICKUP, DELIVERY | 646-649 |
| PaymentStatus | PENDING, PAYMENT_RECEIVED, CONFIRMED | 651-655 |
| OrderStatus | NEW, PREPARING, READY, DELIVERED, CANCELLED | 657-663 |
| AppointmentStatus | REQUESTED, CONFIRMED, COMPLETED, CANCELLED, NO_SHOW | 665-671 |
| ServicePaymentType | AT_APPOINTMENT, IN_ADVANCE | 673-676 |
| ProjectStatus | PROPOSAL_SENT, IN_PROGRESS, REVIEW, COMPLETED, CANCELLED | 678-684 |
| MilestoneStatus | PENDING, SUBMITTED_FOR_REVIEW, APPROVED, PAYMENT_RECEIVED | 686-691 |
| InvoiceStatus | UNPAID, PAID | 693-696 |
| FieldType | TEXT, NUMBER, DATE, YESNO | 698-703 |
| Plan | FREE, PRO, BUSINESS | 705-709 |

---

## Appendix: Why CLAUDE.md's old schema is wrong

CLAUDE.md embeds an early schema that has drifted far from the live file. The divergences below are preserved from FUNCTIONALITY_INVENTORY.md section C.4 and re-verified against the working-tree schema.

### Added models (17), none present in CLAUDE.md

SentReminder, DeviceToken, ConsentRecord, BlockedSlot, CustomerTag, Reminder, OtpCode, LinkToken, BusinessCustomField, CustomerFieldValue, CustomerStage, CheckoutQuestion, AdminUser, AuditLog, UsageLog, LegalDocument, PlatformSettings.

### Removed model (1)

`Message` is NOT FOUND in the schema. The table was dropped by migration `20260701120000_backfill_admin_tables/migration.sql:105` (`DROP TABLE IF EXISTS "Message"`). The `Customer.messages` relation went with it. The messaging/inbox feature CLAUDE.md describes does not exist in the data model.

### Enum changes

- Added: AdminRole, DeletionState, LegalDocType, FieldType, Plan.
- Removed: `CardBank` (values UZCARD, HUMO), dropped by migration `20260627020000_remove_card_bank`.
- `Language` gained a third value ENGLISH (:643). CLAUDE.md's two-language claim (Uzbek, Russian) is stale.

### Per-model field changes

- Business: `mode Mode[]` became a scalar `Mode @default(SERVICES)` (:20); plaintext `botToken @unique` became the encrypted triple `botTokenEncrypted`/`botTokenIv`/`botTokenTag` (:56-58); `cardBank` removed; `photoUrl` retained; ADDED `address`, `calendarToken`, `bufferMinutes`, `cardHolderName`, `reminderSettings`, `ownerTelegramChatId`, `fcmToken`, `plan`, `planExpiresAt`, `suspendedAt`, `suspendedReason`, `deletionState`, `deletionRequestedAt`, `deletionScheduledAt`; 9 new relations; 2 new indexes.
- User: ADDED `telegramChatId`, `telegramVerifiedAt`, the email plus newsletter-consent cluster, the `consentRecords` relation, and a phone trigram index. (CLAUDE.md's phone-OTP `POST /auth/request-otp` plus fake-1234 flow does not exist; auth is Telegram-based, see FUNCTIONALITY_INVENTORY.md section B.1.)
- Customer: ADDED `birthday`, `customFields`, `currentStage`, `consentedAt`, `consentVersion`, `deletedAt`, `anonymizedAt`, plus `tags`/`reminders`/`fieldValues` relations and 3 trigram indexes; `languagePreference` is now NULLABLE with no default (:170); the `messages` relation was removed.
- Order: ADDED `customAnswers`, `idempotencyKey`, `paymentProofFileId`, `paymentProofAt`, `paymentProofUrl`, `deletedAt`, an idempotency unique constraint, and 2 indexes.
- Product, Service, Staff, Appointment, Project, Milestone: each gained `deletedAt`; Project additionally gained `paymentTerms` and `acceptToken`; Appointment, Project, and Milestone gained indexes.
- onDelete: CLAUDE.md's schema block declares none. The working tree has 36 explicit rules (section 2), every one a divergence, and all 36 are UNCOMMITTED at HEAD `64a177a` (the two migrations that carry them are untracked).
