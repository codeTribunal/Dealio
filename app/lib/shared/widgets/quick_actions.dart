import 'package:flutter/material.dart';

import '../../core/icons/app_icon.dart';
import '../../core/theme/app_tokens.dart';
import 'neu_tile.dart';

/// A single quick-action: an [icon] above a [label], opening [onTap].
class QuickActionItem {
  final AppIconName icon;
  final String label;
  final VoidCallback? onTap;

  const QuickActionItem({required this.icon, required this.label, this.onTap});
}

/// A non-scrolling grid of neumorphic [NeuTile] quick actions. The tiles are
/// the ONLY place the neumorphic treatment is used. [columns] defaults to a
/// responsive count based on available width.
class QuickActions extends StatelessWidget {
  final List<QuickActionItem> items;
  final int? columns;
  final double spacing;

  const QuickActions({
    super.key,
    required this.items,
    this.columns,
    this.spacing = AppSpacing.s3,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final cols = columns ?? (constraints.maxWidth >= 360 ? 4 : 3);
        final totalSpacing = spacing * (cols - 1);
        final tileWidth = (constraints.maxWidth - totalSpacing) / cols;

        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: [
            for (final item in items)
              SizedBox(
                width: tileWidth,
                child: _QuickActionTile(item: item),
              ),
          ],
        );
      },
    );
  }
}

class _QuickActionTile extends StatelessWidget {
  final QuickActionItem item;
  const _QuickActionTile({required this.item});

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return NeuTile(
      onTap: item.onTap,
      height: 92,
      padding: const EdgeInsets.all(AppSpacing.s3),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          AppIcon(name: item.icon, size: 26, color: t.accent),
          const SizedBox(height: AppSpacing.s2),
          Text(
            item.label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: AppTextSizes.caption,
              fontWeight: AppFontWeights.semibold,
              color: t.text1,
            ),
          ),
        ],
      ),
    );
  }
}
