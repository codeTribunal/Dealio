# Backend
Audience: internal
Last updated: 2026-07-03
Verified against: 64a177a

---

The backend is a Node.js + Fastify + TypeScript API. Entry point `backend/src/index.ts` boots via `bootstrap()` and listens on `0.0.0.0:PORT` (default 3000, index.ts:114-115). All route modules register under `{ prefix: '/api/v1' }` (index.ts:83-106); the only root-scope routes are the ICS calendar feed `GET /calendar/:token.ics` (index.ts:110) and `GET /health` (index.ts:112).

## Legend

Auth levels used in the tables below:

| Token | Meaning |
|---|---|
| owner JWT | `authenticate` preHandler, `request.jwtVerify()` (middleware/auth.ts:3-9) |
| bot secret | timing-safe `x-bot-secret` header (bot.ts:17-26; internal.ts:9-18) |
| admin | `requireAdmin` (middleware/adminAuth.ts:26-58) |
| superadmin | `requireSuperAdmin` (middleware/adminAuth.ts:60-65) |
| capability | an unguessable token in the URL or body is the entire authorization |
| public | no auth (usually with a per-route rate override) |

Suspension column:

- `Yes (GBOF@N)` = enforced by the `getBusinessOrFail` call at line N, which 403s `ACCOUNT_SUSPENDED` for a suspended business (businessFromUser.ts:40-46; impersonation-exempt).
- For bot routes, `Yes (:N)` = an inline `business.suspendedAt` check that returns 403 at line N.
- `No` = deliberately reachable while suspended (see Suspension behavior below).

Plan-limit column: `Yes` = a `checkLimits.ts` preHandler is attached (HTTP 402 `PLAN_LIMIT_REACHED`). Only three owner routes carry one; everything else is `No`. See the Plan limits section.

---

## 1. Route inventory (by route file)

### auth.ts (public, Telegram-based owner auth)

CLAUDE.md's `/auth/request-otp` and fake code 1234 do NOT exist; auth is Telegram enrollment plus a login-code flow.

| METHOD | Path | Auth | Purpose | Plan limit | Suspension |
|---|---|---|---|---|---|
| POST | /api/v1/auth/enroll/start | public (rate 10/10min, auth.ts:79-85) | Mint enrollment link token + platform-bot deep link (auth.ts:76-93) | No | No |
| GET | /api/v1/auth/enroll/status | public (auth.ts:100) | Poll enrollment link state | No | No |
| POST | /api/v1/auth/enroll/verify | public (rate 20/10min, auth.ts:127-129) | Verify ENROLL code + mandatory consents, upsert user, issue 30d JWT (auth.ts:124-205) | No | No |
| POST | /api/v1/auth/login/request | public (rate 5/10min keyed by phone, auth.ts:217-226) | Send LOGIN code to bound Telegram chat; anti-enumeration generic 200 (auth.ts:214-277) | No | No (deliberate, auth.ts:25) |
| POST | /api/v1/auth/login/verify | public (rate 20/10min, auth.ts:287-289) | Verify LOGIN code, re-gate consent vs live PRIVACY version, issue JWT (auth.ts:284-342) | No | No |

### business.ts

| METHOD | Path | Auth | Purpose | Plan limit | Suspension |
|---|---|---|---|---|---|
| GET | /api/v1/business | owner JWT (business.ts:231) | Owner's business, SAFE select + cardPaymentsEnabled flag | No | No, readable while suspended (comment :43-44) |
| POST | /api/v1/business/request-deletion | owner JWT (:249) | Self-serve deletion: 30-day purge window + immediate suspension (:243-304) | No | Partial, admin suspension blocks self-delete (:264-269) |
| POST | /api/v1/business/reactivate | owner JWT (:310) | Cancel pending deletion, unsuspend, restart bot (:306-341) | No | No, deliberately reachable while suspended (:307-309) |
| GET | /api/v1/platform-settings | owner JWT (:346) | Read global cardPaymentsEnabled | No | No |
| POST | /api/v1/business | owner JWT (:351) | Create business (onboarding path), 409 if exists | No | No |
| PATCH | /api/v1/business | owner JWT (:378) | Update profile/mode/language/workingHours | No | Yes (GBOF@379) |
| PATCH | /api/v1/business/payment | owner JWT (:407) | Set/clear P2P card number + holder | No | Yes (GBOF@408) |
| PATCH | /api/v1/business/bot-token | owner JWT (:437) | Replace bot token: getMe verify, uniqueness, hot-swap (:434-470) | No | Yes (GBOF@438) |
| PATCH | /api/v1/business/fcm-token | owner JWT (:472) | Legacy single FCM token (vestigial) | No | Yes (GBOF@473) |
| GET | /api/v1/business/bot | owner JWT (:486) | Bot username + t.me link | No | Yes (GBOF@487) |
| POST | /api/v1/business/calendar-token | owner JWT (:506) | Generate/regenerate ICS token | No | Yes (GBOF@507) |
| DELETE | /api/v1/business/calendar-token | owner JWT (:523) | Disable calendar sync | No | Yes (GBOF@524) |
| GET | /api/v1/business/reminder-settings | owner JWT (:537) | Reminder settings merged with defaults | No | Yes (GBOF@538) |
| PATCH | /api/v1/business/reminder-settings | owner JWT (:546) | Partial update of reminder settings | No | Yes (GBOF@547) |

