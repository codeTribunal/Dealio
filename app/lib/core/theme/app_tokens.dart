import 'package:flutter/material.dart';

/// Design tokens for the "Practical Soft Depth" system on the Dealio blue accent.
///
/// These values are kept IDENTICAL to the web app (`web/app/tokens.css`) so the
/// Flutter app and the Next.js web app render the same visual language.
///
/// ── HSL authoring ──────────────────────────────────────────────────────────
/// Colors are authored in HSL via [_hsl] (the same clean H S% L% values used in
/// `web/app/tokens.css`) so shades are easy to make/tweak:
///   • adjust L (lightness) for lighter/darker shades (hover / active / soft),
///   • adjust S (saturation) for more/less intensity,
///   • keep H (hue) constant to stay in the same family.
/// Because `HSLColor.toColor()` isn't a const expression, the [light]/[dark]
/// token sets are `static final` (built once at startup). Rendered output is
/// within ≤1/255 per channel of the prior hex palette — the tiny rounding is
/// intentional; readable, adjustable HSL is the point.
///
/// Usage (unchanged):
///   final t = AppTokens.of(context); // picks light/dark by Theme brightness
///   Container(color: t.surface, boxShadow: t.shadowMd, ...)
///
/// Color-bearing tokens (which differ between light/dark) live on [AppTokens].
/// Brightness-independent tokens (radii, spacing, type scale, weights, motion)
/// live on the small static helper classes below.

/// Authors a [Color] from HSL. [h] in degrees [0,360); [s]/[l] as PERCENTAGES
/// (0–100) to read exactly like the CSS `hsl(H S% L%)` tokens; [a] is 0–1.
Color _hsl(double h, double s, double l, [double a = 1.0]) =>
    HSLColor.fromAHSL(a, h, s / 100.0, l / 100.0).toColor();

@immutable
class AppTokens {
  final Brightness brightness;

  // ── Accent — Dealio blue ───────────────────────────────────────────────────
  final Color accent;
  final Color accentHover;
  final Color accentActive;
  final Color accentSoft;
  final Color accentOn;

  // ── Status ───────────────────────────────────────────────────────────────
  final Color success;
  final Color successSoft;
  final Color successStrong;
  final Color warning;
  final Color warningSoft;
  final Color warningStrong;
  final Color error;
  final Color errorSoft;
  final Color errorStrong;

  // ── Surfaces ─────────────────────────────────────────────────────────────
  final Color bg;
  final Color surface;
  final Color surface2;
  final Color border;
  final Color borderStrong;

  // ── Text ─────────────────────────────────────────────────────────────────
  final Color text1;
  final Color text2;
  final Color text3;

  // ── Elevation — soft shadows ─────────────────────────────────────────────
  /// Soft outer shadows translated 1:1 from `web/app/tokens.css` (low opacity,
  /// large blur, negative spread, downward offset). Use for cards/surfaces.
  final List<BoxShadow> shadowSm;
  final List<BoxShadow> shadowMd;
  final List<BoxShadow> shadowLg;

  /// Accent-tinted glow for accent/primary affordances (`--shadow-accent`).
  final List<BoxShadow> shadowAccent;

  /// Neumorphic raised pair — RESERVED for quick-action tiles only
  /// (`--shadow-neu`). In dark mode this is flattened to a normal soft shadow
  /// (matching the web, where `--shadow-neu` falls back to `--shadow-sm`).
  final List<BoxShadow> neuRaised;

  /// Pressed companion to [neuRaised]. Flutter has no true inset BoxShadow, so
  /// the pressed look is achieved at the widget level (see `NeuTile` in the
  /// design tokens screen): swap to [surface2] bg + a thin [borderStrong]
  /// border and drop the raised shadow to this subtle residual. These values
  /// approximate the web `--shadow-neu-inset`.
  final List<BoxShadow> neuPressed;

  const AppTokens._({
    required this.brightness,
    required this.accent,
    required this.accentHover,
    required this.accentActive,
    required this.accentSoft,
    required this.accentOn,
    required this.success,
    required this.successSoft,
    required this.successStrong,
    required this.warning,
    required this.warningSoft,
    required this.warningStrong,
    required this.error,
    required this.errorSoft,
    required this.errorStrong,
    required this.bg,
    required this.surface,
    required this.surface2,
    required this.border,
    required this.borderStrong,
    required this.text1,
    required this.text2,
    required this.text3,
    required this.shadowSm,
    required this.shadowMd,
    required this.shadowLg,
    required this.shadowAccent,
    required this.neuRaised,
    required this.neuPressed,
  });

  /// Returns the token set matching the active theme brightness.
  static AppTokens of(BuildContext context) =>
      Theme.of(context).brightness == Brightness.dark ? dark : light;

