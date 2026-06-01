import 'package:flutter/material.dart';

import '../../core/theme/app_tokens.dart';

/// A small accent-colored progress indicator.
///
/// [size] controls the diameter; [color] overrides the accent default
/// (useful on accent backgrounds, e.g. inside a primary [AppButton]).
class AppSpinner extends StatelessWidget {
  final double size;
  final double strokeWidth;
  final Color? color;

  const AppSpinner({
    super.key,
    this.size = 20,
    this.strokeWidth = 2,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final c = color ?? AppTokens.of(context).accent;
    return SizedBox(
      width: size,
      height: size,
      child: CircularProgressIndicator(
        strokeWidth: strokeWidth,
        valueColor: AlwaysStoppedAnimation<Color>(c),
      ),
    );
  }
}
