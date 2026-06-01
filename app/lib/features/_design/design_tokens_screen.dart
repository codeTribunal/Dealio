import 'package:flutter/material.dart';

import '../../core/theme/app_tokens.dart';

/// Dev-only reference screen that renders the full token system so it can be
/// verified visually. Reached via `/design-tokens` (not linked in navigation).
class DesignTokensScreen extends StatelessWidget {
  const DesignTokensScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    final text = Theme.of(context).textTheme;
    final isDark = t.brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Design Tokens — Practical Soft Depth (Cobalt)'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.s5),
        children: [
          // ── Cyrillic / Latin verification ──────────────────────────────
          const _SectionTitle('Typeface — Manrope'),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(AppSpacing.s4),
            decoration: BoxDecoration(
              color: t.surface,
              borderRadius: AppRadii.md,
              border: Border.all(color: t.border),
              boxShadow: t.shadowSm,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Привет, мир! Salom, dunyo!',
                    style: text.headlineSmall),
                const SizedBox(height: AppSpacing.s2),
                Text(
                  'Cyrillic (RU) + Latin (UZ) must both render — no tofu boxes.',
                  style: text.bodySmall,
                ),
                const SizedBox(height: AppSpacing.s2),
                Text('АаБбВвГгДд  0123456789  АаБбВвГгҒғ',
                    style: text.bodyMedium),
              ],
            ),
          ),

          const SizedBox(height: AppSpacing.s6),

          // ── Colors ─────────────────────────────────────────────────────
          const _SectionTitle('Colors'),
          const _Subtitle('Accent — Cobalt'),
          _SwatchGrid([
            _Sw('accent', t.accent, isDark ? '0xFF3B82F6' : '0xFF2563EB'),
            _Sw('accentHover', t.accentHover,
                isDark ? '0xFF60A5FA' : '0xFF1D4ED8'),
            _Sw('accentActive', t.accentActive,
                isDark ? '0xFF93C5FD' : '0xFF1E40AF'),
            _Sw('accentSoft', t.accentSoft,
                isDark ? '0x2E3B82F6' : '0xFFEAF0FF'),
            _Sw('accentOn', t.accentOn, isDark ? '0xFF0B1322' : '0xFFFFFFFF'),
          ]),
          const _Subtitle('Status'),
          _SwatchGrid([
            _Sw('success', t.success, isDark ? '0xFF22C55E' : '0xFF16A34A'),
            _Sw('successSoft', t.successSoft,
                isDark ? '0x2922C55E' : '0xFFDCFCE7'),
            _Sw('successStrong', t.successStrong,
                isDark ? '0xFF4ADE80' : '0xFF15803D'),
            _Sw('warning', t.warning, isDark ? '0xFFF59E0B' : '0xFFD97706'),
            _Sw('warningSoft', t.warningSoft,
                isDark ? '0x29F59E0B' : '0xFFFEF3C7'),
            _Sw('warningStrong', t.warningStrong,
                isDark ? '0xFFFBBF24' : '0xFFB45309'),
            _Sw('error', t.error, isDark ? '0xFFF87171' : '0xFFDC2626'),
            _Sw('errorSoft', t.errorSoft,
                isDark ? '0x29F87171' : '0xFFFEE2E2'),
            _Sw('errorStrong', t.errorStrong,
                isDark ? '0xFFFCA5A5' : '0xFFB91C1C'),
          ]),
          const _Subtitle('Surfaces & borders'),
          _SwatchGrid([
            _Sw('bg', t.bg, isDark ? '0xFF0B1322' : '0xFFEEF2FB'),
            _Sw('surface', t.surface, isDark ? '0xFF111B2E' : '0xFFFFFFFF'),
            _Sw('surface2', t.surface2, isDark ? '0xFF0E1626' : '0xFFF7F9FE'),
            _Sw('border', t.border, isDark ? '0xFF22324D' : '0xFFE3EAFA'),
            _Sw('borderStrong', t.borderStrong,
                isDark ? '0xFF2C3E5C' : '0xFFD4DDEE'),
          ]),
          const _Subtitle('Text'),
          _SwatchGrid([
            _Sw('text1', t.text1, isDark ? '0xFFEEF3FB' : '0xFF1A2540'),
            _Sw('text2', t.text2, isDark ? '0xFF8DA0C0' : '0xFF6B7A9C'),
            _Sw('text3', t.text3, isDark ? '0xFF5D7299' : '0xFF97A3BC'),
          ]),

          const SizedBox(height: AppSpacing.s6),

          // ── Radii ──────────────────────────────────────────────────────
          const _SectionTitle('Radius scale'),
          Wrap(
            spacing: AppSpacing.s4,
            runSpacing: AppSpacing.s4,
            children: [
              _RadiusChip('sm', AppRadii.sm, AppRadii.smValue, t),
              _RadiusChip('md', AppRadii.md, AppRadii.mdValue, t),
              _RadiusChip('lg', AppRadii.lg, AppRadii.lgValue, t),
              _RadiusChip('xl', AppRadii.xl, AppRadii.xlValue, t),
              _RadiusChip('pill', AppRadii.pill, AppRadii.pillValue, t),
            ],
          ),

          const SizedBox(height: AppSpacing.s6),

          // ── Shadows ────────────────────────────────────────────────────
          const _SectionTitle('Shadow scale'),
          Wrap(
            spacing: AppSpacing.s6,
            runSpacing: AppSpacing.s6,
            children: [
              _ShadowCard('shadowSm', t.shadowSm, t),
              _ShadowCard('shadowMd', t.shadowMd, t),
              _ShadowCard('shadowLg', t.shadowLg, t),
              _ShadowCard('shadowAccent', t.shadowAccent, t),
            ],
          ),

          const SizedBox(height: AppSpacing.s6),

          // ── Quick-action neumorphic tile (interactive) ─────────────────
          const _SectionTitle('Quick-action tile (neumorphic — depresses on tap)'),
          Text(
            'Press and hold the tile: it visibly depresses. Reserved for '
            'quick-action buttons only. In dark mode the neumorphic shadow is '
            'flattened to a normal soft shadow.',
            style: text.bodySmall,
          ),
          const SizedBox(height: AppSpacing.s4),
          const Row(
            children: [
              NeuTile(label: 'New order', icon: Icons.add_shopping_cart),
              SizedBox(width: AppSpacing.s5),
              NeuTile(label: 'New booking', icon: Icons.event_available),
            ],
          ),

          const SizedBox(height: AppSpacing.s6),

          // ── Type scale ─────────────────────────────────────────────────
          const _SectionTitle('Type scale'),
          _TypeRow('displayLarge (h1 / 38)', text.displayLarge),
          _TypeRow('displayMedium (h2 / 30)', text.displayMedium),
          _TypeRow('displaySmall (h3 / 24)', text.displaySmall),
          _TypeRow('titleLarge (lg / 18)', text.titleLarge),
          _TypeRow('bodyMedium (base / 16)', text.bodyMedium),
          _TypeRow('bodySmall (sm / 14)', text.bodySmall),
          _TypeRow('labelMedium (caption / 12)', text.labelMedium),

          const SizedBox(height: AppSpacing.s8),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Neumorphic quick-action tile
