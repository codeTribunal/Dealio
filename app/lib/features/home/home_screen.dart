import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_service.dart';
import '../../core/auth/auth_notifier.dart';
import '../../core/models/customer.dart';
import '../../core/models/order.dart';
import '../../shared/utils/format.dart';
import 'home_provider.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final homeAsync = ref.watch(homeProvider);
    final auth = ref.watch(authNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(auth.state?.business?.name ?? 'CRM'),
        actions: [
          IconButton(
            icon: const Icon(Icons.bar_chart_outlined),
            tooltip: 'Analytics',
            onPressed: () => context.push('/analytics'),
          ),
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            tooltip: 'Settings',
            onPressed: () => context.push('/settings'),
          ),
        ],
      ),
      body: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        behavior: HitTestBehavior.translucent,
        child: homeAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => _ErrorView(
          message: e.toString(),
          onRetry: () => ref.read(homeProvider.notifier).refresh(),
        ),
        data: (data) {
          // Build the unified activity feed and sort by time descending
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

          return RefreshIndicator(
            onRefresh: () => ref.read(homeProvider.notifier).refresh(),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
              children: [
                // Quick search
                const _SearchBar(),
                const SizedBox(height: 16),

                // Quick nav row
                const _QuickActions(),
                const SizedBox(height: 20),

                // Needs attention
                if (data.hasAttentionItems) ...[
                  _SectionHeader(
                    title: 'Needs attention',
                    count: data.overdueReminders.length +
                        data.dormantCustomers.length,
                    color: Colors.orange,
                  ),
                  const SizedBox(height: 8),
                  ...data.overdueReminders.map(
                    (r) => _ReminderCard(reminder: r),
                  ),
                  ...data.dormantCustomers.map(
                    (c) => _DormantCard(customer: c),
                  ),
                  const SizedBox(height: 20),
                ],

                // Today's activity — unified feed
                _SectionHeader(
                  title: "Today's activity",
                  count: activityItems.length,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(height: 8),

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
        if (mounted) setState(() { _searchResults = results; _loading = false; });
      } catch (_) {
        if (mounted) setState(() { _searchResults = []; _loading = false; });
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
    final primary = Theme.of(context).colorScheme.primary;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE5E7EB), width: 1.5),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: TextField(
            controller: _searchController,
            focusNode: _focusNode,
            onChanged: (value) => _onSearchChanged(value),
            style: const TextStyle(
              fontSize: 15,
              color: Color(0xFF111827),
              fontWeight: FontWeight.w400,
            ),
            decoration: InputDecoration(
              hintText: 'Search customers...',
              hintStyle: TextStyle(
                fontSize: 15,
                color: Colors.grey.shade400,
                fontWeight: FontWeight.w400,
              ),
              prefixIcon: Icon(
                Icons.search_rounded,
                color: Colors.grey.shade400,
                size: 22,
              ),
              suffixIcon: _searchController.text.isNotEmpty
                  ? IconButton(
                      icon: Icon(Icons.close_rounded,
                          color: Colors.grey.shade400, size: 20),
                      onPressed: () {
                        _searchController.clear();
                        _onSearchChanged('');
                      },
                    )
                  : null,
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16, vertical: 14),
            ),
          ),
        ),
        if (_isSearching)
          Container(
            constraints: const BoxConstraints(maxHeight: 320),
            margin: const EdgeInsets.only(top: 4),
            child: Material(
              elevation: 8,
              borderRadius: BorderRadius.circular(16),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: _loading
                    ? const SizedBox(
                        height: 80,
                        child: Center(
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      )
                    : _searchResults.isEmpty
                        ? const SizedBox(
                            height: 80,
                            child: Center(
                              child: Text(
                                'No customers found',
                                style:
                                    TextStyle(color: Colors.grey, fontSize: 14),
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
                                  : result.phone ?? 'No contact info';
                              return ListTile(
                                leading: CircleAvatar(
                                  backgroundColor:
                                      primary.withValues(alpha: 0.1),
                                  child: Text(
                                    result.name.isNotEmpty
                                        ? result.name[0].toUpperCase()
                                        : '?',
                                    style: TextStyle(
                                      color: primary,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                title: Text(
                                  result.name,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                  ),
                                ),
                                subtitle: Text(
                                  subtitle,
                                  style: TextStyle(
                                    color: Colors.grey[500],
                                    fontSize: 12,
                                  ),
                                ),
                                trailing: Text(
                                  '${result.orderCount} orders',
                                  style: TextStyle(
                                    color: Colors.grey[500],
                                    fontSize: 12,
                                  ),
                                ),
                                onTap: () {
                                  _clearSearch();
                                  context.push('/customers/${result.id}');
                                },
                              );
                            },
                          ),
              ),
            ),
          ),
      ],
    );
  }
}

