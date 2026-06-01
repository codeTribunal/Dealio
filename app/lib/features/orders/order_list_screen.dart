import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/icons/app_icon.dart';
import '../../core/models/order.dart';
import '../../core/theme/app_tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/utils/format.dart';
import '../../shared/utils/status_labels.dart';
import '../../shared/widgets/app_badge.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_card.dart';
import '../../shared/widgets/app_spinner.dart';
import 'orders_provider.dart';

const _statusFilters = [
  null,
  'NEW',
  'PREPARING',
  'READY',
  'DELIVERED',
  'CANCELLED'
];

class OrderListScreen extends ConsumerStatefulWidget {
  const OrderListScreen({super.key});

  @override
  ConsumerState<OrderListScreen> createState() => _OrderListScreenState();
}

class _OrderListScreenState extends ConsumerState<OrderListScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final notifier = ref.read(ordersProvider.notifier);
    final ordersAsync = ref.watch(ordersProvider);
    final filter = ref.watch(ordersProvider.notifier).filter;

    return Scaffold(
      appBar: AppBar(title: Text(l.ordersTitle)),
      body: Column(
        children: [
          // ── Search bar ────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(
                AppSpacing.s4, AppSpacing.s3, AppSpacing.s4, 0),
            child: Container(
              decoration: BoxDecoration(
                color: t.surface,
                borderRadius: AppRadii.md,
                border: Border.all(color: t.border),
                boxShadow: t.shadowSm,
              ),
              child: TextField(
                controller: _searchController,
                style: TextStyle(fontSize: AppTextSizes.base, color: t.text1),
                decoration: InputDecoration(
                  hintText: l.ordersSearchHint,
                  hintStyle:
                      TextStyle(fontSize: AppTextSizes.base, color: t.text3),
                  prefixIcon: Padding(
                    padding: const EdgeInsets.only(
                        left: AppSpacing.s4, right: AppSpacing.s2),
                    child: AppIcon(
                        name: AppIconName.search, size: 20, color: t.text2),
                  ),
                  prefixIconConstraints:
                      const BoxConstraints(minWidth: 0, minHeight: 0),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: AppIcon(
                              name: AppIconName.close,
                              size: 18,
                              color: t.text2),
                          onPressed: () {
                            _searchController.clear();
                            notifier.setSearch('');
                            setState(() {});
                          },
                        )
                      : null,
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.s4, vertical: AppSpacing.s3),
                ),
                onChanged: (v) {
                  notifier.setSearch(v);
                  setState(() {});
                },
              ),
            ),
          ),

          // ── Status filter chips ───────────────────────────────
          SizedBox(
            height: 56,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.s4, vertical: AppSpacing.s2),
              children: _statusFilters.map((value) {
                final label =
                    value == null ? l.commonAll : orderStatusLabel(l, value);
                final selected = filter.status == value;
                return Padding(
                  padding: const EdgeInsets.only(right: AppSpacing.s2),
                  child: _FilterChip(
                    label: label,
                    selected: selected,
                    onTap: () => notifier.setStatus(value),
                  ),
                );
              }).toList(),
            ),
          ),

          // ── Order list ────────────────────────────────────────
          Expanded(
            child: ordersAsync.when(
              loading: () => const Center(child: AppSpinner(size: 32)),
              error: (e, _) => _ErrorView(
                message: e.toString(),
                onRetry: notifier.refresh,
              ),
              data: (_) {
                final orders = notifier.filteredOrders;
                if (orders.isEmpty) {
                  return _EmptyView(
                    hasFilter: filter.status != null ||
                        filter.searchQuery.isNotEmpty,
                  );
                }
                return RefreshIndicator(
                  color: t.accent,
                  onRefresh: notifier.refresh,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(AppSpacing.s4),
                    itemCount: orders.length,
                    separatorBuilder: (_, __) =>
                        const SizedBox(height: AppSpacing.s2),
                    itemBuilder: (ctx, i) => _OrderCard(order: orders[i]),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

// ── Filter chip (token-styled) ──────────────────────────────────────

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: AppMotion.durFast,
        curve: AppMotion.ease,
        alignment: Alignment.center,
        padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.s4, vertical: AppSpacing.s2),
        decoration: BoxDecoration(
          color: selected ? t.accentSoft : t.surface,
          borderRadius: AppRadii.pill,
          border: Border.all(color: selected ? t.accent : t.border),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: AppTextSizes.sm,
            fontWeight: AppFontWeights.semibold,
            color: selected ? t.accent : t.text2,
          ),
        ),
      ),
    );
  }
}

// ── Order card ──────────────────────────────────────────────────────

class _OrderCard extends StatelessWidget {
  final Order order;
  const _OrderCard({required this.order});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);

    return AppCard(
      onTap: () => context.push('/orders/${order.id}'),
      padding: const EdgeInsets.all(AppSpacing.s4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Order number + dual semantic badges
          Row(
            children: [
              Text(
                l.orderNumberLabel(order.orderNumber),
                style: TextStyle(
                  fontWeight: AppFontWeights.bold,
                  fontSize: AppTextSizes.sm,
                  color: t.text1,
                ),
              ),
              const Spacer(),
              AppBadge(
                  status: order.paymentStatus, type: AppBadgeType.payment),
              const SizedBox(width: AppSpacing.s1),
              AppBadge(status: order.orderStatus, type: AppBadgeType.order),
            ],
          ),

          const SizedBox(height: AppSpacing.s2),

          // Customer name (+ handle) and created time
          Row(
            children: [
              Expanded(
                child: Text(
                  order.customer.phone != null
                      ? '${order.customer.name} · ${order.customer.phone}'
                      : order.customer.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style:
                      TextStyle(color: t.text2, fontSize: AppTextSizes.caption),
                ),
              ),
              Text(
                formatDateTime(order.createdAt),
                style:
                    TextStyle(color: t.text3, fontSize: AppTextSizes.caption),
              ),
            ],
          ),

          const SizedBox(height: AppSpacing.s2),

          // Items summary + total
          Row(
            children: [
              Expanded(
                child: Text(
                  order.items
                      .map((i) => '${i.productName} ×${i.quantity}')
                      .join(', '),
                  style:
                      TextStyle(color: t.text2, fontSize: AppTextSizes.caption),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: AppSpacing.s2),
              Text(
                formatUZS(order.total),
                style: TextStyle(
                  fontWeight: AppFontWeights.bold,
                  fontSize: AppTextSizes.sm,
                  color: t.text1,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Empty / error ───────────────────────────────────────────────────

class _EmptyView extends StatelessWidget {
  final bool hasFilter;
  const _EmptyView({required this.hasFilter});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          AppIcon(name: AppIconName.orders, size: 56, color: t.text3),
          const SizedBox(height: AppSpacing.s3),
          Text(
            hasFilter ? l.ordersEmptyFiltered : l.ordersEmpty,
            style: TextStyle(color: t.text2),
          ),
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
