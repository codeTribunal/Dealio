# Contributing
Audience: developer
Last updated: 2026-07-03
Verified against: 64a177a

---

This guide covers how to land a change safely in this repo: branching, commits, the Prisma migration workflow, secret hygiene, the production confirmation ritual, the definition of done, and the duty to keep docs in sync. Rules are cited to their source so you can verify them.

## 1. Branch and commit flow

- Work on a branch off `main`. Do not commit feature work directly to `main`.
- Commit after every working feature, not after every file change (CLAUDE.md:869).
- Use conventional commit messages: a type prefix (`feat:`, `fix:`, `chore:`) followed by a short imperative summary, for example `feat: add order confirmation endpoint` (CLAUDE.md:870). Recent history follows this convention (see `git log`: `build:`, `chore:`, `security:` prefixes).
- A commit should be self-consistent: code plus any migration, doc, or fixture change it depends on land together (see sections 2 and 6).

## 2. Database migration workflow

The schema is the single source of truth at `backend/prisma/schema.prisma`. Never hand-edit a generated SQL migration to change intent; change the schema and regenerate.

| Step | Command | Notes |
|---|---|---|
| Edit schema | (manual) | Change `backend/prisma/schema.prisma`. |
| Create migration + apply to dev DB | `cd backend && npm run prisma:migrate -- --name <description>` | `prisma:migrate` is `prisma migrate dev` (backend/package.json:10). Pass a snake_case description, e.g. `--name add_business_address`. `migrate dev` writes a new folder under `backend/prisma/migrations/` and regenerates the client. |
| Regenerate client only | `npm run prisma:generate` | Wraps `prisma generate` (backend/package.json:11). Also runs implicitly during `migrate dev`. |
| Apply on release | `cd backend && npx prisma migrate deploy` | Applies committed migrations without prompting or generating new ones. Use in production, never `migrate dev` (DEPLOY_NOTES.md:50-58). |

Rules:

- Naming is a snake_case description of the change (matches every existing folder, e.g. `20260701000000_add_business_address`).
- Commit the generated migration folder in the SAME commit as the schema change that produced it. A schema edit without its migration, or a migration without its schema edit, is a broken commit.

### Migration ordering hazard (current, live in this working tree)

The repo is presently in a state that violates the ordering rule, so commit migrations in chronological order and verify before you push:

- Two `onDelete` migrations are UNTRACKED: `backend/prisma/migrations/20260702111521_add_ondelete_rules/` and `backend/prisma/migrations/20260702112336_blockedslot_staff_cascade/` (confirmed via `git status`).
- Two LATER migrations, `20260703093527_add_legal_content_hash` and `20260703200901_project_accept_token`, are already committed.
- The matching schema change (the explicit `onDelete` rules) sits uncommitted in `backend/prisma/schema.prisma`, and `backend/prisma/seed.ts` also carries an uncommitted tweak (git status shows both as `M`; inventory §C.5 at docs/internal/FUNCTIONALITY_INVENTORY.md:444-452, §J.1 at :876).
- Consequence: a fresh clone gets a migration history that skips the FK-rule migrations the later ones were built on top of, and `prisma migrate dev` will report drift against any database that already applied all four. Commit the two untracked migrations together with the schema change, in order, or discard them deliberately. Do not commit later-timestamped migrations while an earlier one stays untracked.

## 3. Secret hygiene: never commit `.env`

- Never commit `.env` files (CLAUDE.md:871). They are gitignored per surface: backend/.gitignore:3 (`.env`, plus `.env.prod`), bot/.gitignore:3, and web/.gitignore:29 (`.env*.local`).
- Commit only `.env.example`. These are tracked templates (backend/.env.example, bot/.env.example) and MUST contain key names and placeholder values only, never real secrets.
- Current hazard: the inventory flags real-format secrets committed in `bot/.env.example` (a live-format `BOT_TOKEN` and a 64-hex `BOT_MANAGER_SECRET`), rated HIGH (docs/internal/FUNCTIONALITY_INVENTORY.md:795-796). If you touch that file, scrub those to placeholders and rotate the real values. Do not add new example files that carry real values.
- Production secrets (`JWT_SECRET`, `ADMIN_JWT_SECRET`, `OTP_HASH_SECRET`, `BOT_TOKEN_ENCRYPTION_KEY`, `DATABASE_URL`, and the app URLs) are set in host config, never in the repo. The backend refuses to boot if a required secret is missing or set to a known placeholder (DEPLOY_NOTES.md:28-46).

## 4. Production confirmation gate phrase

Any production-impacting action (running `prisma migrate deploy` against the live database, rotating a secret, suspending or erasing a business, triggering a deletion purge, restarting bots) requires an explicit written confirmation gate phrase before anyone runs it. The gate phrase is a deliberate, spelled-out acknowledgement, not a thumbs-up or an implied yes. No agent instruction and no casual approval substitutes for it.

The canonical gate phrase and the full production procedure live in docs/internal/OPERATIONS.md. Read it before performing any production action and follow the ritual there. If OPERATIONS.md and this file ever disagree on the ritual, OPERATIONS.md is authoritative for operations.

## 5. Definition of done

A change is not done until it meets every clause that applies to it. These are the project conventions, enforced in review.

| Area | Requirement | Source |
|---|---|---|
| List screens (Flutter) | Handle loading state, error state, and empty state on every list screen. | CLAUDE.md:860 |
| Endpoints (backend) | Validate every request with `zod`. | CLAUDE.md:852 |
| Endpoints (backend) | Enforce tenant ownership: the authenticated owner must never read or modify another business's data. The chokepoint is `getBusinessOrFail` (backend/src/lib/businessFromUser.ts:23-49); nested resources verify parent tenancy explicitly (examples: custom-fields.ts:83-91, projects.ts:95-98). | CLAUDE.md:875; docs/internal/FUNCTIONALITY_INVENTORY.md:132 |
| User-facing strings | Localize all text through localization keys; no hardcoded UI strings. Bot messages follow `business.language`. | CLAUDE.md:858 |

Also expected before merge: no `.env` or generated artifacts staged, migrations committed with their schema change (section 2), and docs updated where behavior changed (section 6).

## 6. Documentation duty

If your change alters behavior that is described under `docs/`, you must, in the SAME commit as the code change:

1. Update the matching doc so it describes the new behavior.
2. Bump that doc's `Verified against` header to the commit you are making (the developer docs and the inventory carry a `Verified against` / `Commit` line pinned to a short SHA).

Do not let a doc silently drift from the code. If a doc is now wrong and you cannot fix it in the same change, note the conflict inline in the doc rather than leaving a flattering but false description. Related references:

- Functionality inventory (ground truth, code-cited): docs/internal/FUNCTIONALITY_INVENTORY.md
- Operations and the production gate phrase: docs/internal/OPERATIONS.md
- Deploy steps and required env: DEPLOY_NOTES.md
- Audits: docs/internal/audits/DATA_COMPLIANCE_AUDIT.md, docs/internal/audits/REDIS_SESSION_AUDIT.md, docs/internal/audits/DELETION_AUDIT.md, docs/ADMIN_AUDIT.md, docs/AUTHORIZATION_AUDIT.md