  // ───────────────────────────── LIGHT ────────────────────────────────────
  // `final` (not `const`): _hsl() / HSLColor.toColor() are not const.
  static final AppTokens light = AppTokens._(
    brightness: Brightness.light,

    // Brand blue (Dealio). Darker shades drop L (60 → 53 → 48); soft = high L.
    accent: _hsl(217, 91, 60),
    accentHover: _hsl(221, 83, 53),
    accentActive: _hsl(224, 76, 48),
    accentSoft: _hsl(223, 100, 96),
    accentOn: _hsl(0, 0, 100),

    success: _hsl(142, 76, 36),
    successSoft: _hsl(140.6, 84.2, 92.5),
    successStrong: _hsl(142, 72, 29),
    warning: _hsl(32.1, 94.6, 43.7),
    warningSoft: _hsl(48, 96, 89),
    warningStrong: _hsl(26, 90, 37),
    error: _hsl(0, 72.2, 50.6),
    errorSoft: _hsl(0, 93, 94),
    errorStrong: _hsl(0, 74, 42),

    bg: _hsl(222, 62, 96),
    surface: _hsl(0, 0, 100),
    surface2: _hsl(223, 78, 98),
    border: _hsl(221.7, 69.7, 93.5),
    borderStrong: _hsl(219, 43, 88),

    // L values chosen for WCAG AA on white/near-white surfaces (mirrors
    // tokens.css): text2 ≈5.1:1, text3 ≈4.6:1 — meta text renders small, so
    // it needs the full 4.5:1, not the large-text 3:1.
    text1: _hsl(223, 42, 18),
    text2: _hsl(222, 20, 47),
    text3: _hsl(220.5, 21.6, 50),

    // --shadow-sm: 0 1px 2px hsla(223 42% 18% / .05),
    //             0 4px 12px -8px hsla(223 42% 18% / .12)
    shadowSm: [
      BoxShadow(
        color: _hsl(223, 42, 18, .05),
        offset: const Offset(0, 1),
        blurRadius: 2,
      ),
      BoxShadow(
        color: _hsl(223, 42, 18, .12),
        offset: const Offset(0, 4),
        blurRadius: 12,
        spreadRadius: -8,
      ),
    ],
    // --shadow-md: 0 8px 20px -12px hsla(223 42% 18% / .18)
    shadowMd: [
      BoxShadow(
        color: _hsl(223, 42, 18, .18),
        offset: const Offset(0, 8),
        blurRadius: 20,
        spreadRadius: -12,
      ),
    ],
    // --shadow-lg: 0 16px 40px -20px hsla(223 42% 18% / .28)
    shadowLg: [
      BoxShadow(
        color: _hsl(223, 42, 18, .28),
        offset: const Offset(0, 16),
        blurRadius: 40,
        spreadRadius: -20,
      ),
    ],
    // --shadow-accent: 0 12px 26px -10px hsla(217 91% 60% / .45)
    shadowAccent: [
      BoxShadow(
        color: _hsl(217, 91, 60, .45),
        offset: const Offset(0, 12),
        blurRadius: 26,
        spreadRadius: -10,
      ),
    ],
    // --shadow-neu: 5px 5px 12px hsl(221 48% 88%), -5px -5px 12px hsl(0 0% 100%)
    neuRaised: [
      BoxShadow(
        color: _hsl(0, 0, 100),
        offset: const Offset(-5, -5),
        blurRadius: 12,
      ),
      BoxShadow(
        color: _hsl(221, 48, 88),
        offset: const Offset(5, 5),
        blurRadius: 12,
      ),
    ],
    // Pressed residual approximating --shadow-neu-inset.
    neuPressed: [
      BoxShadow(
        color: _hsl(223, 42, 18, .08),
        offset: const Offset(0, 1),
        blurRadius: 3,
      ),
    ],
  );

