import 'dart:ui';

import 'package:flutter/material.dart';

import '../../core/icons/app_icon.dart';
import '../../core/theme/app_tokens.dart';

/// Frosted-glass blur is OFF by default: `BackdropFilter` janks on low-end
/// Android, which is exactly this market's hardware, and the blur is
/// decorative (the solid bar keeps the identical shape, shadow, and sliding
/// selector). Flip to true to treat blur as an enhancement on known-good
/// devices.
const bool kUseGlassBlur = false;

class FloatingTabItem {
  final AppIconName icon;
  final String label;
  const FloatingTabItem({required this.icon, required this.label});
}

/// A floating, frosted-glass tab bar with an animated sliding selector.
///
/// Floats inset from the screen edges with a margin below (not flush), casts a
/// soft shadow, and the active-tab pill glides between slots with an eased
/// ~280ms animation. Active tab uses the accent color; inactive uses text-3.
class FloatingTabBar extends StatelessWidget {
  final List<FloatingTabItem> items;
  final int currentIndex;
  final ValueChanged<int> onTap;

  const FloatingTabBar({
    super.key,
    required this.items,
    required this.currentIndex,
    required this.onTap,
  });

  /// Height of the pill bar itself.
  static const double barHeight = 62;

  /// Gap between the bar and the bottom safe-area edge (the SafeArea below).
  static const double bottomMargin = AppSpacing.s3;

  /// Total vertical space the floating bar reserves above the bottom safe area
  /// (bar + its bottom margin). Screens lift their FAB by this so it clears the
  /// bar; the Scaffold's `endFloat` then adds the standard 16px gap on top.
  static const double reservedHeight = barHeight + bottomMargin;

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    const radius = AppRadii.xl;

    // Glass → translucent so the blur shows through; Solid → opaque surface.
    final barColor =
        kUseGlassBlur ? t.surface.withValues(alpha: 0.72) : t.surface;

    // Inset so the selector pill sits a touch inside each slot. Kept small so
    // the active pill reads as a prominent, full-feeling highlight.
    const selectorInset = AppSpacing.s1;

    final content = Container(
      height: barHeight,
      decoration: BoxDecoration(
        color: barColor,
        borderRadius: radius,
        border: Border.all(color: t.border),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final slotW = constraints.maxWidth / items.length;
          return Stack(
            children: [
              // Sliding selector — exactly one slot wide minus the inset,
              // vertically centred, matching the inner pill radius. Geometry is
              // derived from the measured slot width so it lines up under the
              // active tab.
              AnimatedPositioned(
                duration: AppMotion.durSlow,
                curve: AppMotion.ease,
                left: slotW * currentIndex + selectorInset,
                top: selectorInset,
                bottom: selectorInset,
                width: slotW - selectorInset * 2,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: t.accentSoft,
                    borderRadius: AppRadii.lg,
                  ),
                ),
              ),
              // Tabs fill the full bar height so the whole slot is tappable;
              // feedback is a brief on-brand scale (no Material ripple to spill
              // outside the rounded pill).
              Positioned.fill(
                child: Row(
                  children: List.generate(items.length, (i) {
                    final selected = i == currentIndex;
                    final color = selected ? t.accent : t.text3;
                    return Expanded(
                      child: _TabButton(
                        onTap: () => onTap(i),
                        label: items[i].label,
                        selected: selected,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            AppIcon(
                                name: items[i].icon, size: 22, color: color),
                            const SizedBox(height: 2),
                            Text(
                              items[i].label,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                // Slightly smaller than caption (12) so the
                                // longest active label fits across en/uz/ru
                                // ("Appointments" / "Navbatlar" / "Записи").
                                fontSize: 11,
                                fontWeight: selected
                                    ? AppFontWeights.semibold
                                    : AppFontWeights.medium,
                                color: color,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                ),
              ),
            ],
          );
        },
      ),
    );

    // Shadow sits on the outer (unclipped) box so it isn't cut by the clip.
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
            AppSpacing.s4, 0, AppSpacing.s4, bottomMargin),
        child: DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: radius,
            boxShadow: t.shadowLg,
          ),
          child: ClipRRect(
            borderRadius: radius,
            child: kUseGlassBlur
                ? BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
                    child: content,
                  )
                : content,
          ),
        ),
      ),
    );
  }
}

/// A full-slot tab tap target. The whole slot is tappable (opaque hit test, so
/// taps anywhere on the tab register), with a brief scale-down on press as
/// clean, on-brand feedback — no Material ripple that could spill outside the
/// rounded pill.
class _TabButton extends StatefulWidget {
  final VoidCallback onTap;
  final String label;
  final bool selected;
  final Widget child;
  const _TabButton({
    required this.onTap,
    required this.label,
    required this.selected,
    required this.child,
  });

  @override
  State<_TabButton> createState() => _TabButtonState();
}

class _TabButtonState extends State<_TabButton> {
  bool _pressed = false;

  void _set(bool v) {
    if (mounted && _pressed != v) setState(() => _pressed = v);
  }

  @override
  Widget build(BuildContext context) {
    // Semantics: announce as a selectable tab ("Orders, tab, selected") so
    // TalkBack users can navigate the app shell.
    return Semantics(
      button: true,
      selected: widget.selected,
      label: widget.label,
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: widget.onTap,
        onTapDown: (_) => _set(true),
        onTapUp: (_) => _set(false),
        onTapCancel: () => _set(false),
        child: AnimatedScale(
          scale: _pressed ? 0.9 : 1.0,
          duration: AppMotion.durFast,
          curve: AppMotion.ease,
          child: Center(child: widget.child),
        ),
      ),
    );
  }
}
