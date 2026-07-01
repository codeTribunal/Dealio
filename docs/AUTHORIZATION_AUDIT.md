# Authorization / Tenant-Isolation Audit

**Scope:** Prove or disprove that no business owner, customer, or staff member can access another tenant's data across backend, web, app, and bot.
**Type:** Read-only audit. No code was modified. Every claim cites `file:line`.
**Method:** Exhaustive per-file enumeration of every route in `backend/src/routes/` (125 route handlers across 25 files), a dedicated adversarial IDOR-pattern hunt over every tenant-data database call (169 call sites), plus dedicated passes on the bot secret, admin gates, client surfaces, and test coverage. Every suspected gap was put through independent adversarial verification.
**Date:** 2026-07-02.

## Headline verdict

- **No authenticated cross-tenant read or write path exists.** Every one of the 108 authenticated owner/bot tenant-data routes resolves the tenant from the caller's own identity (owner JWT `userId` → `ownerId`, or the bot's unique `botUsername`) and scopes every query by that `businessId`. A caller who substitutes another business's record id on their own token receives `404`/`403`, never another tenant's data. **No BLOCKER-class finding.**
- The **only** database accesses that read/mutate tenant data by a client-supplied id **without** a `businessId` binding are the **3 intentionally-public routes in `backend/src/routes/proposals.ts`** (shareable proposal/invoice links). Of these, `POST /proposals/:projectId/accept` is a genuine **unauthenticated IDOR-write (HIGH)**; the two GET reads are public-by-design capability URLs (LOW).
- Two **intra-tenant** (customer-vs-customer *within the same business*, not cross-tenant) authorization gaps exist in the bot (`cancel-appointment`, `milestone-review`) — **LOW**.
- Several routes are correctly scoped in code but have **no cross-tenant isolation test** — **MEDIUM** (test-coverage gaps, not vulnerabilities).

The prior audit's claim (isolation via `getBusinessOrFail`, `businessId` scoping, cross-tenant → 404, passing test) is **VERIFIED** and now proven exhaustively across all routes.

---

## Section 1 — The isolation mechanism

### `getBusinessOrFail` — `backend/src/lib/businessFromUser.ts:23-49`

```ts
export async function getBusinessOrFail(request: FastifyRequest, reply: FastifyReply) {
  const { userId, isImpersonation } = request.user as {
    userId: string;
    isImpersonation?: boolean;
  };

  const business = await prisma.business.findUnique({ where: { ownerId: userId } });
  if (!business) {
    sendError(reply, 404, 'Business not found. Complete onboarding first.');
    return null;
  }

  // Suspended businesses are blocked on the owner API. Admin impersonation is
  // exempt so support can still view (read) the suspended account.
  if (business.suspendedAt && isImpersonation !== true) {
    reply.status(403).send({
      error: 'ACCOUNT_SUSPENDED',
      reason: business.suspendedReason || 'Your account has been suspended.',
    });
    return null;
  }

  return business;
}
```

**How it resolves the caller's business:** solely from `request.user.userId` (the signed JWT claim), via `prisma.business.findUnique({ where: { ownerId: userId } })` (`businessFromUser.ts:32`). `ownerId` is `@unique` on Business, so this returns **exactly the business the caller owns, or none**.

**Can it ever return a business the caller does not own?** No. There is no client-supplied identifier in this function — the only input is the JWT `userId`. To obtain business B, an attacker would need a validly-signed JWT whose `userId` is business B's owner (i.e. B's own credentials).

**Impersonation:** an admin `impersonate` route mints a normal owner JWT additionally carrying `isImpersonation: true`. A suspended business is exempted from the `403 ACCOUNT_SUSPENDED` block only for impersonation sessions (read access for support), while destructive impersonation actions are separately fenced (see Section 4).

**Suspension:** any non-impersonation caller whose business is `suspendedAt` gets `403 ACCOUNT_SUSPENDED` before any handler logic runs.

### `authenticate` — `backend/src/middleware/auth.ts:3-9`

```ts
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    reply.status(401).send({ error: 'Unauthorized' });
  }
}
```