// ─────────────────────────────────────────────────────────────────────────

/// A quick-action tile demonstrating the neumorphic raised → pressed look.
///
/// Pressed-state implementation (Flutter has no true `inset` BoxShadow):
/// on press we swap the decoration to a "depressed" look —
///   • background changes from [surface] to the slightly darker [surface2]
///   • a thin [borderStrong] outline is added
///   • the raised [neuRaised] shadow is dropped to the subtle [neuPressed]
///     residual shadow
/// and the content is nudged down/scaled slightly, so the tile reads as
/// pressed into the surface. The transition is animated with the motion tokens.
class NeuTile extends StatefulWidget {
  final String label;
  final IconData icon;

  const NeuTile({super.key, required this.label, required this.icon});

  @override
  State<NeuTile> createState() => _NeuTileState();
}

class _NeuTileState extends State<NeuTile> {
  bool _pressed = false;

  void _set(bool v) => setState(() => _pressed = v);

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    final text = Theme.of(context).textTheme;

    return GestureDetector(
      onTapDown: (_) => _set(true),
      onTapUp: (_) => _set(false),
      onTapCancel: () => _set(false),
      child: AnimatedContainer(
        duration: AppMotion.durFast,
        curve: AppMotion.ease,
        width: 132,
        height: 108,
        transform: _pressed
            ? Matrix4.diagonal3Values(0.97, 0.97, 1)
            : Matrix4.identity(),
        transformAlignment: Alignment.center,
        decoration: BoxDecoration(
          color: _pressed ? t.surface2 : t.surface,
          borderRadius: AppRadii.lg,
          border: Border.all(
            color: _pressed ? t.borderStrong : Colors.transparent,
            width: 1,
          ),
          boxShadow: _pressed ? t.neuPressed : t.neuRaised,
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(widget.icon, color: t.accent, size: 28),
            const SizedBox(height: AppSpacing.s2),
            Text(
              widget.label,
              style: text.labelLarge?.copyWith(color: t.text1),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Small presentational helpers
// ─────────────────────────────────────────────────────────────────────────

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

class _Subtitle extends StatelessWidget {
  final String text;
  const _Subtitle(this.text);

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return Padding(
      padding: const EdgeInsets.only(top: AppSpacing.s4, bottom: AppSpacing.s3),
      child: Text(
        text,
        style: Theme.of(context)
            .textTheme
            .titleSmall
            ?.copyWith(color: t.text2),
      ),
    );
  }
}

class _Sw {
  final String name;
  final Color color;
  final String hex;
  const _Sw(this.name, this.color, this.hex);
}

class _SwatchGrid extends StatelessWidget {
  final List<_Sw> swatches;
  const _SwatchGrid(this.swatches);

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    final text = Theme.of(context).textTheme;
    return Wrap(
      spacing: AppSpacing.s3,
      runSpacing: AppSpacing.s3,
      children: [
        for (final s in swatches)
          SizedBox(
            width: 104,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  height: 56,
                  decoration: BoxDecoration(
                    color: s.color,
                    borderRadius: AppRadii.sm,
                    border: Border.all(color: t.border),
                  ),
                ),
                const SizedBox(height: AppSpacing.s1),
                Text(s.name, style: text.labelMedium?.copyWith(color: t.text1)),
                Text(s.hex,
                    style: text.labelSmall?.copyWith(color: t.text3)),
              ],
            ),
          ),
      ],
    );
  }
}

