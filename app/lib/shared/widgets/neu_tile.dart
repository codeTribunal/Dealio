import 'package:flutter/material.dart';

import '../../core/theme/app_tokens.dart';

/// The one neumorphic primitive in the Soft Depth system — RESERVED for
/// quick-action tiles only (see [QuickActions]). Everything else tappable uses
/// a fill or border, never shadow alone.
///
/// Raised state uses [AppTokens.neuRaised]; pressed state simulates an inset
/// (Flutter has no true inset BoxShadow) by swapping the background to the
/// darker [AppTokens.surface2], adding a thin [AppTokens.borderStrong] outline,
/// dropping to [AppTokens.neuPressed], and scaling down slightly. In dark mode
/// the neumorphic shadows are already flattened to a soft shadow by the tokens.
class NeuTile extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final double? width;
  final double? height;
  final EdgeInsetsGeometry padding;
  final BorderRadius borderRadius;

  const NeuTile({
    super.key,
    required this.child,
    this.onTap,
    this.width,
    this.height,
    this.padding = const EdgeInsets.all(AppSpacing.s3),
    this.borderRadius = AppRadii.lg,
  });

  @override
  State<NeuTile> createState() => _NeuTileState();
}

class _NeuTileState extends State<NeuTile> {
  bool _pressed = false;

  void _set(bool v) {
    if (mounted) setState(() => _pressed = v);
  }

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);

    return GestureDetector(
      onTapDown: (_) => _set(true),
      onTapUp: (_) => _set(false),
      onTapCancel: () => _set(false),
      onTap: widget.onTap,
      child: AnimatedContainer(
        duration: AppMotion.durFast,
        curve: AppMotion.ease,
        width: widget.width,
        height: widget.height,
        padding: widget.padding,
        transform: _pressed
            ? Matrix4.diagonal3Values(0.97, 0.97, 1)
            : Matrix4.identity(),
        transformAlignment: Alignment.center,
        decoration: BoxDecoration(
          color: _pressed ? t.surface2 : t.surface,
          borderRadius: widget.borderRadius,
          border: Border.all(
            color: _pressed ? t.borderStrong : Colors.transparent,
            width: 1,
          ),
          boxShadow: _pressed ? t.neuPressed : t.neuRaised,
        ),
        child: widget.child,
      ),
    );
  }
}
