# Decision Log

Audience: internal
Last updated: 2026-07-03
Verified against: 64a177a

---

Architectural and product decisions, newest first. Each entry is Decision,
Context, Consequence, Status. Exact dates are not recorded per decision, so the
ordering is by inferred recency (migration timestamps and git history), and is
approximate. Every entry below was checked against code or the functionality
inventory. No entry is marked UNVERIFIED; where a decision is only partly realized
that is stated in its Status.

---

## 1. Deliberate onDelete rules on foreign keys (working tree, not yet committed)

- Decision: give every Prisma relation an explicit `onDelete` rule instead of
  relying on Prisma defaults. Business-owned child rows Cascade with the business.
  Compliance and financial-evidence relations Restrict (ConsentRecord to User,
  Order/Appointment/Project to Customer, AuditLog to AdminUser). Customer to
  CustomerStage is SetNull. BlockedSlot to Staff is Cascade, NOT SetNull, because
  a null `staffId` means a whole-business block, so nulling on staff delete would
  silently widen a personal block to the entire business (comment at
  backend/prisma/schema.prisma:325-327).
- Context: the committed schema had zero database-level referential rules;
  deletion correctness depended entirely on hand-written ordering in
  `eraseBusinessCascade`.
- Consequence: 36 explicit rules land in schema.prisma plus two migrations
  (20260702111521_add_ondelete_rules, 20260702112336_blockedslot_staff_cascade).
- Status: IMPLEMENTED IN THE WORKING TREE, NOT COMMITTED at HEAD 64a177a. The
  schema is modified and both migrations are untracked, while two later July 3
  migrations are already committed, which is a commit-ordering hazard. Until this
  is committed and deployed, `eraseBusiness.ts` still does manual FK-safe ordering
  and the database has no cascade behavior. See docs/internal/DATA_MODEL.md.

## 2. Owner account deletion: 30-day recoverable grace, then hard purge

- Decision: an owner can request account deletion. The business is suspended
  immediately and hard-purged after a 30 calendar day recovery window
  (`deletionScheduledAt`) unless the owner reactivates by logging back in. 30 days
  is the committed request-fulfillment window.
- Context: prior to this there was no owner-initiated deletion path at all
  (docs/internal/audits/DELETION_AUDIT.md flagged it as a blocker).
- Consequence: `POST /business/request-deletion` and `/business/reactivate`, the
  `DeletionState` enum and `deletionRequestedAt`/`deletionScheduledAt` columns
  (migration 20260702000000_add_business_deletion), and the `deletionPurge` job
  (boot plus every 24h, backend/src/index.ts:137-141) which stops the bot then
  calls `eraseBusinessCascade`.
- Status: IMPLEMENTED on the backend. Owner-facing UI is Not implemented: the web
  API functions `requestAccountDeletion`/`reactivateAccount` exist
  (web/lib/api.ts:121-130) but no web or Flutter screen calls them yet.

## 3. Consent versioning reads the live LegalDocument version, not a constant

- Decision: the required consent version is the version of the in-force PRIVACY
  document stored in the `LegalDocument` table and published by a superadmin.
  Publishing a new version forces customer re-consent. This supersedes a hardcoded
  version constant by design.
- Context: compliance requires that a policy change re-triggers consent, and that
  the in-force version be operationally changeable without a code deploy.
- Consequence: `getCurrentVersion('PRIVACY')` reads `LegalDocument` with a 15s
  in-process cache and a `'2026-07-01'` fallback used only when the row is missing
  or the DB read fails (backend/src/lib/legalVersion.ts:11-52). The bot gate
  compares stored `consentVersion` against this live value
  (bot/src/lib/consent.ts:26). Admin publish bumps the version and invalidates the
  cache (backend/src/routes/admin.ts:983-1049).
- Status: IMPLEMENTED. Note the stale code comment at schema.prisma:172-173 still
  says "CONSENT_VERSION" as if it were a constant; the DB row is authoritative.

## 4. Admin session moved to an httpOnly cookie with a CSRF header

- Decision: the admin panel authenticates with an httpOnly `admin_session` cookie
  (separate `ADMIN_JWT_SECRET` namespace, 8h) plus a required
  `x-requested-with: dealio-admin` header on every mutating admin request.
- Context: the earlier design put the admin token in a JS-readable cookie with no
  CSRF protection (docs/ADMIN_AUDIT.md).
- Consequence: cookie set at login (backend/src/routes/admin.ts:282-297), verified
  by `requireAdmin` (backend/src/middleware/adminAuth.ts:26-58), CSRF enforced by
  the global `adminCsrfGuard` onRequest hook (backend/src/index.ts:67). The web
  admin client sends the header with `withCredentials: true`
  (web/lib/adminApi.ts:8-13); JavaScript never sees the token.
- Status: IMPLEMENTED. Known residual: no server-side token revocation, so a
  stolen token stays valid up to 8h.

## 5. Cloudflare R2 retired; no object storage

- Decision: remove object storage entirely. Store payment-proof screenshots as
  Telegram `file_id` values and serve them through an authenticated getFile proxy;
  keep product photos as owner-entered URL strings.
