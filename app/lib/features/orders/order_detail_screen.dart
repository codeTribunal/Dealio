import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_notifier.dart';
import '../../core/config/app_config.dart';
import '../../core/icons/app_icon.dart';
import '../../core/models/order.dart';
import '../../core/theme/app_tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/utils/format.dart';
import '../../shared/widgets/app_avatar.dart';
import '../../shared/widgets/app_badge.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_card.dart';
import '../../shared/widgets/app_dialog.dart';
import '../../shared/widgets/app_error_state.dart';
import '../../shared/widgets/app_spinner.dart';
import '../settings/customization_provider.dart';
import 'order_detail_provider.dart';
import 'orders_provider.dart';

class OrderDetailScreen extends ConsumerWidget {
  final String orderId;
  const OrderDetailScreen({super.key, required this.orderId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final orderAsync = ref.watch(orderDetailProvider(orderId));
    final notifier = ref.read(orderDetailProvider(orderId).notifier);

    Future<void> confirmDelete() async {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (ctx) => AppDialog(
          title: l.deleteOrderTitle,
          content: Text(l.deleteOrderBody),
          actions: [
            AppButton(
              label: l.buttonCancel,
              variant: AppButtonVariant.ghost,
              size: AppButtonSize.sm,
              onPressed: () => Navigator.of(ctx).pop(false),
            ),
            AppButton(
              label: l.buttonDelete,
              variant: AppButtonVariant.danger,
              size: AppButtonSize.sm,
              onPressed: () => Navigator.of(ctx).pop(true),
            ),
          ],
        ),
      );
      if (confirmed != true || !context.mounted) return;
      try {
        await ref.read(ordersProvider.notifier).delete(orderId);
        if (context.mounted) context.go('/orders');
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(e.toString()), backgroundColor: t.error),
          );
        }
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: orderAsync.maybeWhen(
          data: (o) => Text(l.orderNumberLabel(o.orderNumber)),
          orElse: () => Text(l.orderDetailTitle),
        ),
        actions: [
          TextButton(
            onPressed: confirmDelete,
            style: TextButton.styleFrom(foregroundColor: t.errorStrong),
            child: Text(l.buttonDelete),
          ),
        ],
      ),
      body: orderAsync.when(
        loading: () => const Center(child: AppSpinner(size: 32)),
        error: (e, _) => AppErrorState(error: e, onRetry: notifier.refresh),
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
    final t = AppTokens.of(context);
    return RefreshIndicator(
      color: t.accent,
      onRefresh: notifier.refresh,
      child: ListView(
        padding: const EdgeInsets.all(AppSpacing.s4),
        children: [
          _HeaderBlock(order: order),
          const SizedBox(height: AppSpacing.s4),
          _CustomerCard(customer: order.customer),
          const SizedBox(height: AppSpacing.s3),
          _ItemsCard(order: order),
          const SizedBox(height: AppSpacing.s3),
          _DeliveryCard(order: order),
          if (order.hasPaymentProof) ...[
            const SizedBox(height: AppSpacing.s3),
            _PaymentProofCard(orderId: order.id),
          ],
          if (order.notes != null && order.notes!.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.s3),
            _NotesCard(notes: order.notes!),
          ],
          if (order.customAnswers.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.s3),
            _CustomAnswersCard(answers: order.customAnswers),
          ],
          const SizedBox(height: AppSpacing.s3),
          _TimelineCard(timeline: order.timeline),
          const SizedBox(height: AppSpacing.s5),
          _ActionButtons(order: order, notifier: notifier),
          const SizedBox(height: AppSpacing.s6),
        ],
      ),
    );
  }
}

// ── Header block ────────────────────────────────────────────────────

class _HeaderBlock extends StatelessWidget {
  final Order order;
  const _HeaderBlock({required this.order});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          l.orderNumberLabel(order.orderNumber),
          style: TextStyle(
            fontSize: AppTextSizes.h3,
            fontWeight: AppFontWeights.extra,
            color: t.text1,
          ),
        ),
        const SizedBox(height: AppSpacing.s2),
        Row(
          children: [
            AppBadge(status: order.paymentStatus, type: AppBadgeType.payment),
            const SizedBox(width: AppSpacing.s2),
            AppBadge(status: order.orderStatus, type: AppBadgeType.order),
            const Spacer(),
            Text(
              formatDateTime(order.createdAt),
              style: TextStyle(color: t.text3, fontSize: AppTextSizes.caption),
            ),
          ],
        ),
      ],
    );
  }
}

