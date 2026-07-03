# Coding Conventions
Audience: developer
Last updated: 2026-07-03
Verified against: 64a177a

---

This document restates the conventions from `CLAUDE.md` ("Coding conventions" section) and reconciles them with what the code actually does. Where the spec and the code disagree, the code wins and the divergence is called out inline. Brand rules are sourced from `docs/design-tokens.md`.

## 1. TypeScript (backend)

| Rule | Status | Evidence / notes |
|---|---|---|
| Strict mode on, no `any` | Convention | `CLAUDE.md` conventions section. Enforce in review; `backend/tsconfig.json` governs strictness. |
| `zod` request validation on every endpoint | Followed in practice | zod is imported and used across all 22 route files (`grep z.object` hits in every file under `backend/src/routes/`, e.g. `orders.ts`, `appointments.ts`, `admin.ts`). Onboarding mode is validated by zod (`backend/src/routes/onboarding.ts:18`). |
| Explicit error handling, no silent swallow | Convention | Errors are surfaced via a shared `sendError` helper (e.g. `backend/src/lib/businessFromUser.ts:34`). |
| Typed API responses | Convention | Response shapes are minimized on public/read endpoints (see commits `56cc39d`, `27eb9ff`). |

Validation and error-shape helpers to reuse: `sendError` (used at `backend/src/lib/businessFromUser.ts:34`) and the per-route zod schemas at the top of each route file.

## 2. Flutter / Dart (app)

| Rule | Status | Evidence / notes |
|---|---|---|
| Every screen is a `ConsumerWidget` (or `ConsumerStatefulWidget`) | Followed | Screens extend the Riverpod consumer types, e.g. `app/lib/features/catalog/catalog_screen.dart`, `app/lib/features/customers/customers_screen.dart`, `app/lib/features/calendar/calendar_screen.dart`. |
| No business logic inside widgets | Convention | Logic belongs in providers; see the provider inventory in `docs/internal/FUNCTIONALITY_INVENTORY.md` (F.2). |
| Never call the API from a widget; always via a provider | Convention | The Dio client is exposed as a provider and consumed through feature providers, not directly in widgets. |
| One Riverpod provider file per feature | Followed | Feature-scoped providers live under `app/lib/features/<feature>/`; shared/core providers under `app/lib/core/` (e.g. `app/lib/core/locale/locale_provider.dart`). |

Handle loading, error, and empty states on every list screen (per `CLAUDE.md`). Local UI state uses `NotifierProvider`/`StateNotifierProvider`; API-backed data uses async providers.

## 3. Localization

Three locales ship, not two. `CLAUDE.md`'s "two languages at launch" claim is stale (conflict; code wins).

| Item | Value | Evidence |
|---|---|---|
| ARB files | `app/lib/l10n/app_uz.arb`, `app/lib/l10n/app_ru.arb`, `app/lib/l10n/app_en.arb` | files present under `app/lib/l10n/` |
| Supported locales | `en`, `ru`, `uz` | `app/lib/l10n/app_localizations.dart:97-100`; wired at `app/lib/main.dart:184` |
| Locale state | `localeProvider` (uz/ru/en), persisted as `app_locale`, syncs from `business.language` if the user never chose | `app/lib/core/locale/locale_provider.dart:16-30`; inventory F.2 (`:660`) |

Rules:
- All user-facing app strings go through ARB keys. Never hardcode display text in widgets.
- Bot copy is resolved through i18n keys, never hardcoded per message. Language is resolved per message by `getLang(ctx)`: session cache, then a backend lookup via `resolveLang(languagePreference, businessLanguage)`, falling back to `UZBEK` on any failure (`bot/src/lib/lang.ts:11-25`; `bot/src/lib/i18n.ts:10-19`). Always look up the business/customer language rather than assuming one.
- Known gaps (Partial): a few owner-facing and system bot strings are hardcoded English, not localized: `SUSPENSION_MESSAGE` (`bot/src/lib/api.ts:5-6`) and owner `mark_paid`/`register_owner` replies (`bot/src/handlers/owner.ts:24-32, 55-79`). Do not add more hardcoded copy; route new strings through i18n.

## 4. Formatting (money and dates)

