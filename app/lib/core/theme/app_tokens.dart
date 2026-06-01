import 'package:flutter/material.dart';

/// Design tokens for the "Practical Soft Depth" system on a Cobalt accent.
///
/// These values are kept IDENTICAL to the web app (`web/app/tokens.css`) so the
/// Flutter app and the Next.js web app render the same visual language.
///
/// Usage:
///   final t = AppTokens.of(context); // picks light/dark by Theme brightness
///   Container(color: t.surface, boxShadow: t.shadowMd, ...)
///
/// Color-bearing tokens (which differ between light/dark) live on [AppTokens].
/// Brightness-independent tokens (radii, spacing, type scale, weights, motion)
/// live on the small static helper classes below.
@immutable
class AppTokens {
  final Brightness brightness;

  // ── Accent — Cobalt ──────────────────────────────────────────────────────
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

  /// Cobalt-tinted glow for accent/primary affordances (`--shadow-accent`).
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
  static const AppTokens light = AppTokens._(
    brightness: Brightness.light,

    accent: Color(0xFF2563EB),
    accentHover: Color(0xFF1D4ED8),
    accentActive: Color(0xFF1E40AF),
    accentSoft: Color(0xFFEAF0FF),
    accentOn: Color(0xFFFFFFFF),

    success: Color(0xFF16A34A),
    successSoft: Color(0xFFDCFCE7),
    successStrong: Color(0xFF15803D),
    warning: Color(0xFFD97706),
    warningSoft: Color(0xFFFEF3C7),
    warningStrong: Color(0xFFB45309),
    error: Color(0xFFDC2626),
    errorSoft: Color(0xFFFEE2E2),
    errorStrong: Color(0xFFB91C1C),

    bg: Color(0xFFEEF2FB),
    surface: Color(0xFFFFFFFF),
    surface2: Color(0xFFF7F9FE),
    border: Color(0xFFE3EAFA),
    borderStrong: Color(0xFFD4DDEE),

    text1: Color(0xFF1A2540),
    text2: Color(0xFF6B7A9C),
    text3: Color(0xFF97A3BC),

    // --shadow-sm: 0 1px 2px rgba(26,37,64,.05),
    //             0 4px 12px -8px rgba(26,37,64,.12)
    shadowSm: [
      BoxShadow(
        color: Color(0x0D1A2540), // .05
        offset: Offset(0, 1),
        blurRadius: 2,
      ),
      BoxShadow(
        color: Color(0x1F1A2540), // .12
        offset: Offset(0, 4),
        blurRadius: 12,
        spreadRadius: -8,
      ),
    ],
    // --shadow-md: 0 8px 20px -12px rgba(26,37,64,.18)
    shadowMd: [
      BoxShadow(
        color: Color(0x2E1A2540), // .18
        offset: Offset(0, 8),
        blurRadius: 20,
        spreadRadius: -12,
      ),
    ],
    // --shadow-lg: 0 16px 40px -20px rgba(26,37,64,.28)
    shadowLg: [
      BoxShadow(
        color: Color(0x471A2540), // .28
        offset: Offset(0, 16),
        blurRadius: 40,
        spreadRadius: -20,
      ),
    ],
    // --shadow-accent: 0 12px 26px -10px rgba(37,99,235,.45)
    shadowAccent: [
      BoxShadow(
        color: Color(0x732563EB), // .45
        offset: Offset(0, 12),
        blurRadius: 26,
        spreadRadius: -10,
      ),
    ],
    // --shadow-neu: 5px 5px 12px #d2dbef, -5px -5px 12px #ffffff
    neuRaised: [
      BoxShadow(
        color: Color(0xFFFFFFFF),
        offset: Offset(-5, -5),
        blurRadius: 12,
      ),
      BoxShadow(
        color: Color(0xFFD2DBEF),
        offset: Offset(5, 5),
        blurRadius: 12,
      ),
    ],
    // Pressed residual approximating --shadow-neu-inset.
    neuPressed: [
      BoxShadow(
        color: Color(0x141A2540), // ~.08
        offset: Offset(0, 1),
        blurRadius: 3,
      ),
    ],
  );

  // ───────────────────────────── DARK ─────────────────────────────────────
  static const AppTokens dark = AppTokens._(
    brightness: Brightness.dark,

    accent: Color(0xFF3B82F6),
    accentHover: Color(0xFF60A5FA),
    accentActive: Color(0xFF93C5FD),
    accentSoft: Color(0x293B82F6), // rgba(59,130,246,.16)
    accentOn: Color(0xFF0B1322),

    success: Color(0xFF22C55E),
    successSoft: Color(0x2922C55E), // .16
    successStrong: Color(0xFF4ADE80),
    warning: Color(0xFFF59E0B),
    warningSoft: Color(0x29F59E0B), // .16
    warningStrong: Color(0xFFFBBF24),
    error: Color(0xFFF87171),
    errorSoft: Color(0x29F87171), // .16
    errorStrong: Color(0xFFFCA5A5),

    bg: Color(0xFF0B1322),
    surface: Color(0xFF111B2E),
    surface2: Color(0xFF0E1626),
    border: Color(0xFF22324D),
    borderStrong: Color(0xFF2C3E5C),

    text1: Color(0xFFEEF3FB),
    text2: Color(0xFF8DA0C0),
    text3: Color(0xFF5D7299),

    // --shadow-sm: 0 1px 2px rgba(0,0,0,.3), 0 6px 16px -10px rgba(0,0,0,.5)
    shadowSm: [
      BoxShadow(
        color: Color(0x4D000000), // .30
        offset: Offset(0, 1),
        blurRadius: 2,
      ),
      BoxShadow(
        color: Color(0x80000000), // .50
        offset: Offset(0, 6),
        blurRadius: 16,
        spreadRadius: -10,
      ),
    ],
    // --shadow-md: 0 8px 24px -12px rgba(0,0,0,.55)
    shadowMd: [
      BoxShadow(
        color: Color(0x8C000000), // .55
        offset: Offset(0, 8),
        blurRadius: 24,
        spreadRadius: -12,
      ),
    ],
    // --shadow-lg: 0 16px 40px -18px rgba(0,0,0,.65)
    shadowLg: [
      BoxShadow(
        color: Color(0xA6000000), // .65
        offset: Offset(0, 16),
        blurRadius: 40,
        spreadRadius: -18,
      ),
    ],
    // --shadow-accent: 0 12px 26px -10px rgba(59,130,246,.5)
    shadowAccent: [
      BoxShadow(
        color: Color(0x803B82F6), // .50
        offset: Offset(0, 12),
        blurRadius: 26,
        spreadRadius: -10,
      ),
    ],
    // Dark flattens neumorphic to a normal soft shadow (web: --shadow-neu
    // falls back to --shadow-sm).
    neuRaised: [
      BoxShadow(
        color: Color(0x4D000000),
        offset: Offset(0, 1),
        blurRadius: 2,
      ),
      BoxShadow(
        color: Color(0x80000000),
        offset: Offset(0, 6),
        blurRadius: 16,
        spreadRadius: -10,
      ),
    ],
    // --shadow-neu-inset (dark): inset 0 1px 2px rgba(0,0,0,.4)
    neuPressed: [
      BoxShadow(
        color: Color(0x66000000), // .40
        offset: Offset(0, 1),
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