**JWT verification / trusted claims:** `request.jwtVerify()` (from `@fastify/jwt`, registered in `plugins/jwt.ts`) verifies the token's signature against the server secret and rejects on failure. The only claim consumed downstream for tenancy is `userId`. **A forged or manipulated token cannot resolve to another business** unless it is validly signed — signature verification fails closed (`401`) for any tampered/unsigned token. Because the business is derived from `userId` (not from any request body/param), even a validly-signed token can only ever reach its own owner's business.

### Admin auth (separate credential) — `backend/src/middleware/adminAuth.ts:4-31`

```ts
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  try {
    const payload = (await request.adminVerify()) as { adminUserId: string; role: string };
    const admin = await prisma.adminUser.findUnique({
      where: { id: payload.adminUserId },
      select: { id: true, role: true, name: true, email: true },
    });
    if (!admin) return reply.status(401).send({ error: 'Admin not found' });
    request.adminUser = admin;
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}

export async function requireSuperAdmin(request: FastifyRequest, reply: FastifyReply) {
  await requireAdmin(request, reply);
  if (request.adminUser?.role !== 'SUPER_ADMIN') {
    return reply.status(403).send({ error: 'Forbidden — Super Admin access required' });
  }
}
```

Admin auth uses `request.adminVerify()` — a **separate JWT namespace/secret** (`plugins/adminJwt.ts`) distinct from the owner `jwtVerify()`. An owner token presented to an admin route fails `adminVerify()` → `401`. (See Section 4.)

### Impersonation guard — `backend/src/middleware/impersonation.ts:23-59`

```ts
export function isImpersonationBlocked(method: string, routeUrl: string): boolean {
  if (method === 'DELETE') return true;
  if (method === 'PATCH' && routeUrl.endsWith('/payment')) return true;
  return false;
}

export async function impersonationGuard(request: FastifyRequest, reply: FastifyReply) {
  const auth = request.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return;
  let isImpersonation = false;
  try {
    const payload = await request.jwtVerify<{ isImpersonation?: boolean }>();
    isImpersonation = payload?.isImpersonation === true;
  } catch { return; }
  if (!isImpersonation) return;
  const routeUrl = request.routeOptions?.url ?? request.url;
  if (isImpersonationBlocked(request.method, routeUrl)) {
    return reply.status(403).send({ error: 'IMPERSONATION_READONLY', ... });
  }
}
```

Registered as a global `preHandler` (`index.ts:58`). An impersonation token (minted for a specific business) is blocked from every `DELETE` and every `PATCH …/payment`.

---

## Section 2 — Every backend owner route (exhaustive)

125 route handlers were enumerated across all 25 files. Legend: **scoped** = calls `getBusinessOrFail` and filters queries by `businessId`. **id pattern** for `:id` routes: `findFirst{id,businessId}` (fetch scoped) / `updateMany{id,businessId}` / `ownership-checked-after-fetch` (a `businessId`-scoped `findFirst` returns 404 before the bare `update({where:{id}})`) / `nested-parent-verified` (child bound to an owned parent). All ids are cuids (globally unique), so an `ownership-checked-after-fetch` `update({where:{id}})` cannot hit a different verified row.

### orders.ts (8) — all VERIFIED SCOPED
| Method + Path | id pattern | Verdict | Line |
|---|---|---|---|
| GET /orders | list, `where.businessId` | VERIFIED SCOPED | 44 |
| POST /orders | create; customerId+productIds re-validated by businessId | VERIFIED SCOPED | 98 |
| GET /orders/:id | findFirst{id,businessId} | VERIFIED SCOPED | 149 |
| GET /orders/:id/payment-proof | findFirst{id,businessId}, then this business's own bot token | VERIFIED SCOPED | 170 |
| PATCH /orders/:id/status | ownership-checked-after-fetch (findFirst L211) | VERIFIED SCOPED | 206 |
| PATCH /orders/:id/payment | ownership-checked-after-fetch (findFirst L242) | VERIFIED SCOPED | 237 |
| DELETE /orders/:id | updateMany{id,businessId} via softDelete | VERIFIED SCOPED | 269 |
| POST /orders/:id/restore | updateMany{id,businessId} via restore | VERIFIED SCOPED | 280 |

