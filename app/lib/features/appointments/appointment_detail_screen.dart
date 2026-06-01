import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

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

class AppointmentDetailScreen extends ConsumerWidget {
  final String appointmentId;
  const AppointmentDetailScreen({super.key, required this.appointmentId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final apptAsync = ref.watch(appointmentDetailProvider(appointmentId));

    return Scaffold(
      appBar: AppBar(title: Text(l.apptDetailTitle)),
      body: apptAsync.when(
        loading: () => const Center(child: AppSpinner(size: 32)),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.s5),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                AppIcon(
                    name: AppIconName.close, size: 48, color: t.errorStrong),
                const SizedBox(height: AppSpacing.s3),
                Text(e.toString(),
                    textAlign: TextAlign.center,
                    style: TextStyle(color: t.text2)),
                const SizedBox(height: AppSpacing.s4),
                AppButton(
                  label: l.buttonRetry,
                  variant: AppButtonVariant.secondary,
                  size: AppButtonSize.sm,
                  onPressed: () =>
                      ref.invalidate(appointmentDetailProvider(appointmentId)),
                ),
              ],
            ),
          ),
        ),
        data: (appt) => _AppointmentDetail(appointment: appt),
      ),
    );
  }
}

class _AppointmentDetail extends ConsumerStatefulWidget {
  final Appointment appointment;
  const _AppointmentDetail({required this.appointment});

  @override
  ConsumerState<_AppointmentDetail> createState() => _AppointmentDetailState();
}

class _AppointmentDetailState extends ConsumerState<_AppointmentDetail> {
  late Appointment _appt;
  bool _updatingStatus = false;
  bool _updatingPayment = false;
  bool _editingNotes = false;
  bool _savingNotes = false;
  late TextEditingController _notesController;

