import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/models/appointment.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/utils/format.dart';
import '../../shared/utils/status_labels.dart';
import 'appointments_provider.dart';

const _statusColor = {
  'REQUESTED': Color(0xFFD97706),
  'CONFIRMED': Color(0xFF059669),
  'COMPLETED': Color(0xFF1A56DB),
  'CANCELLED': Color(0xFF6B7280),
  'NO_SHOW': Color(0xFFDC2626),
};

class AppointmentCalendarScreen extends ConsumerWidget {
  const AppointmentCalendarScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final notifier = ref.read(appointmentsProvider.notifier);
    final apptAsync = ref.watch(appointmentsProvider);
    final selectedDay = notifier.filter.selectedDate;
    final today = DateTime.now();
    final isToday = _isSameDay(selectedDay, today);

    return Scaffold(
      appBar: AppBar(
        title: Text(l.appointmentsTitle),
        actions: [
          if (!isToday)
            TextButton(
              onPressed: () => notifier.selectDate(today),
              child: Text(l.commonToday),
            ),
        ],
      ),
      body: Column(
        children: [
          // ── Day navigation header ─────────────────────────────────
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
            ),
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.chevron_left),
                  onPressed: () => notifier.selectDate(
                    selectedDay.subtract(const Duration(days: 1)),
                  ),
                ),
                Expanded(
                  child: GestureDetector(
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: selectedDay,
                        firstDate: DateTime.now().subtract(const Duration(days: 365)),
                        lastDate: DateTime.now().add(const Duration(days: 365)),
                      );
                      if (picked != null) notifier.selectDate(picked);
                    },
                    child: Column(
                      children: [
                        Text(
                          _dayLabel(l, selectedDay, today),
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                          textAlign: TextAlign.center,
                        ),
                        Text(
                          DateFormat('EEEE, d MMMM yyyy').format(selectedDay),
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[500],
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.chevron_right),
                  onPressed: () => notifier.selectDate(
                    selectedDay.add(const Duration(days: 1)),
                  ),
                ),
              ],
            ),
          ),

          // ── Appointment list ──────────────────────────────────────
          Expanded(
            child: apptAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => _ErrorView(
                message: e.toString(),
                onRetry: notifier.refresh,
              ),
              data: (appointments) {
                if (appointments.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.calendar_today_outlined,
                            size: 56, color: Colors.grey[300]),
                        const SizedBox(height: 16),
                        Text(
                          l.apptEmpty,
                          style: TextStyle(
                              color: Colors.grey[500], fontSize: 15),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          l.apptEmptyHint,
                          style: TextStyle(
                              color: Colors.grey[400], fontSize: 12),
                        ),
                      ],
                    ),
                  );
                }
                return RefreshIndicator(
                  onRefresh: notifier.refresh,
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 88),
                    itemCount: appointments.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (ctx, i) => _AppointmentTile(
                      appointment: appointments[i],
                      onTap: () =>
                          ctx.push('/appointments/${appointments[i].id}'),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/appointments/new'),
        child: const Icon(Icons.add),
      ),
    );
  }

  String _dayLabel(AppLocalizations l, DateTime d, DateTime today) {
    if (_isSameDay(d, today)) return l.commonToday;
    if (_isSameDay(d, today.add(const Duration(days: 1)))) return l.apptTomorrow;
    if (_isSameDay(d, today.subtract(const Duration(days: 1)))) return l.commonYesterday;
    return DateFormat('EEEE').format(d);
  }

  bool _isSameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;
}

class _AppointmentTile extends StatelessWidget {
  final Appointment appointment;
  final VoidCallback onTap;

  const _AppointmentTile({required this.appointment, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final color = _statusColor[appointment.status] ?? const Color(0xFF6B7280);
    final start = appointment.startTime.toLocal();
    final timeLabel = formatTime(start);
    final durationLabel = l.durationMinutes(appointment.service.durationMinutes);
    final staffLabel =
        appointment.staff != null ? ' · ${appointment.staff!.name}' : '';

    return Card(
      margin: EdgeInsets.zero,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          child: Row(
            children: [
              // Time column
              SizedBox(
                width: 44,
                child: Text(
                  timeLabel,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: Colors.grey[700],
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(width: 10),
              // Color stripe
              Container(
                width: 4,
                height: 52,
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 12),
              // Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      appointment.customer.name,
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${appointment.service.name}$staffLabel',
                      style: TextStyle(color: Colors.grey[600], fontSize: 12),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      durationLabel,
                      style: TextStyle(color: Colors.grey[400], fontSize: 11),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    formatUZS(appointment.price),
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                  const SizedBox(height: 4),
                  _StatusBadge(status: appointment.status, color: color),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;
  final Color color;
  const _StatusBadge({required this.status, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        appointmentStatusLabel(AppLocalizations.of(context)!, status),
        style:
            TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: color),
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
    );
  }
}