- UZS amounts use a space as the thousands separator: `150 000`. The formatter builds `#,##0` then replaces commas with spaces (`app/lib/shared/utils/format.dart:27-32`).
- Conflict (code wins): `CLAUDE.md` writes amounts as `150 000 UZS`, but the code appends a localized currency word, not the literal `UZS`. `formatUZS` renders `150 000 so'm` (uz), `150 000 сум` (ru), or `150 000 soum` (en) via `currencyWord()` (`app/lib/shared/utils/format.dart:16-31`). The space separator is correct; the suffix is a localized word.
- Dates use localized month names in `DD month YYYY` form: `15 yanvar 2026` (uz), `15 января 2026` (ru), English months for `en`. Month/weekday names are explicit tables driven by the active locale, because intl symbols for uz are not initialized and ru needs the genitive month (`app/lib/shared/utils/format.dart:34-52`). The web mirror lives in `web/lib/format.ts` (kept in sync per the comment at `format.dart:38`).

## 5. Commit messages

Format: `type: summary`, for example `feat: add order confirmation endpoint`. Commit after a working feature, not after every file change. Never commit `.env`, `node_modules`, or `.dart_tool`. Recent history follows this (e.g. `security: public read endpoints filtered, limited, minimized`, `chore: resolve form-data high vulnerability`).

## 6. Tenant-ownership check (REQUIRED on every protected endpoint)

A business owner must never read or modify another business's data. The enforced idiom is `getBusinessOrFail` (`backend/src/lib/businessFromUser.ts:23-49`):

```ts
const business = await getBusinessOrFail(request, reply);
if (!business) return;
```

It resolves the business by the authenticated `userId` (`ownerId`), 404s if none exists, and 403s `ACCOUNT_SUSPENDED` for a suspended business (impersonation-exempt) (`businessFromUser.ts:32-46`). All subsequent queries in the handler must be scoped to that `business.id`. Do not trust a `businessId` from the request body or params.

Notes:
- Owner routes enforce suspension and ownership via this call ("GBOF" in the inventory B-route tables). Deliberate exceptions: `GET /business`, reactivate, `user.ts`, and platform-settings routes (inventory J.5 `:920`, J.3 `:886`).
- The standalone `backend/src/middleware/checkSuspended.ts` is dead code (zero imports); do not wire new routes to it (inventory J.3 `:886`).
- Bot routes are gated by a shared bot secret and enforce suspension inline (`business.suspendedAt` -> 403) on 20 of 22 routes (inventory B.7 `:211`).

Authorization background: `docs/AUTHORIZATION_AUDIT.md` and `docs/ADMIN_AUDIT.md`.

## 7. Brand rules (from docs/design-tokens.md)

Verified against `docs/design-tokens.md`. Do not trust any pre-supplied hex outside that file.

| Rule | Value | Evidence |
|---|---|---|
| Typeface everywhere | Manrope | `docs/design-tokens.md:168`; applied in `app/lib/core/theme/app_theme.dart:52,167` (`GoogleFonts.manrope`) |
| Single font exception | The splash "Dealio." wordmark uses Inter | `docs/design-tokens.md:173-175`; `app/lib/core/router/router.dart:407-423` (`GoogleFonts.inter`, brand-blue period) |
| Locked brand slate | `#0F1729` (`hsl(222 47% 11%)`) | `docs/design-tokens.md:26` |
| Locked brand blue | `#3C83F6` (`hsl(217 91% 60%)`), the `accent` token | `docs/design-tokens.md:27` |
| Reconciled drift | `#0F172A` slate-900 and `#3B82F6` blue-500 were drift and are reconciled to the locked hex above | `docs/design-tokens.md:33-34` |
| App background | Cool blue-grey `hsl(222 62% 96%)` | `docs/design-tokens.md:49`. There is no `#FAFAF8` paper background in UI chrome; `#FAFAF8` (`hsl(60 20% 98%)`) exists only on the launcher icon (`docs/design-tokens.md:64-72`). |
| Emoji policy | No emojis in Dealio-rendered UI. Telegram bot copy may use them | `docs/design-tokens.md` intent + bot copy such as `💬 {customerName}` at `bot/src/index.ts:230-245` |
| Copy dashes | No em-dashes in copy | project convention |

Brand-mark hex (slate `#0F1729`, blue `#3C83F6`) are baked into brand assets and the splash, not runtime tokens (`docs/design-tokens.md:207-209`). Consume named tokens (`AppTokens` in Flutter, CSS vars in web) rather than raw literals; see `docs/design-tokens.md` section 8 for the Flutter-to-web token map.
