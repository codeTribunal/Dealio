import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/icons/app_icon.dart';
import '../../core/models/appointment.dart';
import '../../core/theme/app_tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/utils/format.dart';
import '../../shared/widgets/app_badge.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_card.dart';
import '../../shared/widgets/app_spinner.dart';
import 'appointments_provider.dart';

class AppointmentCalendarScreen extends ConsumerWidget {
  const AppointmentCalendarScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final notifier = ref.read(appointmentsProvider.notifier);
    final apptAsync = ref.watch(appointmentsProvider);
    final selectedDay = notifier.filter.selectedDate;
    final today = DateTime.now();
    final isToday = _isSameDay(selectedDay, today);

    return Scaffold(
      appBar: AppBar(
        title: Text(l.appointmentsTitle),
        actions: [
          TextButton(
            onPressed: () => notifier.setShowDeleted(!notifier.showDeleted),
            style: TextButton.styleFrom(
              foregroundColor: notifier.showDeleted ? t.accent : t.text2,
            ),
            child: Text(l.commonShowDeleted),
          ),
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
            padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.s2, vertical: AppSpacing.s1),
            decoration: BoxDecoration(
              color: t.surface,
              border: Border(bottom: BorderSide(color: t.border)),
            ),
            child: Row(
              children: [
                IconButton(
                  icon: Icon(Icons.chevron_left, color: t.text2, size: 28),
                  onPressed: () => notifier.selectDate(
                    selectedDay.subtract(const Duration(days: 1)),
                  ),
                  tooltip: l.commonYesterday,
                ),
                Expanded(
                  child: GestureDetector(
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: selectedDay,
                        firstDate:
                            DateTime.now().subtract(const Duration(days: 365)),
                        lastDate:
                            DateTime.now().add(const Duration(days: 365)),
                      );
                      if (picked != null) notifier.selectDate(picked);
                    },
                    child: Column(
                      children: [
                        Text(
                          _dayLabel(l, selectedDay, today),
                          style: TextStyle(
                            fontSize: AppTextSizes.base,
                            fontWeight: AppFontWeights.bold,
                            color: t.text1,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        Text(
                          DateFormat('EEEE, d MMMM yyyy').format(selectedDay),
                          style: TextStyle(
                              fontSize: AppTextSizes.caption, color: t.text3),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.chevron_right, color: t.text2, size: 28),
                  onPressed: () => notifier.selectDate(
                    selectedDay.add(const Duration(days: 1)),
                  ),
                  tooltip: l.apptTomorrow,
                ),
              ],
            ),
          ),

          // ── Appointment list ──────────────────────────────────────
          Expanded(
            child: apptAsync.when(
              loading: () => const Center(child: AppSpinner(size: 32)),
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
                        AppIcon(
                            name: AppIconName.calendar,
                            size: 56,
                            color: t.text3),
                        const SizedBox(height: AppSpacing.s4),
                        Text(l.apptEmpty,
                            style: TextStyle(
                                color: t.text2, fontSize: AppTextSizes.base)),
                        const SizedBox(height: AppSpacing.s2),
                        Text(l.apptEmptyHint,
                            style: TextStyle(
                                color: t.text3,
                                fontSize: AppTextSizes.caption)),
                      ],
                    ),
                  );
                }
                return RefreshIndicator(
                  color: t.accent,
                  onRefresh: notifier.refresh,
                  child: ListView.separated(
                    padding: EdgeInsets.fromLTRB(AppSpacing.s4, AppSpacing.s3,
                        AppSpacing.s4,
                        AppSpacing.s8 + MediaQuery.of(context).padding.bottom),
                    itemCount: appointments.length,
                    separatorBuilder: (_, __) =>
                        const SizedBox(height: AppSpacing.s2),
                    itemBuilder: (ctx, i) {
                      final a = appointments[i];
                      if (a.deleted) {
                        return _DeletedAppointmentTile(
                          appointment: a,
                          onRestore: () => notifier.restore(a.id),
                        );
                      }
                      return _AppointmentTile(
                        appointment: a,
                        onTap: () => ctx.push('/appointments/${a.id}'),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: t.accent,
        foregroundColor: t.accentOn,
        onPressed: () => context.push('/appointments/new'),
        child: AppIcon(name: AppIconName.add, color: t.accentOn),
      ),
    );
  }

  String _dayLabel(AppLocalizations l, DateTime d, DateTime today) {
    if (_isSameDay(d, today)) return l.commonToday;
    if (_isSameDay(d, today.add(const Duration(days: 1)))) {
      return l.apptTomorrow;
    }
    if (_isSameDay(d, today.subtract(const Duration(days: 1)))) {
      return l.commonYesterday;
    }
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
    final t = AppTokens.of(context);
    final start = appointment.startTime.toLocal();
    final timeLabel = formatTime(start);
    final durationLabel =
        l.durationMinutes(appointment.service.durationMinutes);
    final staffLabel =
        appointment.staff != null ? ' · ${appointment.staff!.name}' : '';

    return AppCard(
      onTap: onTap,
      padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.s3, vertical: AppSpacing.s3),
      child: Row(
        children: [
          // Time column (24h)
          SizedBox(
            width: 46,
            child: Text(
              timeLabel,
              style: TextStyle(
                fontSize: AppTextSizes.sm,
                fontWeight: AppFontWeights.bold,
                color: t.text1,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(width: AppSpacing.s2),
          // Accent stripe
          Container(
            width: 4,
            height: 52,
            decoration: BoxDecoration(
              color: t.accent,
              borderRadius: AppRadii.sm,
            ),
          ),
          const SizedBox(width: AppSpacing.s3),
          // Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  appointment.service.name,
                  style: TextStyle(
                    fontWeight: AppFontWeights.bold,
                    fontSize: AppTextSizes.sm,
                    color: t.text1,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  '${appointment.customer.name}$staffLabel',
                  style: TextStyle(
                      color: t.text2, fontSize: AppTextSizes.caption),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  durationLabel,
                  style:
                      TextStyle(color: t.text3, fontSize: AppTextSizes.caption),
                ),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.s2),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                formatUZS(appointment.price),
                style: TextStyle(
                  fontWeight: AppFontWeights.bold,
                  fontSize: AppTextSizes.sm,
                  color: t.text1,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
              const SizedBox(height: AppSpacing.s1),
              AppBadge(
                  status: appointment.status,
                  type: AppBadgeType.appointment),
            ],
          ),
        ],
      ),
    );
  }
}

class _DeletedAppointmentTile extends StatelessWidget {
  final Appointment appointment;
  final VoidCallback onRestore;
  const _DeletedAppointmentTile({
    required this.appointment,
    required this.onRestore,
  });

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    return Opacity(
      opacity: 0.6,
      child: AppCard(
        padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.s3, vertical: AppSpacing.s3),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          appointment.service.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontWeight: AppFontWeights.bold,
                            fontSize: AppTextSizes.sm,
                            color: t.text1,
                          ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.s2),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.s2, vertical: 2),
                        decoration: BoxDecoration(
                          color: t.errorSoft,
                          borderRadius: AppRadii.pill,
                        ),
                        child: Text(
                          l.commonDeletedBadge,
                          style: TextStyle(
                            fontSize: AppTextSizes.caption,
                            fontWeight: AppFontWeights.semibold,
                            color: t.errorStrong,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${formatTime(appointment.startTime.toLocal())} · ${appointment.customer.name}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style:
                        TextStyle(color: t.text2, fontSize: AppTextSizes.caption),
                  ),
                ],
              ),
            ),
            const SizedBox(width: AppSpacing.s2),
            AppButton(
              label: l.buttonRestore,
              variant: AppButtonVariant.secondary,
              size: AppButtonSize.sm,
              onPressed: onRestore,
            ),
          ],
        ),
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
