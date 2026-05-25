import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/models/product.dart';
import '../../shared/utils/format.dart';
import 'catalog_provider.dart';

class CatalogScreen extends ConsumerWidget {
  const CatalogScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final catalogAsync = ref.watch(catalogProvider);
    final notifier = ref.read(catalogProvider.notifier);

    return Scaffold(
      appBar: AppBar(title: const Text('Catalog')),
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          await context.push('/catalog/new');
          notifier.productSaved();
        },
        child: const Icon(Icons.add),
      ),
      body: catalogAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => _ErrorView(
          message: e.toString(),
          onRetry: notifier.refresh,
        ),
        data: (products) {
          if (products.isEmpty) return const _EmptyView();
          return RefreshIndicator(
            onRefresh: notifier.refresh,
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: products.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
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
                          content: Text('Error: $e'),
                          backgroundColor: Colors.red,
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
    final scheme = Theme.of(context).colorScheme;

    return Card(
      margin: EdgeInsets.zero,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 8, 14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Left: name + description + stock
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Name + active badge
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            product.name,
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 15,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        _ActiveBadge(active: product.active),
                      ],
                    ),
                    if (product.description != null &&
                        product.description!.isNotEmpty) ...[
                      const SizedBox(height: 3),
                      Text(
                        product.description!,
                        style: TextStyle(
                            color: Colors.grey[600], fontSize: 12),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Text(
                          formatUZS(product.price),
                          style: const TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                        const SizedBox(width: 10),
                        _StockChip(label: product.stockLabel),
                      ],
                    ),
                    if (product.prepTime != null) ...[
                      const SizedBox(height: 3),
                      Text(
                        'Prep: ${product.prepTime}',
                        style: TextStyle(
                            color: Colors.grey[500], fontSize: 11),
                      ),
                    ],
                  ],
                ),
              ),
              // Right: toggle switch
              Switch(
                value: product.active,
                onChanged: (_) => onToggle(),
                activeThumbColor: scheme.primary,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ActiveBadge extends StatelessWidget {
  final bool active;
  const _ActiveBadge({required this.active});

  @override
  Widget build(BuildContext context) {
    final color = active ? const Color(0xFF059669) : const Color(0xFF6B7280);
    final label = active ? 'Active' : 'Paused';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(
            fontSize: 10, fontWeight: FontWeight.w600, color: color),
      ),
    );
  }
}

class _StockChip extends StatelessWidget {
  final String label;
  const _StockChip({required this.label});

  @override
  Widget build(BuildContext context) {
    final isOut = label == 'Out of stock';
    final color = isOut ? const Color(0xFFDC2626) : Colors.grey;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: TextStyle(
            fontSize: 10, color: color, fontWeight: FontWeight.w500),
      ),
    );
  }
}

// ── Empty / error states ────────────────────────────────────────────

class _EmptyView extends StatelessWidget {
  const _EmptyView();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.inventory_2_outlined, size: 56, color: Colors.grey[300]),
          const SizedBox(height: 12),
          Text('No products yet',
              style: TextStyle(color: Colors.grey[600])),
          const SizedBox(height: 8),
          Text('Tap + to add your first product',
              style: TextStyle(color: Colors.grey[400], fontSize: 13)),
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
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            TextButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}
