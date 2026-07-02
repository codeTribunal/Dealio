import 'package:flutter/material.dart';

import '../../core/theme/app_tokens.dart';

/// Soft Depth surface card: surface fill, hairline border, [AppRadii.xl]
/// corners, soft [AppTokens.shadowSm]. Optional [onTap] adds pressed feedback;
/// optional [header] slot renders above [child] with a divider.
class AppCard extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry padding;
  final Widget? header;

  const AppCard({
    super.key,
    required this.child,
    this.onTap,
    this.padding = const EdgeInsets.all(AppSpacing.s5),
    this.header,
  });

  @override
  State<AppCard> createState() => _AppCardState();
}

class _AppCardState extends State<AppCard> {
  bool _pressed = false;

  void _set(bool v) {
    if (mounted) setState(() => _pressed = v);
  }

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    final tappable = widget.onTap != null;

    Widget body = Padding(
      padding: widget.padding,
      child: widget.header == null
          ? widget.child
          : Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              mainAxisSize: MainAxisSize.min,
              children: [
                widget.header!,
                const SizedBox(height: AppSpacing.s3),
                Divider(height: 1, thickness: 1, color: t.border),
                const SizedBox(height: AppSpacing.s3),
                widget.child,
              ],
            ),
    );

    final container = AnimatedContainer(
      duration: AppMotion.durFast,
      curve: AppMotion.ease,
      transform: _pressed && tappable
          ? Matrix4.diagonal3Values(0.99, 0.99, 1)
          : Matrix4.identity(),
      transformAlignment: Alignment.center,
      decoration: BoxDecoration(
        color: _pressed && tappable ? t.surface2 : t.surface,
        borderRadius: AppRadii.xl,
        border: Border.all(color: t.border),
        boxShadow: t.shadowSm,
      ),
      child: body,
    );

    if (!tappable) return container;

    // Semantics: a tappable card is a button to TalkBack/VoiceOver; its
    // content (title, amounts) provides the announced label.
    return Semantics(
      button: true,
      child: GestureDetector(
        onTapDown: (_) => _set(true),
        onTapUp: (_) => _set(false),
        onTapCancel: () => _set(false),
        onTap: widget.onTap,
        child: container,
      ),
    );
  }
}

/// Header row for an [AppCard]: a [title] (sm/semibold/text1) with an optional
/// [trailing] widget aligned to the end.
class AppCardHeader extends StatelessWidget {
  final String title;
  final Widget? trailing;

  const AppCardHeader({super.key, required this.title, this.trailing});

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: TextStyle(
              fontSize: AppTextSizes.sm,
              fontWeight: AppFontWeights.semibold,
              color: t.text1,
            ),
          ),
        ),
        if (trailing != null) trailing!,
      ],
    );
  }
}