### user.ts

| METHOD | Path | Auth | Purpose | Plan limit | Suspension |
|---|---|---|---|---|---|
| PATCH | /api/v1/user/email-consent | owner JWT (user.ts:52) | Owner email + newsletter consent | No | No, account-level, deliberate (user.ts:8-10) |
| PATCH | /api/v1/user/dismiss-email-prompt | owner JWT (user.ts:75) | Stamp email-prompt dismissal + count | No | No |

### products.ts

| METHOD | Path | Auth | Purpose | Plan limit | Suspension |
|---|---|---|---|---|---|
| GET | /api/v1/products | owner JWT (products.ts:22) | List products (not deleted) | No | Yes (GBOF@23) |
| POST | /api/v1/products | owner JWT (:33) | Create product (photos = URL strings) | No | Yes (GBOF@34) |
| GET | /api/v1/products/:id | owner JWT (:46) | Product detail | No | Yes (GBOF@47) |
| PATCH | /api/v1/products/:id | owner JWT (:58) | Update product | No | Yes (GBOF@59) |
| DELETE | /api/v1/products/:id | owner JWT (:75) | Soft-delete (deletedAt, :85) | No | Yes (GBOF@76) |
| PATCH | /api/v1/products/:id/toggle | owner JWT (:89) | Toggle active/paused | No | Yes (GBOF@90) |

### orders.ts

| METHOD | Path | Auth | Purpose | Plan limit | Suspension |
|---|---|---|---|---|---|
| GET | /api/v1/orders | owner JWT (orders.ts:44) | List orders with filters, includeDeleted, hasPaymentProof boolean | No | Yes (GBOF@45) |
| POST | /api/v1/orders | owner JWT + checkOrderLimit() (:98) | Manual order create, allocates order number | Yes (checkLimits.ts:37-55) | Yes (GBOF@99) |
| GET | /api/v1/orders/:id | owner JWT (:149) | Order detail (payment-proof file_id stripped, :160-161) | No | Yes (GBOF@150) |
| GET | /api/v1/orders/:id/payment-proof | owner JWT (:170) | Stream payment screenshot via the business's own bot token getFile proxy (:164-204) | No | Yes (GBOF@171) |
| PATCH | /api/v1/orders/:id/status | owner JWT (:206) | Update status + timeline push. No customer notification | No | Yes (GBOF@207) |
| PATCH | /api/v1/orders/:id/payment | owner JWT (:237) | Confirm payment (409 if already CONFIRMED, :247-249). No customer notification | No | Yes (GBOF@238) |
| DELETE | /api/v1/orders/:id | owner JWT (:269) | Soft-delete | No | Yes (GBOF@270) |
| POST | /api/v1/orders/:id/restore | owner JWT (:280) | Restore | No | Yes (GBOF@281) |

### customers.ts

| METHOD | Path | Auth | Purpose | Plan limit | Suspension |
|---|---|---|---|---|---|
| GET | /api/v1/customers | owner JWT (customers.ts:55) | Paginated list + spend aggregates | No | Yes (GBOF@56) |
| POST | /api/v1/customers | owner JWT + checkCustomerLimit() (:135) | Manual create (phone normalized) | Yes (checkLimits.ts:17-35) | Yes (GBOF@136) |
| GET | /api/v1/customers/:id | owner JWT (:185) | Full detail: orders/appointments/projects/fields/tags/reminders (15s timeout :215-217) | No | Yes (GBOF@186) |
| PATCH | /api/v1/customers/:id | owner JWT (:250) | Update profile fields | No | Yes (GBOF@251) |
| PATCH | /api/v1/customers/:id/notes | owner JWT (:280) | Legacy notes-only update | No | Yes (GBOF@281) |
| POST | /api/v1/customers/:id/tags | owner JWT (:302) | Add tag | No | Yes (GBOF@303) |
| DELETE | /api/v1/customers/:id/tags/:tagId | owner JWT (:327) | Remove tag (hard delete :337) | No | Yes (GBOF@328) |
| POST | /api/v1/customers/:id/reminders | owner JWT (:342) | Add follow-up reminder | No | Yes (GBOF@343) |
| POST | /api/v1/customers/:id/message | owner JWT (:367) | Send Telegram message to customer via business bot (:388-399) | No | Yes (GBOF@368) |
| DELETE | /api/v1/customers/:id | owner JWT (:414) | Soft-delete customer | No | Yes (GBOF@415) |
| POST | /api/v1/customers/:id/restore | owner JWT (:426) | Restore | No | Yes (GBOF@427) |

### bot.ts (all bot secret, bot.ts:17-26)

