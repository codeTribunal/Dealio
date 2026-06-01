import 'package:flutter/material.dart';

import '../../core/theme/app_tokens.dart';
import 'app_card.dart';

/// A compact metric tile built on [AppCard]: an uppercase [label], a large
/// [value], and an optional [delta]. When [money] is true the value is colored
/// with [AppTokens.successStrong]. A [delta] string beginning with '-' is
/// colored error, otherwise success.
class AppStatCard extends StatelessWidget {
  final String label;
  final String value;
  final String? delta;
  final bool money;
  final VoidCallback? onTap;

  const AppStatCard({
    super.key,
    required this.label,
    required this.value,
    this.delta,
    this.money = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    final deltaNegative = delta != null && delta!.trimLeft().startsWith('-');

    return AppCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label.toUpperCase(),
            style: TextStyle(
              fontSize: AppTextSizes.caption,
              fontWeight: AppFontWeights.semibold,
              letterSpacing: 0.5,
              color: t.text2,
            ),
          ),
          const SizedBox(height: AppSpacing.s2),
          Text(
            value,
            style: TextStyle(
              fontSize: AppTextSizes.h2,
              fontWeight: AppFontWeights.extra,
              color: money ? t.successStrong : t.text1,
              fontFeatures: const [FontFeature.tabularFigures()],
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
