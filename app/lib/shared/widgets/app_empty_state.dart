import 'package:flutter/material.dart';

import '../../core/icons/app_icon.dart';
import '../../core/theme/app_tokens.dart';
import 'app_button.dart';

/// Standard empty state shown in place of a list.
///
/// Two flavours, both built from this one widget:
///  - data-empty: [icon] + [title] ("No X yet") + [message] (what the section
///    is for) + a create [ctaLabel]/[onCta] (mirrors the screen's FAB action).
///  - search-empty: [icon] (search) + [title] ("No results for …") + a
///    "Clear search" [ctaLabel]/[onCta]. Pass no [message] and no [ctaIcon].
///
/// [message] and the CTA ([ctaLabel] + [onCta]) are optional; the CTA only
/// renders when both a label and a callback are given.
class AppEmptyState extends StatelessWidget {
  final AppIconName icon;
  final String title;
  final String? message;
  final String? ctaLabel;
  final AppIconName? ctaIcon;
  final VoidCallback? onCta;

  const AppEmptyState({
    super.key,
    required this.icon,
    required this.title,
    this.message,
    this.ctaLabel,
    this.ctaIcon,
    this.onCta,
  });

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.s6),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppIcon(name: icon, size: 56, color: t.text3),
            const SizedBox(height: AppSpacing.s3),
            Text(
              title,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: AppTextSizes.base,
                fontWeight: AppFontWeights.semibold,
                color: t.text2,
              ),
            ),
            if (message != null) ...[
              const SizedBox(height: AppSpacing.s2),
              Text(
                message!,
                textAlign: TextAlign.center,
                style: TextStyle(color: t.text3, fontSize: AppTextSizes.sm),
              ),
            ],
            if (ctaLabel != null && onCta != null) ...[
              const SizedBox(height: AppSpacing.s5),
              AppButton(
                label: ctaLabel!,
                leftIcon: ctaIcon,
                size: AppButtonSize.sm,
                onPressed: onCta,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
