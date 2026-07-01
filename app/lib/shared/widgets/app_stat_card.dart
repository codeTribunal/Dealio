import 'package:flutter/material.dart';

import '../../core/icons/app_icon.dart';
import '../../core/theme/app_tokens.dart';
import 'app_card.dart';

/// A compact metric tile built on [AppCard]: an uppercase [label], a large
/// [value], and an optional [delta]. When [money] is true the value is colored
/// with [AppTokens.successStrong]. A [delta] string beginning with '-' is
/// colored error, otherwise success. An optional [icon] renders a small
/// accent-tinted glyph chip at the top-right (purely decorative).
class AppStatCard extends StatelessWidget {
  final String label;
  final String value;
  final String? delta;
  final bool money;
  final VoidCallback? onTap;
  final AppIconName? icon;

  const AppStatCard({
    super.key,
    required this.label,
    required this.value,
    this.delta,
    this.money = false,
    this.onTap,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    final deltaNegative = delta != null && delta!.trimLeft().startsWith('-');

    // Reserve a constant two-line height for the label so the value below always
    // starts at the same offset. Side-by-side cards then line up — a 1-line
    // label ("New customers") and a 2-line one ("Pending payments") share the
    // same title row and the same number row.
    const labelLineHeight = 1.25;
    final labelStyle = TextStyle(
      fontSize: AppTextSizes.caption,
      fontWeight: AppFontWeights.semibold,
      letterSpacing: 0.5,
      color: t.text2,
      height: labelLineHeight,
    );
    final labelHeight = MediaQuery.textScalerOf(context)
        .scale(AppTextSizes.caption * labelLineHeight * 2);

    return AppCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            height: labelHeight,
            width: double.infinity,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    label.toUpperCase(),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: labelStyle,
                  ),
                ),
                if (icon != null) ...[
                  const SizedBox(width: AppSpacing.s2),
                  Container(
                    width: 28,
                    height: 28,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: t.accentSoft,
                      borderRadius: AppRadii.sm,
                    ),
                    child: AppIcon(name: icon!, size: 15, color: t.accent),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.s2),
          // Scale the value down to fit the (often half-width) card on one line,
          // so long currency values never wrap mid-number.
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              maxLines: 1,
              softWrap: false,
              style: TextStyle(
                fontSize: AppTextSizes.h2,
                fontWeight: AppFontWeights.extra,
                color: money ? t.successStrong : t.text1,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
          ),
          if (delta != null) ...[
            const SizedBox(height: AppSpacing.s1),
            Text(
              delta!,
              style: TextStyle(
                fontSize: AppTextSizes.sm,
                fontWeight: AppFontWeights.semibold,
                color: deltaNegative ? t.errorStrong : t.successStrong,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
