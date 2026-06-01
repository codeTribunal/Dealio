import 'package:flutter/material.dart';

import '../../core/theme/app_tokens.dart';

/// A bold accent feature card: solid cobalt fill, [AppRadii.xl] corners, the
/// cobalt [AppTokens.shadowAccent] glow, and a decorative translucent circle
/// clipped to the rounded corners. Used for the single most important figure on
/// a screen (e.g. today's revenue).
class HeroCard extends StatelessWidget {
  final String label;
  final String value;
  final String? sub;

  const HeroCard({
    super.key,
    required this.label,
    required this.value,
    this.sub,
  });

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    final onAccent = t.accentOn;

    return Container(
      decoration: BoxDecoration(
        color: t.accent,
        borderRadius: AppRadii.xl,
        boxShadow: t.shadowAccent,
      ),
      child: ClipRRect(
        borderRadius: AppRadii.xl,
        child: Stack(
          children: [
            // Decorative translucent circle, bleeding off the top-right corner.
            Positioned(
              right: -28,
              top: -28,
              child: Container(
                width: 128,
                height: 128,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(AppSpacing.s5),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: AppTextSizes.sm,
                      fontWeight: AppFontWeights.semibold,
                      color: onAccent.withValues(alpha: 0.85),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.s2),
                  Text(
                    value,
                    style: TextStyle(
                      fontSize: 34,
                      fontWeight: AppFontWeights.extra,
                      color: onAccent,
                      height: 1.1,
                      fontFeatures: const [FontFeature.tabularFigures()],
                    ),
                  ),
                  if (sub != null) ...[
                    const SizedBox(height: AppSpacing.s2),
                    Text(
                      sub!,
                      style: TextStyle(
                        fontSize: AppTextSizes.sm,
                        color: onAccent.withValues(alpha: 0.90),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
