# Telegram Bot
Audience: internal
Last updated: 2026-07-03
Verified against: 64a177a

---

The bot lives in `bot/` and runs as its own Node process, separate from the Fastify backend. It hosts three things at once: a fleet of per-business customer bots (one grammy `Bot` per business), one central platform (owner-auth) bot, and an Express "manager" HTTP server the backend calls to start and stop bots. Everything talks to the backend over `/api/v1/*` with the shared `x-bot-secret` header; the bot never touches the database directly.

---

## 1. Manager lifecycle

### 1.1 Process shape

- **`activeBots: Map<businessId, Bot>`** holds every running per-business bot (bot/src/index.ts:36). It is the single source of "is this business's bot live". Start is deduped against it (:292-295, :373-376), stop deletes from it (:421), and `GET /internal/status` reports its size and keys (:431-434).
- **Express manager HTTP server** listens on `BOT_MANAGER_PORT`, code default **3002** (bot/src/index.ts:437-440). Note the `.env.example` ships 3003 (bot/.env.example:4); the backend's default target `BOT_SERVICE_URL` is `http://localhost:3002` (backend/src/lib/botManager.ts:8), so the code defaults line up at 3002 and only the example files agree at 3003.
- **Long polling, never webhooks.** Both per-business bots (`bot.start(...)`, bot/src/index.ts:317-325) and the platform bot (:77-89) run grammy long polling. A repo-wide search for "webhook" returns nothing.
- The platform (owner-auth) bot is created in bot/src/platform/bot.ts:24 and is deliberately **not** added to `activeBots` (bot/src/index.ts:59-64); it is additive and only handles enrollment.

### 1.2 Boot sequence

`main()` (bot/src/index.ts:443-478), invoked at :518, does, in order:

1. `startManagerServer()` first, so the HTTP endpoint can accept start/stop even if bot loading is slow or the backend is briefly down (:446).
2. `startPlatformBot()` (:450), independent of the business list.
3. `GET /api/v1/internal/businesses` to list bot-configured businesses (:456-457). On failure it logs and returns without exiting; the HTTP server stays up (:458-462).
4. Filter to businesses with a `botUsername` (:464), then start them all concurrently with `Promise.allSettled` so one failure does not block the rest (:469-474). Each start first fetches that business's token via `fetchBotInfo` (:471, which POSTs `/api/v1/internal/get-bot-token`, :273-281).

### 1.3 Token fetch and decryption

Per-business tokens are stored in the DB as an AES-256-GCM triple (`botTokenEncrypted` / `botTokenIv` / `botTokenTag`, schema.prisma:56-58). The bot service never sees the ciphertext: it calls `POST /api/v1/internal/get-bot-token` with a `businessId` (bot/src/index.ts:276), and the backend decrypts and returns the plaintext token plus `botUsername` (backend/src/routes/internal.ts:50-80). That endpoint deliberately returns suspended businesses too, so their bots keep running (internal.ts:66).

### 1.4 Per-bot setup order

`startBotForBusiness` (bot/src/index.ts:287-341) constructs the `Bot`, registers all handlers, then, because grammy forbids installing handlers after polling begins, runs: `bot.init()` -> `runReminderJob(bot, botUsername)` (which also registers the `CANCEL` hears handler and starts the hourly job) -> fire-and-forget `registerBotCommandMenu` (`setMyCommands`) -> `bot.start(...)` long polling (:306-325). The bot is inserted into `activeBots` **before** `start` so concurrent start requests dedupe (:301-302).

### 1.5 Crash retry (30s)

If long polling rejects, the catch handler deletes the bot from `activeBots` and re-calls `startBotForBusiness` after **30 seconds** (bot/src/index.ts:326-335). The platform bot uses the same 30s retry on crash (:82-89).

### 1.6 Manager HTTP endpoints

All three require the timing-safe `x-bot-secret` check `verifyBotSecret` (bot/src/index.ts:345-354).

| Method | Path | Behavior | Evidence |
|---|---|---|---|
| POST | /internal/start-bot | Hot-start a bot for a `businessId`; no-op if already in `activeBots`; fetches token then `startBotForBusiness` | bot/src/index.ts:361-395 |
| POST | /internal/stop-bot | `bot.stop()` then delete from `activeBots`; no-op reply if not running | bot/src/index.ts:398-423 |
| GET | /internal/status | `{ running: activeBots.size, businesses: [...keys] }` | bot/src/index.ts:426-435 |