Per-route rate override 600/min keyed `bot:<botUsername>:<telegramUserId>` (onRoute hook, bot.ts:121-140). Suspension enforced inline via `suspendedAt` 403s.

| METHOD | Path | Purpose | Plan limit | Suspension |
|---|---|---|---|---|
| GET | /api/v1/bot/checkout-questions/:botUsername | Checkout questions for a business (:143-163) | No | Yes (:150-155) |
| GET | /api/v1/bot/catalog/:botUsername | Products + card/payment info (:166-215) | No | Yes (:173-178) |
| POST | /api/v1/bot/customers | Upsert customer by Telegram id; records consent; reactivates soft-deleted (:252-281) | Inline cap on NEW customers only (:236-250) | Yes (:229-234) |
| POST | /api/v1/bot/customers/erase | Customer-initiated erasure, idempotent, shared `anonymizeCustomer` (:285-312) | No | No, deliberate (:290-291) |
| POST | /api/v1/bot/orders | Create order: idempotency key, DB-priced lines, guarded stock decrement + retries (:314-483) | No (NOT FOUND) | Yes (:326-331) |
| POST | /api/v1/bot/payment-received | "I paid": store proof file_id, set PAYMENT_RECEIVED, push owner (:485-545) | No | Yes (:497-502) |
| POST | /api/v1/bot/set-owner-chat | Bind owner Telegram chat id (:547-572) | No | Yes (:560-565) |
| GET | /api/v1/bot/customer-orders/:botUsername/:telegramUserId | Customer's last 10 orders (:574-611) | No | Yes (:583-588) |
| GET | /api/v1/bot/services/:botUsername | Active services + staff for booking (:613-649) | No | Yes (:621-626) |
| GET | /api/v1/bot/availability/:botUsername | Available slots (:651-688) | No | Yes (:665-670) |
| POST | /api/v1/bot/appointments | Create appointment; STRICT `isSlotBookable` re-check (:754-761) | No (NOT FOUND) | Yes (:723-728) |
| POST | /api/v1/bot/cancel-appointment | Customer cancels; push owner (:805-856). No requester-identity check | No | Yes (:820-825) |
| GET | /api/v1/bot/customer-appointments/:botUsername/:telegramUserId | Upcoming appointments (:858-901) | No | Yes (:867-872) |
| GET | /api/v1/bot/due-reminders | Appointments needing customer reminder in [from,to] (:903-947) | No | Yes (:915-920) |
| POST | /api/v1/bot/mark-reminder-sent | Flag reminderSent (:949-975) | No | Yes (:962-967) |
| GET | /api/v1/bot/projects/:botUsername/:telegramUserId | Customer's projects + milestones + invoices (:977-1021) | No | Yes (:986-991) |
| POST | /api/v1/bot/milestone-review | Approve/reject milestone; notifies owner (:1023-1098). No requester-identity check | No | Yes (:1039-1044) |
| POST | /api/v1/bot/accept-proposal | Accept proposal, bound to customer.telegramUserId (:1102-1160). No bot-side caller found | No | Yes (:1116-1121) |
| POST | /api/v1/bot/message | Forward customer free-text to owner's Telegram (:1164-1207) | No | Yes (:1181-1186) |
| POST | /api/v1/bot/confirm-payment | Owner "Mark as paid" from Telegram inline button (:1209-1255) | No | Yes (:1221-1226) |
| GET | /api/v1/bot/customer/:botUsername/:telegramUserId | Language/consent lookup + current PRIVACY version (:1257-1290) | No | No, no suspendedAt check (rationale undocumented, UNVERIFIED intentional) |
| POST | /api/v1/bot/set-language | Persist customer language; minimal upsert (:1292-1334) | No | Yes (:1313-1318) |

Note: `POST /bot/orders` and `POST /bot/appointments` have no monthly-quota checks (NOT FOUND in bot.ts:315-483 and :691-803). The only bot-side plan gate is the inline new-customer cap in `POST /bot/customers`.

### analytics.ts

| METHOD | Path | Auth | Purpose | Plan limit | Suspension |
|---|---|---|---|---|---|
| GET | /api/v1/analytics | owner JWT (analytics.ts:7) | Revenue this/last month, completions, pending payments, top customers, 6-mo trend (orders + appointments merged); never mode-gated | No | Yes (GBOF@8) |

### reminders.ts

| METHOD | Path | Auth | Purpose | Plan limit | Suspension |
|---|---|---|---|---|---|
| GET | /api/v1/reminders | owner JWT (:14) | Follow-up reminders list | No | Yes (GBOF) |
| PATCH | /api/v1/reminders/:id | owner JWT (:35) | Mark reminder done | No | Yes (GBOF) |

### home.ts

| METHOD | Path | Auth | Purpose | Plan limit | Suspension |
|---|---|---|---|---|---|
| GET | /api/v1/home | owner JWT (:14) | Dashboard: overdue reminders, dormant customers, today's orders/appointments, pending payments, new customers, projects, milestones | No | Yes (GBOF) |

### custom-fields.ts

