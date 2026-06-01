# 00 — Visual & Brand Inputs

This document gives the designer the **raw inputs and constraints** needed to create a visual
language from scratch. It deliberately makes **no visual decisions** — no palette, typeface, spacing
scale, elevation style, or component aesthetic is prescribed. Those are the designer's to define.
What follows is everything that should *inform* those decisions.

## Brand starting point

There is **no existing brand**. The designer defines the full visual identity. Inputs to work from:

- **Product name / wordmark:** to be designed (no logo exists yet).
- **What the product is:** a CRM and business-management tool for very small businesses in
  Uzbekistan — see `01-design-brief.md` for the full context and personas.
- **Emotional goals (requirements, not aesthetics):** the product handles people's money and
  customer relationships, so it must *feel* trustworthy and dependable; owners use it in short
  bursts while busy, so it must *feel* quick and clear. How those qualities are expressed visually
  is entirely open.

> If a moodboard / brand-direction exploration is wanted before committing, request it as an early
> deliverable (see `08-deliverables-checklist.md`).

## Hard constraints the visual system must satisfy

These are facts about the product and audience, not style choices:

1. **Two platforms, different rules.**
   - *Owner app:* Flutter, **mobile-first** (phones, mixed-quality Android). The designer owns the
     full visual canvas here.
   - *Customer bot:* Telegram. The designer does **not** control Telegram's chrome — only message
     copy, inline-button labels/grouping, and any branded images. Visual identity here is limited to
     assets and tone, not layout.

2. **Bilingual, two scripts.** Every string ships in **Uzbek (Latin, with diacritics)** and
   **Russian (Cyrillic)**. Whatever typeface(s) are chosen **must fully cover both** scripts.
   Russian text runs noticeably longer — the type and layout choices must tolerate text expansion
   without breaking.

3. **Number-heavy.** Currency is always **UZS**, shown as large numbers formatted with a space as
   the thousands separator (e.g. `150 000 UZS`). Dates render as `15 yanvar 2026` (Uz) /
   `15 января 2026` (Ru). Whatever type and component choices are made must keep big numbers and
   localized dates legible.

4. **Status-driven product.** Orders, payments, appointments, projects, milestones and invoices all
   move through defined states (full list in `02-information-architecture.md`). The visual system
   needs a **consistent way to express status** that does not rely on color alone (accessibility).

5. **Real-world conditions.** Used on lower-end devices, variable connectivity, sometimes outdoors.
   The system should hold up at small sizes and in bright light, and must define loading / empty /
   error / offline states — not just the happy path.

## Accessibility requirements (non-negotiable, mechanism open)

- Meet **WCAG AA** contrast for text and essential UI in whatever palette is chosen.
- **Never communicate status or meaning by color alone** — pair with label / icon / shape.
- Minimum touch target **44×44pt**.
- Support OS dynamic text scaling to ~**130%** without breaking layouts.

## Open decisions explicitly left to the designer

Everything below is the designer's call — listed so nothing is assumed:

- Whether to support a **dark theme** in addition to light (recommended given outdoor use, but not
  mandated — flag the recommendation either way).
- Color palette, including how many accents and how status colors are chosen.
- Typeface(s) and the full type scale.
- Spacing system / grid.
- Corner radii, borders, and elevation/shadow language (flat, soft, layered — open).
- Iconography style.
- Motion and transition character.
- Overall density (airy vs. compact).

> Note for engineers: an early in-code styling experiment exists in `/web`, but it is **not a
> decision and not a constraint**. The designer should ignore it and design from the ground up;
> engineering will re-implement against the delivered system.
