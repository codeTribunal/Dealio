import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_service.dart';
import '../../core/auth/auth_notifier.dart';
import '../../core/icons/app_icon.dart';
import '../../core/models/customer.dart';
import '../../core/models/order.dart';
import '../../core/theme/app_tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/utils/format.dart';
import '../../shared/widgets/app_avatar.dart';
import '../../shared/widgets/app_badge.dart';
import '../../shared/widgets/app_card.dart';
import '../../shared/widgets/app_error_state.dart';
import '../../shared/widgets/app_spinner.dart';
import '../../shared/widgets/app_stat_card.dart';
import '../../shared/widgets/quick_actions.dart';
import 'home_provider.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final homeAsync = ref.watch(homeProvider);
    final auth = ref.watch(authNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(auth.state?.business?.name ?? 'Dealio'),
        actions: [
          IconButton(
            icon: AppIcon(name: AppIconName.analytics, color: t.text1),
            tooltip: l.navAnalytics,
            onPressed: () => context.push('/analytics'),
          ),
          // Account/profile entry (replaces the old Settings gear, which just
          // duplicated the bottom-nav Settings tab). Settings is still in the
          // bottom bar; this opens the owner's profile/account.
          Padding(
            padding: const EdgeInsets.only(right: AppSpacing.s3),
            child: Tooltip(
              message: l.profileTitle,
              child: GestureDetector(
                onTap: () => context.push('/profile'),
                child: AppAvatar(
                  name: auth.state?.business?.name ?? 'Dealio',
                  size: AppAvatarSize.sm,
                ),
              ),
            ),
          ),
        ],
      ),
      body: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        behavior: HitTestBehavior.translucent,
        child: homeAsync.when(
          loading: () => const Center(child: AppSpinner(size: 32)),
          error: (e, _) => AppErrorState(
            error: e,
            onRetry: () => ref.read(homeProvider.notifier).refresh(),
          ),
          data: (data) {
            // Build the unified activity feed and sort by time descending.
            final activityItems = <({DateTime time, Widget widget})>[
              for (final o in data.todayOrders)
                (time: o.createdAt, widget: _OrderActivityCard(order: o)),
              for (final a in data.todayAppointments)
                (
                  time: a.startTime,
                  widget: _AppointmentActivityCard(appt: a),
                ),
              for (final a in data.recentCancellations)
                (
                  time: a.startTime,
                  widget: _CancellationActivityCard(appt: a),
                ),
              for (final p in data.todayProjects)
                (time: p.createdAt, widget: _ProjectActivityCard(project: p)),
              for (final m in data.recentMilestones)
                (
                  time: m.updatedAt,
                  widget: _MilestoneActivityCard(milestone: m),
                ),
            ];
            activityItems.sort((a, b) => b.time.compareTo(a.time));

            // The "today" metric follows the business mode: appointments for a
            // services business, projects for freelance, orders for products.
            final mode = auth.state?.business?.mode ?? 'SERVICES';
            final String todayLabel;
            final int todayCount;
            final String todayRoute;
            if (mode == 'FREELANCE') {
              todayLabel = l.homeHeroTodayProjects;
              todayCount = data.todayProjects.length;
              todayRoute = '/projects';
            } else if (mode == 'PRODUCTS') {
              todayLabel = l.homeHeroTodayOrders;
              todayCount = data.todayOrders.length;
              todayRoute = '/orders';
            } else {
              todayLabel = l.homeHeroTodayAppointments;
              todayCount = data.todayAppointments.length;
              todayRoute = '/appointments';
            }

            final hasQueue = data.pendingPayments.isNotEmpty ||
                data.pendingAppointmentPayments.isNotEmpty;

            return RefreshIndicator(
              color: t.accent,
              onRefresh: () => ref.read(homeProvider.notifier).refresh(),
              child: ListView(
                padding: EdgeInsets.fromLTRB(
                    AppSpacing.s4,
                    AppSpacing.s4,
                    AppSpacing.s4,
                    AppSpacing.s6 + MediaQuery.of(context).padding.bottom),
                children: [
                  // Greeting
                  _Greeting(businessName: data.businessName),
                  const SizedBox(height: AppSpacing.s4),

                  // Quick search
                  const _SearchBar(),
                  const SizedBox(height: AppSpacing.s5),

                  // Payment queue — the one thing the owner must act on.
                  // Hidden when empty: the queue vanishing after the last
                  // confirm IS the feedback, and home stays calm instead of
                  // celebrating nothing.
                  if (hasQueue) ...[
                    _PaymentQueue(data: data),
                    const SizedBox(height: AppSpacing.s4),
                  ],

                  // Summary stats — the old hero metric, demoted to a card
                  _StatRow(
                    data: data,
                    todayLabel: todayLabel,
                    todayCount: todayCount,
                    todayRoute: todayRoute,
                  ),
                  const SizedBox(height: AppSpacing.s5),

                  // Quick actions — secondary tools that aren't in the bottom nav
                  _QuickActionsGrid(mode: mode),

                  // Needs attention
                  if (data.hasAttentionItems) ...[
                    _SectionHeader(
                      title: l.homeNeedsAttention,
                      count: data.overdueReminders.length +
                          data.dormantCustomers.length,
                      color: t.warningStrong,
                    ),
                    const SizedBox(height: AppSpacing.s2),
                    ...data.overdueReminders.map(
                      (r) => _ReminderCard(reminder: r),
                    ),
                    ...data.dormantCustomers.map(
                      (c) => _DormantCard(customer: c),
                    ),
                    const SizedBox(height: AppSpacing.s5),
                  ],

                  // Today's activity — unified feed
                  _SectionHeader(
                    title: l.homeTodaysActivity,
                    count: activityItems.length,
                    color: t.accent,
                  ),
                  const SizedBox(height: AppSpacing.s2),

                  if (activityItems.isEmpty)
                    const _EmptyActivity()
                  else
                    ...activityItems.map((item) => item.widget),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

// ── Greeting ─────────────────────────────────────────────────────────

class _Greeting extends StatelessWidget {
  final String businessName;
  const _Greeting({required this.businessName});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          l.homeWelcome,
          style: TextStyle(fontSize: AppTextSizes.sm, color: t.text2),
        ),
        const SizedBox(height: AppSpacing.s1),
        Text(
          businessName,
          style: TextStyle(
            fontSize: AppTextSizes.h3,
            fontWeight: AppFontWeights.bold,
            color: t.text1,
          ),
        ),
        const SizedBox(height: AppSpacing.s1),
        Text(
          formatDate(DateTime.now()),
          style: TextStyle(fontSize: AppTextSizes.sm, color: t.text3),
        ),
      ],
    );
  }
}

// ── Payment queue ────────────────────────────────────────────────────

/// Customers who tapped "I have paid" and are waiting for the owner to
/// confirm — orders and in-advance appointments, newest claim first. Rows
/// navigate to the detail screen (payment proof + confirm sheet); the queue
/// never confirms blind from home. Mirrors the web home queue card.
class _PaymentQueue extends StatelessWidget {
  final HomeData data;
  const _PaymentQueue({required this.data});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);

    final entries = <({
      String route,
      String name,
      String meta,
      int amount,
      DateTime at,
    })>[
      for (final p in data.pendingPayments)
        (
          route: '/orders/${p.id}',
          name: p.customerName,
          meta: l.homeQueueOrderMeta(p.orderNumber),
          amount: p.total,
          at: p.updatedAt,
        ),
      for (final a in data.pendingAppointmentPayments)
        (
          route: '/appointments/${a.id}',
          name: a.customerName,
          meta: a.serviceName,
          amount: a.price,
          at: a.updatedAt,
        ),
    ]..sort((x, y) => y.at.compareTo(x.at));

    final visible = entries.take(5).toList();

    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: t.surface,
        borderRadius: AppRadii.xl,
        border: Border.all(color: t.border),
        boxShadow: t.shadowSm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            color: t.accentSoft,
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.s4,
              vertical: AppSpacing.s3,
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    l.homeQueueTitle,
                    style: TextStyle(
                      fontSize: AppTextSizes.base,
                      fontWeight: AppFontWeights.bold,
                      color: t.text1,
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.s2),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.s2,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: t.accent,
                    borderRadius: AppRadii.pill,
                  ),
                  child: Text(
                    '${entries.length}',
                    style: TextStyle(
                      fontSize: AppTextSizes.sm,
                      fontWeight: AppFontWeights.bold,
                      color: t.accentOn,
                    ),
                  ),
                ),
              ],
            ),
          ),
          for (final e in visible) _QueueRow(entry: e),
          if (entries.length > 5)
            GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () => context.go(
                data.pendingPayments.isNotEmpty ? '/orders' : '/appointments',
              ),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.s4,
                  vertical: AppSpacing.s3,
                ),
                decoration: BoxDecoration(
                  border: Border(top: BorderSide(color: t.border)),
                ),
                child: Text(
                  l.homeQueueViewAll(entries.length),
                  style: TextStyle(
                    fontSize: AppTextSizes.sm,
                    fontWeight: AppFontWeights.semibold,
                    color: t.accent,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _QueueRow extends StatelessWidget {
  final ({
    String route,
    String name,
    String meta,
    int amount,
    DateTime at
  }) entry;
  const _QueueRow({required this.entry});

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => context.push(entry.route),
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.s4,
          vertical: AppSpacing.s3,
        ),
        decoration: BoxDecoration(
          border: Border(top: BorderSide(color: t.border)),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    entry.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: AppTextSizes.base,
                      fontWeight: AppFontWeights.semibold,
                      color: t.text1,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    entry.meta,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: AppTextSizes.caption,
                      color: t.text2,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: AppSpacing.s3),
            Text(
              formatUZS(entry.amount),
              style: TextStyle(
                fontSize: AppTextSizes.base,
                fontWeight: AppFontWeights.bold,
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

// ── Summary stats ────────────────────────────────────────────────────

class _StatRow extends StatelessWidget {
  final HomeData data;
  final String todayLabel;
  final int todayCount;
  final String todayRoute;
  const _StatRow({
    required this.data,
    required this.todayLabel,
    required this.todayCount,
    required this.todayRoute,
  });

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    // IntrinsicHeight + stretch keeps both cards the same height even when one
    // label wraps to two lines and the other doesn't.
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: AppStatCard(
              label: todayLabel,
              value: '$todayCount',
              onTap: () => context.go(todayRoute),
            ),
          ),
          const SizedBox(width: AppSpacing.s3),
          Expanded(
            child: AppStatCard(
              label: l.homeStatNewCustomers,
              value: '${data.newCustomers.length}',
              onTap: () => context.go('/customers'),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Quick search ─────────────────────────────────────────────────────

class _SearchBar extends ConsumerStatefulWidget {
  const _SearchBar();

  @override
  ConsumerState<_SearchBar> createState() => _SearchBarState();
}

class _SearchBarState extends ConsumerState<_SearchBar> {
  final _searchController = TextEditingController();
  final _focusNode = FocusNode();
  bool _isSearching = false;
  bool _loading = false;
  List<CustomerSearchResult> _searchResults = [];
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _focusNode.addListener(() {
      if (!_focusNode.hasFocus && mounted) {
        setState(() {
          _isSearching = false;
          _loading = false;
          _searchResults = [];
        });
      }
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    _debounce?.cancel();
    if (value.trim().length < 2) {
      setState(() {
        _isSearching = false;
        _loading = false;
        _searchResults = [];
      });
      return;
    }
    setState(() {
      _isSearching = true;
      _loading = true;
    });
    _debounce = Timer(const Duration(milliseconds: 300), () async {
      try {
        final results =
            await ref.read(apiServiceProvider).searchCustomers(value.trim());
        if (mounted) {
          setState(() {
            _searchResults = results;
            _loading = false;
          });
        }
      } catch (_) {
        if (mounted) {
          setState(() {
            _searchResults = [];
            _loading = false;
          });
        }
      }
    });
  }

  void _clearSearch() {
    _debounce?.cancel();
    _searchController.clear();
    _focusNode.unfocus();
    setState(() {
      _isSearching = false;
      _loading = false;
      _searchResults = [];
    });
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          decoration: BoxDecoration(
            color: t.surface,
            borderRadius: AppRadii.md,
            border: Border.all(color: t.border),
            boxShadow: t.shadowSm,
          ),
          child: TextField(
            controller: _searchController,
            focusNode: _focusNode,
            onChanged: _onSearchChanged,
            style: TextStyle(fontSize: AppTextSizes.base, color: t.text1),
            decoration: InputDecoration(
              hintText: l.homeSearchHint,
              hintStyle: TextStyle(fontSize: AppTextSizes.base, color: t.text3),
              prefixIcon: Padding(
                padding: const EdgeInsets.only(
                    left: AppSpacing.s4, right: AppSpacing.s2),
                child:
                    AppIcon(name: AppIconName.search, size: 20, color: t.text2),
              ),
              prefixIconConstraints:
                  const BoxConstraints(minWidth: 0, minHeight: 0),
              suffixIcon: _searchController.text.isNotEmpty
                  ? IconButton(
                      icon: AppIcon(
                          name: AppIconName.close, size: 18, color: t.text2),
                      onPressed: () {
                        _searchController.clear();
                        _onSearchChanged('');
                      },
                    )
                  : null,
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.s4, vertical: AppSpacing.s3),
            ),
          ),
        ),
        if (_isSearching)
          Container(
            constraints: const BoxConstraints(maxHeight: 320),
            margin: const EdgeInsets.only(top: AppSpacing.s1),
            decoration: BoxDecoration(
              color: t.surface,
              borderRadius: AppRadii.md,
              border: Border.all(color: t.border),
              boxShadow: t.shadowMd,
            ),
            clipBehavior: Clip.antiAlias,
            child: _loading
                ? const SizedBox(
                    height: 80,
                    child: Center(child: AppSpinner()),
                  )
                : _searchResults.isEmpty
                    ? SizedBox(
                        height: 80,
                        child: Center(
                          child: Text(
                            l.homeNoCustomersFound,
                            style: TextStyle(
                                color: t.text2, fontSize: AppTextSizes.sm),
                          ),
                        ),
                      )
                    : ListView.builder(
                        shrinkWrap: true,
                        padding: EdgeInsets.zero,
                        itemCount: _searchResults.length,
                        itemBuilder: (ctx, i) {
                          final result = _searchResults[i];
                          final subtitle = result.telegramUsername != null
                              ? '@${result.telegramUsername}'
                              : result.phone ?? l.homeNoContactInfo;
                          return ListTile(
                            leading: AppAvatar(
                                name: result.name, size: AppAvatarSize.sm),
                            title: Text(
                              result.name,
                              style: TextStyle(
                                fontWeight: AppFontWeights.semibold,
                                fontSize: AppTextSizes.sm,
                                color: t.text1,
                              ),
                            ),
                            subtitle: Text(
                              subtitle,
                              style: TextStyle(
                                  color: t.text2,
                                  fontSize: AppTextSizes.caption),
                            ),
                            trailing: Text(
                              l.homeOrdersCount(result.orderCount),
                              style: TextStyle(
                                  color: t.text2,
                                  fontSize: AppTextSizes.caption),
                            ),
                            onTap: () {
                              _clearSearch();
                              context.push('/customers/${result.id}');
                            },
                          );
                        },
                      ),
          ),
      ],
    );
  }
}

// ── Quick actions ────────────────────────────────────────────────────

class _QuickActionsGrid extends StatelessWidget {
  final String mode;
  const _QuickActionsGrid({required this.mode});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    // Only secondary tools that have NO bottom-nav tab, so nothing here just
    // mirrors the bar (Customers / Appointments / Projects / Settings live
    // there; Analytics and the account avatar are in the app bar).
    // Per-mode quick actions, kept IDENTICAL to the web home:
    //   SERVICES  → Services + Staff
    //   PRODUCTS  → Catalog + Calendar
    //   FREELANCE → Staff + Calendar
    // (A FREELANCE "Todo" button is still omitted — no Todo screen exists yet.)
    final items = <QuickActionItem>[
      if (mode == 'SERVICES') ...[
        QuickActionItem(
          icon: AppIconName.catalog,
          label: l.navServices,
          onTap: () => context.push('/services'),
        ),
        QuickActionItem(
          icon: AppIconName.staff,
          label: l.navStaff,
          onTap: () => context.push('/staff'),
        ),
      ],
      if (mode == 'PRODUCTS') ...[
        QuickActionItem(
          icon: AppIconName.catalog,
          label: l.navCatalog,
          onTap: () => context.push('/catalog'),
        ),
        QuickActionItem(
          icon: AppIconName.calendar,
          label: l.navCalendar,
          onTap: () => context.push('/calendar'),
        ),
      ],
      if (mode == 'FREELANCE') ...[
        QuickActionItem(
          icon: AppIconName.staff,
          label: l.navStaff,
          onTap: () => context.push('/staff'),
        ),
        QuickActionItem(
          icon: AppIconName.calendar,
          label: l.navCalendar,
          onTap: () => context.push('/calendar'),
        ),
      ],
    ];
    if (items.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.s6),
      // columns == item count so the tiles always fill the row (no empty gap).
      child: QuickActions(items: items, columns: items.length),
    );
  }
}

// ── Section headers ──────────────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  final String title;
  final int count;
  final Color color;

  const _SectionHeader({
    required this.title,
    required this.count,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: TextStyle(
              fontSize: AppTextSizes.base,
              fontWeight: AppFontWeights.bold,
              color: t.text1,
            ),
          ),
        ),
        if (count > 0)
          Container(
            padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.s2, vertical: 2),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: AppRadii.pill,
            ),
            child: Text(
              count.toString(),
              style: TextStyle(
                fontSize: AppTextSizes.caption,
                fontWeight: AppFontWeights.bold,
                color: color,
              ),
            ),
          ),
      ],
    );
  }
}