| METHOD | Path | Auth | Purpose | Plan limit | Suspension |
|---|---|---|---|---|---|
| GET | /api/v1/custom-fields | owner JWT (:20) | List field definitions | No | Yes (GBOF) |
| POST | /api/v1/custom-fields | owner JWT (:32) | Create field definition | No (customFields limit not enforced here) | Yes (GBOF) |
| DELETE | /api/v1/custom-fields/:fieldId | owner JWT (:51) | Delete field definition | No | Yes (GBOF) |
| PATCH | /api/v1/customers/:customerId/fields | owner JWT (:69, ownership verified :83-91) | Set per-customer field values | No | Yes (GBOF) |

### stages.ts

| METHOD | Path | Auth | Purpose | Plan limit | Suspension |
|---|---|---|---|---|---|
| GET | /api/v1/stages | owner JWT (:26) | List pipeline stages | No | Yes (GBOF) |
| POST | /api/v1/stages | owner JWT (:38) | Create stage | No (pipelineStages limit not enforced here) | Yes (GBOF) |
| PATCH | /api/v1/stages/:stageId | owner JWT (:57) | Update stage | No | Yes (GBOF) |
| DELETE | /api/v1/stages/:stageId | owner JWT (:78, tx clears stage from customers :89-98) | Delete stage | No | Yes (GBOF) |
| PATCH | /api/v1/customers/:customerId/stage | owner JWT (:103, ownership verified :117-122) | Move customer to a stage | No | Yes (GBOF) |

### checkout-questions.ts

| METHOD | Path | Auth | Purpose | Plan limit | Suspension |
|---|---|---|---|---|---|
| GET | /api/v1/checkout-questions | owner JWT (:22) | List checkout questions | No | Yes (GBOF) |
| POST | /api/v1/checkout-questions | owner JWT (:34) | Create checkout question | No (checkoutQuestions limit not enforced here) | Yes (GBOF) |
| PATCH | /api/v1/checkout-questions/:questionId | owner JWT (:53) | Update checkout question | No | Yes (GBOF) |
| DELETE | /api/v1/checkout-questions/:questionId | owner JWT (:74) | Delete checkout question | No | Yes (GBOF) |

### services.ts

| METHOD | Path | Auth | Purpose | Plan limit | Suspension |
|---|---|---|---|---|---|
| GET | /api/v1/services | owner JWT (:33) | List services | No | Yes (GBOF) |
| POST | /api/v1/services | owner JWT (:45) | Create service (staff-link ownership verified :54-61) | No | Yes (GBOF) |
| PATCH | /api/v1/services/:id | owner JWT (:80, staff links replaced :95-111) | Update service | No | Yes (GBOF) |
| PATCH | /api/v1/services/:id/toggle | owner JWT (:121) | Toggle active/paused | No | Yes (GBOF) |
| DELETE | /api/v1/services/:id | owner JWT (:141, soft) | Soft-delete service | No | Yes (GBOF) |

### staff.ts

| METHOD | Path | Auth | Purpose | Plan limit | Suspension |
|---|---|---|---|---|---|
| GET | /api/v1/staff | owner JWT (:47) | List staff | No | Yes (GBOF) |
| POST | /api/v1/staff | owner JWT (:59, service-link ownership verified :68-75) | Add staff | No (staff limit not enforced here) | Yes (GBOF) |
| PATCH | /api/v1/staff/:id | owner JWT (:96) | Update staff | No | Yes (GBOF) |
| DELETE | /api/v1/staff/:id | owner JWT (:140, soft :150) | Soft-delete staff | No | Yes (GBOF) |

### appointments.ts

| METHOD | Path | Auth | Purpose | Plan limit | Suspension |
|---|---|---|---|---|---|
| GET | /api/v1/appointments | owner JWT (:49) | List appointments | No | Yes (GBOF) |
| POST | /api/v1/appointments | owner JWT + checkAppointmentLimit() (:84) | Owner free-hand booking; only CONFLICT blocks, overridable (:112-115) | Yes (checkLimits.ts:57-75) | Yes (GBOF) |
| GET | /api/v1/appointments/:id | owner JWT (:134) | Appointment detail | No | Yes (GBOF) |
| PATCH | /api/v1/appointments/:id | owner JWT (:152, conflict re-check :191-204) | Update appointment | No | Yes (GBOF) |
| PATCH | /api/v1/appointments/:id/status | owner JWT (:229) | Update status. No customer notify | No | Yes (GBOF) |
| PATCH | /api/v1/appointments/:id/payment | owner JWT (:250, 409 if already :259) | Confirm payment | No | Yes (GBOF) |
| PATCH | /api/v1/appointments/:id/notes | owner JWT (:269) | Update notes | No | Yes (GBOF) |
| GET | /api/v1/availability | owner JWT (:291) | Available slots | No | Yes (GBOF) |
| DELETE | /api/v1/appointments/:id | owner JWT (:324, soft) | Soft-delete | No | Yes (GBOF) |
| POST | /api/v1/appointments/:id/restore | owner JWT (:335) | Restore | No | Yes (GBOF) |

