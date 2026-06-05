# Backend tests — cross-tenant data isolation

This suite is the **regression guard** for multi-tenant isolation: it proves that
Business B can never read or mutate Business A's data through the API, that bot
endpoints stay within the business their `botUsername` resolves to, and that the
admin/impersonation boundary holds.

Runner: **Vitest**. Requests go through the real Fastify app via `app.inject()`
(no network). Source: [test/](./test/).

## ⚠️ Safety — never run against production

These tests **truncate** the database they point at. They will **only** use
`TEST_DATABASE_URL`, and [test/setup.ts](./test/setup.ts) hard-aborts if the
resolved URL looks like the Railway/production host. `backend/.env` is **not**
loaded by the test runner (`envDir` is `./test`). Point `TEST_DATABASE_URL` at a
**throwaway local Postgres** — never at production.

## Running

```bash
cd backend
npm test          # vitest run (CI mode: exits non-zero on any failure)
npm run test:watch
```

### Without a test DB (default here)
If `TEST_DATABASE_URL` is unset, the DB-dependent suites **skip cleanly** with a
message, and the DB-free auth-boundary tests still run and pass. The command
exits `0`.

### With a throwaway Postgres (full run)
1. Start a local Postgres, e.g. with Docker:
   ```bash
   docker run --rm -d --name crm-test-db -e POSTGRES_PASSWORD=test \
     -e POSTGRES_DB=crm_test -p 5433:5432 postgres:16
   ```
2. Point the suite at it and create the schema (one-time per DB):
   ```bash
   export TEST_DATABASE_URL="postgresql://postgres:test@localhost:5433/crm_test"
   DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate deploy   # or: prisma db push
   ```
   You can also put `TEST_DATABASE_URL=...` in `backend/test/.env` instead of
   exporting it (that file is git-ignored and loaded automatically).
3. Run the tests:
   ```bash
   npm test
   ```

Each run wipes and re-seeds the two tenants, so it is repeatable. Any isolation
assertion failure makes `npm test` exit **non-zero** (suitable for CI / pre-deploy).

## What it covers

- **Fixtures** ([test/helpers/seed.ts](./test/helpers/seed.ts)): Business A and B,
  each with its own Customer, Service, Staff, Appointment, Project (+ Milestone,
  Invoice), BlockedSlot, Product and (CONFIRMED) Order — plus a super-admin.
- **Owner isolation** ([test/cross-tenant.test.ts](./test/cross-tenant.test.ts)):
  - B cannot `GET` A's customer/order/appointment/project/product by id → `404`.
  - B cannot `PATCH`/`DELETE`/toggle A's appointment/order/customer/product/
    service/staff/project/blocked-slot → `404`, and the record is asserted
    **unchanged** in the DB.
  - Nested: B cannot patch/delete A's milestone, mark A's invoice paid, or add a
    milestone to A's project; nor reach A's milestone by nesting it under B's own
    project → `404`, unchanged.
  - Lists (`/customers`, `/orders`, `/appointments`, `/projects`, `/services`,
    `/staff`, `/products`, `/blocked-slots`) as B contain only B's rows.
  - `GET /business` as B returns B and **never** exposes
    `botTokenEncrypted/Iv/Tag`.
  - `/analytics`, `/home`, `/availability` as B never include A's data.
- **Bot endpoints**: A's `botUsername` paired with B's record id on
  `/bot/mark-reminder-sent`, `/bot/confirm-payment`, `/bot/milestone-review` →
  `404`/no mutation (guards the class of gap fixed at `bot.ts:760`). Positive
  control confirms A's own ids still work.
- **Admin boundary** ([test/boundary.test.ts](./test/boundary.test.ts) +
  cross-tenant): an owner JWT cannot reach `/admin/*` (`401/403`); an
  impersonation token issued for A acts on A but `404`s on B's records.
- **Boundary (no DB)**: app builds, protected routes require auth, bot endpoints
  require the shared secret.