### appointments.ts (10) — all VERIFIED SCOPED
| Method + Path | id pattern | Verdict | Line |
|---|---|---|---|
| GET /appointments | list, `where.businessId` | VERIFIED SCOPED | 49 |
| POST /appointments | create; serviceId/staffId re-validated by businessId | VERIFIED SCOPED | 84 |
| GET /appointments/:id | findFirst{id,businessId} | VERIFIED SCOPED | 134 |
| PATCH /appointments/:id | ownership-checked-after-fetch (L157) | VERIFIED SCOPED | 152 |
| PATCH /appointments/:id/status | ownership-checked-after-fetch (L234) | VERIFIED SCOPED | 229 |
| PATCH /appointments/:id/payment | ownership-checked-after-fetch (L255) | VERIFIED SCOPED | 250 |
| PATCH /appointments/:id/notes | ownership-checked-after-fetch (L274) | VERIFIED SCOPED | 269 |
| GET /availability | scoped by businessId | VERIFIED SCOPED | 291 |
| DELETE /appointments/:id | updateMany{id,businessId} | VERIFIED SCOPED | 324 |
| POST /appointments/:id/restore | updateMany{id,businessId} | VERIFIED SCOPED | 335 |

### projects.ts (10) — all VERIFIED SCOPED (nested milestones/invoices bound to owned project)
| Method + Path | id pattern | Verdict | Line |
|---|---|---|---|
| GET /projects | list, `where.businessId` | VERIFIED SCOPED | 56 |
| POST /projects | create; customerId validated by businessId | VERIFIED SCOPED | 87 |
| GET /projects/:id | findFirst{id,businessId} | VERIFIED SCOPED | 118 |
| PATCH /projects/:id | ownership-checked-after-fetch (L149) | VERIFIED SCOPED | 143 |
| DELETE /projects/:id | ownership-checked-after-fetch (L182) | VERIFIED SCOPED | 176 |
| POST /projects/:id/milestones | nested-parent-verified (project owned, L200) | VERIFIED SCOPED | 194 |
| PATCH /projects/:id/milestones/:milestoneId | nested-parent-verified (L233+238) | VERIFIED SCOPED | 221 |
| DELETE /projects/:id/milestones/:milestoneId | nested-parent-verified (L293+298) | VERIFIED SCOPED | 281 |
| POST /projects/:id/invoices | nested-parent-verified (project owned, L321) | VERIFIED SCOPED | 315 |
| PATCH /projects/:id/invoices/:invoiceId/paid | nested-parent-verified (L365+370) | VERIFIED SCOPED | 353 |

### customers.ts (11) — all VERIFIED SCOPED
| Method + Path | id pattern | Verdict | Line |
|---|---|---|---|
| GET /customers | list, `where.businessId` | VERIFIED SCOPED | 55 |
| POST /customers | create bound to businessId | VERIFIED SCOPED | 135 |
| GET /customers/:id | findFirst{id,businessId}; all child reads keyed off that customer.id | VERIFIED SCOPED | 185 |
| PATCH /customers/:id | ownership-checked-after-fetch (L255) | VERIFIED SCOPED | 250 |
| PATCH /customers/:id/notes | ownership-checked-after-fetch (L285) | VERIFIED SCOPED | 280 |
| POST /customers/:id/tags | ownership-checked-after-fetch | VERIFIED SCOPED | 302 |
| DELETE /customers/:id/tags/:tagId | findFirst{id,businessId} | VERIFIED SCOPED | 327 |
| POST /customers/:id/reminders | ownership-checked-after-fetch (customer L347); reminder created with businessId | VERIFIED SCOPED | 342 |
| POST /customers/:id/message | ownership-checked-after-fetch (L372); sends via this business's bot | VERIFIED SCOPED | 367 |
| DELETE /customers/:id | updateMany{id,businessId} | VERIFIED SCOPED | 414 |
| POST /customers/:id/restore | updateMany{id,businessId} | VERIFIED SCOPED | 426 |