### blocked-slots.ts

| METHOD | Path | Auth | Purpose | Plan limit | Suspension |
|---|---|---|---|---|---|
| GET | /api/v1/blocked-slots | owner JWT (:21) | List blocked windows | No | Yes (GBOF) |
| POST | /api/v1/blocked-slots | owner JWT (:47, staff tenancy checked :57-62) | Create blocked window | No | Yes (GBOF) |
| DELETE | /api/v1/blocked-slots/:id | owner JWT (:78, hard delete :88) | Hard-delete blocked window | No | Yes (GBOF) |

### projects.ts

| METHOD | Path | Auth | Purpose | Plan limit | Suspension |
|---|---|---|---|---|---|
| GET | /api/v1/projects | owner JWT (:57) | List projects | No | Yes (GBOF) |
| POST | /api/v1/projects | owner JWT (:88, customer tenancy verified :95-98) | Create project | No | Yes (GBOF) |
| POST | /api/v1/projects/:id/proposal-link | owner JWT (:122) | Issue single-use proposal accept token | No | Yes (GBOF) |
| GET | /api/v1/projects/:id | owner JWT (:147) | Project with milestones + invoices | No | Yes (GBOF) |
| PATCH | /api/v1/projects/:id | owner JWT (:172) | Update project | No | Yes (GBOF) |
| DELETE | /api/v1/projects/:id | owner JWT (:205, soft) | Soft-delete project | No | Yes (GBOF) |
| POST | /api/v1/projects/:id/milestones | owner JWT (:223) | Add milestone | No | Yes (GBOF) |
| PATCH | /api/v1/projects/:id/milestones/:milestoneId | owner JWT (:250, Telegram notify to customer on SUBMITTED_FOR_REVIEW :285-303) | Update milestone status | No | Yes (GBOF) |
| DELETE | /api/v1/projects/:id/milestones/:milestoneId | owner JWT (:310, soft) | Soft-delete milestone | No | Yes (GBOF) |
| POST | /api/v1/projects/:id/invoices | owner JWT (:344, sequential number :359-360) | Generate invoice. No customer notify | No | Yes (GBOF) |
| PATCH | /api/v1/projects/:id/invoices/:invoiceId/paid | owner JWT (:382) | Mark invoice paid | No | Yes (GBOF) |

### device-token.ts

| METHOD | Path | Auth | Purpose | Plan limit | Suspension |
|---|---|---|---|---|---|
| POST | /api/v1/device-token | owner JWT (:9) | Upsert FCM device token | No | Yes (GBOF) |

### onboarding.ts

No `getBusinessOrFail` here because the business does not exist yet.

| METHOD | Path | Auth | Purpose | Plan limit | Suspension |
|---|---|---|---|---|---|
| POST | /api/v1/onboarding/verify-bot-token | public (:53) | Validate a candidate bot token before completing onboarding | No | No (no business) |
| POST | /api/v1/onboarding/complete | owner JWT (:85) | Create business with encrypted bot token, plan FREE, fire-and-forget bot start (:83-151) | No | No (no business) |

### proposals.ts (public capability endpoints)

| METHOD | Path | Auth | Purpose | Plan limit | Suspension |
|---|---|---|---|---|---|
| GET | /api/v1/proposals/:projectId | public (capability = unguessable projectId; rate 60/hr, proposals.ts:9,13) | Render-minimal proposal JSON (:13-50). No suspension check | No | No |
| POST | /api/v1/proposals/:projectId/accept | public + single-use token (`t` must match `acceptToken`; uniform 404; rate 10/hr; :61-81) | Atomic status flip + token null (:72-80) | No | No |
| GET | /api/v1/invoices/:invoiceId | public (capability = invoiceId; rate 60/hr, :96) | Render-minimal invoice JSON (:99-111) | No | No |

### internal.ts (bot-manager secret, internal.ts:9-18)

| METHOD | Path | Purpose | Plan limit | Suspension |
|---|---|---|---|---|
| POST | /api/v1/internal/get-bot-token | Decrypt + return a business's bot token to the bot manager (:50-80). Returns suspended businesses too, so suspended bots keep running to show the notice (:66, :130-132) | No | No (deliberate) |
| POST | /api/v1/internal/start-bot | Proxy hot-start to bot service; soft-succeeds if unreachable (:87-125) | No | No |
| GET | /api/v1/internal/businesses | All bot-configured businesses, including suspended (:127-150) | No | No (deliberate) |
| POST | /api/v1/internal/platform/start | Bind Telegram chatId to enrollment link token (:158-167) | No | No |
| POST | /api/v1/internal/platform/contact | Bind phone + issue ENROLL code; foreign-contact rejection (:176-192, check :186-188) | No | No |

### admin.ts (admin/superadmin, all mutations also covered by the global CSRF guard)

