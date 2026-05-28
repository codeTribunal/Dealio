import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/models/order.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/utils/format.dart';
import '../../shared/utils/status_labels.dart';
import 'orders_provider.dart';

const _statusFilters = [null, 'NEW', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'];

const _statusColor = {
  'NEW': Color(0xFF1A56DB),
  'PREPARING': Color(0xFFD97706),
  'READY': Color(0xFF059669),
  'DELIVERED': Color(0xFF6B7280),
  'CANCELLED': Color(0xFFDC2626),
};

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
    final notifier = ref.read(ordersProvider.notifier);
    final ordersAsync = ref.watch(ordersProvider);
    final filter = ref.watch(ordersProvider.notifier).filter;

    return Scaffold(
      appBar: AppBar(title: Text(l.ordersTitle)),
      body: Column(
        children: [
          // ── Search bar ────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: l.ordersSearchHint,
                prefixIcon: const Icon(Icons.search, size: 20),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () {
                          _searchController.clear();
                          notifier.setSearch('');
                        },
                      )
                    : null,
              ),
              onChanged: notifier.setSearch,
            ),
          ),

          // ── Status filter chips ───────────────────────────────
          SizedBox(
            height: 52,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              children: _statusFilters.map((value) {
                final label =
                    value == null ? l.commonAll : orderStatusLabel(l, value);
                final selected = filter.status == value;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    label: Text(label),
                    selected: selected,
                    onSelected: (_) => notifier.setStatus(value),
                    selectedColor:
                        Theme.of(context).colorScheme.primaryContainer,
                    checkmarkColor: Theme.of(context).colorScheme.primary,
                  ),
                );
              }).toList(),
            ),
          ),

          const Divider(height: 1),

          // ── Order list ────────────────────────────────────────
          Expanded(
            child: ordersAsync.when(
              loading: () =>
                  const Center(child: CircularProgressIndicator()),
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
                  onRefresh: notifier.refresh,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: orders.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
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

class _OrderCard extends StatelessWidget {
  final Order order;
  const _OrderCard({required this.order});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final statusColor =
        _statusColor[order.orderStatus] ?? const Color(0xFF6B7280);
    final paymentBadge = order.paymentStatus == 'PAYMENT_RECEIVED';

    return Card(
      margin: EdgeInsets.zero,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => context.push('/orders/${order.id}'),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top row: order number + status badge
              Row(
                children: [
                  Text(
                    l.orderNumberLabel(order.orderNumber),
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const Spacer(),
                  if (paymentBadge)
                    _Badge(
                      label: l.orderPaidBadge,
                      color: const Color(0xFF059669),
                    ),
                  if (paymentBadge) const SizedBox(width: 6),
                  _Badge(
                    label: orderStatusLabel(l, order.orderStatus),
                    color: statusColor,
                  ),
                ],
              ),

              const SizedBox(height: 8),

              // Customer name + time
              Row(
                children: [
                  const Icon(Icons.person_outline, size: 14,
                      color: Colors.grey),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      order.customer.name,
                      style: TextStyle(
                          color: Colors.grey[700], fontSize: 13),
                    ),
                  ),
                  Text(
                    formatDateTime(order.createdAt),
                    style:
                        TextStyle(color: Colors.grey[500], fontSize: 12),
                  ),
                ],
              ),

              const SizedBox(height: 6),

              // Items summary + total
              Row(
                children: [
                  const Icon(Icons.shopping_bag_outlined, size: 14,
                      color: Colors.grey),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      order.items.map((i) => '${i.productName} ×${i.quantity}').join(', '),
                      style: TextStyle(
                          color: Colors.grey[600], fontSize: 12),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Text(
                    formatUZS(order.total),
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  final String label;
  final Color color;
  const _Badge({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(
            fontSize: 11, fontWeight: FontWeight.w600, color: color),
      ),
    );
  }
}

class _EmptyView extends StatelessWidget {
  final bool hasFilter;
  const _EmptyView({required this.hasFilter});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.receipt_long_outlined, size: 56, color: Colors.grey[300]),
          const SizedBox(height: 12),
          Text(
            hasFilter ? l.ordersEmptyFiltered : l.ordersEmpty,
            style: TextStyle(color: Colors.grey[600]),
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
            TextButton(onPressed: onRetry, child: Text(AppLocalizations.of(context)!.buttonRetry)),
          ],
        ),
      ),
    );
  }
}
