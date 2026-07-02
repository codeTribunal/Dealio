import 'package:flutter/material.dart';

import '../../core/theme/app_tokens.dart';

/// Custom toggle matching the web design system's switch:
///   • pill track ~44×24 — [AppTokens.accent] when ON, the muted
///     [AppTokens.borderStrong] when OFF (mirrors web `bg-accent` / `bg-border-strong`).
///   • a ~20px white ([AppTokens.surface]) circular thumb with a soft shadow,
///     inset 2px, that slides left↔right with a smooth ~200ms eased transition.
///
/// API mirrors a Material [Switch]: pass [value] and [onChanged]. A null
/// [onChanged] renders the control disabled (dimmed, non-interactive).
/// Tokens only — light + dark correct.
class AppSwitch extends StatelessWidget {
  final bool value;
  final ValueChanged<bool>? onChanged;

  const AppSwitch({super.key, required this.value, required this.onChanged});

  static const double _trackW = 44;
  static const double _trackH = 24;
  static const double _thumb = 20;
  static const double _inset = 2;

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    final enabled = onChanged != null;

    // Semantics: announce as a switch with its on/off state to TalkBack /
    // VoiceOver. The hit area is expanded to the 44px floor (PRODUCT.md)
    // while the 44×24 visual stays — Center only grows when the parent allows.
    return Semantics(
      toggled: value,
      enabled: enabled,
      child: Opacity(
        opacity: enabled ? 1.0 : 0.5,
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: enabled ? () => onChanged!(!value) : null,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
            child: Center(
              child: AnimatedContainer(
                duration: AppMotion.durBase,
                curve: AppMotion.ease,
                width: _trackW,
                height: _trackH,
                decoration: BoxDecoration(
                  color: value ? t.accent : t.borderStrong,
                  borderRadius: AppRadii.pill,
                ),
                child: AnimatedAlign(
                  duration: AppMotion.durBase,
                  curve: AppMotion.ease,
                  alignment:
                      value ? Alignment.centerRight : Alignment.centerLeft,
                  child: Padding(
                    padding: const EdgeInsets.all(_inset),
                    child: Container(
                      width: _thumb,
                      height: _thumb,
                      decoration: BoxDecoration(
                        color: t.surface,
                        shape: BoxShape.circle,
                        boxShadow: t.shadowSm,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