| METHOD | Path | Auth | Purpose |
|---|---|---|---|
| POST | /api/v1/admin/auth/login | public (rate 10/hr :231-233) | Login; account lockout (:20-22, :258-274); sets `admin_session` cookie (:291-297) |
| POST | /api/v1/admin/auth/logout | admin (:308) | Clear session |
| GET | /api/v1/admin/auth/me | admin (:321) | Current admin identity |
| GET | /api/v1/admin/dashboard | admin (:329) | KPIs, activation funnel, attention lists (incl. pending-deletion queue), momentum, upgrade candidates |
| GET | /api/v1/admin/businesses | admin (:575) | List businesses |
| GET | /api/v1/admin/businesses/:id | admin (:613) | Business detail |
| PATCH | /api/v1/admin/businesses/:id/plan | superadmin (:668, audited :691-698) | Change plan |
| POST | /api/v1/admin/businesses/:id/suspend | superadmin (:705) | Suspend business |
| POST | /api/v1/admin/businesses/:id/unsuspend | superadmin (:737, reason min 10 required :88-92) | Unsuspend business |
| POST | /api/v1/admin/businesses/:id/impersonate | superadmin (:769) | Mint 15-min JWT `isImpersonation: true` (:787-793); refused for suspended (:784); reason 10 to 500 chars required (:94-96) |
| GET | /api/v1/admin/platform-settings | admin (:816) | Read platform settings |
| PATCH | /api/v1/admin/platform-settings | superadmin (:823) | Update platform settings |
| GET | /api/v1/admin/audit | admin (:845) | Audit log |
| GET | /api/v1/admin/users | superadmin (:872) | List admin users |
| POST | /api/v1/admin/users | superadmin (:881, bcrypt 12) | Create admin user |
| PATCH | /api/v1/admin/users/:id | superadmin (:910, self-change blocked :913-915) | Update admin user |
| GET | /api/v1/admin/legal-docs | superadmin (:948) | List legal docs |
| POST | /api/v1/admin/legal-docs/:docType/publish | superadmin (:983) | Bump in-force version, force re-consent, sha256 content hash (:1000-1002) |
| POST | /api/v1/admin/businesses/:id/cancel-deletion | superadmin (:1057) | Cancel a pending deletion |
| POST | /api/v1/admin/purge-deletions | superadmin (:1103) | Manually run the deletion purge sweep |

### adminData.ts (admin/superadmin)

| METHOD | Path | Auth | Purpose |
|---|---|---|---|
| GET | /api/v1/admin/businesses/:id/customers | admin (:109) | Business customers |
| GET | /api/v1/admin/businesses/:id/orders | admin (:147) | Business orders |
| GET | /api/v1/admin/businesses/:id/appointments | admin (:182) | Business appointments |
| GET | /api/v1/admin/businesses/:id/projects | admin (:218) | Business projects |
| GET | /api/v1/admin/customers/:id | admin (:250) | Customer detail |
| GET | /api/v1/admin/orders/:id | admin (:296, payment-proof ids stripped :309-311) | Order detail |
| GET | /api/v1/admin/appointments/:id | admin (:315) | Appointment detail |
| GET | /api/v1/admin/projects/:id | admin (:330) | Project detail |
| PATCH | /api/v1/admin/customers/:id | superadmin (:349, audited diff) | Edit customer |
| PATCH | /api/v1/admin/orders/:id | superadmin (:380, audited diff) | Edit order |
| PATCH | /api/v1/admin/appointments/:id | superadmin (:409, audited diff) | Edit appointment |
| PATCH | /api/v1/admin/projects/:id | superadmin (:438, audited diff) | Edit project |
| DELETE + POST restore | /api/v1/admin/{customers,orders,appointments,projects}/:id and .../restore | superadmin (loop :486-525) | Soft-delete and restore all four entities |
| POST | /api/v1/admin/customers/:id/anonymize | superadmin (:536, shared `anonymizeCustomer` :544-545) | Irreversible customer de-identification |
| POST | /api/v1/admin/businesses/:id/erase | superadmin (:565, `eraseBusinessCascade`, audit survives :559-564) | Hard-erase a business (does NOT stop a running bot) |
| GET | /api/v1/admin/search | admin (:598) | Cross-tenant trigram search |

### calendar.ts (root scope, no /api/v1 prefix)

| METHOD | Path | Auth | Purpose |
|---|---|---|---|
| GET | /calendar/:token.ics | public + capability token (rate 60/hr, calendar.ts:11-13) | ICS feed: appointments (SERVICES), delivery dates (PRODUCTS), milestones/deadlines (FREELANCE). No suspension check, a suspended business's feed still serves |

---

## 2. Middleware and plugins

### Global hooks (registered on the root instance in index.ts before any plugin, so they fire for every route)

