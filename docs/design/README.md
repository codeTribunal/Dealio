# Design Documentation — Uzbek SME CRM

This folder is the handoff package for the UI designer. It defines **what** to design and the
**constraints** to design within, before any high-fidelity visual work begins.

The product has two human-facing surfaces:

1. **Owner App** — a Flutter mobile app used by the business owner to run their business.
2. **Customer Bot** — a per-business Telegram bot that the owner's customers use to browse, order,
   book, and track work. The customer never installs anything.

There is **no existing brand or design system** — the designer creates the full visual identity from
scratch. (An early in-code styling experiment exists in `/web`; it is not a decision and should be
ignored — see `00-visual-foundation.md`.)

## Read in this order

| # | Document | Purpose |
|---|----------|---------|
| 00 | [Visual & Brand Inputs](00-visual-foundation.md) | Inputs and constraints to design the visual system from scratch (no decisions made) |
| 01 | [Design Brief](01-design-brief.md) | Audience, personas, market context, design principles, constraints |
| 02 | [Information Architecture](02-information-architecture.md) | Content model, navigation model, labeling |
| 03 | [Sitemap](03-sitemap.md) | Every screen and bot state, with hierarchy |
| 04 | [User Flows](04-user-flows.md) | The critical end-to-end task flows |
| 05 | [Wireframes — Owner App](05-wireframes-app.md) | Low-fidelity layout for every app screen |
| 06 | [Wireframes — Telegram Bot](06-wireframes-bot.md) | Message + keyboard mockups for every bot state |
| 07 | [Component Inventory](07-component-inventory.md) | Reusable UI components and their states |
| 08 | [Deliverables Checklist](08-deliverables-checklist.md) | **What to request back from the designer** |

## Scope note

Wireframes here are intentionally **low fidelity** (grayscale, box layout, real content). Their job
is to lock structure, hierarchy, and behavior. Color, type rendering, iconography, motion, and
polish are the designer's job, working from `00-visual-foundation.md`.
