# Redis Session Data Audit — Dealio Bot

**Scope:** How the Grammy bot (`bot/`) stores session data in Redis, and whether personal data (customer name, phone, delivery address) is held transiently (cleared/expired) or persistently (lingers) after the checkout/booking flows complete.
**Type:** Read-only inspection. No code was modified. Every claim cites `file:line`.
**Date:** 2026-07-02.

## Answers to the filing questions

**1. Does the Redis session store have a TTL?**
**No.** The store is `@grammyjs/storage-redis` `RedisAdapter` (`^2.5.1`), constructed at [bot/src/index.ts:47](bot/src/index.ts#L47) as `new RedisAdapter<SessionData>({ instance: redis })` — **no `ttl` option is passed**. The adapter only applies an expiry when `ttl` is truthy: in the package source `write()` is `await this.redis.set(key, …); if (this.ttl) { this.redis.expire(key, this.ttl); }` (`bot/node_modules/@grammyjs/storage-redis/dist/esm/mod.js:29-34`). With no `ttl`, every session key is written with a **plain `SET` and no `EXPIRE`**, so keys persist indefinitely. Session keys are namespaced `${businessId}:${chat.id}` ([bot/src/index.ts:134](bot/src/index.ts#L134)) — one key per (business, customer chat), each surviving until explicitly overwritten or deleted. There is no cron/sweeper that deletes them anywhere in `bot/`.

**2. After a completed checkout, is name/phone/address cleared from the session? — YES.**
Checkout is a manual state machine; name/phone/address live in `session.checkout` (`co.name`/`co.phone`/`co.address` set at [checkout.ts:298](bot/src/scenes/checkout.ts#L298), [:377](bot/src/scenes/checkout.ts#L377), [:405](bot/src/scenes/checkout.ts#L405), [:419](bot/src/scenes/checkout.ts#L419)). After `createOrder` (POST /bot/orders) succeeds:
- **Card path:** [checkout.ts:235](bot/src/scenes/checkout.ts#L235) reassigns `ctx.session.checkout = { step: 'awaiting_payment', orderId: order.id }` — the whole object is replaced, so name/phone/address/deliveryMethod are dropped **at order creation**. The flow then ends via `finishCheckout(ctx)` at [checkout.ts:448](bot/src/scenes/checkout.ts#L448).
- **No-card path:** `finishCheckout(ctx)` at [checkout.ts:226](bot/src/scenes/checkout.ts#L226).
- `finishCheckout` is defined at [checkout.ts:45-49](bot/src/scenes/checkout.ts#L45) as `ctx.session.checkout = { step: 'idle' }` — a full reset that drops all PII fields. Cancel ([:333](bot/src/scenes/checkout.ts#L333)) does the same.

So on successful completion `session.checkout` no longer contains name/phone/address (the cart is also cleared, [checkout.ts:196](bot/src/scenes/checkout.ts#L196)). Mechanism note: clearing is by **overwrite** — the session key is re-`SET` with the PII-free object on the next session write; the key itself is not deleted (`session.customerId` at [checkout.ts:197](bot/src/scenes/checkout.ts#L197) remains). (The name/phone/address are also sent to the backend — `upsertCustomer` [checkout.ts:154-160](bot/src/scenes/checkout.ts#L154), `createOrder` deliveryAddress [checkout.ts:174](bot/src/scenes/checkout.ts#L174) — and persisted in Postgres, the system of record; that is expected and out of scope here.)

**3. After a completed booking, is name/phone/address cleared from the session? — YES (and address is never collected).**
The SERVICES booking flow is a `@grammyjs/conversations` (`^1.2.0`) conversation. Name and phone are **local variables** inside `bookingConversation`, collected via `conversation.waitFor(...)` at [booking.ts:281-292](bot/src/scenes/booking.ts#L281) (name) and [booking.ts:303-321](bot/src/scenes/booking.ts#L303) (phone). They are held only in the conversation's transient replay state, which the plugin persists under `session.conversation` (the codebase confirms this: [index.ts:143-162](bot/src/index.ts#L143) manipulates `sess.conversation` directly and notes `exit()` does `session.conversation = undefined`). The booking flow writes **only** `ctx.session.customerId` to the persistent session ([booking.ts:374](bot/src/scenes/booking.ts#L374)) — never name/phone into `ctx.session`. No delivery address is collected in booking at all.

There is **no explicit clear line** in `booking.ts`; clearing happens because the conversation builder function **returns** on completion (end of function, [booking.ts:466](bot/src/scenes/booking.ts#L466)), at which point the 1.x conversations plugin ends the conversation and drops its `session.conversation` state. So after a completed booking the transient name/phone are gone and only `customerId` remains. (Caveat: this relies on the plugin's documented end-on-return behaviour, corroborated by the app's own reliance on `session.conversation` in index.ts — there is no code line in `booking.ts` that clears it.)

**4. For abandoned flows, does the personal data expire, or linger? — It LINGERS INDEFINITELY.**
Because there is no TTL (Q1), nothing time-based ever clears an abandoned flow. Personal data is removed only by one of:
- **Completing/cancelling** the flow (Q2/Q3), or
- The customer later **sending any `/command`**, which the pre-conversations middleware treats as an escape: [index.ts:161](bot/src/index.ts#L161) `sess.conversation = undefined` (wipes abandoned booking state incl. typed name/phone) and [index.ts:163](bot/src/index.ts#L163) `if (sess.checkout) sess.checkout = { step: 'idle' }` (wipes abandoned checkout name/phone/address). A second reset also exists at [commands.ts:319](bot/src/handlers/commands.ts#L319).

If a customer starts checkout or booking, provides name/phone (and address, for checkout), then simply **stops replying and never sends another command**, that half-filled personal data remains in the Redis session key **forever**. No timer, expiry, or background job clears it — **NOT FOUND: nothing time-based or automatic expires abandoned session PII.**

**5. One-line verdict (for the filing):**
**Redis holds this personal data PERSISTENTLY, not transiently.** Completed checkout/booking flows *do* clear name/phone/address from the session, but because the Redis store has **no TTL**, any abandoned (never-completed, no-follow-up-command) flow leaves the customer's name/phone (and delivery address, for checkout) in Redis **indefinitely**.

## Additional notes

- **Session shape** ([bot/src/lib/types.ts:55-69](bot/src/lib/types.ts#L55)): `SessionData` = `cart`, `customerId`, `orderIdemKey`, `checkout` (`CheckoutState` with `name`/`phone`/`deliveryMethod`/`address`/`idemKey`/`orderId`), `booking` (`BookingState` — service/staff/date/time only, **no** name/phone/address), `consentReturnTo`, `lang`. The conversations plugin adds a `session.conversation` slot.
- **All session writes were enumerated** (grep of `.session.<field> =` across `bot/src`). Name/phone/address are written **only** into `session.checkout` in `checkout.ts`. Other session writes hold non-PII: `lang` (lang.ts, commands.ts), `cart`/`orderIdemKey` (catalog.ts), `customerId` (checkout.ts, booking.ts), `consentReturnTo` (consent.ts, commands.ts), `enrollToken` (platform/bot.ts — a link token on the separate platform bot, not customer PII). No name/phone/address is written to session state outside the checkout flow.
- **`customerId` and `lang` also persist indefinitely** (no TTL). These are not the name/phone/address in question, but each session key retains an internal customer identifier and language preference after any interaction, for the lifetime of the key.
- **In-memory fallback:** when `REDIS_URL` is unset (local dev) sessions are in-memory and lost on restart ([index.ts:49-51](bot/src/index.ts#L49)); the persistence findings above apply to the Redis (production) path.

_No remediation is proposed here (inspection only, per the task). No secret values are printed._