### business.ts (12) — all mutations target `where:{id: business.id}` (no client id)
| Method + Path | id pattern | Verdict | Line |
|---|---|---|---|
| GET /business | scoped (hides botToken fields) | VERIFIED SCOPED | 215 |
| GET /platform-settings | no tenant data (global settings) | N/A | 230 |
| POST /business | create, keyed to `ownerId: userId`, 409 if exists | VERIFIED SCOPED (create) | 235 |
| PATCH /business | `update where {id: business.id}` | VERIFIED SCOPED | 262 |
| PATCH /business/payment | `where {id: business.id}` | VERIFIED SCOPED | 291 |
| PATCH /business/bot-token | `where {id: business.id}`; collision check is reject-only | VERIFIED SCOPED | 321 |
| PATCH /business/fcm-token | `where {id: business.id}` | VERIFIED SCOPED | 356 |
| GET /business/bot | scoped | VERIFIED SCOPED | 370 |
| POST /business/calendar-token | `where {id: business.id}` | VERIFIED SCOPED | 386 |
| DELETE /business/calendar-token | `where {id: business.id}` | VERIFIED SCOPED | 403 |
| GET /business/reminder-settings | scoped | VERIFIED SCOPED | 417 |
| PATCH /business/reminder-settings | `where {id: business.id}` | VERIFIED SCOPED | 426 |

None of the business routes accept a client-supplied id selecting the row to mutate — resolution is always by the caller's own `userId`.

### products.ts + services.ts + staff.ts (15) — all VERIFIED SCOPED
| Method + Path | id pattern | Verdict | Line |
|---|---|---|---|
| GET /products | list businessId | VERIFIED SCOPED | 22 |
| POST /products | create bound businessId | VERIFIED SCOPED | 33 |
| GET /products/:id | findFirst{id,businessId} | VERIFIED SCOPED | 46 |
| PATCH /products/:id | ownership-checked-after-fetch (L63) | VERIFIED SCOPED | 58 |
| DELETE /products/:id | ownership-checked-after-fetch (L80) | VERIFIED SCOPED | 75 |
| PATCH /products/:id/toggle | ownership-checked-after-fetch (L94) | VERIFIED SCOPED | 89 |
| GET /services | list businessId | VERIFIED SCOPED | 33 |
| POST /services | create bound businessId | VERIFIED SCOPED | 45 |
| PATCH /services/:id | ownership-checked-after-fetch (L85); staffIds re-validated by businessId | VERIFIED SCOPED | 80 |
| PATCH /services/:id/toggle | ownership-checked-after-fetch (L126) | VERIFIED SCOPED | 121 |
| DELETE /services/:id | updateMany{id,businessId} | VERIFIED SCOPED | 141 |
| GET /staff | list businessId | VERIFIED SCOPED | 47 |
| POST /staff | create bound businessId | VERIFIED SCOPED | 59 |
| PATCH /staff/:id | ownership-checked-after-fetch (L101); serviceIds re-validated by businessId | VERIFIED SCOPED | 96 |
| DELETE /staff/:id | ownership-checked-after-fetch (L145) | VERIFIED SCOPED | 140 |

Note: `StaffService` join rows have no `businessId` column; they are gated by verifying the parent Staff/Service belongs to the caller's business, and the counterpart id set is re-validated by `businessId` (`services.ts:105/107`, `staff.ts:120/122`).

### blocked-slots.ts + custom-fields.ts + stages.ts + checkout-questions.ts (16) — all VERIFIED SCOPED
| Method + Path | id pattern | Verdict | Line |
|---|---|---|---|
| GET /blocked-slots | list businessId | VERIFIED SCOPED | 21 |
| POST /blocked-slots | nested-parent-verified (staff owned) | VERIFIED SCOPED | 47 |
| DELETE /blocked-slots/:id | findFirst{id,businessId} then delete | VERIFIED SCOPED | 78 |
| GET /custom-fields | list businessId | VERIFIED SCOPED | 20 |
| POST /custom-fields | create bound businessId | VERIFIED SCOPED | 32 |
| DELETE /custom-fields/:fieldId | findFirst{id,businessId} then update | VERIFIED SCOPED | 51 |
| PATCH /customers/:customerId/fields | customer + every fieldId re-validated by businessId | VERIFIED SCOPED | 69 |
| GET /stages | list businessId | VERIFIED SCOPED | 26 |
| POST /stages | create bound businessId | VERIFIED SCOPED | 38 |
| PATCH /stages/:stageId | findFirst{id,businessId} then update | VERIFIED SCOPED | 57 |
| DELETE /stages/:stageId | findFirst{id,businessId}; cascade updateMany scoped businessId | VERIFIED SCOPED | 78 |
| PATCH /customers/:customerId/stage | customer + stageId both re-validated by businessId | VERIFIED SCOPED | 103 |
| GET /checkout-questions | list businessId | VERIFIED SCOPED | 22 |
| POST /checkout-questions | create bound businessId | VERIFIED SCOPED | 34 |
| PATCH /checkout-questions/:questionId | findFirst{id,businessId} then update | VERIFIED SCOPED | 53 |
| DELETE /checkout-questions/:questionId | findFirst{id,businessId} then update | VERIFIED SCOPED | 74 |