class _RadiusChip extends StatelessWidget {
  final String name;
  final BorderRadius radius;
  final double value;
  final AppTokens t;
  const _RadiusChip(this.name, this.radius, this.value, this.t);

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Column(
      children: [
        Container(
          width: 72,
          height: 72,
          decoration: BoxDecoration(
            color: t.accentSoft,
            borderRadius: radius,
            border: Border.all(color: t.accent),
          ),
        ),
        const SizedBox(height: AppSpacing.s1),
        Text('$name (${value.toInt()})',
            style: text.labelMedium?.copyWith(color: t.text2)),
      ],
    );
  }
}

class _ShadowCard extends StatelessWidget {
  final String name;
  final List<BoxShadow> shadow;
  final AppTokens t;
  const _ShadowCard(this.name, this.shadow, this.t);

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Column(
      children: [
        Container(
          width: 120,
          height: 80,
          decoration: BoxDecoration(
            color: t.surface,
            borderRadius: AppRadii.md,
            boxShadow: shadow,
          ),
        ),
        const SizedBox(height: AppSpacing.s2),
        Text(name, style: text.labelMedium?.copyWith(color: t.text2)),
      ],
    );
  }
}

class _TypeRow extends StatelessWidget {
  final String label;
  final TextStyle? style;
  const _TypeRow(this.label, this.style);

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.s4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: Theme.of(context)
                  .textTheme
                  .labelSmall
                  ?.copyWith(color: t.text3)),
          const SizedBox(height: AppSpacing.s1),
          Text('Aa Привет Salom 123', style: style),
        ],
      ),
    );
  }
}