// ── Customer card ───────────────────────────────────────────────────

class _CustomerCard extends StatelessWidget {
  final OrderCustomer customer;
  const _CustomerCard({required this.customer});

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return AppCard(
      header: AppCardHeader(
          title: AppLocalizations.of(context)!.orderSectionCustomer),
      child: Row(
        children: [
          AppAvatar(name: customer.name, size: AppAvatarSize.md),
          const SizedBox(width: AppSpacing.s3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(customer.name,
                    style: TextStyle(
                        fontWeight: AppFontWeights.semibold, color: t.text1)),
                if (customer.phone != null)
                  Text(customer.phone!,
                      style: TextStyle(
                          color: t.text2, fontSize: AppTextSizes.caption)),
              ],
            ),
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
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    return AppCard(
      header: AppCardHeader(title: l.orderSectionItems),
      child: Column(
        children: [
          ...order.items.map((item) => Padding(
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.s1),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(item.productName,
                          style: TextStyle(color: t.text1)),
                    ),
                    Text('×${item.quantity}', style: TextStyle(color: t.text2)),
                    const SizedBox(width: AppSpacing.s4),
                    Text(
                      formatUZS(item.subtotal),
                      style: TextStyle(
                        fontWeight: AppFontWeights.medium,
                        color: t.text1,
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                    ),
                  ],
                ),
              )),
          Divider(height: AppSpacing.s5, color: t.border),
          Row(
            children: [
              Text(l.commonTotal,
                  style: TextStyle(
                      fontWeight: AppFontWeights.bold, color: t.text1)),
              const Spacer(),
              Text(
                formatUZS(order.total),
                style: TextStyle(
                  fontWeight: AppFontWeights.bold,
                  fontSize: AppTextSizes.lg,
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

// ── Delivery card ───────────────────────────────────────────────────

class _DeliveryCard extends StatelessWidget {
  final Order order;
  const _DeliveryCard({required this.order});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final isDelivery = order.deliveryMethod == 'DELIVERY';
    return AppCard(
      header: AppCardHeader(title: l.orderSectionDelivery),
      child: Row(
        children: [
          AppIcon(
            name: isDelivery ? AppIconName.delivery : AppIconName.orders,
            size: 18,
            color: t.text2,
          ),
          const SizedBox(width: AppSpacing.s2),
          Expanded(
            child: Text(
              isDelivery
                  ? (order.deliveryAddress ?? l.deliveryMethodDelivery)
                  : l.deliveryMethodPickup,
              style: TextStyle(color: t.text1),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Payment proof card ──────────────────────────────────────────────

class _PaymentProofCard extends ConsumerWidget {
  final String orderId;
  const _PaymentProofCard({required this.orderId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    // Authenticated proxy — the JWT rides in the header (same token the Dio
    // interceptor uses). getFile URLs are ~1h and regenerated server-side, so
    // the image loads fresh each view; the raw file_id is never exposed.
    final token = ref.read(authNotifierProvider).state?.token;
    final url = '${AppConfig.apiBaseUrl}/orders/$orderId/payment-proof';
    final headers =
        token != null ? {'Authorization': 'Bearer $token'} : <String, String>{};

    Widget unavailable() => SizedBox(
          height: 220,
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.broken_image_outlined, color: t.text3),
                const SizedBox(height: AppSpacing.s1),
                Text(
                  l.orderProofUnavailable,
                  style: TextStyle(color: t.text3, fontSize: AppTextSizes.sm),
                ),
              ],
            ),
          ),
        );

    return AppCard(
      header: AppCardHeader(title: l.orderSectionPaymentProof),
      child: GestureDetector(
        onTap: () => showDialog<void>(
          context: context,
          builder: (dialogCtx) => Dialog(
            backgroundColor: Colors.transparent,
            insetPadding: const EdgeInsets.all(AppSpacing.s4),
            // Tap anywhere on the full-size image to dismiss.
            child: GestureDetector(
              onTap: () => Navigator.of(dialogCtx).pop(),
              child: InteractiveViewer(
                child: CachedNetworkImage(
                  imageUrl: url,
                  httpHeaders: headers,
                  fit: BoxFit.contain,
                  errorWidget: (context, _, __) => unavailable(),
                ),
              ),
            ),
          ),
        ),
        child: ClipRRect(
          borderRadius: AppRadii.md,
          child: CachedNetworkImage(
            imageUrl: url,
            httpHeaders: headers,
            width: double.infinity,
            height: 220,
            fit: BoxFit.cover,
            placeholder: (context, _) => const SizedBox(
              height: 220,
              child: Center(child: AppSpinner()),
            ),
            errorWidget: (context, _, __) => unavailable(),
          ),
        ),
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
    final t = AppTokens.of(context);
    return AppCard(
      header:
          AppCardHeader(title: AppLocalizations.of(context)!.orderSectionNotes),
      child: Text(notes, style: TextStyle(color: t.text1)),
    );
  }
}

// ── Custom answers card ─────────────────────────────────────────────

class _CustomAnswersCard extends ConsumerWidget {
  final Map<String, String> answers;
  const _CustomAnswersCard({required this.answers});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppTokens.of(context);
    final questionsAsync = ref.watch(checkoutQuestionsProvider);
    final questionMap = questionsAsync.valueOrNull != null
        ? {for (final q in questionsAsync.valueOrNull!) q.id: q.question}
        : <String, String>{};

    return AppCard(
      header: AppCardHeader(
          title: AppLocalizations.of(context)!.orderSectionResponses),
      child: Column(
        children: answers.entries.map((e) {
          final label = questionMap[e.key] ?? e.key;
          return Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.s2),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  flex: 2,
                  child: Text(label,
                      style: TextStyle(
                          color: t.text2, fontSize: AppTextSizes.caption)),
                ),
                Expanded(
                  flex: 3,
                  child: Text(
                    e.value.isEmpty ? '—' : e.value,
                    style: TextStyle(
                        fontSize: AppTextSizes.sm,
                        fontWeight: AppFontWeights.medium,
                        color: t.text1),
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
    return AppCard(
      header: AppCardHeader(
          title: AppLocalizations.of(context)!.orderSectionTimeline),
      child: Column(
        children: timeline.reversed
            .map(
                (entry) => _TimelineEntry(entry: entry as Map<String, dynamic>))
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
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final status = entry['status'] as String? ?? '';
    final ts = entry['at'] as String? ?? entry['timestamp'] as String? ?? '';
    DateTime? time;
    try {
      if (ts.isNotEmpty) time = DateTime.parse(ts);
    } catch (_) {}

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.s2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 8,
            height: 8,
            margin: const EdgeInsets.only(top: 5, right: AppSpacing.s3),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              // Dot carries the event's meaning: a cancellation is never
              // accent-colored (mirrors the web timeline).
              color: status == 'CANCELLED' ? t.error : t.accent,
            ),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _label(l, status),
                  style: TextStyle(
                      fontWeight: AppFontWeights.medium, color: t.text1),
                ),
                if (time != null)
                  Text(
                    formatDateTime(time),
                    style: TextStyle(
                        color: t.text3, fontSize: AppTextSizes.caption),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _label(AppLocalizations l, String s) => switch (s) {
        'NEW' => l.orderTimelinePlaced,
        'PREPARING' => l.orderStatusPreparing,
        'READY' => l.orderTimelineReady,
        'DELIVERED' => l.orderStatusDelivered,
        'CANCELLED' => l.orderStatusCancelled,
        'PAYMENT_RECEIVED' => l.paymentStatusPaymentReceived,
        'PAYMENT_CONFIRMED' => l.orderTimelinePaymentConfirmed,
        'CONFIRMED' => l.orderTimelinePaymentConfirmed,
        _ => s,
      };
}

// ── Action buttons ──────────────────────────────────────────────────

class _ActionButtons extends StatefulWidget {
  final Order order;
  final OrderDetailNotifier notifier;
  const _ActionButtons({required this.order, required this.notifier});

  @override
  State<_ActionButtons> createState() => _ActionButtonsState();
}

class _ActionButtonsState extends State<_ActionButtons> {
  // Double-submit guard: while a mutation is in flight every action button is
  // disabled and the tapped one shows a spinner, so a rapid second tap cannot
  // fire a duplicate PATCH before the provider refresh rebuilds this widget.
  // _pending holds the tag of the in-flight action ('PAY' or an order status).
  String? _pending;
  bool get _busy => _pending != null;

  Future<void> _guard(String tag, Future<void> Function() action) async {
    if (_busy) return;
    setState(() => _pending = tag);
    try {
      await action();
    } finally {
      if (mounted) setState(() => _pending = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final order = widget.order;
    final status = order.orderStatus;
    final showConfirmPayment = order.paymentStatus != 'CONFIRMED';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (showConfirmPayment)
          AppButton(
            label: l.orderConfirmPayment,
            leftIcon: AppIconName.paid,
            fullWidth: true,
            loading: _pending == 'PAY',
            onPressed: _busy ? null : () => _confirmPayment(context),
          ),
        if (status == 'NEW') ...[
          if (showConfirmPayment) const SizedBox(height: AppSpacing.s2),
          AppButton(
            label: l.orderStartPreparing,
            variant: AppButtonVariant.secondary,
            fullWidth: true,
            loading: _pending == 'PREPARING',
            onPressed: _busy ? null : () => _updateStatus(context, 'PREPARING'),
          ),
        ],
        if (status == 'PREPARING') ...[
          if (showConfirmPayment) const SizedBox(height: AppSpacing.s2),
          AppButton(
            label: l.orderMarkReady,
            variant: AppButtonVariant.secondary,
            fullWidth: true,
            loading: _pending == 'READY',
            onPressed: _busy ? null : () => _updateStatus(context, 'READY'),
          ),
        ],
        if (status == 'READY') ...[
          if (showConfirmPayment) const SizedBox(height: AppSpacing.s2),
          AppButton(
            label: l.orderMarkDelivered,
            variant: AppButtonVariant.secondary,
            fullWidth: true,
            loading: _pending == 'DELIVERED',
            onPressed: _busy ? null : () => _updateStatus(context, 'DELIVERED'),
          ),
        ],
        if (status != 'DELIVERED' && status != 'CANCELLED') ...[
          const SizedBox(height: AppSpacing.s2),
          AppButton(
            label: l.orderCancel,
            variant: AppButtonVariant.danger,
            fullWidth: true,
            loading: _pending == 'CANCELLED',
            onPressed: _busy ? null : () => _cancelOrder(context),
          ),
        ],
      ],
    );
  }

  Future<void> _confirmPayment(BuildContext context) async {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final order = widget.order;
    final amount = formatUZS(order.total);

    // Money moment: restate the exact amount and customer before the
    // irreversible confirm, and acknowledge success — never a silent flip
    // (PRODUCT.md: "earn trust wherever money appears").
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AppDialog(
        title: l.paymentConfirmTitle,
        content: Text(l.paymentConfirmBody(amount, order.customer.name)),
        actions: [
          AppButton(
            label: l.buttonCancel,
            variant: AppButtonVariant.ghost,
            onPressed: () => Navigator.of(ctx).pop(false),
          ),
          AppButton(
            label: l.paymentConfirmAction,
            onPressed: () => Navigator.of(ctx).pop(true),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;

    await _guard('PAY', () async {
      try {
        await widget.notifier.confirmPayment();
        if (!context.mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(l.paymentConfirmedSnack(amount)),
            backgroundColor: t.success,
          ),
        );
      } catch (e) {
        if (!context.mounted) return;
        final alreadyConfirmed = e.toString().contains('already confirmed');
        final msg = alreadyConfirmed
            ? l.orderPaymentAlreadyConfirmed
            : l.errorWithMessage(e.toString());
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(msg),
            backgroundColor: alreadyConfirmed ? t.warning : t.error,
          ),
        );
      }
    });
  }

  Future<void> _updateStatus(BuildContext context, String status) async {
    await _guard(status, () async {
      try {
        await widget.notifier.updateStatus(status);
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                  AppLocalizations.of(context)!.errorWithMessage(e.toString())),
              backgroundColor: AppTokens.of(context).error,
            ),
          );
        }
      }
    });
  }

  Future<void> _cancelOrder(BuildContext context) async {
    final l = AppLocalizations.of(context)!;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AppDialog(
        title: l.orderCancelTitle,
        content: Text(l.orderCancelConfirm),
        actions: [
          AppButton(
            label: l.orderKeep,
            variant: AppButtonVariant.ghost,
            size: AppButtonSize.sm,
            onPressed: () => Navigator.pop(ctx, false),
          ),
          AppButton(
            label: l.orderCancel,
            variant: AppButtonVariant.danger,
            size: AppButtonSize.sm,
            onPressed: () => Navigator.pop(ctx, true),
          ),
        ],
      ),
    );
    if (confirmed == true && context.mounted) {
      await _updateStatus(context, 'CANCELLED');
    }
  }
}

// ── Error view ──────────────────────────────────────────────────────