// ── Activity / attention building blocks ─────────────────────────────

/// Leading accentSoft square holding an [AppIcon].
class _IconTile extends StatelessWidget {
  final AppIconName icon;
  final Color? color;
  const _IconTile({required this.icon, this.color});

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    final c = color ?? t.accent;
    return Container(
      width: 40,
      height: 40,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: c.withValues(alpha: 0.12),
        borderRadius: AppRadii.md,
      ),
      child: AppIcon(name: icon, size: 22, color: c),
    );
  }
}

/// Shared activity/attention row built on [AppCard].
class _FeedCard extends StatelessWidget {
  final Widget leading;
  final String title;
  final String subtitle;
  final Widget? trailing;
  final VoidCallback onTap;

  const _FeedCard({
    required this.leading,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.s2),
      child: AppCard(
        onTap: onTap,
        padding: const EdgeInsets.all(AppSpacing.s3),
        child: Row(
          children: [
            leading,
            const SizedBox(width: AppSpacing.s3),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: AppTextSizes.sm,
                      fontWeight: AppFontWeights.semibold,
                      color: t.text1,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                        fontSize: AppTextSizes.caption, color: t.text2),
                  ),
                ],
              ),
            ),
            if (trailing != null) ...[
              const SizedBox(width: AppSpacing.s2),
              trailing!,
            ],
          ],
        ),
      ),
    );
  }
}

