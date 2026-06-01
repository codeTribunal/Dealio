# 07 — Component Inventory

A functional list of the reusable UI the product needs. This describes **what each component must do
and which states it must cover** — it does **not** prescribe how any of it should look. Styling,
naming, structure, and which primitives to compose are the designer's decisions.

The list is exhaustive in *function*; the designer may consolidate, split, or rename freely.

## Foundations to define (from `00-visual-foundation.md`)
The designer establishes the full system: color, typography, spacing/grid, radii, borders,
elevation, iconography, and motion — including whether a dark theme is supported. Everything below
should be built on top of those foundations.

## Core components (function + required states)

| Component | What it does | States to cover |
|-----------|--------------|-----------------|
| Button | Triggers actions; one clear primary per screen | primary · secondary · subtle · destructive · icon-only · sizes · default/hover/pressed/disabled/loading |
| Text input | Single/multi-line entry | text · number (UZS) · phone (+998 mask) · textarea · with label/helper/error · focus/disabled |
| Select / dropdown | Choose from a set | closed · open · selected · disabled |
| Card | Groups related content; often tappable | static · tappable (with disclosure) · padding variants |
| Metric / stat | Shows a number + label + trend | up/down/neutral delta; loading |
| Status badge | Communicates an entity's state | one per status in the taxonomy below — **color + icon/shape + label** |
| Avatar | Business / customer / staff identity | image · initials fallback · sizes |
| List row | Repeated item in lists (orders, customers, products…) | leading media + 2–3 text lines + trailing status/chevron; pressed; with/without media |
| Filter chips | Filter a list by status/category | single-select · multi-select · scrollable row · selected/unselected |
| Quick actions | Fast shortcuts to top tasks on Home | default/pressed; per enabled mode |
| Bottom tab bar | Primary navigation (mobile) | active/inactive items; badge counts; mode-composed set |
| Top app bar | Per-screen title, back, actions | with/without back; 0–2 actions + overflow |
| Stepper / progress | Multi-step progress + entity status path | onboarding steps; order/appointment status advance |
| Wizard chrome | Onboarding frame | back + progress + title |
| Bottom sheet / modal | Forms and confirmations | form sheet · confirm dialog · destructive confirm |
| Toast / snackbar | Transient feedback | success · info · error · with optional undo |
| Spinner / loader | Indicate work in progress | inline · full-screen |
| Skeleton | Placeholder while loading | list-row · card · detail-header variants |
| Empty state | First-use / no-data prompt | icon/illustration + message + CTA |
| Notification row | "Needs attention" item on Home | per type; deep-links; unread |
| Calendar — day/week | Owner's appointment schedule | day · week; blocks distinguished by status (see below) |
| Date / time picker | Pick booking date & slot | availability-aware; available/disabled/selected |
| Time-slot grid | Choose a slot | available · selected · disabled |
| Photo manager | Add/reorder/remove product photos | empty · with photos · carousel viewer |
| Chat bubble | Owner ↔ customer messaging | inbound vs outbound; timestamp; delivery state |
| Progress bar | Milestone completion on projects | partial/complete |
| Currency / date text | Consistent UZS + localized date rendering | UZS (`150 000 UZS`) · Uz/Ru date formats |

## Status taxonomy (single source of truth)

The product's entities move through these states. The designer delivers **one consistent status
system** covering every value below. Each status carries a **semantic meaning** the design must make
instantly readable — expressed with more than color alone (icon/shape/label too). The meaning
categories are intent only; the designer decides how each is rendered.

| Domain | States (with intended meaning) |
|--------|--------------------------------|
| Payment | PENDING (awaiting) · PAYMENT_RECEIVED (action needed) · CONFIRMED (done) |
| Order | NEW · PREPARING (in progress) · READY · DELIVERED (done) · CANCELLED (negative) |
| Appointment | REQUESTED (action needed) · CONFIRMED · COMPLETED (done) · CANCELLED · NO_SHOW (negative) |
| Project | PROPOSAL_SENT · IN_PROGRESS · REVIEW · COMPLETED (done) · CANCELLED (negative) |
| Milestone | PENDING · SUBMITTED_FOR_REVIEW (action needed) · APPROVED · PAYMENT_RECEIVED (done) |
| Invoice | UNPAID (action needed) · PAID (done) |

Suggested intent groupings to help the designer (not a color mandate): *neutral/new*,
*in progress / awaiting action*, *positive / money received / done*, *negative / cancelled /
no-show*. How many visual treatments these collapse into is the designer's call.

**One firm rule:** every status indicator combines color **with** an icon/shape and a text label —
never color by itself.

## Bot "components"
Not UI components but reusable patterns the designer specifies for Telegram: message templates,
inline-keyboard button groupings, the payment-card visual, and a status emoji/symbol map kept
consistent with the app's status system. See `06-wireframes-bot.md`.