- Context: R2 was upload-only dead weight and a data-retention liability
  (docs/internal/audits/DELETION_AUDIT.md); no feature needed durable object
  storage.
- Consequence: no `@aws-sdk`, no `r2.ts`, no `R2_*` env keys anywhere in the repo.
  `Order.paymentProofFileId` holds the Telegram file id; `GET /orders/:id/payment-proof`
  streams it via the business's own bot token (backend/src/routes/orders.ts:164-204).
  The `Order.paymentProofUrl` column remains as a reserved hook for a possible
  future archival job but is never written today.
- Status: IMPLEMENTED. See FUNCTIONALITY_INVENTORY.md section G. CLAUDE.md's old
  stack table and env list (which named R2) were stale and have been corrected.

## 6. Redis session TTL set to 86400s (24h), refreshed on write

- Decision: give bot sessions a 24h TTL, re-issued on every write, so abandoned
  in-flight checkout PII (name, phone, address) expires rather than lingering
  forever, while active users keep their carts.
- Context: docs/internal/audits/REDIS_SESSION_AUDIT.md found no TTL and PII that
  persisted indefinitely.
- Consequence: `new RedisAdapter({ instance: redis, ttl: 86400 })`
  (bot/src/index.ts:52). If `REDIS_URL` is unset the bot falls back to in-memory
  sessions (restart-lossy).
- Status: IMPLEMENTED. Erasure paths still make no Redis call, so residual session
  data is bounded by the 24h TTL rather than cleared on erase.

## 7. Railway trustProxy enabled; rate limiting keyed on the real client IP

- Decision: set Fastify `trustProxy: 1` (exactly one trusted hop, the Railway
  edge) and key rate limits on `request.ip` (the plugin default), which then
  resolves to the real client IP.
- Context: an earlier `trustProxy: true` trusted client-supplied X-Forwarded-For,
  making rate-limit keys spoofable (docs/ADMIN_AUDIT.md).
- Consequence: backend/src/index.ts:51-53 and backend/src/plugins/rateLimit.ts:10-12.
  Global limit 100 req/min/IP with tighter per-route overrides for auth, admin
  login, bot, proposal, and calendar routes.
- Status: IMPLEMENTED.

## 8. Bot checkout rewritten from the conversations plugin to a manual state machine

- Decision: replace the `@grammyjs/conversations`-based checkout with a manual
  session state machine driven by explicit `CheckoutStep` values.
- Context: the plugin caused a chain of Redis state/persistence and
  update-swallow (dropped-update) bugs in the checkout flow (comment at
  bot/src/scenes/checkout.ts:17-20).
- Consequence: checkout is now one `bot.on('message')` handler that switches on
  `session.checkout.step` through the states idle, awaiting_name, awaiting_phone,
  awaiting_delivery, awaiting_address, awaiting_confirm, awaiting_payment,
  awaiting_payment_proof (bot/src/lib/types.ts:28-36). The catalog/cart handlers
  and the order-creation backend were untouched.
- Status: IMPLEMENTED for checkout only. Booking deliberately still uses the
  `@grammyjs/conversations` plugin (`bookingConversation`,
  bot/src/scenes/booking.ts:170), so the decision was scoped to checkout, not a
  blanket removal of the plugin.

## 9. Local dev database split from production; prod URL only in gitignored .env.prod

- Decision: keep local development on a separate database (Docker Postgres on
  5433) and keep the production connection string out of the repo, in a gitignored
  `backend/.env.prod`.
- Context: preventing accidental destructive runs against production (the seed and
  test harness are especially dangerous).
- Consequence: `backend/.env.prod` is gitignored (backend/.gitignore:5) and not
  tracked. The seed refuses to run unless `DATABASE_URL` contains `localhost`
  (backend/prisma/seed.ts:24-28), and the test setup hard-aborts on
  Railway-looking hosts (backend/test/setup.ts:23-25).
- Status: IMPLEMENTED.

## 10. Brand system: Manrope, locked slate and blue, cool blue-grey surfaces

- Decision: use Manrope as the typeface everywhere, with a locked brand palette;
  no emojis in Dealio-rendered UI (Telegram bot copy may use them); no em-dashes
  in copy.
- Context: converging the app and web on one calm, trustworthy identity
  (docs/design-tokens.md is the single source of truth).
- Consequence: Manrope is applied in app/lib/core/theme/app_theme.dart:52,167 and
  in web via `--font-manrope`; the one exception is the splash "Dealio." wordmark,
  which uses Inter (docs/design-tokens.md:173-175). Locked brand hex are slate
  `#0F1729` and blue `#3C83F6`; the app background is a cool blue-grey
  `hsl(222 62% 96%)`.
- Status: IMPLEMENTED, with a correction to the values as originally briefed. The
  earlier brief cited slate `#0F172A`, blue `#3B82F6`, and a paper `#FAFAF8`
  background. Per docs/design-tokens.md:26-34 the first two were Tailwind-derived
  drift and are reconciled to `#0F1729` and `#3C83F6`; `#FAFAF8` is not a UI
  background at all (it appears only on the launcher icon,
  docs/design-tokens.md:64-72). This doc records the reconciled, code-true values.