| Order | Hook | Type | What it does | Wired at |
|---|---|---|---|---|
| 1 | securityHeaders | preHandler | nosniff, DENY frames, referrer policy, permissions policy (security.ts:7-11) | index.ts:58 |
| 2 | detectMaliciousInput | preHandler | Deep-scan body strings for SQLi/XSS patterns then 400 (inputSanitizer.ts:5-50); `botToken` field exempted (:27-28) | index.ts:59 |
| 3 | impersonationGuard | preHandler | Self-verifies the bearer; if `isImpersonation: true`, blocks ALL mutating methods with a currently empty allowlist (impersonation.ts:27-68); inert otherwise | index.ts:63 |
| 4 | adminCsrfGuard | onRequest | Every mutating `/admin/*` request must carry `x-requested-with: dealio-admin` else 403 CSRF_HEADER_REQUIRED (adminAuth.ts:18-24). onRequest so it rejects before body parsing | index.ts:67 |

### Global plugins (registered inside `bootstrap()` after `validateEnv()`)

| Plugin | Role | Evidence |
|---|---|---|
| helmet | CSP: default/script 'self', style 'unsafe-inline', img 'self' data: https:, object/frame 'none' (helmet.ts:10-18) | index.ts:74 |
| cookie | Parses the httpOnly `admin_session` cookie; no signing (value is a self-verifying admin JWT) | index.ts:77 |
| cors | Dynamic origin allowlist (localhost 3001/3000 + `OWNER_APP_URL`/`ADMIN_APP_URL`, cors.ts:8-13); no-Origin requests allowed (:15); credentials true (:21); exposes rate-limit headers (:29-34) | index.ts:78 |
| jwt | Owner JWT instance; `requireSecret('JWT_SECRET')`, no fallback (jwt.ts:9); expiry 30d default (:11) | index.ts:79 |
| adminJwt | Second JWT instance, namespace `admin`, `ADMIN_JWT_SECRET` (adminJwt.ts:9-12) | index.ts:80 |
| rateLimit | Global 100/min/IP (rateLimit.ts:7-9), relying on `trustProxy: 1`; many per-route overrides | index.ts:81 |

Other boot behavior in `bootstrap()`: `validateEnv()` fail-fast (index.ts:72), `trustProxy: 1` for exactly one Railway hop (:51-53), bodyLimit 1 MB (:50), pino warn-level in prod (:42-49), `prisma.$connect()` after listen (:119), SIGTERM closes the app + disconnects Prisma (:150-153).

### Per-route middleware (attached as preHandlers on specific routes)

| Middleware | What it does | Applied |
|---|---|---|
| authenticate | Owner JWT verify, 401 on failure (auth.ts:3-9) | Per-route, roughly 111 occurrences across 18 route files |
| requireAdmin | Cookie-first, Bearer fallback, DB re-check (adminAuth.ts:26-58) | Per-route on `/admin/*` |
| requireSuperAdmin | Superadmin gate (adminAuth.ts:60-65) | Per-route on `/admin/*` mutations |
| checkCustomerLimit / checkOrderLimit / checkAppointmentLimit | FREE-plan quota preHandlers, HTTP 402 `PLAN_LIMIT_REACHED` (checkLimits.ts:17/37/57) | POST /customers, POST /orders, POST /appointments only |
| getBusinessOrFail | Not a preHandler but the in-handler chokepoint for tenancy + suspension (businessFromUser.ts:23-49) | Called inside nearly every owner route |

Dead code: `middleware/checkSuspended.ts` (a standalone 403 ACCOUNT_SUSPENDED preHandler, :11-23) has zero imports anywhere. The only references to `checkSuspended` are its own JSDoc example and its `export` line (grep of backend/src). Suspension is enforced entirely through `getBusinessOrFail` plus the inline bot checks, not this file.

---

## 3. Schedulers and their actual wiring state

There are three background jobs. All three are wired with plain `setInterval` (no cron library), have no `NODE_ENV` guard (they run in every environment including local dev), and are all git-tracked source files.

| Job | Schedule | Wiring | Source | What it does |
|---|---|---|---|---|
| ownerReminders (`runOwnerReminders()`) | Boot, then every 15 min | `setInterval(..., 15 * 60_000)` (index.ts:126-130); initial run at :127 | jobs/ownerReminders.ts, imported index.ts:39 | Loads all businesses (skips suspended, :111), merges per-business `reminderSettings` over defaults (:113); by mode: SERVICES appointment reminders (24h default + optional 1h second), PRODUCTS delivery-date, FREELANCE milestone/project deadlines. 15-min firing window (:9), exactly-once dedup via `SentReminder` unique key. Delivers via BOTH Telegram (business bot token to ownerTelegramChatId) AND FCM `sendPushToAll` |
| deletionPurge (`runDeletionPurge()`) | Boot, then every 24 h | `setInterval(..., 24 * 60 * 60_000)` (index.ts:137-141); boot run at :138 | jobs/deletionPurge.ts, imported index.ts:40 | Finds `deletionState: PENDING_DELETION` with `deletionScheduledAt <= now` (:24-27); per business best-effort `stopBusinessBot` (:35) then `eraseBusinessCascade` (:36); failures independent, retried next sweep. Also superadmin-triggerable via POST /admin/purge-deletions |
| bot customer reminders (`runReminderJob(bot, botUsername)`) | Bot start (immediately), then every 1 h | `setInterval` per bot (bot/src/index.ts:306-307; reminders.ts:137-151) | bot/src/jobs/reminders.ts, per-bot in `startBotForBusiness` | Fetches `GET /bot/due-reminders` for the 24 to 25h-ahead window; sends localized Telegram reminder per appointment; marks sent; registers the `CANCEL` reply handler (to POST /bot/cancel-appointment) |