### 1.7 Start / stop triggers (from the backend)

The backend drives bot lifecycle by calling the manager over `BOT_SERVICE_URL`:

| Trigger | Action | Evidence |
|---|---|---|
| Onboarding complete | start (fire-and-forget) | backend/src/routes/onboarding.ts:128-140 |
| Owner deletion request | stop | backend/src/routes/business.ts:280-296 |
| Owner reactivation | start | backend/src/routes/business.ts:322-336 |
| Admin cancel-deletion | start | backend/src/routes/admin.ts:1084-1085 |
| Deletion purge (24h job) | stop, then erase cascade | backend/src/jobs/deletionPurge.ts:31-44 |
| Bot-token change | restart (stop + start) | backend/src/routes/business.ts:202-221 |

### 1.8 Suspension does NOT stop the bot process

This is deliberate. Admin suspend leaves the bot running; `GET /internal/businesses` returns suspended businesses precisely so their bots stay live and can answer with a suspension notice (backend/src/routes/internal.ts:127-150). Enforcement is per-request instead: 20 of 22 `/bot/*` routes return 403 `ACCOUNT_SUSPENDED`, and the bot's axios interceptor maps that to a `SuspendedError` (bot/src/lib/api.ts:58-68) which the handlers and `bot.catch` translate into a hardcoded-English `SUSPENSION_MESSAGE` reply (bot/src/lib/api.ts:5-6; bot/src/index.ts:255-262). The one route never suspension-blocked is `POST /bot/customers/erase` (deletion right is unconditional, backend/src/routes/bot.ts:290-291). See docs/ADMIN_AUDIT.md and docs/internal/audits/DELETION_AUDIT.md.

### 1.9 Graceful shutdown

`SIGTERM` and `SIGINT` both run `shutdown()`, which stops the platform bot then `Promise.allSettled`-stops every bot in `activeBots`, then `process.exit(0)` (bot/src/index.ts:482-516).

---

## 2. Session model

| Aspect | Value | Evidence |
|---|---|---|
| Adapter | `@grammyjs/storage-redis` `RedisAdapter` over `ioredis`, one shared store for all business bots | bot/src/index.ts:7-8, 43-53 |
| TTL | **86400 s (24 h)**, re-issued on every write (adapter re-EXPIRE), so an active mid-flow customer is never expired inside any 24h window | bot/src/index.ts:52 (comment :47-51) |
| Fallback | `REDIS_URL` unset -> grammy in-memory session (restart-lossy), a warning is logged | bot/src/index.ts:44, 54-56 |
| Session key | `` `${businessId}:${ctx.chat.id}` `` when a chat exists, else undefined. In private chats `chat.id` equals the Telegram user id, which is identical across every business bot, so the `businessId` prefix is what prevents one customer's cart bleeding between businesses | bot/src/index.ts:132-141 |
| Shape (`SessionData`) | `cart: CartItem[]`, `customerId?`, `orderIdemKey?` (vestigial), `checkout?: CheckoutState`, `booking?: BookingState`, `consentReturnTo?`, `lang?`; initial value `{ cart: [] }` | bot/src/lib/types.ts:55-69; bot/src/index.ts:134 |
| Platform bot | separate plain in-memory session holding only the enroll token | bot/src/platform/bot.ts:27 |

The 24h TTL was introduced to close docs/internal/audits/REDIS_SESSION_AUDIT.md: abandoned checkout/booking PII (name, phone, address left half-entered) auto-expires instead of lingering forever.

---

## 3. Conversation flows

### 3.1 Catalog browse (DORMANT)

The catalog scene (bot/src/scenes/catalog.ts) is fully coded but unreachable. The welcome menu gates the "Browse catalog" and "My orders" buttons behind `mode === 'PRODUCTS'`, and no business runs PRODUCTS mode (the `Business.mode` scalar defaults to SERVICES and PRODUCTS is dormant), so `hasProducts` is never true (bot/src/handlers/commands.ts:54-68). The command menu likewise only adds `/orders` for PRODUCTS mode (:92). Were it reachable, the flow is: `catalog` -> product list (catalog.ts:80-110) -> `product:<id>` detail with photo/stock/prep-time and a +1/+2/+3/+5 quantity row (:112-180) -> `add:<id>:<qty>` mutates `session.cart` (:182-235) -> `cart` view with per-item remove (:237-254), editing messages in place via `editOrSend` (:17-34).

