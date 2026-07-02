import 'package:flutter/material.dart';

import '../../core/icons/app_icon.dart';
import '../../core/theme/app_tokens.dart';
import 'app_spinner.dart';

/// Visual style of an [AppButton].
enum AppButtonVariant { primary, secondary, ghost, danger }

/// Size of an [AppButton].
enum AppButtonSize { sm, md, lg }

/// Soft Depth button.
///
/// Variants: primary (accent fill + accent glow), secondary (surface + border),
/// ghost (transparent, accentSoft on press), danger (error fill).
///
/// Backward-compatible with the original API: the legacy [outlined] flag maps
/// to [AppButtonVariant.secondary] when [variant] is not given, and the legacy
/// [icon] ([IconData]) still renders if no [leftIcon] is provided.
class AppButton extends StatefulWidget {
  final String label;
  final VoidCallback? onPressed;
  final AppButtonVariant? variant;
  final AppButtonSize size;
  final AppIconName? leftIcon;
  final AppIconName? rightIcon;
  final bool loading;
  final bool fullWidth;
  final bool disabled;

  // ── Legacy params (kept so existing call sites keep working) ──
  final bool outlined;
  final IconData? icon;

  const AppButton({
    super.key,
    required this.label,
    this.onPressed,
    this.variant,
    this.size = AppButtonSize.md,
    this.leftIcon,
    this.rightIcon,
    this.loading = false,
    this.fullWidth = false,
    this.disabled = false,
    this.outlined = false,
    this.icon,
  });

  AppButtonVariant get _variant =>
      variant ??
      (outlined ? AppButtonVariant.secondary : AppButtonVariant.primary);

  @override
  State<AppButton> createState() => _AppButtonState();
}

class _AppButtonState extends State<AppButton> {
  bool _pressed = false;

  void _set(bool v) {
    if (mounted) setState(() => _pressed = v);
  }

  double get _height => switch (widget.size) {
        AppButtonSize.sm => 40,
        AppButtonSize.md => 52,
        AppButtonSize.lg => 56,
      };

  double get _hPad => switch (widget.size) {
        AppButtonSize.sm => AppSpacing.s3,
        AppButtonSize.md => AppSpacing.s4,
        AppButtonSize.lg => AppSpacing.s5,
      };

  double get _iconSize => switch (widget.size) {
        AppButtonSize.sm => 16,
        AppButtonSize.md => 18,
        AppButtonSize.lg => 20,
      };

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    final text = Theme.of(context).textTheme;
    final variant = widget._variant;
    final isInteractive =
        !widget.disabled && !widget.loading && widget.onPressed != null;

    // Resolve colors per variant (and press state for ghost).
    Color bg;
    Color fg;
    Color? borderColor;
    List<BoxShadow>? shadow;
    switch (variant) {
      case AppButtonVariant.primary:
        bg = t.accent;
        fg = t.accentOn;
        shadow = isInteractive ? t.shadowAccent : null;
      case AppButtonVariant.secondary:
        bg = t.surface;
        fg = t.text1;
        borderColor = t.border;
      case AppButtonVariant.ghost:
        bg = _pressed ? t.accentSoft : Colors.transparent;
        fg = _pressed ? t.accent : t.text2;
      case AppButtonVariant.danger:
        bg = t.error;
        fg = Colors.white;
      // No glow: the accent glow under an error fill read as a *blue* halo,
      // and a destructive action should never out-shine the primary one.
    }

    final labelStyle = text.labelLarge?.copyWith(
          color: fg,
          fontWeight: AppFontWeights.semibold,
        ) ??
        TextStyle(color: fg, fontWeight: AppFontWeights.semibold);

    Widget content;
    if (widget.loading) {
      content = AppSpinner(size: _iconSize + 2, color: fg);
    } else {
      content = Row(
        mainAxisSize: widget.fullWidth ? MainAxisSize.max : MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (widget.leftIcon != null) ...[
            AppIcon(name: widget.leftIcon!, size: _iconSize, color: fg),
            const SizedBox(width: AppSpacing.s2),
          ] else if (widget.icon != null) ...[
            Icon(widget.icon, size: _iconSize, color: fg),
            const SizedBox(width: AppSpacing.s2),
          ],
          Flexible(child: Text(widget.label, style: labelStyle)),
          if (widget.rightIcon != null) ...[
            const SizedBox(width: AppSpacing.s2),
            AppIcon(name: widget.rightIcon!, size: _iconSize, color: fg),
          ],
        ],
      );
    }

    final body = AnimatedContainer(
      duration: AppMotion.durFast,
      curve: AppMotion.ease,
      // minHeight (not a fixed height) so long uz/ru labels at large system
      // text scales wrap and grow the button instead of clipping inside it.
      constraints: BoxConstraints(minHeight: _height),
      width: widget.fullWidth ? double.infinity : null,
      padding: EdgeInsets.symmetric(horizontal: _hPad, vertical: AppSpacing.s2),
      alignment: Alignment.center,
      transform: _pressed && isInteractive
          ? Matrix4.diagonal3Values(0.98, 0.98, 1)
          : Matrix4.identity(),
      transformAlignment: Alignment.center,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: AppRadii.md,
        border: borderColor != null ? Border.all(color: borderColor) : null,
        boxShadow: shadow,
      ),
      child: content,
    );

    // Semantics: announce as a button with its label even while [loading]
    // hides the text behind a spinner.
    return Semantics(
      button: true,
      enabled: isInteractive,
      label: widget.loading ? widget.label : null,
      child: Opacity(
        opacity: isInteractive ? 1 : 0.5,
        child: GestureDetector(
          onTapDown: isInteractive ? (_) => _set(true) : null,
          onTapUp: isInteractive ? (_) => _set(false) : null,
          onTapCancel: isInteractive ? () => _set(false) : null,
          onTap: isInteractive ? widget.onPressed : null,
          child: body,
        ),
      ),
    );
  }
}
