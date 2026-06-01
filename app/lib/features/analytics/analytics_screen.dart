import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/icons/app_icon.dart';
import '../../core/models/analytics.dart';
import '../../core/theme/app_tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/utils/format.dart';
import '../../shared/widgets/app_avatar.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_card.dart';
import '../../shared/widgets/app_spinner.dart';
import '../../shared/widgets/app_stat_card.dart';
import '../../shared/widgets/hero_card.dart';
import 'analytics_provider.dart';

class AnalyticsScreen extends ConsumerWidget {
  const AnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final analyticsAsync = ref.watch(analyticsProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l.analyticsTitle)),
      body: analyticsAsync.when(
        loading: () => const Center(child: AppSpinner(size: 32)),
        error: (e, _) => _ErrorView(
          message: e.toString(),
          onRetry: () => ref.read(analyticsProvider.notifier).refresh(),
        ),
        data: (data) => RefreshIndicator(
          color: AppTokens.of(context).accent,
          onRefresh: () => ref.read(analyticsProvider.notifier).refresh(),
          child: ListView(
            padding: const EdgeInsets.all(AppSpacing.s4),
            children: [
              _RevenueCard(data: data),
              const SizedBox(height: AppSpacing.s3),
              _QuickStatsRow(data: data),
              const SizedBox(height: AppSpacing.s3),
              _PendingPaymentsCard(data: data),
              const SizedBox(height: AppSpacing.s3),
              _TopCustomersCard(data: data),
              const SizedBox(height: AppSpacing.s3),
              _BestSellingCard(data: data),
              const SizedBox(height: AppSpacing.s6),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Revenue: HeroCard + this-vs-last token bars ──────────────────────

class _RevenueCard extends StatelessWidget {
  final AnalyticsData data;
  const _RevenueCard({required this.data});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final change = data.revenueChangePercent;
    final isUp = change != null && change >= 0;
    final changeText = change == null
        ? l.analyticsNoDataLastMonth
        : l.analyticsVsLastMonth(
            '${isUp ? '+' : ''}${change.toStringAsFixed(1)}');

    // Bar widths relative to the larger of the two months.
    final maxRev = data.revenueThisMonth > data.revenueLastMonth
        ? data.revenueThisMonth
        : data.revenueLastMonth;
    double frac(int v) => maxRev <= 0 ? 0 : (v / maxRev).clamp(0.0, 1.0);

    return Column(
      children: [
        HeroCard(
          label: l.analyticsRevenueThisMonth,
          value: formatUZS(data.revenueThisMonth),
          sub: changeText,
        ),
        const SizedBox(height: AppSpacing.s3),
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _ComparisonBar(
                label: l.analyticsRevenueThisMonth,
                value: formatUZS(data.revenueThisMonth),
                fraction: frac(data.revenueThisMonth),
                color: t.accent,
              ),
              const SizedBox(height: AppSpacing.s3),
              _ComparisonBar(
                label: l.analyticsLastMonth(''),
                value: formatUZS(data.revenueLastMonth),
                fraction: frac(data.revenueLastMonth),
                color: t.text3,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// A simple token-styled comparison bar (NOT a charting package).
class _ComparisonBar extends StatelessWidget {
  final String label;
  final String value;
  final double fraction;
  final Color color;
  const _ComparisonBar({
    required this.label,
    required this.value,
    required this.fraction,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Flexible(
              child: Text(
                label.trim().isEmpty ? '—' : label,
                style: TextStyle(
                    fontSize: AppTextSizes.caption, color: t.text2),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            Text(
              value,
              style: TextStyle(
                fontSize: AppTextSizes.caption,
                fontWeight: AppFontWeights.semibold,
                color: t.text1,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.s1),
        ClipRRect(
          borderRadius: AppRadii.pill,
          child: Stack(
            children: [
              Container(height: 8, color: t.surface2),
              FractionallySizedBox(
                widthFactor: fraction,
                child: Container(height: 8, color: color),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ── Quick stats row ──────────────────────────────────────────────────

class _QuickStatsRow extends StatelessWidget {
  final AnalyticsData data;
  const _QuickStatsRow({required this.data});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: AppStatCard(
            label: l.analyticsCompletedThisMonth,
            value: data.ordersCompletedThisMonth.toString(),
          ),
        ),
        const SizedBox(width: AppSpacing.s3),
        Expanded(
          child: AppStatCard(
            label: l.analyticsAvgOrderValue,
            value: formatUZS(data.averageOrderValue),
            money: true,
          ),
        ),
      ],
    );
  }
}

// ── Pending payments card ────────────────────────────────────────────

class _PendingPaymentsCard extends StatelessWidget {
  final AnalyticsData data;
  const _PendingPaymentsCard({required this.data});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final hasPending = data.pendingPaymentsTotal > 0;

    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.s4),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: hasPending ? t.warningSoft : t.surface2,
              borderRadius: AppRadii.md,
            ),
            child: AppIcon(
              name: AppIconName.pending,
              size: 20,
              color: hasPending ? t.warningStrong : t.text3,
            ),
          ),
          const SizedBox(width: AppSpacing.s3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l.analyticsPendingPayments,
                  style: TextStyle(
                      color: t.text2, fontSize: AppTextSizes.caption),
                ),
                const SizedBox(height: 2),
                Text(
                  hasPending
                      ? formatUZS(data.pendingPaymentsTotal)
                      : l.analyticsAllReceived,
                  style: TextStyle(
                    fontWeight: AppFontWeights.bold,
                    fontSize: AppTextSizes.base,
                    color: hasPending ? t.warningStrong : t.text3,
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
              ],
            ),
          ),
        ],
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
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppCardHeader(title: l.analyticsTopCustomers),
          const SizedBox(height: AppSpacing.s3),
          if (data.topCustomers.isEmpty)
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.s3),
                child: Text(
                  l.analyticsNoConfirmedOrders,
                  style: TextStyle(color: t.text3, fontSize: AppTextSizes.sm),
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

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);

    return InkWell(
      onTap: onTap,
      borderRadius: AppRadii.sm,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.s2),
        child: Row(
          children: [
            SizedBox(
              width: 24,
              child: Text(
                '$rank',
                style: TextStyle(
                  fontSize: AppTextSizes.sm,
                  fontWeight: AppFontWeights.bold,
                  color: t.text3,
                ),
              ),
            ),
            const SizedBox(width: AppSpacing.s2),
            AppAvatar(name: customer.name, size: AppAvatarSize.sm),
            const SizedBox(width: AppSpacing.s3),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    customer.name,
                    style: TextStyle(
                        fontWeight: AppFontWeights.medium,
                        fontSize: AppTextSizes.sm,
                        color: t.text1),
                  ),
                  Text(
                    l.homeOrdersCount(customer.orderCount),
                    style: TextStyle(
                        color: t.text3, fontSize: AppTextSizes.caption),
                  ),
                ],
              ),
            ),
            Text(
              formatUZS(customer.totalSpent),
              style: TextStyle(
                fontWeight: AppFontWeights.bold,
                fontSize: AppTextSizes.sm,
                color: t.text1,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
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
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final product = data.bestSellingProduct;

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppCardHeader(title: l.analyticsBestSelling),
          const SizedBox(height: AppSpacing.s3),
          if (product == null)
            Text(
              l.ordersEmpty,
              style: TextStyle(color: t.text3, fontSize: AppTextSizes.sm),
            )
          else
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: t.accentSoft,
                    borderRadius: AppRadii.md,
                  ),
                  child: AppIcon(
                      name: AppIconName.catalog, size: 20, color: t.accent),
                ),
                const SizedBox(width: AppSpacing.s3),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        product.name,
                        style: TextStyle(
                            fontWeight: AppFontWeights.bold,
                            fontSize: AppTextSizes.base,
                            color: t.text1),
                      ),
                      Text(
                        l.analyticsUnitsSold(product.unitsSold),
                        style: TextStyle(
                            color: t.text3, fontSize: AppTextSizes.caption),
                      ),
                    ],
                  ),
                ),
              ],
            ),
        ],
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
