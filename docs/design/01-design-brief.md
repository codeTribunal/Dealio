# 01 — Design Brief

## What we are designing

A CRM and business-management platform for **Uzbekistan's informal small-business economy**. The
owner runs everything from a phone; their customers transact through a Telegram bot without
installing anything.

## Who uses it

### Surface 1 — The Owner (primary user of the app)
Three business archetypes, one app that adapts to the modes they enable:

| Persona | Example | Primary jobs | Mode |
|---------|---------|--------------|------|
| **Dilnoza — Product seller** | Sells cakes via Instagram/Telegram | Manage catalog, take orders, confirm P2P payments, track delivery | `PRODUCTS` |
| **Aziz — Service provider** | Runs a barbershop with 2 staff | Manage services & staff, accept bookings, see today's calendar, send reminders | `SERVICES` |
| **Kamola — Freelancer** | Video editor | Track projects, milestones, send invoices, share proposals | `FREELANCE` |

A single business can enable **multiple modes** (`Mode[]`). The app's navigation and home dashboard
must adapt to which modes are on. **Design for the multi-mode case, then degrade gracefully.**

Owner traits to design for:
- On a **phone**, often mid-task (cooking, cutting hair, editing). Glanceable > dense.
- Not a "power CRM" user. Low tolerance for jargon. Plain Uzbek/Russian labels.
- Mixed-quality Android devices and **intermittent connectivity** — design loading, error, offline,
  and empty states as first-class, not afterthoughts.

### Surface 2 — The Customer (primary user of the bot)
The owner's end customer. Interacts only through Telegram. Wants to browse/book/order and pay fast.
Never sees the CRM. May be a first-time Telegram-commerce user — flows must be **linear and
forgiving**, with a clear way back at every step.

## Market & cultural context (must inform design)

- **Languages:** Uzbek (Latin script) and Russian. Every string is localized; the bot speaks the
  business's configured language. Russian words run ~15% longer — **layouts must flex, never
  truncate hard.** The chosen typeface(s) must fully cover Cyrillic + Latin-with-diacritics.
- **Currency:** Always UZS, formatted `150 000 UZS` (space as thousands separator). Amounts are
  large numbers — design number-heavy components (totals, analytics) to stay legible.
- **Dates:** `15 yanvar 2026` (Uz) / `15 января 2026` (Ru).
- **Payment:** P2P card transfer only (Uzcard/Humo). No gateway. The hero interaction is "show card
  number with one-tap copy → customer pays → owner confirms." Design this trust-critical moment well.
- **Phone-number identity:** login is phone + OTP (no email/password).

## Design principles

1. **Glanceable first.** The owner should grasp "what needs my attention" in under 3 seconds on Home.
2. **One primary action per screen.** Each screen makes its single most important action obvious;
   everything else recedes. (How that emphasis is expressed is the designer's choice.)
3. **Status is the spine.** Orders, appointments, projects, payments all move through states. Status
   must be instantly readable (color + label + icon), never color alone (accessibility).
4. **Forgiving flows.** Every multi-step flow (onboarding, checkout, booking) has back, progress, and
   safe exit. No dead ends.
5. **Feels trustworthy, not flashy.** This app handles people's money and customer relationships;
   the experience should read as calm and dependable. (The visual expression of that is open.)
6. **Localization-proof.** No hardcoded widths around text. Test every screen in both languages.
7. **Bilingual parity.** Uzbek and Russian are equal first-class citizens, not translation
   afterthoughts.

## Accessibility targets

- WCAG AA contrast for text and essential UI.
- Status never communicated by color alone (pair with label + icon).
- Minimum touch target 44×44pt.
- Support OS dynamic text scaling up to ~130% without breaking layout.

## Out of scope (do not design)

- Payment gateway / in-app payments (P2P card only at launch).
- Customer-side mobile app (customers use Telegram).
- Multi-owner / team accounts inside one business beyond the `Staff` model.
