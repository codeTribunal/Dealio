import 'package:flutter/material.dart';

import '../../core/theme/app_tokens.dart';

/// Soft-Depth modal matching the web app's dialogs: a rounded ([AppRadii.xl])
/// [AppTokens.surface] card with a soft [AppTokens.shadowLg], comfortable
/// padding, Manrope title/body via tokens, and actions aligned to the end.
///
/// Use inside the existing `showDialog<T>(...)` calls (drop-in for
/// `AlertDialog`): pass [title], [content], and [actions] (use AppButton).
/// The surrounding `showDialog`/`Navigator.pop` logic stays unchanged.
class AppDialog extends StatelessWidget {
  final String? title;
  final Widget? content;
  final List<Widget> actions;

  const AppDialog({
    super.key,
    this.title,
    this.content,
    this.actions = const [],
  });

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return Dialog(
      backgroundColor: Colors.transparent,
      elevation: 0,
      insetPadding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.s5,
        vertical: AppSpacing.s6,
      ),
      child: Container(
        decoration: BoxDecoration(
          color: t.surface,
          borderRadius: AppRadii.xl,
          boxShadow: t.shadowLg,
        ),
        padding: const EdgeInsets.all(AppSpacing.s5),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (title != null) ...[
              Text(
                title!,
                style: TextStyle(
                  fontSize: AppTextSizes.lg,
                  fontWeight: AppFontWeights.bold,
                  color: t.text1,
                ),
              ),
              if (content != null) const SizedBox(height: AppSpacing.s2),
            ],
            if (content != null)
              // Scrollable so a tall body (or one pushed up by the keyboard)
              // never overflows — the title stays pinned above, actions below.
              Flexible(
                child: SingleChildScrollView(
                  child: DefaultTextStyle.merge(
                    style: TextStyle(
                      fontSize: AppTextSizes.sm,
                      color: t.text2,
                      height: 1.45,
                    ),
                    child: content!,
                  ),
                ),
              ),
            if (actions.isNotEmpty) ...[
              const SizedBox(height: AppSpacing.s5),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  for (var i = 0; i < actions.length; i++) ...[
                    if (i > 0) const SizedBox(width: AppSpacing.s2),
                    actions[i],
                  ],
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
