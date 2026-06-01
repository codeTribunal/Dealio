# 02 — Information Architecture

## Navigation model — Owner App

The app uses **mode-aware navigation**. Which destinations appear depends on the business's enabled
`Mode[]` (`PRODUCTS`, `SERVICES`, `FREELANCE`). Below: which sections belong to which mode.

| Section | PRODUCTS | SERVICES | FREELANCE | Always |
|---------|:--------:|:--------:|:---------:|:------:|
| Home (dashboard) | | | | ✅ |
| Catalog (products) | ✅ | | | |
| Orders | ✅ | | | |
| Services | | ✅ | | |
| Staff | | ✅ | | |
| Appointments | | ✅ | | |
| Projects | | | ✅ | |
| Customers | | | | ✅ |
| Messages (inbox) | | | | ✅ |
| Analytics | | | | ✅ |
| Settings | | | | ✅ |

### Primary navigation pattern
A **bottom tab bar** (mobile-native, thumb-reachable) carrying at most 5 destinations. Because the
destination set varies by mode, the tab bar is composed at runtime. Recommended composition:

- **1 mode (e.g. products only):** `Home · Orders · Catalog · Customers · More`
- **1 mode (services):** `Home · Calendar · Services · Customers · More`
- **1 mode (freelance):** `Home · Projects · Customers · Messages · More`
- **Multi-mode:** `Home · [Work] · Customers · Messages · More` where **Work** opens a hub that
  branches into the enabled modes (Orders / Calendar / Projects).

**"More"** holds overflow: Analytics, Settings, Staff, Services, and any mode sections not on the bar.

> Designer decision needed: confirm whether multi-mode owners get a combined "Work" hub or a
> segmented control at the top of Home. Provide both options in the wireframe review.

### Secondary navigation
- **Top app bar** per screen: title, contextual actions (search, filter, add), back affordance.
- **Detail screens** push over list screens (standard mobile stack).
- **Forms** open as full-screen routes or bottom sheets (designer's call per density).

## Content model → screen mapping

Derived from the Prisma schema. This is the canonical object inventory the IA must cover.

| Object | Owner screens | Customer (bot) touchpoints |
|--------|---------------|----------------------------|
| Business | Onboarding, Settings | (branding only) |
| Product | Catalog list, Product detail, Product form | Browse catalog, product detail |
| Order + OrderItem | Order list, Order detail | Cart, checkout, order status |
| Customer | Customer list, Customer detail | (the customer themself) |
| Service | Service list, Service form | Service selection |
| Staff + StaffService | Staff list, Staff form | Staff selection |
| Appointment | Calendar, Appointment detail | Booking flow, reminders |
| Project + Milestone + Invoice | Project list, Project detail, Milestone form | Project status, invoice notices |
| Message | Inbox, Conversation | Free-text to owner |
| Analytics (derived) | Analytics dashboard | — |

## Status taxonomy (the IA spine)

The designer must produce a single, consistent **status system** covering every state below. Each
state carries a semantic intent (neutral · in progress / awaiting action · positive / done ·
negative / cancelled); the visual treatment of those intents is the designer's to define. Status
must read by more than color alone.

| Domain | States |
|--------|--------|
| Payment | PENDING · PAYMENT_RECEIVED · CONFIRMED |
| Order | NEW · PREPARING · READY · DELIVERED · CANCELLED |
| Appointment | REQUESTED · CONFIRMED · COMPLETED · CANCELLED · NO_SHOW |
| Project | PROPOSAL_SENT · IN_PROGRESS · REVIEW · COMPLETED · CANCELLED |
| Milestone | PENDING · SUBMITTED_FOR_REVIEW · APPROVED · PAYMENT_RECEIVED |
| Invoice | UNPAID · PAID |

Grouping the states by intent (a starting point, not a prescription):
- *Neutral / new:* e.g. NEW, PENDING, PROPOSAL_SENT
- *In progress / awaiting action:* e.g. PREPARING, PAYMENT_RECEIVED, REQUESTED, SUBMITTED_FOR_REVIEW, UNPAID
- *Positive / done:* e.g. CONFIRMED, DELIVERED, COMPLETED, PAID, PAYMENT_RECEIVED (milestone)
- *Negative:* e.g. CANCELLED, NO_SHOW

How many visual treatments these collapse into, and how each looks, is the designer's call.

## Labeling

- Plain language, no CRM jargon. "Buyurtmalar" / "Заказы" not "Sales Pipeline."
- All labels are localization keys; never hardcode. The designer should annotate Figma text layers
  with their string key (e.g. `orders.title`) where known, or flag new strings needed.

## Navigation model — Telegram Bot

The bot is **stateless-feeling, linear, button-driven**. No hamburger, no tabs — inline keyboards and
slash commands only.

- **Entry:** `/start` → role-appropriate welcome with 1–2 big buttons.
- **Persistent commands** (Telegram command menu): `/orders`, `/appointments`, `/projects`, `/help`.
- **Within a flow:** every step shows a `← Back` and the bot remembers session state (cart, booking
  draft). A `✕ Cancel` returns to start.
- **Branching by business mode:** the welcome and command set reflect which mode(s) the business runs.

See `03-sitemap.md` for the full state tree and `06-wireframes-bot.md` for message mockups.
