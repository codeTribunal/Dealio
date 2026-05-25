import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/models/customer.dart' show Customer, CustomerStage;
import '../../shared/utils/format.dart';
import 'customers_provider.dart';

class CustomersScreen extends ConsumerStatefulWidget {
  const CustomersScreen({super.key});

  @override
  ConsumerState<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends ConsumerState<CustomersScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final notifier = ref.read(customersProvider.notifier);
    final customersAsync = ref.watch(customersProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Customers')),
      body: Column(
        children: [
          // ── Search bar ────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search by name, @handle or phone',
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

          const Divider(height: 1),

          // ── Customer list ─────────────────────────────────────
          Expanded(
            child: customersAsync.when(
              loading: () =>
                  const Center(child: CircularProgressIndicator()),
              error: (e, _) => _ErrorView(
                message: e.toString(),
                onRetry: notifier.refresh,
              ),
              data: (_) {
                final customers = notifier.filteredCustomers;
                if (customers.isEmpty) {
                  return _EmptyView(
                    hasFilter: _searchController.text.isNotEmpty,
                  );
                }
                return RefreshIndicator(
                  onRefresh: notifier.refresh,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: customers.length,
                    separatorBuilder: (_, __) =>
                        const SizedBox(height: 8),
                    itemBuilder: (ctx, i) => _CustomerCard(
                      customer: customers[i],
                      onTap: () =>
                          context.push('/customers/${customers[i].id}'),
                    ),
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

// ── Customer card ───────────────────────────────────────────────────

class _CustomerCard extends StatelessWidget {
  final Customer customer;
  final VoidCallback onTap;
  const _CustomerCard({required this.customer, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              // Avatar
              CircleAvatar(
                radius: 22,
                backgroundColor: Theme.of(context)
                    .colorScheme
                    .primaryContainer,
                child: Text(
                  customer.name.isNotEmpty
                      ? customer.name[0].toUpperCase()
                      : '?',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
              ),
              const SizedBox(width: 12),

              // Name + handle + stage
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      customer.name,
                      style: const TextStyle(
                          fontWeight: FontWeight.w600, fontSize: 14),
                    ),
                    if (customer.telegramUsername != null)
                      Text(
                        '@${customer.telegramUsername}',
                        style: TextStyle(
                            color: Colors.grey[600], fontSize: 12),
                      )
                    else if (customer.phone != null)
                      Text(
                        customer.phone!,
                        style: TextStyle(
                            color: Colors.grey[600], fontSize: 12),
                      ),
                    if (customer.currentStage != null) ...[
                      const SizedBox(height: 4),
                      _StagePill(stage: customer.currentStage!),
                    ],
                  ],
                ),
              ),

              // Stats
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${customer.orderCount} order${customer.orderCount != 1 ? 's' : ''}',
                    style: const TextStyle(
                        fontWeight: FontWeight.w500, fontSize: 12),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    formatDate(customer.lastInteractionAt),
                    style: TextStyle(
                        color: Colors.grey[500], fontSize: 11),
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

// ── Stage pill ──────────────────────────────────────────────────────

class _StagePill extends StatelessWidget {
  final CustomerStage stage;
  const _StagePill({required this.stage});

  @override
  Widget build(BuildContext context) {
    final color = () {
      try {
        return Color(
            int.parse('FF${stage.color.replaceFirst('#', '')}', radix: 16));
      } catch (_) {
        return const Color(0xFF6366F1);
      }
    }();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 4),
          Text(
            stage.name,
            style: TextStyle(
                fontSize: 10, fontWeight: FontWeight.w600, color: color),
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
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.people_outline, size: 56, color: Colors.grey[300]),
          const SizedBox(height: 12),
          Text(
            hasFilter ? 'No customers match your search' : 'No customers yet',
            style: TextStyle(color: Colors.grey[600]),
          ),
          if (!hasFilter) ...[
            const SizedBox(height: 6),
            Text(
              'Customers are added when they order through the bot',
              style: TextStyle(color: Colors.grey[400], fontSize: 12),
              textAlign: TextAlign.center,
            ),
          ],
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
