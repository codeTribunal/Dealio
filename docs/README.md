# Dealio Documentation

Audience: internal
Last updated: 2026-07-03
Verified against: 64a177a

This is the index for all Dealio documentation. Start here.

## Folders

| Folder | Purpose | Audience | Publishable? |
|---|---|---|---|
| `internal/` | How the system actually works: architecture, backend, bot, web, app, data model, operations runbook, security, decision log, and the ground-truth functionality inventory. | internal | No, never |
| `internal/audits/` | Point-in-time security and compliance audit reports (data compliance, Redis sessions, deletion). Historical findings, some since remediated. | internal | No, never |
| `developer/` | Onboarding for engineers: setup, coding conventions, contributing workflow. | developer | No, never |
| `design/` | Design handoff package (visual foundation, IA, sitemap, flows, wireframes, components). | internal | No, never |
| `public/` | The only publishable folder. Owner guide and customer help, written for business owners and end customers. | public | Yes |

Two audit reports also remain at the top level of `docs/` for now:
`ADMIN_AUDIT.md` and `AUTHORIZATION_AUDIT.md`. They are internal and not
publishable.

## Files

Internal:

- `internal/ARCHITECTURE.md` - the four surfaces, communication paths, auth
  boundaries, multi-tenancy model, topology diagram.
- `internal/BACKEND.md` - route inventory with auth levels, middleware,
  schedulers and their wiring, plan limits, suspension behavior.
- `internal/BOT.md` - bot manager lifecycle, session model and TTL, all flows,
  consent gate, `/deletedata`, language resolution, proactive sends.
- `internal/WEB.md` - owner dashboard, admin panel, public pages, auth models,
  page-to-endpoint mapping.
- `internal/APP.md` - Flutter routes, providers, push handling, caching and
  sign-out, API base URL configuration.
- `internal/DATA_MODEL.md` - models, relations with onDelete rules, enums, and an
  appendix on why CLAUDE.md's old schema is wrong.
- `internal/OPERATIONS.md` - local bring-up, deploy flow, env var tables,
  scheduler status, the production confirmation-gate ritual, rollback and backups.
- `internal/SECURITY.md` - auth matrix, tenant isolation idiom, bot token
  encryption, rate limiting, audit log, impersonation, consent and deletion.
  Marked INTERNAL ONLY.
- `internal/DECISIONS.md` - decision log, newest first.
- `internal/FUNCTIONALITY_INVENTORY.md` - the code-cited ground-truth inventory
  that every other doc is derived from.

Developer:

- `developer/SETUP.md` - zero-to-running for a new hire.
- `developer/CONVENTIONS.md` - TypeScript, Dart/Riverpod, localization, brand,
  commit format, tenant-ownership rule.
- `developer/CONTRIBUTING.md` - branch and commit flow, migration workflow,
  definition of done, documentation duty.

Public (Russian; Uzbek mirrors to follow):

- `public/owner-guide/01-nachalo-raboty.md` - registration, onboarding, creating
  and connecting the Telegram bot.
- `public/owner-guide/03-uslugi-i-zapisi.md` - services, staff, slots,
  appointments, reminders.
- `public/owner-guide/04-proekty.md` - projects, milestones, invoices.
- `public/owner-guide/05-klienty.md` - customer list and card, notes,
  special-category-data warning.
- `public/owner-guide/06-nastroyki-i-tarify.md` - settings and FREE plan limits.
- `public/owner-guide/07-faq.md` - frequently asked questions.
- `public/customer-help.md` - one page for end customers.

The products owner guide, `internal/parked/02-tovary-i-zakazy.md`, is finished and
code-verified but held back while PRODUCTS (product-seller) mode is parked for
launch. Publish it to `public/owner-guide/02-tovary-i-zakazy.md` when PRODUCTS
un-parks. The rest of the public docs are written for the live services and
freelance modes.

## Trust rule

`internal/` and `developer/` (and `design/` and the two top-level audit files)
are INTERNAL and must never be published or shared outside the team. They name
internal endpoints, security constraints, and known gaps. `public/` is the only
folder that may be published, and only after review.

## Freshness rule

Any change that alters behavior described in a doc must, in the same commit,
update the matching doc and bump its `Verified against` header to the new
`git rev-parse --short HEAD`. A doc whose `Verified against` commit is far behind
`main` should be treated as suspect until re-verified against code. Code always
wins over docs; when they disagree, fix the doc.

## Source of truth

`backend/prisma/schema.prisma` is the sole source of truth for the data model.
The code is the sole source of truth for behavior. `internal/FUNCTIONALITY_INVENTORY.md`
is the verified snapshot the rest of these docs were built from. The root
`CLAUDE.md` contains historical route lists and build notes that are partly stale;
`docs/internal/` supersedes it.