// ── Quick actions ────────────────────────────────────────────────────

class _QuickActions extends ConsumerWidget {
  const _QuickActions();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final business = ref.watch(authNotifierProvider).state?.business;
    final mode = business?.mode ?? [];
    final hasFreelance = mode.contains('FREELANCE');

    final buttons =
        <({String label, IconData icon, String route, int badge})>[
      (
        label: 'Customers',
        icon: Icons.people_outline,
        route: '/customers',
        badge: 0
      ),
      (
        label: 'Orders',
        icon: Icons.receipt_outlined,
        route: '/orders',
        badge: 0
      ),
      (
        label: 'Appointments',
        icon: Icons.calendar_month_outlined,
        route: '/appointments',
        badge: 0
      ),
      if (hasFreelance)
        (
          label: 'Projects',
          icon: Icons.work_outline,
          route: '/projects',
          badge: 0
        ),
      (
        label: 'Catalog',
        icon: Icons.inventory_2_outlined,
        route: '/catalog',
        badge: 0
      ),
    ];

    // 4 buttons → 2 per row (2+2); 5+ buttons → 3 per row
    final cols = buttons.length <= 4 ? 2 : 3;

    final rows =
        <List<({String label, IconData icon, String route, int badge})>>[];
    for (var i = 0; i < buttons.length; i += cols) {
      rows.add(buttons.sublist(
          i, i + cols > buttons.length ? buttons.length : i + cols));
    }

    return Column(
      children: [
        for (var ri = 0; ri < rows.length; ri++) ...[
          if (ri > 0) const SizedBox(height: 10),
          Row(
            children: [
              for (var bi = 0; bi < rows[ri].length; bi++) ...[
                if (bi > 0) const SizedBox(width: 10),
                _ActionButton(
                  label: rows[ri][bi].label,
                  icon: rows[ri][bi].icon,
                  badge: rows[ri][bi].badge,
                  onTap: () => context.push(rows[ri][bi].route),
                ),
              ],
              for (var pad = rows[ri].length; pad < cols; pad++) ...[
                const SizedBox(width: 10),
                const Expanded(child: SizedBox()),
              ],
            ],
          ),
        ],
      ],
    );
  }
}

class _ActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onTap;
  final int badge;

  const _ActionButton({
    required this.label,
    required this.icon,
    required this.onTap,
    this.badge = 0,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Column(
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.primaryContainer,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(icon,
                      color: Theme.of(context).colorScheme.primary,
                      size: 22),
                ),
                if (badge > 0)
                  Positioned(
                    top: -5,
                    right: -5,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 5, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.red,
                        borderRadius: BorderRadius.circular(10),
                        border:
                            Border.all(color: Colors.white, width: 1.5),
                      ),
                      child: Text(
                        badge > 99 ? '99+' : badge.toString(),
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              label,
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(fontWeight: FontWeight.w500),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
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
    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: Theme.of(context)
                .textTheme
                .titleSmall
                ?.copyWith(fontWeight: FontWeight.bold),
          ),
        ),
        if (count > 0)
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              count.toString(),
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ),
      ],
    );
  }
}

// ── Attention cards ──────────────────────────────────────────────────

class _ReminderCard extends StatelessWidget {
  final ReminderItem reminder;
  const _ReminderCard({required this.reminder});

