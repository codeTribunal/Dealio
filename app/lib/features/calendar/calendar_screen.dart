import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_notifier.dart';
import '../../core/icons/app_icon.dart';
import '../../core/theme/app_tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/utils/format.dart';
import '../../shared/widgets/app_badge.dart';
import '../../shared/widgets/app_card.dart';
import '../../shared/widgets/app_empty_state.dart';
import '../../shared/widgets/app_error_state.dart';
import '../../shared/widgets/app_spinner.dart';
import '../orders/orders_provider.dart';
import '../projects/projects_provider.dart';

/// A chronological, date-grouped schedule (NOT a month grid) of dated records
/// from existing data. Mode-aware:
///   PRODUCTS  → orders by deliveryDate     → tap opens /orders/:id
///   FREELANCE → project deadlines + milestone due dates → tap opens /projects/:id
/// Reached via /calendar (guarded to PRODUCTS + FREELANCE in the router).
class CalendarScreen extends ConsumerWidget {
  const CalendarScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final mode =
        ref.watch(authNotifierProvider).state?.business?.mode ?? 'PRODUCTS';
    return Scaffold(
      appBar: AppBar(title: Text(l.navCalendar)),
      // The router guard only allows PRODUCTS + FREELANCE here, so the branch is
      // exhaustive: FREELANCE → deadlines, everything else (PRODUCTS) → orders.
      body: mode == 'FREELANCE'
          ? const _FreelanceSchedule()
          : const _ProductsSchedule(),
    );
  }
}

// ── A single dated row ───────────────────────────────────────────────
class _ScheduleItem {
  final DateTime date;
  final String title;
  final String? subtitle;
  final String status;
  final AppBadgeType badgeType;
  final String route;
  final String? trailing; // e.g. formatted order total

  const _ScheduleItem({
    required this.date,
    required this.title,
    this.subtitle,
    required this.status,
    required this.badgeType,
    required this.route,
    this.trailing,
  });
}

// ── PRODUCTS: orders by delivery date ────────────────────────────────
class _ProductsSchedule extends ConsumerWidget {
  const _ProductsSchedule();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final notifier = ref.read(ordersProvider.notifier);
    final ordersAsync = ref.watch(ordersProvider);
    return ordersAsync.when(
      loading: () => const Center(child: AppSpinner(size: 32)),
      error: (e, _) => AppErrorState(error: e, onRetry: notifier.refresh),
      data: (orders) {
        final items = [
          for (final o in orders)
            if (o.deliveryDate != null)
              _ScheduleItem(
                date: o.deliveryDate!,
                title: l.orderNumberLabel(o.orderNumber),
                status: o.orderStatus,
                badgeType: AppBadgeType.order,
                route: '/orders/${o.id}',
                trailing: formatUZS(o.total),
              ),
        ];
        return _ScheduleList(
          items: items,
          onRefresh: notifier.refresh,
          emptyTitle: l.calendarEmptyOrdersTitle,
          emptyMessage: l.calendarEmptyOrdersMessage,
        );
      },
    );
  }
}

// ── FREELANCE: project deadlines + milestone due dates ───────────────
class _FreelanceSchedule extends ConsumerWidget {
  const _FreelanceSchedule();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final notifier = ref.read(projectsProvider.notifier);
    final projectsAsync = ref.watch(projectsProvider);
    return projectsAsync.when(
      loading: () => const Center(child: AppSpinner(size: 32)),
      error: (e, _) =>
          AppErrorState(error: e, onRetry: () => notifier.refresh()),
      data: (projects) {
        final items = <_ScheduleItem>[];
        for (final p in projects) {
          if (p.deadline != null) {
            items.add(_ScheduleItem(
              date: p.deadline!,
              title: p.name,
              subtitle: l.calendarProjectDeadline,
              status: p.status,
              badgeType: AppBadgeType.project,
              route: '/projects/${p.id}',
            ));
          }
          for (final m in p.milestones) {
            if (m.dueDate != null) {
              items.add(_ScheduleItem(
                date: m.dueDate!,
                title: m.name,
                subtitle: p.name,
                status: m.status,
                badgeType: AppBadgeType.milestone,
                route: '/projects/${p.id}',
              ));
            }
          }
        }
        return _ScheduleList(
          items: items,
          onRefresh: () => notifier.refresh(),
          emptyTitle: l.calendarEmptyDeadlinesTitle,
          emptyMessage: l.calendarEmptyDeadlinesMessage,
        );
      },
    );
  }
}

// ── Shared grouped list ──────────────────────────────────────────────
class _ScheduleList extends StatelessWidget {
  final List<_ScheduleItem> items;
  final Future<void> Function() onRefresh;
  final String emptyTitle;
  final String emptyMessage;

  const _ScheduleList({
    required this.items,
    required this.onRefresh,
    required this.emptyTitle,
    required this.emptyMessage,
  });

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);

    if (items.isEmpty) {
      return AppEmptyState(
        icon: AppIconName.calendar,
        title: emptyTitle,
        message: emptyMessage,
      );
    }

    // Group by calendar day, soonest/earliest first (overdue surfaces above
    // Today, then Today → Tomorrow → later — matching the Today/Tomorrow/date
    // ordering in the spec).
    final groups = <DateTime, List<_ScheduleItem>>{};
    for (final it in items) {
      final key = DateTime(it.date.year, it.date.month, it.date.day);
      (groups[key] ??= []).add(it);
    }
    final keys = groups.keys.toList()..sort();

    // Flatten into a single list of (header, rows) for one ListView.
    final children = <Widget>[];
    for (final key in keys) {
      children.add(Padding(
        padding: const EdgeInsets.fromLTRB(
            AppSpacing.s1, AppSpacing.s3, AppSpacing.s1, AppSpacing.s2),
        child: Text(
          _dateLabel(l, key),
          style: TextStyle(
            fontWeight: AppFontWeights.bold,
            fontSize: AppTextSizes.sm,
            color: t.text2,
          ),
        ),
      ));
      for (final it in groups[key]!) {
        children.add(Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.s2),
          child: _ScheduleRow(item: it),
        ));
      }
    }

    return RefreshIndicator(
      color: t.accent,
      onRefresh: onRefresh,
      child: ListView(
        padding: EdgeInsets.fromLTRB(
            AppSpacing.s4,
            AppSpacing.s2,
            AppSpacing.s4,
            AppSpacing.s6 + MediaQuery.of(context).padding.bottom),
        children: children,
      ),
    );
  }

  String _dateLabel(AppLocalizations l, DateTime d) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final diff = d.difference(today).inDays;
    if (diff == 0) return l.commonToday;
    if (diff == 1) return l.apptTomorrow;
    if (diff == -1) return l.commonYesterday;
    return formatWeekdayDate(d);
  }
}

class _ScheduleRow extends StatelessWidget {
  final _ScheduleItem item;
  const _ScheduleRow({required this.item});

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return AppCard(
      onTap: () => context.push(item.route),
      padding: const EdgeInsets.all(AppSpacing.s3),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontWeight: AppFontWeights.semibold,
                    fontSize: AppTextSizes.sm,
                    color: t.text1,
                  ),
                ),
                if (item.subtitle != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    item.subtitle!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                        color: t.text2, fontSize: AppTextSizes.caption),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.s2),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              AppBadge(status: item.status, type: item.badgeType),
              if (item.trailing != null) ...[
                const SizedBox(height: AppSpacing.s1),
                Text(
                  item.trailing!,
                  style: TextStyle(
                    fontWeight: AppFontWeights.bold,
                    fontSize: AppTextSizes.sm,
                    color: t.text1,
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}
