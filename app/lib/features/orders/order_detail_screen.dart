import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/order.dart';
import '../../shared/utils/format.dart';
import '../settings/customization_provider.dart';
import 'order_detail_provider.dart';

class OrderDetailScreen extends ConsumerWidget {
  final String orderId;
  const OrderDetailScreen({super.key, required this.orderId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final orderAsync = ref.watch(orderDetailProvider(orderId));
    final notifier = ref.read(orderDetailProvider(orderId).notifier);

    return Scaffold(
      appBar: AppBar(
        title: orderAsync.maybeWhen(
          data: (o) => Text('Order #${o.orderNumber}'),
          orElse: () => const Text('Order'),
        ),
      ),
      body: orderAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => _ErrorView(message: e.toString(), onRetry: notifier.refresh),
        data: (order) => _OrderBody(order: order, notifier: notifier),
      ),
    );
  }
}

class _OrderBody extends StatelessWidget {
  final Order order;
  final OrderDetailNotifier notifier;
  const _OrderBody({required this.order, required this.notifier});

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: notifier.refresh,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _StatusRow(order: order),
          const SizedBox(height: 16),
          _CustomerCard(customer: order.customer),
          const SizedBox(height: 12),
          _ItemsCard(order: order),
          const SizedBox(height: 12),
          _DeliveryCard(order: order),
          if (order.notes != null && order.notes!.isNotEmpty) ...[
            const SizedBox(height: 12),
            _NotesCard(notes: order.notes!),
          ],
          if (order.customAnswers.isNotEmpty) ...[
            const SizedBox(height: 12),
            _CustomAnswersCard(answers: order.customAnswers),
          ],
          const SizedBox(height: 12),
          _TimelineCard(timeline: order.timeline),
          const SizedBox(height: 20),
          _ActionButtons(order: order, notifier: notifier),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}

// ── Status row ──────────────────────────────────────────────────────

class _StatusRow extends StatelessWidget {
  final Order order;
  const _StatusRow({required this.order});

  static const _statusColor = {
    'NEW': Color(0xFF1A56DB),
    'PREPARING': Color(0xFFD97706),
    'READY': Color(0xFF059669),
    'DELIVERED': Color(0xFF6B7280),
    'CANCELLED': Color(0xFFDC2626),
  };

  static const _statusLabel = {
    'NEW': 'New',
    'PREPARING': 'Preparing',
    'READY': 'Ready',
    'DELIVERED': 'Delivered',
    'CANCELLED': 'Cancelled',
  };

  @override
  Widget build(BuildContext context) {
    final color = _statusColor[order.orderStatus] ?? const Color(0xFF6B7280);
    final label = _statusLabel[order.orderStatus] ?? order.orderStatus;

    final (payLabel, payColor) = switch (order.paymentStatus) {
      'CONFIRMED' => ('Paid', const Color(0xFF059669)),
      'PAYMENT_RECEIVED' => ('Payment received', const Color(0xFF1A56DB)),
      _ => ('Payment pending', const Color(0xFFD97706)),
    };

    return Row(
      children: [
        _Badge(label: label, color: color),
        const SizedBox(width: 8),
        _Badge(label: payLabel, color: payColor),
        const Spacer(),
        Text(
          formatDateTime(order.createdAt),
          style: TextStyle(color: Colors.grey[500], fontSize: 12),
        ),
      ],
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
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }
}

// ── Customer card ───────────────────────────────────────────────────

class _CustomerCard extends StatelessWidget {
  final OrderCustomer customer;
  const _CustomerCard({required this.customer});