  @override
  Widget build(BuildContext context) {
    final isOverdue = reminder.isOverdue;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => context.push('/customers/${reminder.customerId}'),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: isOverdue
                      ? Colors.red.withValues(alpha: 0.12)
                      : Colors.orange.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  Icons.alarm_outlined,
                  size: 18,
                  color: isOverdue ? Colors.red[700] : Colors.orange[700],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      reminder.customerName,
                      style: const TextStyle(
                          fontWeight: FontWeight.w600, fontSize: 13),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      reminder.note,
                      style:
                          TextStyle(color: Colors.grey[600], fontSize: 12),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Text(
                isOverdue ? 'Overdue' : 'Today',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color:
                      isOverdue ? Colors.red[700] : Colors.orange[700],
                ),
              ),
            ],
          ),
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
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => context.push('/customers/${customer.id}'),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: Colors.grey.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Center(
                  child: Text(
                    customer.name.isNotEmpty
                        ? customer.name[0].toUpperCase()
                        : '?',
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      customer.name,
                      style: const TextStyle(
                          fontWeight: FontWeight.w600, fontSize: 13),
                    ),
                    Text(
                      '${customer.orderCount} order${customer.orderCount != 1 ? 's' : ''}',
                      style: TextStyle(
                          color: Colors.grey[500], fontSize: 11),
                    ),
                  ],
                ),
              ),
              Text(
                '${customer.daysSince}d silent',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  color: Colors.grey[500],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Activity feed cards ──────────────────────────────────────────────

Card _activityCard({
  required BuildContext context,
  required IconData icon,
  required Color iconColor,
  required String title,
  required String subtitle,
  required Widget trailing,
  required VoidCallback onTap,
}) {
  return Card(
    elevation: 0,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    color: Theme.of(context).cardColor,
    margin: const EdgeInsets.symmetric(vertical: 4),
    child: ListTile(
      contentPadding:
          const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      leading: Icon(icon, color: iconColor),
      title: Text(title,
          style: const TextStyle(fontWeight: FontWeight.bold)),
      subtitle: Text(subtitle),
      trailing: trailing,
      onTap: onTap,
    ),
  );
}

class _OrderActivityCard extends StatelessWidget {
  final Order order;
  const _OrderActivityCard({required this.order});

  static const _statusColor = {
    'NEW': Color(0xFF1A56DB),
    'PREPARING': Color(0xFFD97706),
    'READY': Color(0xFF059669),
    'DELIVERED': Color(0xFF6B7280),
    'CANCELLED': Color(0xFFDC2626),
  };

  @override
  Widget build(BuildContext context) {
    final color =
        _statusColor[order.orderStatus] ?? const Color(0xFF6B7280);
    final firstItem =
        order.items.isNotEmpty ? order.items.first.productName : '';
    final subtitle = firstItem.isNotEmpty
        ? '$firstItem • ${formatUZS(order.total)}'
        : formatUZS(order.total);

    return _activityCard(
      context: context,
      icon: Icons.shopping_bag_outlined,
      iconColor: Colors.blue,
      title: order.customer.name,
      subtitle: subtitle,
      trailing: Container(
        padding:
            const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          order.orderStatus,
          style: TextStyle(
              color: color, fontSize: 11, fontWeight: FontWeight.w600),
        ),
      ),
      onTap: () => context.push('/orders/${order.id}'),
    );
  }
}

class _AppointmentActivityCard extends StatelessWidget {
  final HomeAppointment appt;
  const _AppointmentActivityCard({required this.appt});

  @override
  Widget build(BuildContext context) {
    final time = DateFormat('HH:mm').format(appt.startTime.toLocal());
    return _activityCard(
      context: context,
      icon: Icons.calendar_today_outlined,
      iconColor: Colors.green,
      title: appt.customerName,
      subtitle: '${appt.serviceName} • $time',
      trailing: Text('Appointment',
          style: TextStyle(color: Colors.grey[600], fontSize: 12)),
      onTap: () => context.push('/appointments'),
    );
  }
}

class _CancellationActivityCard extends StatelessWidget {
  final HomeAppointment appt;
  const _CancellationActivityCard({required this.appt});

  @override
  Widget build(BuildContext context) {
    return _activityCard(
      context: context,
      icon: Icons.cancel_outlined,
      iconColor: Colors.red,
      title: appt.customerName,
      subtitle: '${appt.serviceName} — cancelled',
      trailing: const Text('Cancelled',
          style: TextStyle(color: Colors.red, fontSize: 12)),
      onTap: () => context.push('/appointments'),
    );
  }
}

class _ProjectActivityCard extends StatelessWidget {
  final HomeProject project;
  const _ProjectActivityCard({required this.project});

  @override
  Widget build(BuildContext context) {
    return _activityCard(
      context: context,
      icon: Icons.work_outline,
      iconColor: Colors.purple,
      title: project.name,
      subtitle: 'New project • ${project.customerName}',
      trailing: Text('Project',
          style: TextStyle(color: Colors.grey[600], fontSize: 12)),
      onTap: () => context.push('/projects/${project.id}'),
    );
  }
}

class _MilestoneActivityCard extends StatelessWidget {
  final HomeMilestone milestone;
  const _MilestoneActivityCard({required this.milestone});

  @override
  Widget build(BuildContext context) {
    return _activityCard(
      context: context,
      icon: Icons.check_circle_outline,
      iconColor: Colors.orange,
      title: milestone.milestoneName,
      subtitle: 'Approved • ${milestone.projectName}',
      trailing: Text('Milestone',
          style: TextStyle(color: Colors.grey[600], fontSize: 12)),
      onTap: () => context.push('/projects/${milestone.projectId}'),
    );
  }
}

// ── Empty states ─────────────────────────────────────────────────────

class _EmptyActivity extends StatelessWidget {
  const _EmptyActivity();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Column(
        children: [
          Icon(Icons.inbox_outlined, size: 40, color: Colors.grey[300]),
          const SizedBox(height: 8),
          Text(
            'No activity today',
            style: TextStyle(color: Colors.grey[500], fontSize: 13),
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
            TextButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}