// ── Attention cards ──────────────────────────────────────────────────

class _ReminderCard extends StatelessWidget {
  final ReminderItem reminder;
  const _ReminderCard({required this.reminder});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final isOverdue = reminder.isOverdue;
    final color = isOverdue ? t.errorStrong : t.warningStrong;

    return _FeedCard(
      leading: _IconTile(icon: AppIconName.bell, color: color),
      title: reminder.customerName,
      subtitle: reminder.note,
      onTap: () => context.push('/customers/${reminder.customerId}'),
      trailing: Text(
        isOverdue ? l.homeOverdue : l.commonToday,
        style: TextStyle(
          fontSize: AppTextSizes.caption,
          fontWeight: AppFontWeights.semibold,
          color: color,
        ),
      ),
    );
  }
}

class _DormantCard extends StatelessWidget {
  final DormantCustomer customer;
  const _DormantCard({required this.customer});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);

    return _FeedCard(
      leading: AppAvatar(name: customer.name, size: AppAvatarSize.md),
      title: customer.name,
      subtitle: l.homeOrdersCount(customer.orderCount),
      onTap: () => context.push('/customers/${customer.id}'),
      trailing: Text(
        l.homeDaysSilent(customer.daysSince),
        style: TextStyle(fontSize: AppTextSizes.caption, color: t.text3),
      ),
    );
  }
}