The two backend jobs each run once at boot with `.catch(...)` logging, then on their interval. The boot run of deletionPurge is the mechanism that makes the 30-day deletion window irreversible even after downtime (index.ts:132-141 comment).

---

## 4. Plan limits

Straight from `backend/src/lib/planLimits.ts` (`PLAN_LIMITS`, :12-46). `Infinity` means unbounded.

| LimitKey | FREE | PRO | BUSINESS |
|---|---|---|---|
| customers | 30 | Infinity | Infinity |
| ordersPerMonth | 50 | Infinity | Infinity |
| appointmentsPerMonth | 50 | Infinity | Infinity |
| staff | 1 | Infinity | Infinity |
| bots | 1 | 1 | 5 |
| analyticsRetentionDays | 30 | 90 | 365 |
| customFields | 3 | Infinity | Infinity |
| checkoutQuestions | 2 | Infinity | Infinity |
| pipelineStages | 3 | Infinity | Infinity |

`checkLimit(plan, key, count)` returns `allowed = count < limit` and falls back to FREE if the plan is unknown (:59). `planLimitError()` builds the 402 body `{ error: 'PLAN_LIMIT_REACHED', limitType, current, limit, plan, upgradeMessage }` (:75-100).

Enforcement is narrow. Only three owner routes attach a `checkLimits.ts` preHandler that actually returns 402:

- POST /api/v1/customers, `checkCustomerLimit()` (checks live `customer.count` where `deletedAt: null`, checkLimits.ts:17-35).
- POST /api/v1/orders, `checkOrderLimit()` (checks `order.count` since current-month start, :37-55).
- POST /api/v1/appointments, `checkAppointmentLimit()` (checks `appointment.count` since current-month start, :57-75).

The bot creation paths do NOT enforce these quotas: `POST /bot/orders` and `POST /bot/appointments` have no monthly-quota check (NOT FOUND in bot.ts:315-483 and :691-803). The only bot-side plan gate is an inline cap on NEW customers in `POST /bot/customers` (bot.ts:236-250); existing customers and reactivations bypass it.

The remaining keys (`staff`, `bots`, `analyticsRetentionDays`, `customFields`, `checkoutQuestions`, `pipelineStages`) are defined in the table but have no wired enforcement middleware; the routes that create those entities (staff.ts, custom-fields.ts, checkout-questions.ts, stages.ts) do not call any limit check (Partial: limits declared, not enforced).

---

## 5. Suspension behavior

Suspension has two enforcement surfaces, and one file that looks like a third but is dead.

Owner routes: the chokepoint is `getBusinessOrFail` (lib/businessFromUser.ts:23-49). It loads the owner's business and, if `business.suspendedAt` is set and the request is not an admin impersonation session (`isImpersonation !== true`), responds 403 `{ error: 'ACCOUNT_SUSPENDED', reason }` and returns null so the handler halts (:40-46). Impersonation is exempt so support can still read a suspended account; destructive impersonation writes are separately fenced by `impersonationGuard`. A handful of owner routes are deliberately reachable while suspended and therefore do NOT call GBOF: `GET /business` (read-only, comment :43-44), `POST /business/reactivate` (:307-309), `POST /business/request-deletion` (partial), and the two `user.ts` account-level consent routes.

Bot routes: `bot.ts` does not use `getBusinessOrFail`. Instead each route inlines a `business.suspendedAt` check that returns 403 (for example :150-155, :229-234, :326-331). 20 of the 22 bot routes carry this check. The two deliberate exceptions are `POST /bot/customers/erase` (erasure must work even when suspended, :290-291) and `GET /bot/customer/:botUsername/:telegramUserId` (no suspendedAt check; rationale undocumented, UNVERIFIED whether intentional).

Internal and capability routes intentionally serve suspended businesses: `POST /internal/get-bot-token` and `GET /internal/businesses` return suspended businesses so their bots keep running to display the suspension notice (internal.ts:66, :130-132), and `GET /calendar/:token.ics` has no suspension check.

Dead code: `middleware/checkSuspended.ts` is a standalone preHandler that would 403 ACCOUNT_SUSPENDED (:11-23), but it is imported nowhere (zero imports; the only `checkSuspended` mentions are inside that file's own JSDoc and export). It is not part of the actual enforcement path.

---

## See also

- docs/internal/FUNCTIONALITY_INVENTORY.md (section B, the primary source for this page)
- docs/ADMIN_AUDIT.md
- docs/AUTHORIZATION_AUDIT.md
- docs/internal/audits/DATA_COMPLIANCE_AUDIT.md
- docs/internal/audits/REDIS_SESSION_AUDIT.md
- docs/internal/audits/DELETION_AUDIT.md
