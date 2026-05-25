import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/models/analytics.dart';
import '../../shared/utils/format.dart';
import 'analytics_provider.dart';

class AnalyticsScreen extends ConsumerWidget {
  const AnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final analyticsAsync = ref.watch(analyticsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Analytics')),
      body: analyticsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => _ErrorView(
          message: e.toString(),
          onRetry: () => ref.read(analyticsProvider.notifier).refresh(),
        ),
        data: (data) => RefreshIndicator(
          onRefresh: () => ref.read(analyticsProvider.notifier).refresh(),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _RevenueCard(data: data),
              const SizedBox(height: 12),
              _QuickStatsRow(data: data),
              const SizedBox(height: 12),
              _PendingPaymentsCard(data: data),
              const SizedBox(height: 12),
              _TopCustomersCard(data: data),
              const SizedBox(height: 12),
              _BestSellingCard(data: data),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Revenue card ─────────────────────────────────────────────────────

class _RevenueCard extends StatelessWidget {
  final AnalyticsData data;
  const _RevenueCard({required this.data});

  @override
  Widget build(BuildContext context) {
    final change = data.revenueChangePercent;
    final isUp = change != null && change >= 0;
    final changeText = change == null
        ? 'No data last month'
        : '${isUp ? '+' : ''}${change.toStringAsFixed(1)}% vs last month';

    return Card(
      margin: EdgeInsets.zero,
      color: Theme.of(context).colorScheme.primary,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Revenue this month',
              style: TextStyle(
                color: Theme.of(context).colorScheme.onPrimary.withValues(alpha: 0.8),
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              formatUZS(data.revenueThisMonth),
              style: TextStyle(
                color: Theme.of(context).colorScheme.onPrimary,
                fontSize: 28,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                if (change != null)
                  Icon(
                    isUp ? Icons.trending_up : Icons.trending_down,
                    size: 16,
                    color: isUp ? Colors.greenAccent[200] : Colors.red[200],
                  ),
                if (change != null) const SizedBox(width: 4),
                Text(
                  changeText,
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onPrimary.withValues(alpha: 0.75),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'Last month: ${formatUZS(data.revenueLastMonth)}',
              style: TextStyle(
                color: Theme.of(context).colorScheme.onPrimary.withValues(alpha: 0.6),
                fontSize: 11,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Quick stats row ──────────────────────────────────────────────────

class _QuickStatsRow extends StatelessWidget {
  final AnalyticsData data;
  const _QuickStatsRow({required this.data});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _StatCard(
            label: 'Completed\nthis month',
            value: data.ordersCompletedThisMonth.toString(),
            icon: Icons.check_circle_outline,
            color: Colors.green,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _StatCard(
            label: 'Avg order\nvalue',
            value: formatUZS(data.averageOrderValue),
            icon: Icons.receipt_long_outlined,
            color: Colors.blue,
          ),
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(height: 8),
            FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text(
                value,
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(color: Colors.grey[600]),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Pending payments card ────────────────────────────────────────────

class _PendingPaymentsCard extends StatelessWidget {
  final AnalyticsData data;
  const _PendingPaymentsCard({required this.data});

  @override
  Widget build(BuildContext context) {
    final hasPending = data.pendingPaymentsTotal > 0;

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: hasPending
                    ? Colors.orange.withValues(alpha: 0.12)
                    : Colors.grey.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                Icons.hourglass_top_outlined,
                size: 20,
                color: hasPending ? Colors.orange[700] : Colors.grey[400],
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Pending payments',
                    style: Theme.of(context)
                        .textTheme
                        .bodySmall
                        ?.copyWith(color: Colors.grey[600]),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    hasPending
                        ? formatUZS(data.pendingPaymentsTotal)
                        : 'All payments received',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                      color: hasPending ? Colors.orange[800] : Colors.grey[500],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Top customers card ───────────────────────────────────────────────

class _TopCustomersCard extends StatelessWidget {
  final AnalyticsData data;
  const _TopCustomersCard({required this.data});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'TOP CUSTOMERS — LAST 90 DAYS',
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: Colors.grey[600],
                    letterSpacing: 0.5,
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 12),
            if (data.topCustomers.isEmpty)
              Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Text(
                    'No confirmed orders in the last 90 days',
                    style: TextStyle(color: Colors.grey[400], fontSize: 13),
                  ),
                ),
              )
            else
              ...data.topCustomers.asMap().entries.map(
                    (entry) => _TopCustomerRow(
                      rank: entry.key + 1,
                      customer: entry.value,
                      onTap: () => context.push('/customers/${entry.value.id}'),
                    ),
                  ),
          ],
        ),
      ),
    );
  }
}

class _TopCustomerRow extends StatelessWidget {
  final int rank;
  final TopCustomer customer;
  final VoidCallback onTap;

  const _TopCustomerRow({
    required this.rank,
    required this.customer,
    required this.onTap,
  });

  static const _rankColors = [Color(0xFFFFD700), Color(0xFFC0C0C0), Color(0xFFCD7F32)];

  @override
  Widget build(BuildContext context) {
    final rankColor = rank <= 3 ? _rankColors[rank - 1] : Colors.grey;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          children: [
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                color: rankColor.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  '$rank',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: rankColor == const Color(0xFFFFD700)
                        ? const Color(0xFFB8860B)
                        : rankColor,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    customer.name,
                    style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
                  ),
                  Text(
                    '${customer.orderCount} order${customer.orderCount != 1 ? 's' : ''}',
                    style: TextStyle(color: Colors.grey[500], fontSize: 12),
                  ),
                ],
              ),
            ),
            Text(
              formatUZS(customer.totalSpent),
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Best selling product card ────────────────────────────────────────

class _BestSellingCard extends StatelessWidget {
  final AnalyticsData data;
  const _BestSellingCard({required this.data});

  @override
  Widget build(BuildContext context) {
    final product = data.bestSellingProduct;

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'BEST SELLING PRODUCT',
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: Colors.grey[600],
                    letterSpacing: 0.5,
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 12),
            if (product == null)
              Text(
                'No orders yet',
                style: TextStyle(color: Colors.grey[400], fontSize: 13),
              )
            else
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      Icons.star_outline,
                      size: 20,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          product.name,
                          style: const TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 15),
                        ),
                        Text(
                          '${product.unitsSold} unit${product.unitsSold != 1 ? 's' : ''} sold',
                          style: TextStyle(color: Colors.grey[500], fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

// ── Error view ───────────────────────────────────────────────────────

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
