import 'package:flutter/material.dart';

import '../../core/theme/app_tokens.dart';

/// Custom checkbox matching the design system (and the clean feel of AppSwitch):
///   • rounded square ([AppRadii.sm]) ~22px;
///   • [AppTokens.accent] fill + white ([AppTokens.accentOn]) check when checked,
///     [AppTokens.surface] fill with a [AppTokens.borderStrong] border when not;
///   • subtle scale-on-press feedback (no harsh Material ripple).
///
/// API mirrors a Material [Checkbox]: [value] + [onChanged]; a null [onChanged]
/// renders it disabled (dimmed, non-interactive). Tokens only; light + dark.
class AppCheckbox extends StatefulWidget {
  final bool value;
  final ValueChanged<bool>? onChanged;

  const AppCheckbox({super.key, required this.value, required this.onChanged});

  @override
  State<AppCheckbox> createState() => _AppCheckboxState();
}

class _AppCheckboxState extends State<AppCheckbox> {
  static const double _size = 22;
  bool _pressed = false;

  void _set(bool v) {
    if (mounted && _pressed != v) setState(() => _pressed = v);
  }

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    final enabled = widget.onChanged != null;
    final checked = widget.value;

    // Semantics: announce as a checkbox with its checked state to TalkBack /
    // VoiceOver. The hit area is expanded to the 44px floor (PRODUCT.md)
    // while the visual stays 22px — Center only grows when the parent allows.
    return Semantics(
      checked: checked,
      enabled: enabled,
      child: Opacity(
        opacity: enabled ? 1.0 : 0.5,
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: enabled ? () => widget.onChanged!(!checked) : null,
          onTapDown: enabled ? (_) => _set(true) : null,
          onTapUp: enabled ? (_) => _set(false) : null,
          onTapCancel: () => _set(false),
          child: ConstrainedBox(
            constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
            child: Center(
              child: AnimatedScale(
                scale: _pressed ? 0.88 : 1.0,
                duration: AppMotion.durFast,
                curve: AppMotion.ease,
                child: AnimatedContainer(
                  duration: AppMotion.durBase,
                  curve: AppMotion.ease,
                  width: _size,
                  height: _size,
                  decoration: BoxDecoration(
                    color: checked ? t.accent : t.surface,
                    borderRadius: AppRadii.sm,
                    border: Border.all(
                      color: checked ? t.accent : t.borderStrong,
                      width: 2,
                    ),
                  ),
                  child: checked
                      ? Icon(Icons.check, size: 15, color: t.accentOn)
                      : null,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