### 3.2 Checkout (manual state machine)

Checkout is deliberately **not** a `@grammyjs/conversations` flow; it was replaced by a manual state machine (bot/src/scenes/checkout.ts:17-26). It is driven by the literal `CheckoutStep` union (bot/src/lib/types.ts:28-36):

```
idle
awaiting_name
awaiting_phone
awaiting_delivery
awaiting_address        (only when deliveryMethod === DELIVERY)
awaiting_confirm
awaiting_payment
awaiting_payment_proof
```

Progression and details:

- Entry callback `checkout` is consent-gated, then calls `startCheckout` (checkout.ts:280-287).
- `startCheckout` refuses an empty cart, mints one idempotency UUID for the whole flow, and moves to `awaiting_name` (checkout.ts:254-274).
- Name is captured by typed text or the `use_tg_name` button (checkout.ts:290-301); phone by a shared contact or typed text (:381-411). One `bot.on('message')` switch dispatches on the current step and never captures inputs that start with `/` (:356-368).
- `awaiting_delivery`: `delivery:PICKUP` goes straight to confirm; `delivery:DELIVERY` inserts the `awaiting_address` step (checkout.ts:304-319).
- `confirm_order` (only valid in `awaiting_confirm`) upserts the customer then creates the order with the idempotency key; on error it keeps state so the customer can retry (checkout.ts:322-326, order creation :130-193).
- The payment step is shown only when `cardPaymentsEnabled && cardNumber` are both present; otherwise checkout finishes with no payment step (checkout.ts:203-248).
- `i_have_paid` (valid only in `awaiting_payment` with an `orderId`) moves to `awaiting_payment_proof` and demands a photo or image document; it sends **only the Telegram `file_id`** (never the image bytes) to `POST /bot/payment-received` (checkout.ts:343-350, upload path :425-458).

### 3.3 Booking (conversation)

Booking is a real `@grammyjs/conversations` flow, `bookingConversation` (bot/src/scenes/booking.ts), entered from the consent-gated `book_appointment` callback (commands.ts:218-226). Steps: load services (:175-194) -> select service (:196-224) -> select staff only if more than one qualifies (`staff:any`, or auto-pick when exactly one, :227-254) -> pick a date, scanning the next 14 Tashkent days that have at least one open slot (:28-44) -> pick a slot (:63-168) -> name (:270-292) -> phone (:294-321) -> confirm (:323-349) -> upsert customer (:351-374) -> `createAppointment` with a 409 `SLOT_UNAVAILABLE` retry loop (:380-440) -> confirmation plus business address (:444-462). Payment type is always `AT_APPOINTMENT`; there is **no in-bot payment** for bookings (:392, :445).

### 3.4 Project view

`showProjects` (bot/src/scenes/project.ts) sends one message per project: status, deadline, total, milestones with a status emoji, and invoices marked paid/unpaid (:29-119). Milestones in `SUBMITTED_FOR_REVIEW` get Approve and Request-changes buttons (:69-86) that call `POST /bot/milestone-review` (:137-173).

---

## 4. Consent gate

First-contact data-subject consent (ZRU-547). See docs/internal/audits/DATA_COMPLIANCE_AUDIT.md.

### 4.1 The 7 gated entry points

The gate fires before any personal-data write, at exactly these entry points:

| # | Entry point | Evidence |
|---|---|---|
| 1 | `/start` command | bot/src/handlers/commands.ts:125-128 |
| 2 | `setlang:(UZBEK\|RUSSIAN\|ENGLISH)` callback (language pick upserts a customer) | bot/src/handlers/commands.ts:141-145 |
| 3 | `/language` command | bot/src/handlers/commands.ts:168-171 |
| 4 | `change_language` callback | bot/src/handlers/commands.ts:177-180 |
| 5 | `main_menu` callback | bot/src/handlers/commands.ts:286-289 |
| 6 | `checkout` callback (checkout entry) | bot/src/scenes/checkout.ts:282-286 |
| 7 | `book_appointment` callback (booking entry) | bot/src/handlers/commands.ts:221-225 |

Not gated (read-only or the deletion right itself): `/help`, `/projects`, `/orders`, `/appointments`, `/cart`, and `/deletedata`.

### 4.2 The predicate

