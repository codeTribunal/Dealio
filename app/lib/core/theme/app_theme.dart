import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app_tokens.dart';

/// App theme for the "Practical Soft Depth" (Cobalt) design system.
///
/// Phase A foundation: this wires the Manrope typeface, a token-seeded color
/// scheme, the token surfaces, and the type scale. The component themes
/// (buttons / inputs / cards / app bar) from the original theme are preserved
/// so the existing feature screens keep working unchanged — widget-level
/// restyling happens in Phase C.
class AppTheme {
  AppTheme._();

  static ThemeData get light => _build(AppTokens.light);
  static ThemeData get dark => _build(AppTokens.dark);

  static ThemeData _build(AppTokens t) {
    final isDark = t.brightness == Brightness.dark;
    final base = isDark ? ThemeData.dark() : ThemeData.light();
    final textTheme = _buildTextTheme(base.textTheme, t);

    final scheme = ColorScheme.fromSeed(
      seedColor: t.accent,
      brightness: t.brightness,
    ).copyWith(
      primary: t.accent,
      onPrimary: t.accentOn,
      primaryContainer: t.accentSoft,
      onPrimaryContainer: isDark ? t.text1 : t.accentActive,
      surface: t.surface,
      onSurface: t.text1,
      surfaceContainerHighest: t.surface2,
      onSurfaceVariant: t.text2,
      error: t.error,
      onError: isDark ? t.bg : Colors.white,
      errorContainer: t.errorSoft,
      onErrorContainer: t.errorStrong,
      outline: t.border,
      outlineVariant: t.borderStrong,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: t.brightness,
      colorScheme: scheme,
      scaffoldBackgroundColor: t.bg,
      canvasColor: t.surface,
      cardColor: t.surface,
      dividerColor: t.border,
      fontFamily: GoogleFonts.manrope().fontFamily,
      textTheme: textTheme,
      dividerTheme: DividerThemeData(color: t.border, thickness: 1, space: 1),

      // ── Component themes preserved from the original (now token-driven) ──
      // Soft Depth app bar: surface fill, text1 title, no elevation shadow —
      // a hairline bottom border provides the only separation.
      appBarTheme: AppBarTheme(
        backgroundColor: t.surface,
        foregroundColor: t.text1,
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
        shadowColor: Colors.transparent,
        centerTitle: true,
        iconTheme: IconThemeData(color: t.text1),
        actionsIconTheme: IconThemeData(color: t.text1),
        titleTextStyle: textTheme.titleLarge?.copyWith(
          color: t.text1,
          fontWeight: AppFontWeights.semibold,
        ),
        shape: Border(bottom: BorderSide(color: t.border, width: 1)),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: t.accent,
          foregroundColor: t.accentOn,
          minimumSize: const Size.fromHeight(52),
          shape: const RoundedRectangleBorder(borderRadius: AppRadii.md),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: t.accent,
          minimumSize: const Size.fromHeight(52),
          side: BorderSide(color: t.accent),
          shape: const RoundedRectangleBorder(borderRadius: AppRadii.md),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: t.surface2,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: const OutlineInputBorder(
          borderRadius: AppRadii.md,
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: AppRadii.md,
          borderSide: BorderSide(color: t.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: AppRadii.md,
          borderSide: BorderSide(color: t.accent, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: AppRadii.md,
          borderSide: BorderSide(color: t.error),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: AppRadii.md,
          borderSide: BorderSide(color: t.error, width: 2),
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: t.surface,
        shape: RoundedRectangleBorder(
          borderRadius: AppRadii.lg,
          side: BorderSide(color: t.border),
        ),
      ),
    );
  }

  /// Maps the token type scale + weights onto a Manrope-based [TextTheme].
  /// display* → h1, headline* → h2/h3, title* → lg/base, body* → base/sm,
  /// label* → sm/caption. Primary text uses `text1`; secondary roles `text2/3`.
  static TextTheme _buildTextTheme(TextTheme src, AppTokens t) {
    final base = GoogleFonts.manropeTextTheme(src);

    TextStyle? s(
      TextStyle? from, {
      required double size,
      required FontWeight weight,
      Color? color,
      double? height,
    }) =>
        from?.copyWith(
          fontSize: size,
          fontWeight: weight,
          color: color ?? t.text1,
          height: height,
        );

    return base.copyWith(
      displayLarge: s(base.displayLarge,
          size: AppTextSizes.h1, weight: AppFontWeights.extra, height: 1.1),
      displayMedium: s(base.displayMedium,
          size: AppTextSizes.h2, weight: AppFontWeights.bold, height: 1.15),
      displaySmall: s(base.displaySmall,
          size: AppTextSizes.h3, weight: AppFontWeights.bold, height: 1.2),
      headlineLarge: s(base.headlineLarge,
          size: AppTextSizes.h2, weight: AppFontWeights.bold, height: 1.15),
      headlineMedium: s(base.headlineMedium,
          size: AppTextSizes.h2, weight: AppFontWeights.bold, height: 1.15),
      headlineSmall: s(base.headlineSmall,
          size: AppTextSizes.h3, weight: AppFontWeights.semibold, height: 1.2),
      titleLarge: s(base.titleLarge,
          size: AppTextSizes.lg, weight: AppFontWeights.semibold, height: 1.3),
      titleMedium: s(base.titleMedium,
          size: AppTextSizes.base,
          weight: AppFontWeights.semibold,
          height: 1.3),
      titleSmall: s(base.titleSmall,
          size: AppTextSizes.sm, weight: AppFontWeights.semibold, height: 1.3),
      bodyLarge: s(base.bodyLarge,
          size: AppTextSizes.lg, weight: AppFontWeights.regular, height: 1.5),
      bodyMedium: s(base.bodyMedium,
          size: AppTextSizes.base, weight: AppFontWeights.regular, height: 1.5),
      bodySmall: s(base.bodySmall,
          size: AppTextSizes.sm,
          weight: AppFontWeights.regular,
          color: t.text2,
          height: 1.45),
      labelLarge: s(base.labelLarge,
          size: AppTextSizes.sm, weight: AppFontWeights.semibold, height: 1.2),
      labelMedium: s(base.labelMedium,
          size: AppTextSizes.caption,
          weight: AppFontWeights.medium,
          color: t.text2,
          height: 1.2),
      labelSmall: s(base.labelSmall,
          size: AppTextSizes.caption,
          weight: AppFontWeights.medium,
          color: t.text3,
          height: 1.2),
    );
  }
}