// ── Activity feed cards ──────────────────────────────────────────────

class _OrderActivityCard extends StatelessWidget {
  final Order order;
  const _OrderActivityCard({required this.order});

  @override
  Widget build(BuildContext context) {
    final firstItem =
        order.items.isNotEmpty ? order.items.first.productName : '';
    final subtitle = firstItem.isNotEmpty
        ? '$firstItem • ${formatUZS(order.total)}'
        : formatUZS(order.total);

    return _FeedCard(
      leading: const _IconTile(icon: AppIconName.orders),
      title: order.customer.name,
      subtitle: subtitle,
      trailing: AppBadge(status: order.orderStatus, type: AppBadgeType.order),
      onTap: () => context.push('/orders/${order.id}'),
    );
  }
}

class _AppointmentActivityCard extends StatelessWidget {
  final HomeAppointment appt;
  const _AppointmentActivityCard({required this.appt});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final time = formatTime(appt.startTime.toLocal());
    return _FeedCard(
      leading: _IconTile(icon: AppIconName.calendar, color: t.successStrong),
      title: appt.customerName,
      subtitle: '${appt.serviceName} • $time',
      trailing: Text(
        l.homeBadgeAppointment,
        style: TextStyle(fontSize: AppTextSizes.caption, color: t.text2),
      ),
      onTap: () => context.go('/appointments'),
    );
  }
}