`needsConsent(ctx)` returns "gate needed" unless `consentedAt` is set AND `consentVersion === currentPrivacyVersion` (bot/src/lib/consent.ts:18-31, comparison at :26). The three values come from `GET /api/v1/bot/customer/:botUsername/:telegramUserId` via `getCustomerLanguage` (bot/src/lib/api.ts). If the lookup throws, the function defaults to gating (fail-closed, consent.ts:27-30), so a backend blip never lets data be stored without consent.

### 4.3 Version source: LegalDocument table, with a fallback

`currentPrivacyVersion` is read live from the backend, which resolves it through `getCurrentVersion('PRIVACY')` (backend/src/lib/legalVersion.ts:24-52). That function reads the `LegalDocument` row for `docType = PRIVACY` behind a 15s in-process cache (legalVersion.ts:20-21, 27, 50). The hardcoded constant `'2026-07-01'` is used **only** as a fallback in two cases: the row is missing (`row?.version ?? FALLBACK_VERSION`, :49) or the DB read throws (returned without caching, so the next call retries, :35-47). There is no version constant on the bot side. When a superadmin publishes a new PRIVACY version (`POST /admin/legal-docs/:docType/publish`), the version bumps and the cache is invalidated, which re-gates every customer at their next gated entry point (backend/src/routes/admin.ts:983-1049; invalidate at :1031). A stale comment in schema.prisma:172-173 still references a "CONSENT_VERSION" constant; the DB row is authoritative.

### 4.4 What is stored on Agree

`consent_agree` calls `recordConsent` (commands.ts:237-267 -> consent.ts:81-96). It re-fetches the live version (and throws rather than record a guessed version, consent.ts:87), then upserts the customer via `POST /bot/customers` with `consentedAt` (ISO now), `consentVersion` (the live value), plus `telegramUserId`, `telegramUsername`, and `first_name` as the name (consent.ts:88-95). The backend persists this as the first personal-data write (backend/src/routes/bot.ts:263-273). One acceptance covers both ordinary processing and cross-border transfer (consent.ts:9-15). Decline writes nothing and offers a back-to-menu button (commands.ts:271-278). On Agree, the flow resumes whatever the customer was doing via `session.consentReturnTo`: `checkout` -> `startCheckout`, `booking` -> re-enter `bookingConversation`, otherwise the language picker or welcome menu (commands.ts:254-266).

### 4.5 When it re-fires

The gate re-fires whenever the predicate goes false: an admin publishing a new PRIVACY version (so `consentVersion` no longer matches), or the customer being reset to unconsented after `/deletedata` (which clears the consent fields server-side and drops `session.lang` so the next `/start` re-gates, commands.ts:316-320).

---

## 5. /deletedata (anonymize and keep)

End to end (see docs/internal/audits/DELETION_AUDIT.md):

1. `/deletedata` command or the `delete_data` menu button shows an explicit confirm dialog; nothing is erased yet (commands.ts:111-119, 298-304).
2. Tapping `delete_confirm` (the only trigger for the irreversible action) calls `eraseCustomer(botUsername, telegramUserId)` (commands.ts:306-321), which POSTs `/api/v1/bot/customers/erase` (bot/src/lib/api.ts:110-116).
3. Backend `POST /bot/customers/erase` (backend/src/routes/bot.ts:285-312) is **never suspension-blocked** (:290-291) and is idempotent: no matching customer -> `{ erased: false }`; already anonymized -> `{ erased: true, idempotent: true }`; otherwise it runs `anonymizeCustomer`.
4. `anonymizeCustomer` (backend/src/services/anonymizeCustomer.ts:113-226) is the single shared de-identification path (also used by admin anonymize). In one transaction it deletes field values and tags; nulls order `deliveryAddress`/`customAnswers`/`notes`/`internalNotes`; clears `paymentProofFileId`/`paymentProofUrl` (after which the getFile proxy 404s); nulls appointment notes; strips order timeline entries down to status/at/by; scrubs project, milestone, and invoice strings; and finally sets the customer row to "Deleted customer" with PII and consent fields nulled and `anonymizedAt` stamped. This is **anonymize-and-keep**: amounts, statuses, dates, and invoice numbers are retained in de-identified form; rows are not hard-deleted.
5. The bot then clears `session.lang` and resets `session.checkout` to `{ step: 'idle' }`, so the next `/start` re-resolves language and re-fires the consent gate as a fresh subject (commands.ts:316-320).