  // ───────────────────────────── DARK ─────────────────────────────────────
  static final AppTokens dark = AppTokens._(
    brightness: Brightness.dark,

    accent: _hsl(217, 91, 60),
    accentHover: _hsl(213, 94, 68),
    accentActive: _hsl(211.7, 96.4, 78.4),
    accentSoft: _hsl(217, 91, 60, .16),
    accentOn: _hsl(219, 51, 9),

    success: _hsl(142, 71, 45),
    successSoft: _hsl(142, 71, 45, .16),
    successStrong: _hsl(142, 69, 58),
    warning: _hsl(38, 92, 50),
    warningSoft: _hsl(38, 92, 50, .16),
    warningStrong: _hsl(43.3, 96.4, 56.3),
    error: _hsl(0, 91, 71),
    errorSoft: _hsl(0, 91, 71, .16),
    errorStrong: _hsl(0, 94, 82),

    bg: _hsl(219, 51, 9),
    surface: _hsl(219, 46, 12),
    surface2: _hsl(220, 46, 10),
    border: _hsl(218, 39, 22),
    borderStrong: _hsl(218, 35, 27),

    // text3 lifted to L58% for ≥4.5:1 on the dark surface (was ~3.6:1);
    // mirrors tokens.css.
    text1: _hsl(217, 62, 96),
    text2: _hsl(218, 29, 65),
    text3: _hsl(219, 24, 58),

    // --shadow-sm: 0 1px 2px hsla(0 0% 0% / .3), 0 6px 16px -10px hsla(0 0% 0% / .5)
    shadowSm: [
      BoxShadow(
        color: _hsl(0, 0, 0, .30),
        offset: const Offset(0, 1),
        blurRadius: 2,
      ),
      BoxShadow(
        color: _hsl(0, 0, 0, .50),
        offset: const Offset(0, 6),
        blurRadius: 16,
        spreadRadius: -10,
      ),
    ],
    // --shadow-md: 0 8px 24px -12px hsla(0 0% 0% / .55)
    shadowMd: [
      BoxShadow(
        color: _hsl(0, 0, 0, .55),
        offset: const Offset(0, 8),
        blurRadius: 24,
        spreadRadius: -12,
      ),
    ],
    // --shadow-lg: 0 16px 40px -18px hsla(0 0% 0% / .65)
    shadowLg: [
      BoxShadow(
        color: _hsl(0, 0, 0, .65),
        offset: const Offset(0, 16),
        blurRadius: 40,
        spreadRadius: -18,
      ),
    ],
    // --shadow-accent: 0 12px 26px -10px hsla(217 91% 60% / .5)
    shadowAccent: [
      BoxShadow(
        color: _hsl(217, 91, 60, .50),
        offset: const Offset(0, 12),
        blurRadius: 26,
        spreadRadius: -10,
      ),
    ],
    // Dark flattens neumorphic to a normal soft shadow (web: --shadow-neu
    // falls back to --shadow-sm).
    neuRaised: [
      BoxShadow(
        color: _hsl(0, 0, 0, .30),
        offset: const Offset(0, 1),
        blurRadius: 2,
      ),
      BoxShadow(
        color: _hsl(0, 0, 0, .50),
        offset: const Offset(0, 6),
        blurRadius: 16,
        spreadRadius: -10,
      ),
    ],
    // --shadow-neu-inset (dark): inset 0 1px 2px hsla(0 0% 0% / .4)
    neuPressed: [
      BoxShadow(
        color: _hsl(0, 0, 0, .40),
        offset: const Offset(0, 1),
        blurRadius: 2,
      ),
    ],
  );
}

/// Corner radii. `pill` is intentionally large to fully round capsule shapes.
class AppRadii {
  AppRadii._();

  static const double smValue = 10;
  static const double mdValue = 14;
  static const double lgValue = 18;
  static const double xlValue = 24;
  static const double pillValue = 999;

  static const BorderRadius sm = BorderRadius.all(Radius.circular(smValue));
  static const BorderRadius md = BorderRadius.all(Radius.circular(mdValue));
  static const BorderRadius lg = BorderRadius.all(Radius.circular(lgValue));
  static const BorderRadius xl = BorderRadius.all(Radius.circular(xlValue));
  static const BorderRadius pill =
      BorderRadius.all(Radius.circular(pillValue));
}

/// Spacing scale (logical pixels). Mirrors web `--s-1`..`--s-8`.
class AppSpacing {
  AppSpacing._();

  static const double s1 = 4;
  static const double s2 = 8;
  static const double s3 = 12;
  static const double s4 = 16;
  static const double s5 = 24;
  static const double s6 = 32;
  static const double s7 = 48;
  static const double s8 = 64;
}

/// Type sizes (logical pixels), matching the web scale.
class AppTextSizes {
  AppTextSizes._();

  static const double caption = 12;
  static const double sm = 14;
  static const double base = 16;
  static const double lg = 18;
  static const double h3 = 24;
  static const double h2 = 30;
  static const double h1 = 38;
}

/// Font weights.
class AppFontWeights {
  AppFontWeights._();

  static const FontWeight regular = FontWeight.w400;
  static const FontWeight medium = FontWeight.w500;
  static const FontWeight semibold = FontWeight.w600;
  static const FontWeight bold = FontWeight.w700;
  static const FontWeight extra = FontWeight.w800;
}

/// Motion tokens.
class AppMotion {
  AppMotion._();

  static const Duration durFast = Duration(milliseconds: 140);
  static const Duration durBase = Duration(milliseconds: 200);
  static const Duration durSlow = Duration(milliseconds: 280);

  /// Standard easing — cubic-bezier(.22,.61,.36,1), matching the web `--ease`.
  static const Cubic ease = Cubic(0.22, 0.61, 0.36, 1.0);
}
