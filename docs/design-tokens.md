# Dealio Design Tokens

Single source of truth for the Dealio design system. The Next.js web app and
the Flutter app derive their color and spacing values from this document.

Light mode only. Colors use HSL — `hsl(H, S%, L%)`, or `hsla(H, S%, L%, A)`
where alpha is needed (shadow, scrim). HSL is the only color format used in
this document (no hex, no rgb).

## Color — Accent

| Token | Value |
|---|---|
| accent | hsl(217, 91%, 60%) |
| accent-hover | hsl(221, 83%, 53%) |
| accent-active | hsl(224, 76%, 48%) |
| accent-soft | hsl(223, 100%, 96%) |
| accent-on | hsl(0, 0%, 100%) |

## 2. Surfaces — 5 elevations (light mode)

| Token | Value | Use |
|---|---|---|
| surface-bg | hsl(60, 20%, 98%) | page background |
| surface-fg | hsl(0, 0%, 100%) | cards, content surfaces |
| surface-panel | hsl(220, 14%, 98%) | sub-cards inside cards |
| surface-dialog | hsl(220, 14%, 98%) | popovers (same fill + the one shadow) |
| surface-modal | hsl(0, 0%, 100%) | full-screen modals (scrim lifts, no shadow) |

Single shadow recipe (the only shadow in the system):

`0 4px 12px hsla(222, 47%, 11%, 0.08)`

Applied only to `surface-dialog`. Routine surfaces lift via lightness. Modals
use a scrim: `hsla(222, 47%, 11%, 0.40)` — never rgba black.

## 3. Foreground — alpha de-emphasis (5 stops)

All stops are `hsl(222, 47%, 11%)` composited at decreasing alpha. Never use a
cool grey scale — always alpha-of-foreground.

| Token | Alpha | Value | Use |
|---|---|---|---|
| fg-primary | 100% | hsla(222, 47%, 11%, 1.00) | body, headings |
| fg-secondary | 80% | hsla(222, 47%, 11%, 0.80) | labels, supporting text |
| fg-tertiary | 55% | hsla(222, 47%, 11%, 0.55) | captions, metadata |
| fg-quaternary | 30% | hsla(222, 47%, 11%, 0.30) | placeholder, disabled |
| fg-divider | 12% | hsla(222, 47%, 11%, 0.12) | hairlines |

## 4. Intent families — full 9-shade scales (light mode)

### positive (done / paid / completed / confirmed) — green

| Shade | Value |
|---|---|
| 100 | hsl(138, 76%, 97%) |
| 200 | hsl(141, 79%, 85%) |
| 300 | hsl(142, 77%, 73%) |
| 400 | hsl(142, 69%, 58%) |
| 500 | hsl(142, 71%, 45%) |
| 600 | hsl(142, 76%, 36%) |
| 700 | hsl(142, 72%, 29%) |
| 800 | hsl(143, 64%, 24%) |
| 900 | hsl(144, 61%, 20%) |

### negative (cancelled / no-show / error) — red

| Shade | Value |
|---|---|
| 100 | hsl(0, 86%, 97%) |
| 200 | hsl(0, 93%, 89%) |
| 300 | hsl(0, 96%, 80%) |
| 400 | hsl(0, 91%, 71%) |
| 500 | hsl(0, 84%, 60%) |
| 600 | hsl(0, 72%, 51%) |
| 700 | hsl(0, 74%, 42%) |
| 800 | hsl(0, 70%, 35%) |
| 900 | hsl(0, 63%, 31%) |

### progress (in-progress / preparing / awaiting / requested) — amber-leaning ochre, NOT the earned accent

| Shade | Value |
|---|---|
| 100 | hsl(48, 100%, 96%) |
| 200 | hsl(48, 97%, 77%) |
| 300 | hsl(46, 97%, 65%) |
| 400 | hsl(43, 96%, 56%) |
| 500 | hsl(38, 92%, 50%) |
| 600 | hsl(32, 95%, 44%) |
| 700 | hsl(26, 90%, 37%) |
| 800 | hsl(23, 83%, 31%) |
| 900 | hsl(22, 78%, 26%) |

### info (bot online / links / ambient metadata) — DESATURATED blue, distinct from CTA

| Shade | Value |
|---|---|
| 100 | hsl(214, 95%, 97%) |
| 200 | hsl(213, 97%, 87%) |
| 300 | hsl(212, 96%, 78%) |
| 400 | hsl(213, 94%, 68%) |
| 500 | hsl(217, 80%, 57%) |
| 600 | hsl(221, 70%, 50%) |
| 700 | hsl(224, 64%, 43%) |
| 800 | hsl(226, 57%, 36%) |
| 900 | hsl(226, 55%, 30%) |

**CRITICAL:** info and the CTA blue share a hue family but differ by role and
saturation. CTA = saturated solid fill `hsl(217, 91%, 60%)`. Info = lower-chroma
tints/text. A link or status badge must never look like a button. Separate them
by saturation and fill, not hue.