---

## 6. Language resolution

- `getLang(ctx)` runs per message (bot/src/lib/lang.ts:11-25): (1) return the session cache `ctx.session.lang` if set; (2) else ask the backend and run `resolveLang(languagePreference, businessLanguage)`, caching the result only once the customer has explicitly chosen a language; (3) fall back to `'UZBEK'` on any failure.
- `resolveLang` = `preference ?? businessLanguage`, validated against `UZBEK | RUSSIAN | ENGLISH`, defaulting to `UZBEK` (bot/src/lib/i18n.ts:10-19).
- The language picker is shown when no preference is stored (lang.ts:28-42); the choice is persisted with `POST /bot/set-language` (backend/src/routes/bot.ts:1292-1333) and cached in `session.lang` (commands.ts:162).
- The platform bot resolves differently: it maps the Telegram client `language_code` (`ru*`/`uz*`/`en*`, default UZBEK, bot/src/platform/i18n.ts:8-14).
- **Not localized:** `SUSPENSION_MESSAGE` and the owner-facing `mark_paid` / `register_owner` replies are hardcoded English (bot/src/lib/api.ts:5-6; bot/src/handlers/owner.ts:24-32, 55-79).
- There are **three** supported languages (Uzbek, Russian, English); CLAUDE.md's two-language claim is stale.

---

## 7. Every proactive send

Three transports carry bot-related outbound messages: the business bot instance itself, the backend using the business's bot token (raw Telegram sendMessage, backend/src/lib/telegram.ts), and FCM push to the owner's app devices (`sendPushToAll`, backend/src/lib/push.ts). Content strings shown below omit the leading emoji glyphs present in the source.

### 7.1 Sent by the bot service (business bot)

| Trigger | Recipient | Content | Evidence |
|---|---|---|---|
| Appointment 24-25h out, `reminderSent = false`, status REQUESTED/CONFIRMED (hourly per-bot job) | Customer | business, service, staff, date/time, price, in the customer's language | bot/src/jobs/reminders.ts:58-96; backend filter backend/src/routes/bot.ts:922-935 |
| Customer free-text message outside any active flow | Owner (via that business's bot) | `{customerName}: {text}` (name bold, HTML) | bot/src/index.ts:230-245 (the backend also attempts the same send, so both paths exist, backend/src/routes/bot.ts:1198-1204) |
| Owner taps `mark_paid:` inline button | Customer | payment-confirmed message, customer's language | bot/src/handlers/owner.ts:34-48 |

### 7.2 Sent by the backend via the business bot token

| Trigger | Recipient | Evidence |
|---|---|---|
| Milestone approved (from bot review) | Owner | backend/src/routes/bot.ts:1069-1082 |
| Proposal accepted | Owner | backend/src/routes/bot.ts:1150-1157 |
| Customer message saved | Owner | backend/src/routes/bot.ts:1198-1204 |
| Milestone set to SUBMITTED_FOR_REVIEW by the owner in-app | Customer | backend/src/routes/projects.ts:284-303 |
| Owner one-shot message from the app | Customer | backend/src/routes/customers.ts:367-411 |
| Owner reminder job (15-min): appointment / delivery / milestone / project deadline | Owner | backend/src/jobs/ownerReminders.ts:61-74 |
| LOGIN code (sent via the PLATFORM bot token, not a business bot) | Owner | backend/src/routes/auth.ts:247-272 |

### 7.3 FCM push (`sendPushToAll`, owner devices) from bot routes

| Trigger | Recipient | Evidence |
|---|---|---|
| New order | Owner devices | backend/src/routes/bot.ts:465-471 |
| Payment received ("I have paid") | Owner devices | backend/src/routes/bot.ts:527-532 |
| New appointment | Owner devices | backend/src/routes/bot.ts:788-793 |
| Appointment cancelled | Owner devices | backend/src/routes/bot.ts:842-847 |
| Milestone approved | Owner devices | backend/src/routes/bot.ts:1084-1089 |
| Proposal accepted | Owner devices | backend/src/routes/bot.ts:1143-1148 |

### 7.4 Notable non-message

Booking confirmation returns `ownerTelegramChatId` to the bot, but the bot deliberately does **not** message the owner on a new booking (`void ownerTelegramChatId`, bot/src/scenes/booking.ts:464-465); the owner learns of new appointments through the FCM push in 7.3 instead.
