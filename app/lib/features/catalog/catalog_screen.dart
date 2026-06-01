import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/icons/app_icon.dart';
import '../../core/models/product.dart';
import '../../core/theme/app_tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/utils/format.dart';
import '../../shared/utils/status_labels.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_card.dart';
import '../../shared/widgets/app_spinner.dart';
import 'catalog_provider.dart';

class CatalogScreen extends ConsumerWidget {
  const CatalogScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final catalogAsync = ref.watch(catalogProvider);
    final notifier = ref.read(catalogProvider.notifier);

    Future<void> openNew() async {
      await context.push('/catalog/new');
      notifier.productSaved();
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(l.catalogTitle),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: AppSpacing.s3),
            child: Center(
              child: AppButton(
                label: l.productFormNewTitle,
                leftIcon: AppIconName.add,
                size: AppButtonSize.sm,
                onPressed: openNew,
              ),
            ),
          ),
        ],
      ),
      body: catalogAsync.when(
        loading: () => const Center(child: AppSpinner(size: 32)),
        error: (e, _) => _ErrorView(
          message: e.toString(),
          onRetry: notifier.refresh,
        ),
        data: (products) {
          if (products.isEmpty) return const _EmptyView();
          return RefreshIndicator(
            color: t.accent,
            onRefresh: notifier.refresh,
            child: ListView.separated(
              padding: const EdgeInsets.all(AppSpacing.s4),
              itemCount: products.length,
              separatorBuilder: (_, __) =>
                  const SizedBox(height: AppSpacing.s2),
              itemBuilder: (ctx, i) => _ProductCard(
                product: products[i],
                onTap: () async {
                  await context.push('/catalog/${products[i].id}');
                  notifier.productSaved();
                },
                onToggle: () async {
                  try {
                    await notifier.toggleActive(products[i].id);
                  } catch (e) {
                    if (ctx.mounted) {
                      ScaffoldMessenger.of(ctx).showSnackBar(
                        SnackBar(
                          content: Text(AppLocalizations.of(ctx)!
                              .errorWithMessage(e.toString())),
                          backgroundColor: AppTokens.of(ctx).error,
                        ),
                      );
                    }
                  }
                },
              ),
            ),
          );
        },
      ),
    );
  }
}

// ── Product card ────────────────────────────────────────────────────

class _ProductCard extends StatelessWidget {
  final Product product;
  final VoidCallback onTap;
  final VoidCallback onToggle;

  const _ProductCard({
    required this.product,
    required this.onTap,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);

    return AppCard(
      onTap: onTap,
      padding: const EdgeInsets.all(AppSpacing.s3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Placeholder tile — NO product images exist in this app.
          Container(
            width: 48,
            height: 48,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: t.accentSoft,
              borderRadius: AppRadii.md,
            ),
            child:
                AppIcon(name: AppIconName.catalog, size: 24, color: t.accent),
          ),
          const SizedBox(width: AppSpacing.s3),

          // Name + description + price + stock + prep
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        product.name,
                        style: TextStyle(
                          fontWeight: AppFontWeights.semibold,
                          fontSize: AppTextSizes.sm,
                          color: t.text1,
                        ),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.s2),
                    _ActiveBadge(active: product.active),
                  ],
                ),
                if (product.description != null &&
                    product.description!.isNotEmpty) ...[
                  const SizedBox(height: 3),
                  Text(
                    product.description!,
                    style: TextStyle(
                        color: t.text2, fontSize: AppTextSizes.caption),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                const SizedBox(height: AppSpacing.s1),
                Row(
                  children: [
                    Text(
                      formatUZS(product.price),
                      style: TextStyle(
                        fontWeight: AppFontWeights.bold,
                        fontSize: AppTextSizes.sm,
                        color: t.text1,
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                    ),
                    const SizedBox(width: AppSpacing.s3),
                    _StockChip(
                      label: stockLabel(l,
                          unlimited: product.unlimited,
                          stockQty: product.stockQty),
                      isOut: !product.unlimited && product.stockQty == 0,
                    ),
                  ],
                ),
                if (product.prepTime != null) ...[
                  const SizedBox(height: 3),
                  Text(
                    l.catalogPrepTime(product.prepTime!),
                    style: TextStyle(
                        color: t.text3, fontSize: AppTextSizes.caption),
                  ),
                ],
              ],
            ),
          ),

          // Active/paused toggle
          Switch(
            value: product.active,
            onChanged: (_) => onToggle(),
            activeThumbColor: t.accent,
          ),
        ],
      ),
    );
  }
}

class _ActiveBadge extends StatelessWidget {
  final bool active;
  const _ActiveBadge({required this.active});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final bg = active ? t.successSoft : t.warningSoft;
    final fg = active ? t.successStrong : t.warningStrong;
    final label = active ? l.commonActive : l.commonPaused;
    return Container(
      padding:
          const EdgeInsets.symmetric(horizontal: AppSpacing.s2, vertical: 2),
      decoration: BoxDecoration(color: bg, borderRadius: AppRadii.pill),
      child: Text(
        label,
        style: TextStyle(
            fontSize: AppTextSizes.caption,
            fontWeight: AppFontWeights.semibold,
            color: fg),
      ),
    );
  }
}

class _StockChip extends StatelessWidget {
  final String label;
  final bool isOut;
  const _StockChip({required this.label, required this.isOut});

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    final color = isOut ? t.errorStrong : t.text3;
    return Container(
      padding:
          const EdgeInsets.symmetric(horizontal: AppSpacing.s2, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: AppRadii.sm,
      ),
      child: Text(
        label,
        style: TextStyle(
            fontSize: AppTextSizes.caption,
            color: color,
            fontWeight: AppFontWeights.medium),
      ),
    );
  }
}

// ── Empty / error states ────────────────────────────────────────────

class _EmptyView extends StatelessWidget {
  const _EmptyView();

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          AppIcon(name: AppIconName.catalog, size: 56, color: t.text3),
          const SizedBox(height: AppSpacing.s3),
          Text(l.catalogEmpty, style: TextStyle(color: t.text2)),
          const SizedBox(height: AppSpacing.s2),
          Text(l.catalogEmptyHint,
              style: TextStyle(color: t.text3, fontSize: AppTextSizes.sm)),
        ],
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.s5),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppIcon(name: AppIconName.close, size: 48, color: t.errorStrong),
            const SizedBox(height: AppSpacing.s3),
            Text(message,
                textAlign: TextAlign.center,
                style: TextStyle(color: t.text2)),
            const SizedBox(height: AppSpacing.s4),
            AppButton(
              label: l.buttonRetry,
              variant: AppButtonVariant.secondary,
              size: AppButtonSize.sm,
              onPressed: onRetry,
            ),
          ],
        ),
      ),
    );
  }
}