## 5. Earned accent — amber (1 warm chromatic, used rarely)

| Token | Value |
|---|---|
| accent-base | hsl(38, 78%, 57%) |
| accent-hover | hsl(35, 72%, 50%) |
| accent-text | hsl(28, 75%, 28%) |

The ONLY warm chromatic in the system. Reserved for: hero stat numerals,
milestone-confirmed moments, the single highest-value CTA on a celebratory
screen. Appears at most once per view. It earns meaning by being rare. Never
use amber for routine buttons — those are brand blue.

## 6. Status enum → intent family mapping

Every status badge uses `{family}-100` as fill + `{family}-700` as text. Both
web and Flutter MUST use this exact mapping. No status uses color alone — always
color + icon + label.

Two recipes fall outside the `-100`/`-700` rule: `neutral` (`surface-panel`
fill / `fg-tertiary` text) and the milestone earned-accent (amber, section 5).

### OrderStatus

| Status | Family | Fill | Text |
|---|---|---|---|
| NEW | info | info-100 | info-700 |
| PREPARING | progress | progress-100 | progress-700 |
| READY | positive | positive-100 | positive-700 |
| DELIVERED | neutral | surface-panel | fg-tertiary |
| CANCELLED | negative | negative-100 | negative-700 |

### PaymentStatus

| Status | Family | Fill | Text |
|---|---|---|---|
| PENDING | progress | progress-100 | progress-700 |
| PAYMENT_RECEIVED | info | info-100 | info-700 |
| CONFIRMED | positive | positive-100 | positive-700 |

### AppointmentStatus

| Status | Family | Fill | Text |
|---|---|---|---|
| REQUESTED | info | info-100 | info-700 |
| CONFIRMED | positive | positive-100 | positive-700 |
| COMPLETED | neutral | surface-panel | fg-tertiary |
| CANCELLED | negative | negative-100 | negative-700 |
| NO_SHOW | negative | negative-100 | negative-700 |

### ProjectStatus

| Status | Family | Fill | Text |
|---|---|---|---|
| PROPOSAL_SENT | info | info-100 | info-700 |
| IN_PROGRESS | progress | progress-100 | progress-700 |
| REVIEW | progress | progress-100 | progress-700 |
| COMPLETED | positive | positive-100 | positive-700 |
| CANCELLED | negative | negative-100 | negative-700 |

### MilestoneStatus

| Status | Family | Fill | Text |
|---|---|---|---|
| PENDING | neutral | surface-panel | fg-tertiary |
| SUBMITTED_FOR_REVIEW | info | info-100 | info-700 |
| APPROVED | positive | positive-100 | positive-700 |
| PAYMENT_RECEIVED | accent | accent-base @ 12% | accent-text |

The milestone `PAYMENT_RECEIVED` row is the earned-accent moment — amber
(section 5), not an intent family.

## 7. Spacing — 8pt system

Base unit 8px. Allowed values only — do not use arbitrary spacing.

| Value | Note |
|---|---|
| 4px | tight inner gaps only |
| 8px | |
| 12px | |
| 16px | |
| 24px | |
| 32px | |
| 48px | |
| 64px | |

## 8. Type — modular scale (1.25 ratio)

| Token | Size | Line height | Use |
|---|---|---|---|
| xs | 12px | 16px | captions, metadata |
| sm | 14px | 20px | body small, labels |
| base | 16px | 24px | body |
| lg | 20px | 28px | card titles, section headers |
| xl | 25px | 32px | page titles |
| 2xl | 31px | 38px | hero numbers |

Font: Inter (web + Flutter UI). Architects Daughter is for sketch diagrams ONLY
— never in product UI.

## 9. Geometry — concentric radii

| Element | Radius |
|---|---|
| Outer container | 16px |
| Nested element | outer − padding |
| Status badge | 4px (rounded rectangle, never pills) |

## 10. Frequency budget and rules

Per view, color usage should approximate:

- ~70% surface
- ~18% text
- ~8% one accent (blue CTA)
- ~2% lifts
- <1% earned amber

Rules:

- One accent per view. Blue is the actionable accent. Amber is earned and
  appears at most once.
- Status = color + icon + label. Never color alone.
- Info vs CTA: same hue family, separated by saturation and fill role.
- Alpha-of-foreground for all text de-emphasis. Never a cool grey scale.
- One shadow recipe, only on `surface-dialog`.
- Light mode only — do not define dark values anywhere in this doc.

## 11. Token naming reference

When web (CSS vars / Tailwind) and Flutter (Dart constants) consume these, use
these exact token names:

- Surfaces: `surface-bg`, `surface-fg`, `surface-panel`, `surface-dialog`, `surface-modal`
- Foreground: `fg-primary`, `fg-secondary`, `fg-tertiary`, `fg-quaternary`, `fg-divider`
- Intent families: `{family}-{100..900}` for `positive`, `negative`, `progress`, `info`
- Earned accent: `accent-base`, `accent-hover`, `accent-text`