  @override
  void initState() {
    super.initState();
    _appt = widget.appointment;
    _notesController = TextEditingController(text: _appt.notes ?? '');
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _updateStatus(String status) async {
    setState(() => _updatingStatus = true);
    try {
      final updated = await ref
          .read(appointmentsProvider.notifier)
          .updateStatus(_appt.id, status);
      if (mounted) setState(() => _appt = updated);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(e.toString()),
              backgroundColor: AppTokens.of(context).error),
        );
      }
    } finally {
      if (mounted) setState(() => _updatingStatus = false);
    }
  }

  Future<void> _confirmPayment() async {
    setState(() => _updatingPayment = true);
    try {
      final updated = await ref
          .read(appointmentsProvider.notifier)
          .confirmPayment(_appt.id);
      if (mounted) setState(() => _appt = updated);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(e.toString()),
              backgroundColor: AppTokens.of(context).error),
        );
      }
    } finally {
      if (mounted) setState(() => _updatingPayment = false);
    }
  }

  Future<void> _saveNotes() async {
    setState(() => _savingNotes = true);
    try {
      final updated = await ref
          .read(appointmentsProvider.notifier)
          .updateNotes(_appt.id, _notesController.text.trim());
      if (mounted) {
        setState(() {
          _appt = updated;
          _editingNotes = false;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(e.toString()),
              backgroundColor: AppTokens.of(context).error),
        );
      }
    } finally {
      if (mounted) setState(() => _savingNotes = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final isTerminal = !_appt.isActive;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.s4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ── Status row ────────────────────────────────────────────
          Row(
            children: [
              AppBadge(status: _appt.status, type: AppBadgeType.appointment),
              const SizedBox(width: AppSpacing.s2),
              _PaymentBadge(paymentStatus: _appt.paymentStatus),
            ],
          ),

          const SizedBox(height: AppSpacing.s4),

          // ── Customer ──────────────────────────────────────────────
          AppCard(
            header: AppCardHeader(title: l.orderSectionCustomer),
            child: Column(
              children: [
                _InfoRow(AppIconName.customers, _appt.customer.name),
                if (_appt.customer.phone != null)
                  _InfoRow(AppIconName.customers, _appt.customer.phone!),
                if (_appt.customer.telegramUsername != null)
                  _InfoRow(
                    AppIconName.inbox,
                    '@${_appt.customer.telegramUsername!}',
                  ),
              ],
            ),
          ),

          const SizedBox(height: AppSpacing.s3),

          // ── Appointment info ──────────────────────────────────────
          AppCard(
            header: AppCardHeader(title: l.apptDetailTitle),
            child: Column(
              children: [
                _InfoRow(AppIconName.staff, _appt.service.name),
                if (_appt.staff != null)
                  _InfoRow(AppIconName.staff, _appt.staff!.name),
                _InfoRow(
                  AppIconName.calendar,
                  formatDate(_appt.startTime.toLocal()),
                ),
                _InfoRow(
                  AppIconName.pending,
                  '${_timeLabel(_appt.startTime.toLocal())} – ${_timeLabel(_appt.endTime.toLocal())}',
                ),
                _InfoRow(
                  AppIconName.pending,
                  l.durationMinutes(_appt.service.durationMinutes),
                ),
                _InfoRow(AppIconName.revenue, formatUZS(_appt.price)),
                _InfoRow(
                  AppIconName.payment,
                  _appt.paymentType == 'IN_ADVANCE'
                      ? l.apptPayInAdvance
                      : l.apptPayAtAppointment,
                ),
              ],
            ),
          ),

          const SizedBox(height: AppSpacing.s3),

          // ── Notes ─────────────────────────────────────────────────
          AppCard(
            header: AppCardHeader(
              title: l.orderSectionNotes,
              trailing: _editingNotes
                  ? null
                  : IconButton(
                      icon: AppIcon(
                          name: AppIconName.settings, size: 16, color: t.text2),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      onPressed: () => setState(() => _editingNotes = true),
                    ),
            ),
            child: _editingNotes
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      TextField(
                        controller: _notesController,
                        maxLines: 4,
                        minLines: 2,
                        autofocus: true,
                        style: TextStyle(color: t.text1),
                        decoration: InputDecoration(
                          hintText: l.apptNotesHint,
                          hintStyle: TextStyle(color: t.text3),
                          border: const OutlineInputBorder(
                              borderRadius: AppRadii.md),
                          contentPadding: const EdgeInsets.all(AppSpacing.s3),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.s2),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          AppButton(
                            label: l.buttonCancel,
                            variant: AppButtonVariant.ghost,
                            size: AppButtonSize.sm,
                            onPressed: _savingNotes
                                ? null
                                : () {
                                    _notesController.text = _appt.notes ?? '';
                                    setState(() => _editingNotes = false);
                                  },
                          ),
                          const SizedBox(width: AppSpacing.s2),
                          AppButton(
                            label: l.buttonSave,
                            variant: AppButtonVariant.secondary,
                            size: AppButtonSize.sm,
                            loading: _savingNotes,
                            onPressed: _savingNotes ? null : _saveNotes,
                          ),
                        ],
                      ),
                    ],
                  )
                : Text(
                    (_appt.notes?.isNotEmpty == true)
                        ? _appt.notes!
                        : l.apptNoNotes,
                    style: TextStyle(
                      color: (_appt.notes?.isNotEmpty == true)
                          ? t.text1
                          : t.text3,
                    ),
                  ),
          ),

          const SizedBox(height: AppSpacing.s5),

          // ── Payment confirm button ────────────────────────────────
          if (_appt.paymentStatus != 'CONFIRMED' && _appt.isActive) ...[
            AppButton(
              label: l.apptConfirmPayment,
              leftIcon: AppIconName.paid,
              fullWidth: true,
              loading: _updatingPayment,
              onPressed: _updatingPayment ? null : _confirmPayment,
            ),
            const SizedBox(height: AppSpacing.s3),
          ],

          // ── Status action buttons ─────────────────────────────────
          if (!isTerminal) ...[
            if (_appt.status == 'REQUESTED') ...[
              AppButton(
                label: l.apptConfirm,
                leftIcon: AppIconName.paid,
                fullWidth: true,
                loading: _updatingStatus,
                onPressed: () => _updateStatus('CONFIRMED'),
              ),
              const SizedBox(height: AppSpacing.s2),
            ],
            if (_appt.status == 'CONFIRMED') ...[
              AppButton(
                label: l.apptMarkCompleted,
                variant: AppButtonVariant.secondary,
                fullWidth: true,
                loading: _updatingStatus,
                onPressed: () => _updateStatus('COMPLETED'),
              ),
              const SizedBox(height: AppSpacing.s2),
              AppButton(
                label: l.apptMarkNoShow,
                variant: AppButtonVariant.danger,
                fullWidth: true,
                loading: _updatingStatus,
                onPressed: () => _updateStatus('NO_SHOW'),
              ),
              const SizedBox(height: AppSpacing.s2),
            ],
            AppButton(
              label: l.apptCancel,
              variant: AppButtonVariant.danger,
              fullWidth: true,
              onPressed:
                  _updatingStatus ? null : () => _updateStatus('CANCELLED'),
            ),
          ],

          const SizedBox(height: AppSpacing.s4),
        ],
      ),
    );
  }

  String _timeLabel(DateTime dt) =>
      '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
}

class _PaymentBadge extends StatelessWidget {
  final String paymentStatus;
  const _PaymentBadge({required this.paymentStatus});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final confirmed = paymentStatus == 'CONFIRMED';
    final bg = confirmed ? t.successSoft : t.warningSoft;
    final fg = confirmed ? t.successStrong : t.warningStrong;
    final label = switch (paymentStatus) {
      'PENDING' => l.orderPaymentPending,
      'PAYMENT_RECEIVED' => l.paymentStatusPaymentReceived,
      'CONFIRMED' => l.orderTimelinePaymentConfirmed,
      _ => paymentStatus,
    };
    return Container(
      padding:
          const EdgeInsets.symmetric(horizontal: AppSpacing.s3, vertical: 3),
      decoration: BoxDecoration(color: bg, borderRadius: AppRadii.pill),
      child: Text(
        label,
        style: TextStyle(
          fontSize: AppTextSizes.caption,
          fontWeight: AppFontWeights.semibold,
          color: fg,
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final AppIconName icon;
  final String text;
  const _InfoRow(this.icon, this.text);

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.s2),
      child: Row(
        children: [
          AppIcon(name: icon, size: 16, color: t.text2),
          const SizedBox(width: AppSpacing.s3),
          Expanded(
            child: Text(text,
                style:
                    TextStyle(fontSize: AppTextSizes.sm, color: t.text1)),
          ),
        ],
      ),
    );
  }
}