class _CancellationActivityCard extends StatelessWidget {
  final HomeAppointment appt;
  const _CancellationActivityCard({required this.appt});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    return _FeedCard(
      leading: _IconTile(
          icon: AppIconName.close, color: AppTokens.of(context).errorStrong),
      title: appt.customerName,
      subtitle: l.homeActivityCancelled(appt.serviceName),
      trailing:
          const AppBadge(status: 'CANCELLED', type: AppBadgeType.appointment),
      onTap: () => context.go('/appointments'),
    );
  }
}

class _ProjectActivityCard extends StatelessWidget {
  final HomeProject project;
  const _ProjectActivityCard({required this.project});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    return _FeedCard(
      leading: const _IconTile(icon: AppIconName.projects),
      title: project.name,
      subtitle: l.homeActivityNewProject(project.customerName),
      trailing: Text(
        l.homeBadgeProject,
        style: TextStyle(fontSize: AppTextSizes.caption, color: t.text2),
      ),
      onTap: () => context.push('/projects/${project.id}'),
    );
  }
}

class _MilestoneActivityCard extends StatelessWidget {
  final HomeMilestone milestone;
  const _MilestoneActivityCard({required this.milestone});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    return _FeedCard(
      leading: _IconTile(icon: AppIconName.paid, color: t.successStrong),
      title: milestone.milestoneName,
      subtitle: l.homeActivityMilestoneApproved(milestone.projectName),
      trailing: Text(
        l.homeBadgeMilestone,
        style: TextStyle(fontSize: AppTextSizes.caption, color: t.text2),
      ),
      onTap: () => context.push('/projects/${milestone.projectId}'),
    );
  }
}

// ── Empty / error states ─────────────────────────────────────────────

class _EmptyActivity extends StatelessWidget {
  const _EmptyActivity();

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.s5),
      child: Column(
        children: [
          AppIcon(name: AppIconName.inbox, size: 40, color: t.text3),
          const SizedBox(height: AppSpacing.s2),
          Text(
            AppLocalizations.of(context)!.homeNoActivity,
            style: TextStyle(color: t.text2, fontSize: AppTextSizes.sm),
          ),
        ],
      ),
    );
  }
}
