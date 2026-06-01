import 'package:flutter/material.dart';

import '../../core/icons/app_icon.dart';
import '../../core/theme/app_tokens.dart';

/// Dev-only reference screen rendering every "Micro-Detail" icon so the set can
/// be verified visually. Reached via `/design-icons` (not linked in nav).
class DesignIconsScreen extends StatelessWidget {
  const DesignIconsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final AppTokens t = AppTokens.of(context);
    final Color text1 = t.text1;
    final Color accent = t.accent;
    final Color success = t.success;

    return Scaffold(
      appBar: AppBar(title: const Text('Micro-Detail Icons (Cobalt)')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.s5),
        children: [
          // ── Full set @ 32, text1 ──────────────────────────────────────
          const _SectionTitle('All icons — 32px, text1'),
          _IconGrid(size: 32, color: text1),

          const SizedBox(height: AppSpacing.s6),

          // ── Accent recolor row ────────────────────────────────────────
          const _SectionTitle('Accent color — 32px'),
          _IconWrap(size: 32, color: accent),

          const SizedBox(height: AppSpacing.s6),

          // ── Success recolor row ───────────────────────────────────────
          const _SectionTitle('Success color — 32px'),
          _IconWrap(size: 32, color: success),

          const SizedBox(height: AppSpacing.s6),

          // ── Large size row ────────────────────────────────────────────
          const _SectionTitle('Large — 48px, text1'),
          _IconWrap(size: 48, color: text1),

          const SizedBox(height: AppSpacing.s8),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String text;
  const _SectionTitle(this.text);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.s4),
      child: Text(text, style: Theme.of(context).textTheme.headlineSmall),
    );
  }
}

/// Labeled grid — each icon with its enum name beneath it.
class _IconGrid extends StatelessWidget {
  final double size;
  final Color color;
  const _IconGrid({required this.size, required this.color});

  @override
  Widget build(BuildContext context) {
    final AppTokens t = AppTokens.of(context);
    final TextTheme text = Theme.of(context).textTheme;
    return Wrap(
      spacing: AppSpacing.s3,
      runSpacing: AppSpacing.s4,
      children: [
        for (final name in kAllAppIcons)
          SizedBox(
            width: 86,
            child: Column(
              children: [
                Container(
                  height: 64,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: t.surface,
                    borderRadius: AppRadii.md,
                    border: Border.all(color: t.border),
                  ),
                  child: AppIcon(name: name, size: size, color: color),
                ),
                const SizedBox(height: AppSpacing.s1),
                Text(
                  name.name,
                  textAlign: TextAlign.center,
                  style: text.labelSmall?.copyWith(color: t.text2),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

/// Unlabeled flow of every icon at one size/color (for recolor/scale rows).
class _IconWrap extends StatelessWidget {
  final double size;
  final Color color;
  const _IconWrap({required this.size, required this.color});

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: AppSpacing.s4,
      runSpacing: AppSpacing.s4,
      children: [
        for (final name in kAllAppIcons)
          AppIcon(name: name, size: size, color: color),
      ],
    );
  }
}
