# Dealio Design Tokens — Single Source of Truth

This document is the canonical reference for the Dealio design system. Colors are
authored **HSL-first** (the hex value follows in parentheses as the practical
reference for code). The Flutter app (`app/lib/core/theme/app_tokens.dart`) and
the web app (`web/app/tokens.css`) mirror these **exact** `H S% L%` values and
must stay in sync.

> **Format rule:** HSL is canonical; hex is the practical code value. An HSL
> token renders within ≤1/255 per channel of its hex — keep the brand hex below
> exactly as locked.

> **Reality note:** This doc describes the system **as actually implemented in
> code**, reconciled to the canonical brand slate/blue. Where an earlier
> aspirational draft of this file proposed something the code does not do, it is
> marked **⚠️ Divergence (aspirational, not implemented)** so the doc reflects
> reality, not intent. (The aspirational values live in git history; see the
> report if you want them restored as a labelled "Proposed" appendix.)

---

## 1. Brand foundation

| Role | HSL | Hex | Meaning |
|---|---|---|---|
| **Slate** (brand dark) | `hsl(222 47% 11%)` | **#0F1729** | The brand mark + splash wordmark / brand-dark ink |
| **Blue** (CTA / actionable) | `hsl(217 91% 60%)` | **#3C83F6** | Anything tappable/actionable (the `--accent` / `accent` token) |

**Rule: cool = active, warm = earned.** Cool blue is reserved for actionable
affordances (buttons, links, the brand mark). Warm amber marks something
*earned* or needing attention — never a primary CTA.