### analytics.ts + home.ts + reminders.ts + device-token.ts (5) — all VERIFIED SCOPED
| Method + Path | id pattern | Verdict | Line |
|---|---|---|---|
| GET /analytics | all aggregates keyed by businessId | VERIFIED SCOPED | 7 |
| GET /home | all queries keyed by businessId | VERIFIED SCOPED | 14 |
| GET /reminders | list businessId | VERIFIED SCOPED | 14 |
| PATCH /reminders/:id | findFirst{id,businessId} then update | VERIFIED SCOPED | 35 |
| POST /device-token | upsert keyed on compound `businessId_token`; server-set businessId | VERIFIED SCOPED | 9 |

### proposals.ts + calendar.ts + onboarding.ts + user.ts + auth.ts (13)
| Method + Path | id pattern | Verdict | Line |
|---|---|---|---|
| **GET /proposals/:projectId** | **bare findFirst{id, deletedAt} — NO businessId (public)** | **GAP → §7 P2 (LOW)** | 8 |
| **POST /proposals/:projectId/accept** | **findFirst{id} then update{id} — NO businessId; only guard status==='PROPOSAL_SENT' (public)** | **GAP → §7 P1 (HIGH)** | 47 |
| **GET /invoices/:invoiceId** | **bare findFirst{id} — NO businessId (public)** | **GAP → §7 P2 (LOW)** | 85 |
| GET /calendar/:token.ics | resolves business by unguessable `calendarToken`; all child queries scoped by that businessId | VERIFIED (token capability) | 10 |
| POST /onboarding/verify-bot-token | no tenant id; validates token+username uniqueness | N/A | 53 |
| POST /onboarding/complete | keyed to `ownerId: userId` (creates caller's own business) | VERIFIED SCOPED | 83 |
| PATCH /user/email-consent | `update where {id: userId}` (JWT id IS the User row) | VERIFIED SCOPED | 52 |
| PATCH /user/dismiss-email-prompt | `update where {id: userId}` | VERIFIED SCOPED | 75 |
| POST /auth/enroll/start | creates LinkToken; no tenant data | N/A (public) | 68 |
| GET /auth/enroll/status | findUnique by bearer `token` | N/A (public) | 92 |
| POST /auth/enroll/verify | findUnique by `token` + user upsert by phone | N/A (public) | 116 |
| POST /auth/login/request | lookup by canonical phone; code sent only to bound chat | N/A (public) | 206 |
| POST /auth/login/verify | findUnique by phone after code verification | N/A (public) | 276 |

### The critical pattern (IDOR hunter — 169 tenant-data DB calls)

Every `findUnique`/`findFirst`/`update`/`updateMany`/`delete`/`deleteMany` on tenant data in `backend/src/routes/` was independently enumerated. **165 sites are `businessId`-scoped** (directly, via a preceding `businessId`-scoped `findFirst` in the same handler, or via a verified owned parent). **The only 4 sites that read/mutate tenant data by a client-supplied id WITHOUT a `businessId` binding are all in `proposals.ts`** (lines 11, 55, 64, 88) — the public link routes (§7 P1/P2). No other route in the codebase does a bare `findUnique({where:{id}})` / `update({where:{id}})` on a client-supplied tenant id.

---

## Section 3 — Bot internal endpoints (`bot.ts`, 20 routes + `internal.ts`, 5)

**Secret gating:** every `/bot/*` route calls `verifyBotSecret` (`bot.ts:17-26`), a constant-time `timingSafeEqual` against `BOT_MANAGER_SECRET`. **Business resolution:** from the bot's `botUsername` via `findBusinessByUsername` (`bot.ts:29-36`, `business.findUnique({where:{botUsername}})`); `botUsername` is `@unique`, so a request maps to exactly one business — bot A cannot name business B.

**Customer/order/appointment scoping within the resolved business** — all VERIFIED SCOPED:
- `POST /bot/customers` (L218): `upsert` on compound unique `businessId_telegramUserId` with `businessId: business.id` (L253) — another business's `telegramUserId` targets a distinct row.
- `POST /bot/customers/erase` (L292): `findUnique businessId_telegramUserId`.
- `POST /bot/orders` (L315): customer `findFirst{id,businessId}` (L333), products filtered by businessId, order created with businessId, stock decrement `updateMany` guarded by businessId.
- `POST /bot/payment-received` (L486) / `POST /bot/confirm-payment` (L1209): order `findFirst{id,businessId}` before update.
- `GET /bot/customer-orders|customer-appointments|projects/:botUsername/:telegramUserId` (L575/859/978): customer + rows both `businessId`-scoped.
- `POST /bot/appointments` (L691): customer/service/staff each `findFirst{…,businessId}`; created with businessId.
- `POST /bot/cancel-appointment` (L806): appointment `findFirst{id,businessId}` before update.
- `POST /bot/milestone-review` (L1024): `findFirst{id, project:{businessId}}` parent-relation check.
- `POST /bot/accept-proposal` (L1101): `findFirst{id,businessId}` **plus** telegram-identity ownership check (L1129).
- `POST /bot/message` (L1165): customer `findFirst{businessId,telegramUserId}`.
- `POST /bot/set-owner-chat` / `mark-reminder-sent`: `updateMany{id,businessId}`.

**No `/bot/*` route trusts a client-supplied `businessId`/`customerId`/`orderId` without binding it to the authenticated bot's resolved business.** `internal.ts` routes (`get-bot-token`, `start-bot`, `businesses`, `platform/*`) are bot-manager infrastructure (no per-tenant owner data returned to a client).

**Two intra-tenant (NOT cross-tenant) authorization gaps** — a customer of business X can act on *another customer of the same business X* (never another tenant):
- `POST /bot/cancel-appointment` (`bot.ts:837`): the appointment is `businessId`-scoped but the requesting customer's telegram identity is not verified against the appointment's customer → §7 B1 (LOW, intra-tenant).
- `POST /bot/milestone-review` (`bot.ts:1064`): the milestone's project is `businessId`-scoped but not verified to belong to the requesting telegram customer → §7 B2 (LOW, intra-tenant).

---

## Section 4 — Admin routes (`admin.ts` + `adminData.ts`)

Admin routes intentionally cross tenants; the audit verified the **gates**. All 37 admin routes are gated by `requireAdmin` or `requireSuperAdmin` (`adminAuth.ts`), which use `request.adminVerify()` — a **separate JWT namespace/secret** from the owner `jwtVerify()`.

- **Owner token cannot reach an admin route:** an owner JWT fails `adminVerify()` (different secret/namespace) → `401` (`adminAuth.ts:9,21`). The owner `authenticate()` is never used on any admin route (`admin.ts:6`, `adminData.ts`). VERIFIED.
- **Impersonation scoped:** `POST /admin/businesses/:id/impersonate` (`admin.ts:384`) mints an owner token for that `:id` only; the token carries `isImpersonation: true` and resolves via `getBusinessOrFail` to exactly that business. `impersonationGuard` (`impersonation.ts:23`) blocks every `DELETE` and every `PATCH …/payment` for such tokens. A token minted for business A cannot act on business B (its `userId`/business binding is fixed at mint time). VERIFIED.
- **Decrypted bot tokens / card numbers are never returned to admins:** the admin data routes select non-sensitive fields; no `getBotToken`/decrypt output is placed in an admin response (`adminData.ts`). VERIFIED.
- Sensitivity split: destructive/global actions require `SUPER_ADMIN` (e.g. business erase, admin-user management); routine read/edit require `ADMIN`.

Representative gate rows (all VERIFIED): `GET/PATCH/POST /admin/businesses/:id*` (`admin.ts:194-426`), `/admin/platform-settings` (427/434), `/admin/users*` (483-521, super-admin), `/admin/legal-docs*` (559-580), all `/admin/{customers,orders,appointments,projects}/:id` read/edit/delete/restore (`adminData.ts:249-502`), `/admin/customers/:id/anonymize` (530), `/admin/businesses/:id/erase` (559), `/admin/search` (638).

---

## Section 5 — Other surfaces (client-side is UX, not security)

Every web (Next.js) and Flutter screen that fetches or mutates a record by an id taken from the URL/route calls a backend endpoint that is itself scoped per Section 2 — **the backend is the real gate**. Client-side route guards are UX only.

- **Web** — `/orders/[id]` (read/status/payment/delete/proof: `web/app/orders/[id]/page.tsx:35-90`), `/customers/[id]` (read/notes/delete: `web/app/customers/[id]/page.tsx:37-73`) → backend `orders.ts`/`customers.ts` rows (scoped). Admin `/admin/businesses/[id]` and `BusinessDataManager` → admin gates (Section 4).
- **App (Flutter)** — `/orders/:id`, `/customers/:id`, `/appointments/:id`, `/projects/:id`, `/catalog/:id`, `/services/:id`, `/staff/:id` (`order_detail_provider.dart:9`, `customer_detail_provider.dart:9`, `appointments_provider.dart:217`, `projects_provider.dart:23`, `api_service.dart:959`, etc.) → backend rows (scoped).
- **Client guards labelled UX-only:** `web/components/AuthLayout.tsx:28`, `web/components/admin/AdminLayout.tsx:32`, `app/lib/core/router/router.dart:130`. None of these enforce tenant isolation — the backend does.

No surface was found where the frontend is the *only* thing preventing access to another tenant's record; in every case the backend route is scoped (cross-referenced to Section 2).

---

## Section 6 — Cross-tenant test coverage (`backend/test/`)

`cross-tenant.test.ts` seeds two businesses A and B and asserts "B cannot read/mutate A's record → 404/403". **Covered (real isolation assertions):**

| Model | Coverage | Line |
|---|---|---|
| Customers | read + mutate + list + delete/restore | cross-tenant.test.ts:42 |
| Orders | read + status + list + delete/restore | :45 |
| Appointments | read + status/payment/notes + list + delete/restore + edit | :48 |
| Products | read + patch + delete + toggle + list | :54 |
| Services | patch + toggle + list (GET-by-id not tested) | :109 |
| Staff | patch + delete + list | :116 |
| Projects | read + patch + delete + list | :51 |
| Milestones (nested) | incl. cross-project injection | :140 |
| Invoices (nested) | mark-paid | :152 |
| Blocked-slots | delete + list | :130 |
| Analytics | aggregate does not cross tenants | :234 |
| Availability | cannot probe A's service | :249 |
| Bot (partial) | mark-reminder-sent, confirm-payment, milestone-review | :257 |

**Coverage gaps (route is scoped in code — verified in §2/§3 — but has NO isolation test):**
- Business settings **mutations** (only `GET /business` is tested): `PATCH /business`, `/business/payment`, `/business/bot-token`, `/business/fcm-token`, `/business/calendar-token` (POST/DELETE), `/business/reminder-settings`.
- `custom-fields.ts`, `stages.ts`, `checkout-questions.ts`, `reminders.ts`, `device-token.ts` — no cross-tenant assertion.
- `proposals.ts` public routes + `GET /invoices/:invoiceId` — no auth/exposure test.
- `calendar.ts` ICS feed — no wrong/guessed-token test.
- Bot customer scoping: `POST /bot/customers`, `/bot/orders`, `/bot/appointments`, `/bot/cancel-appointment`, `/bot/message`, and the `GET /bot/customer*` lookups — no A-vs-B assertion.
- `POST /customers/:id/message` and `POST /bot/message` — no foreign-customer 404 assertion.

`boundary.test.ts` covers auth gates only (not A-vs-B); `erase-scrub.test.ts` is single-tenant PII scrub.

---

## Section 7 — Prioritized findings

No BLOCKER (no authenticated cross-tenant read/write path exists). Findings below, most-severe first. Per audit rules, no remediations are proposed here.

| # | Severity | Finding | file:line | Verified |
|---|---|---|---|---|
| P1 | **HIGH** | `POST /proposals/:projectId/accept` is **unauthenticated** and resolves the project solely from the client-supplied `:projectId` (`findFirst{id, deletedAt}`, no `businessId`, no ownership/customer-identity check), guarded only by `status==='PROPOSAL_SENT'`, then `update({where:{id}})` to `IN_PROGRESS`. Anyone who obtains/guesses **any** business's project id can force-accept that proposal; the response also returns that business's `ownerTelegramChatId` and customer name. Classed HIGH (IDOR on a mutation). Not BLOCKER: it is not an authenticated A→B pivot. Practical exploitability is bounded by the id being a high-entropy cuid (capability URL) and the route being public-by-design (shareable accept link); effect is limited to a state transition + the accept-response fields. | `proposals.ts:47,55,64` | CONFIRMED (adversarial) |
| P2 | **LOW** | `GET /proposals/:projectId` and `GET /invoices/:invoiceId` are public reads keyed only by cuid (no `businessId`). By design (shareable proposal/invoice links); exposed fields are bounded (project/invoice details, business name/description, customer name, milestone amounts) — **no** card number, phone, internal notes, or bot token. Confidentiality rests on cuid unguessability (capability-URL pattern). | `proposals.ts:8,85` | CONFIRMED read / REFUTED as breach |
| B1 | **LOW** (intra-tenant) | `POST /bot/cancel-appointment`: appointment is `businessId`-scoped but the requesting customer's telegram identity is not checked against the appointment's customer — a customer of business X can cancel *another customer of business X*'s appointment. Not cross-tenant (bound to one business). | `bot.ts:806,837` | CONFIRMED (intra-tenant) |
| B2 | **LOW** (intra-tenant) | `POST /bot/milestone-review`: milestone's project is `businessId`-scoped but not verified to belong to the requesting telegram customer — same-business customer-vs-customer gap. Not cross-tenant. | `bot.ts:1024,1064` | CONFIRMED (intra-tenant) |
| T1 | **MEDIUM** | Business-settings **mutation** routes are scoped in code but have no cross-tenant isolation test (only `GET /business` is tested). | `business.ts:262-426`; test `cross-tenant.test.ts:219` | Code REFUTED as vuln; test gap |
| T2 | **MEDIUM** | `custom-fields`, `stages`, `checkout-questions`, `reminders`, `device-token` routes are scoped in code (verified §2) but have no isolation test. | `custom-fields.ts`, `stages.ts`, `checkout-questions.ts`, `reminders.ts`, `device-token.ts` | Code REFUTED as vuln; test gap |
| T3 | **MEDIUM** | Bot customer/order/appointment scoping and `POST /customers/:id/message` are scoped in code (verified §3) but have no A-vs-B isolation test. | `bot.ts:218,315,691,1165`; `customers.ts:367` | Code REFUTED as vuln; test gap |
| T4 | **MEDIUM** | `calendar.ts` ICS feed relies on a 192-bit random `calendarToken` (correct, verified) but has no wrong/guessed-token test. | `calendar.ts:10` | Code REFUTED as vuln; test gap |

### What was verified (no gaps)
- **All 108 authenticated owner + bot tenant-data routes** resolve the tenant from the caller's own identity and scope every query by `businessId`; cross-tenant id substitution returns 404/403. (§2, §3)
- **The isolation chokepoint** (`getBusinessOrFail`) cannot return another tenant's business — it keys solely on the JWT `userId`. (§1)
- **Only 4 of 169 tenant-data DB calls** are unscoped-by-`businessId`, all in the public `proposals.ts` link routes (P1/P2). Every other by-id write is `updateMany{id,businessId}` or a `businessId`-scoped `findFirst` ownership check. (§2)
- **Admin auth is a fully separate credential**; owner tokens cannot reach admin routes; impersonation is business-scoped and write-fenced; no secrets returned to admins. (§4)
- **Client surfaces** never act as the sole gate; the backend enforces ownership for every by-id fetch. (§5)