  @override
  Widget build(BuildContext context) {
    return _Section(
      title: 'Customer',
      child: Row(
        children: [
          const CircleAvatar(
            radius: 20,
            child: Icon(Icons.person_outline, size: 20),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(customer.name,
                  style: const TextStyle(fontWeight: FontWeight.w600)),
              if (customer.phone != null)
                Text(customer.phone!,
                    style: TextStyle(color: Colors.grey[600], fontSize: 13)),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Items card ──────────────────────────────────────────────────────

class _ItemsCard extends StatelessWidget {
  final Order order;
  const _ItemsCard({required this.order});

  @override
  Widget build(BuildContext context) {
    return _Section(
      title: 'Items',
      child: Column(
        children: [
          ...order.items.map((item) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(item.productName),
                    ),
                    Text(
                      '×${item.quantity}',
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                    const SizedBox(width: 16),
                    Text(
                      formatUZS(item.subtotal),
                      style: const TextStyle(fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
              )),
          const Divider(height: 20),
          Row(
            children: [
              const Text('Total',
                  style: TextStyle(fontWeight: FontWeight.bold)),
              const Spacer(),
              Text(
                formatUZS(order.total),
                style: const TextStyle(
                    fontWeight: FontWeight.bold, fontSize: 15),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Delivery card ───────────────────────────────────────────────────

class _DeliveryCard extends StatelessWidget {
  final Order order;
  const _DeliveryCard({required this.order});

  @override
  Widget build(BuildContext context) {
    final isDelivery = order.deliveryMethod == 'DELIVERY';
    return _Section(
      title: 'Delivery',
      child: Row(
        children: [
          Icon(
            isDelivery ? Icons.local_shipping_outlined : Icons.store_outlined,
            size: 18,
            color: Colors.grey[600],
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              isDelivery
                  ? (order.deliveryAddress ?? 'Delivery')
                  : 'Pickup',
              style: TextStyle(color: Colors.grey[700]),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Notes card ──────────────────────────────────────────────────────

class _NotesCard extends StatelessWidget {
  final String notes;
  const _NotesCard({required this.notes});

  @override
  Widget build(BuildContext context) {
    return _Section(
      title: 'Notes',
      child: Text(notes, style: TextStyle(color: Colors.grey[700])),
    );
  }
}

// ── Custom answers card ─────────────────────────────────────────────

class _CustomAnswersCard extends ConsumerWidget {
  final Map<String, String> answers;
  const _CustomAnswersCard({required this.answers});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final questionsAsync = ref.watch(checkoutQuestionsProvider);
    final questionMap = questionsAsync.valueOrNull != null
        ? {for (final q in questionsAsync.valueOrNull!) q.id: q.question}
        : <String, String>{};

    return _Section(
      title: 'Customer responses',
      child: Column(
        children: answers.entries.map((e) {
          final label = questionMap[e.key] ?? e.key;
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  flex: 2,
                  child: Text(
                    label,
                    style: TextStyle(color: Colors.grey[600], fontSize: 12),
                  ),
                ),
                Expanded(
                  flex: 3,
                  child: Text(
                    e.value.isEmpty ? '—' : e.value,
                    style: const TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w500),
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }
}

// ── Timeline card ───────────────────────────────────────────────────

class _TimelineCard extends StatelessWidget {
  final List<dynamic> timeline;
  const _TimelineCard({required this.timeline});

  @override
  Widget build(BuildContext context) {
    if (timeline.isEmpty) {
      return const SizedBox.shrink();
    }
    return _Section(
      title: 'Timeline',
      child: Column(
        children: timeline.reversed
            .map((entry) => _TimelineEntry(entry: entry as Map<String, dynamic>))
            .toList(),
      ),
    );
  }
}

class _TimelineEntry extends StatelessWidget {
  final Map<String, dynamic> entry;
  const _TimelineEntry({required this.entry});

  @override
  Widget build(BuildContext context) {
    final status = entry['status'] as String? ?? '';
    final ts = entry['at'] as String? ?? entry['timestamp'] as String? ?? '';
    DateTime? time;
    try {
      if (ts.isNotEmpty) time = DateTime.parse(ts);
    } catch (_) {}

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 8,
            height: 8,
            margin: const EdgeInsets.only(top: 5, right: 10),
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: Color(0xFF1A56DB),
            ),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _label(status),
                  style: const TextStyle(fontWeight: FontWeight.w500),
                ),
                if (time != null)
                  Text(
                    formatDateTime(time),
                    style: TextStyle(color: Colors.grey[500], fontSize: 12),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _label(String s) => switch (s) {
        'NEW' => 'Order placed',
        'PREPARING' => 'Preparing',
        'READY' => 'Ready for pickup / delivery',
        'DELIVERED' => 'Delivered',
        'CANCELLED' => 'Cancelled',
        'PAYMENT_RECEIVED' => 'Payment received',
        'PAYMENT_CONFIRMED' => 'Payment confirmed',
        'CONFIRMED' => 'Payment confirmed',
        _ => s,
      };
}

// ── Action buttons ──────────────────────────────────────────────────

class _ActionButtons extends StatelessWidget {
  final Order order;
  final OrderDetailNotifier notifier;
  const _ActionButtons({required this.order, required this.notifier});

  @override
  Widget build(BuildContext context) {
    final status = order.orderStatus;
    final showConfirmPayment = order.paymentStatus != 'CONFIRMED';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (showConfirmPayment)
          FilledButton.icon(
            icon: const Icon(Icons.check_circle_outline),
            label: const Text('Confirm Payment'),
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFF059669),
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            onPressed: () => _confirmPayment(context),
          ),
        if (status == 'NEW') ...[
          if (showConfirmPayment) const SizedBox(height: 10),
          FilledButton.icon(
            icon: const Icon(Icons.restaurant_outlined),
            label: const Text('Start Preparing'),
            style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14)),
            onPressed: () => _updateStatus(context, 'PREPARING'),
          ),
        ],
        if (status == 'PREPARING') ...[
          if (showConfirmPayment) const SizedBox(height: 10),
          FilledButton.icon(
            icon: const Icon(Icons.done_all),
            label: const Text('Mark as Ready'),
            style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14)),
            onPressed: () => _updateStatus(context, 'READY'),
          ),
        ],
        if (status == 'READY') ...[
          if (showConfirmPayment) const SizedBox(height: 10),
          FilledButton.icon(
            icon: const Icon(Icons.local_shipping_outlined),
            label: const Text('Mark as Delivered'),
            style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14)),
            onPressed: () => _updateStatus(context, 'DELIVERED'),
          ),
        ],
        if (status != 'DELIVERED' && status != 'CANCELLED') ...[
          const SizedBox(height: 10),
          OutlinedButton.icon(
            icon: const Icon(Icons.cancel_outlined),
            label: const Text('Cancel Order'),
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.red,
              side: const BorderSide(color: Colors.red),
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            onPressed: () => _cancelOrder(context),
          ),
        ],
      ],
    );
  }

  Future<void> _confirmPayment(BuildContext context) async {
    try {
      await notifier.confirmPayment();
    } catch (e) {
      if (!context.mounted) return;
      final msg = e.toString().contains('already confirmed')
          ? 'Payment already confirmed'
          : 'Error: $e';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(msg),
          backgroundColor:
              msg == 'Payment already confirmed' ? Colors.orange : Colors.red,
        ),
      );
    }
  }

  Future<void> _updateStatus(BuildContext context, String status) async {
    try {
      await notifier.updateStatus(status);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _cancelOrder(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel order?'),
        content: const Text('This action cannot be undone.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Keep')),
          TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Cancel order',
                  style: TextStyle(color: Colors.red))),
        ],
      ),
    );
    if (confirmed == true && context.mounted) {
      await _updateStatus(context, 'CANCELLED');
    }
  }
}

// ── Shared section wrapper ──────────────────────────────────────────

class _Section extends StatelessWidget {
  final String title;
  final Widget child;
  const _Section({required this.title, required this.child});

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
              title,
              style: Theme.of(context)
                  .textTheme
                  .labelMedium
                  ?.copyWith(
                      color: Colors.grey[600],
                      letterSpacing: 0.5,
                      fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 10),
            child,
          ],
        ),
      ),
    );
  }
}

// ── Error view ──────────────────────────────────────────────────────

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