These two hex values are **locked**. The previous Tailwind-derived values
(#0F172A slate-900, #3B82F6 blue-500) were drift and have been reconciled.

⚠️ **Divergence — "foreground" ≠ brand slate.** Body-text ink (`text-1`) is a
separate, softer color `hsl(223 42% 18%)`, **not** #0F1729. Brand slate #0F1729
is used only for the **brand mark + splash wordmark**; everyday text uses the
`text-1/2/3` ramp (§3).

---

## 2. Surfaces (light mode) — as implemented

The app UI uses a **cool blue-grey** surface family:

| Token | HSL | Use |
|---|---|---|
| `bg` / `--bg` | `hsl(222 62% 96%)` | app background |
| `surface` / `--surface` | `hsl(0 0% 100%)` (#FFFFFF) | cards / raised content |
| `surface2` / `--surface-2` | `hsl(223 78% 98%)` | inset panels / segmented controls |
| `border` / `--border` | `hsl(221.7 69.7% 93.5%)` | hairline |
| `borderStrong` / `--border-strong` | `hsl(219 43% 88%)` | emphasized hairline |

**Shadow scale (light), as implemented** (ink = `hsl(223 42% 18%)`, the text-1 ink):
```
--shadow-sm: 0 1px 2px hsla(223 42% 18% / .05), 0 4px 12px -8px hsla(223 42% 18% / .12)
--shadow-md: 0 8px 20px -12px hsla(223 42% 18% / .18)
--shadow-lg: 0 16px 40px -20px hsla(223 42% 18% / .28)
--shadow-accent: 0 12px 26px -10px hsla(217 91% 60% / .45)
--shadow-neu: 5px 5px 12px hsl(221 48% 88%), -5px -5px 12px hsl(0 0% 100%)   /* quick-action buttons only */
```

**Branding surface exceptions (intentional, do not "fix"):**
- **Launcher icon** background = warm paper `hsl(60 20% 98%)` (#FAFAF8).
- **Mobile Dart splash** background = cool `#F0F0F8` (matches the baked native splash).

⚠️ **Divergence (aspirational, not implemented).** An earlier draft specified
warm-paper surfaces (`surface-bg hsl(60 20% 98%)`, `surface-panel hsl(220 14% 98%)`,
5 named elevations) and a single shadow `0 4px 12px hsla(222 47% 11% / .08)`. The
code uses the cool family + 3-tier shadow scale above. `hsl(60 20% 98%)` exists
only in branding (launcher icon), not UI chrome.

---

## 3. Foreground (text) — as implemented

Three discrete tokens + the border — **not** alpha stops of one ink:

| Token | HSL (light) | Role |
|---|---|---|
| `text1` / `--text-1` | `hsl(223 42% 18%)` | primary text |
| `text2` / `--text-2` | `hsl(222 20% 52%)` | secondary text |
| `text3` / `--text-3` | `hsl(220.5 21.6% 66.5%)` | tertiary / hints |
| `border` / `--border` | `hsl(221.7 69.7% 93.5%)` | dividers / hairlines |

⚠️ **Divergence (aspirational, not implemented).** An earlier draft proposed
`fg-primary/secondary/tertiary/quaternary/divider` as alpha % (100/80/55/30/12)
of slate #0F1729. The code uses the three opaque `text-*` HSL tokens above; there
is no "quaternary" foreground token.

---

## 4. Intent families — as implemented

**3-stop families** — `base` / `soft` (fill) / `strong` (text). Hue fixed per
family; `soft` = high L, `strong` = low L. (No 9-shade 100–900 ramps.)

| Family | base | soft (fill) | strong (text) |
|---|---|---|---|
| **Positive** (green) | `hsl(142 76% 36%)` | `hsl(140.6 84.2% 92.5%)` | `hsl(142 72% 29%)` |
| **Negative** (red) | `hsl(0 72.2% 50.6%)` | `hsl(0 93% 94%)` | `hsl(0 74% 42%)` |
| **Progress / attention** (amber) | `hsl(32.1 94.6% 43.7%)` | `hsl(48 96% 89%)` | `hsl(26 90% 37%)` |

Tokens: `--success(-soft/-strong)`, `--warning(-soft/-strong)`, `--error(-soft/-strong)`
(Flutter `success`/`successSoft`/`successStrong`, etc.).

⚠️ **Divergence (aspirational, not implemented).** An earlier draft specified
full 100–900 ramps and a distinct desaturated-blue **`info`** family. Neither
exists in code. Informational emphasis reuses `--accent` / `--accent-soft`. Amber
(`--warning`) doubles as both "progress" and "attention."

---

## 5. Earned accent (warm)

There is **no separate amber accent token**. "Warm = earned" is filled by the
**`--warning` (amber) family** from §4 (`--warning` base `hsl(32.1 94.6% 43.7%)`,
`--warning-soft` fill, `--warning-strong` text), used sparingly for
overdue/attention states — never as a CTA.

⚠️ **Divergence (aspirational, not implemented).** An earlier draft listed
`accent-base/hover/text` amber tokens; these do not exist. Reuse `--warning-*`.

---

## 6. Status enum → intent mapping (as rendered)

Source of truth: `app/lib/shared/widgets/app_badge.dart` (`_tone()`), mirrored on
web. A badge renders **fill = `{family}-soft`, text = `{family}-strong`**.
Bucketing: terminal-positive → positive; cancelled/failed → negative;
in-flight/awaiting → progress (amber).

| Enum | Status | Family |
|---|---|---|
| **Order** | NEW, PREPARING | progress |
| | READY, DELIVERED | positive |
| | CANCELLED | negative |
| **Payment** | PENDING, PAYMENT_RECEIVED | progress |
| | CONFIRMED | positive |
| **Appointment** | REQUESTED | progress |
| | CONFIRMED, COMPLETED | positive |
| | CANCELLED, NO_SHOW | negative |
| **Project** | PROPOSAL_SENT, IN_PROGRESS, REVIEW | progress |
| | COMPLETED | positive |
| | CANCELLED | negative |
| **Milestone** | PENDING, SUBMITTED_FOR_REVIEW, PAYMENT_RECEIVED | progress |
| | APPROVED | positive |
| **Invoice** | UNPAID | progress |
| | PAID | positive |

Badges never use the blue accent (status ≠ action).

⚠️ **Divergence (aspirational, not implemented).** An earlier draft mapped some
statuses to an `info` family and a `neutral` (surface-panel/fg-tertiary) recipe,
mapped milestone `PAYMENT_RECEIVED` to the amber earned-accent, and specified
`{family}-100` fill / `{family}-700` text on **4px** badges. The code has only
three tones (positive/progress/negative), uses `soft`/`strong` stops, and renders
**pill** badges (`AppRadii.pill` / `--r-pill` = 999px) — not 4px.

---

## 7. Spacing, type, geometry

**Spacing** (8pt-based; `--s-1`..`--s-8` / `AppSpacing.s1`..`s8`):
`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64` px.

**Type — typeface is Manrope** (`--font-manrope`; Flutter via Google Fonts).
Scale: `caption 12 · sm 14 · base 16 · lg 18 · h3 24 · h2 30 · h1 38`.
Weights: regular 400 · medium 500 · semibold 600 · bold 700 · extra 800.

⚠️ **Divergence — font is Manrope, not Inter.** Inter appears in exactly one
place: the splash **"Dealio." wordmark** (`router.dart`, `GoogleFonts.inter`), a
deliberate lockup exception.

**Geometry — concentric radii:** `sm 10 · md 14 · lg 18 · xl 24 · pill 999` px
(`--r-*` / `AppRadii.*`). Nest larger radii outside smaller. Status badges
currently use `pill` (see §6).

⚠️ **Divergence — an earlier draft said status badges are 4px (not pills);** the
code renders pills.

**Motion:** `--dur-fast 140ms · --dur-base 200ms · --dur-slow 280ms`,
`--ease cubic-bezier(.22 .61 .36 1)`.

---

## 8. Token naming reference

Consume these names (never raw literals). Flutter `AppTokens` ↔ web CSS vars:

| Concept | Flutter | Web |
|---|---|---|
| CTA / brand blue | `accent`, `accentHover`, `accentActive`, `accentSoft`, `accentOn` | `--accent`, `--accent-hover`, `--accent-active`, `--accent-soft`, `--accent-on` |
| Surfaces | `bg`, `surface`, `surface2`, `border`, `borderStrong` | `--bg`, `--surface`, `--surface-2`, `--border`, `--border-strong` |
| Text | `text1`, `text2`, `text3` | `--text-1`, `--text-2`, `--text-3` |
| Positive | `success`, `successSoft`, `successStrong` | `--success`, `--success-soft`, `--success-strong` |
| Negative | `error`, `errorSoft`, `errorStrong` | `--error`, `--error-soft`, `--error-strong` |
| Progress / earned | `warning`, `warningSoft`, `warningStrong` | `--warning`, `--warning-soft`, `--warning-strong` |
| Elevation | `shadowSm/Md/Lg/Accent`, `neuRaised/neuPressed` | `--shadow-sm/-md/-lg/-accent`, `--shadow-neu/-neu-inset` |
| Radii | `AppRadii.sm/md/lg/xl/pill` | `--r-sm/-md/-lg/-xl/-pill` |
| Spacing | `AppSpacing.s1..s8` | `--s-1..--s-8` |
| Type size | `AppTextSizes.caption..h1` | `--fs-caption..--fs-h1` |
| Weight | `AppFontWeights.regular..extra` | `--fw-regular..--fw-extra` |
| Motion | `AppMotion.durFast/durBase/durSlow/ease` | `--dur-fast/-base/-slow`, `--ease` |

Brand mark colors (slate #0F1729, blue #3C83F6) are **not** runtime tokens —
they're baked into brand assets (`app/assets/branding/splash_mark.svg`, web
`DealioMark`, favicon) and the splash screen. Keep that exact hex.
