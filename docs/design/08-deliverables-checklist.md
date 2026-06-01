# 08 — Deliverables to Request from the UI Designer

Hand this list to your UI designer as the definition of done. It assumes they design the product
**from the ground up** — including the entire visual identity and design system — using the product
inputs, IA, flows, and wireframes in this folder. **No prior visual decisions constrain them.**

## A. Brand & design system (created from scratch)
- [ ] **Brand direction** — a short moodboard / direction exploration (2–3 options) to align on
      personality before detailed work, given there is no existing brand.
- [ ] **Logo / wordmark** and app icon.
- [ ] **Color system** — full palette including a documented approach to status colors; light theme
      required, dark theme recommended (designer confirms whether it's in scope).
- [ ] **Typography** — chosen typeface(s) with a **proven Uzbek-Latin (diacritics) + Russian
      (Cyrillic)** glyph coverage, plus the full type scale.
- [ ] **Spacing / grid / layout** system and breakpoints (mobile-first), with safe-area handling.
- [ ] **Corner radii, borders, elevation/shadow** language.
- [ ] **Iconography** set covering all navigation + action icons, exported as SVGs.
- [ ] **Motion** guidelines (transitions, durations, easing).
- [ ] **Accessibility report** — AA contrast across the chosen palette(s); status-not-by-color-alone
      audit; touch-target and text-scaling checks.

## B. Component library
- [ ] Every component in `07-component-inventory.md`, built with variants for **all listed states**.
- [ ] The complete **status badge system** (one consistent treatment across all statuses, combining
      color + icon/shape + label).

## C. High-fidelity screens — Owner App
- [ ] All **~25 screens** in `05-wireframes-app.md`, at mobile size, in every theme delivered.
- [ ] For every **list and detail** screen: **5 states** — default · loading (skeleton) · empty ·
      error (with retry) · offline (cached banner).
- [ ] **Both languages** (Uzbek + Russian) on at least the high-traffic screens (Home, Orders, Order
      detail, Catalog, Calendar, Onboarding, Settings) to prove layouts flex for longer Russian text.
- [ ] **Mode variants** of Home + navigation: single-mode (×3) and the multi-mode composition
      (resolve the "Work hub vs. segmented control" question raised in the IA).
- [ ] Onboarding 5-step wizard, including skip/consequence states.
- [ ] The **payment-confirmation moment** (Order detail) designed as the hero interaction.

## D. Telegram bot
- [ ] **Message copy** for every bot state in `06-wireframes-bot.md`, in **Uzbek + Russian**, with
      placeholders marked (`{amount}`, `{orderNo}`, `{date}`, …).
- [ ] **Inline keyboard layouts** (labels + grouping) per state.
- [ ] Branded **images**: welcome banner template, payment-card visual, (optional) confirmation
      graphics — exported assets sized for Telegram.
- [ ] **Status emoji/symbol map** consistent with the app's status system.
- [ ] Edge-case copy: out of stock, no availability, payment help, session timeout, generic error.

## E. Prototype
- [ ] Clickable prototype of the **3 hero flows**: product order (Flow B), appointment booking
      (Flow C), and onboarding (Flow A) — enough to user-test before build.

## F. Handoff assets
- [ ] Dev-ready handoff (e.g. Figma Dev Mode) with redlines tied to design tokens/variables.
- [ ] Exported assets: app icon, splash, logo lockups, empty-state illustrations, bot images.
- [ ] A **design-tokens export** (color/type/spacing/etc. as named variables) engineering can
      translate to code.

## G. Source files
- [ ] The working design file, organized into clear pages (Foundations / Components / App / Bot /
      Prototype), with edit access.

---

### Suggested review milestones
1. **Brand direction** (A: moodboard) — align on personality first.
2. **Foundations + component library** (rest of A + B) — before screens.
3. **Lo-fi → hi-fi of hero flows** (C subset + E) — validate the order/booking/onboarding journeys.
4. **Full screen set + all states** (rest of C).
5. **Bot package** (D).
6. **Final handoff** (F + G).

### Priority order if scope/time is tight
1. Onboarding + Home + Orders + Order detail (Flow B end-to-end) — the revenue path.
2. Catalog + product form.
3. Bot product-seller flow copy + payment visual.
4. Appointments + booking (services).
5. Projects (freelance).
6. Analytics, Messages, Settings polish.
