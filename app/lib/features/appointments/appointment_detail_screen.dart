import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/appointment.dart';
import '../../shared/utils/format.dart';
import 'appointments_provider.dart';

const _statusColor = {
  'REQUESTED': Color(0xFFD97706),
  'CONFIRMED': Color(0xFF059669),
  'COMPLETED': Color(0xFF1A56DB),
  'CANCELLED': Color(0xFF6B7280),
  'NO_SHOW': Color(0xFFDC2626),
};

class AppointmentDetailScreen extends ConsumerWidget {
  final String appointmentId;
  const AppointmentDetailScreen({super.key, required this.appointmentId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final apptAsync = ref.watch(appointmentDetailProvider(appointmentId));

    return Scaffold(
      appBar: AppBar(title: const Text('Appointment')),
      body: apptAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 12),
              Text(e.toString(), textAlign: TextAlign.center),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () =>
                    ref.invalidate(appointmentDetailProvider(appointmentId)),
                child: const Text('Retry'),
              ),
            ],
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
          SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
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
          SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
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
          SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _savingNotes = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final statusColor = _statusColor[_appt.status] ?? const Color(0xFF6B7280);
    final isTerminal = !_appt.isActive;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ── Status banner ─────────────────────────────────────────
          Container(
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: statusColor.withValues(alpha: 0.3)),
            ),
            child: Row(
              children: [
                Icon(_statusIcon(_appt.status), color: statusColor, size: 20),
                const SizedBox(width: 8),
                Text(
                  _statusLabel(_appt.status),
                  style: TextStyle(
                    color: statusColor,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Spacer(),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: _appt.paymentStatus == 'CONFIRMED'
                        ? const Color(0xFF059669).withValues(alpha: 0.1)
                        : Colors.orange.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    _paymentLabel(_appt.paymentStatus),
                    style: TextStyle(
                      fontSize: 11,
                      color: _appt.paymentStatus == 'CONFIRMED'
                          ? const Color(0xFF059669)
                          : Colors.orange[700],
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // ── Customer ──────────────────────────────────────────────
          _SectionCard(
            title: 'Customer',
            child: Column(
              children: [
                _InfoRow(Icons.person_outline, _appt.customer.name),
                if (_appt.customer.phone != null)
                  _InfoRow(Icons.phone_outlined, _appt.customer.phone!),
                if (_appt.customer.telegramUsername != null)
                  _InfoRow(
                    Icons.telegram,
                    '@${_appt.customer.telegramUsername!}',
                  ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // ── Appointment info ──────────────────────────────────────
          _SectionCard(
            title: 'Appointment',
            child: Column(
              children: [
                _InfoRow(Icons.design_services_outlined, _appt.service.name),
                if (_appt.staff != null)
                  _InfoRow(Icons.badge_outlined, _appt.staff!.name),
                _InfoRow(
                  Icons.calendar_today_outlined,
                  formatDate(_appt.startTime.toLocal()),
                ),
                _InfoRow(
                  Icons.access_time_outlined,
                  '${_timeLabel(_appt.startTime.toLocal())} – ${_timeLabel(_appt.endTime.toLocal())}',
                ),
                _InfoRow(
                  Icons.timer_outlined,
                  '${_appt.service.durationMinutes} min',
                ),
                _InfoRow(Icons.payments_outlined, formatUZS(_appt.price)),
                _InfoRow(
                  Icons.payment_outlined,
                  _appt.paymentType == 'IN_ADVANCE'
                      ? 'Pay in advance'
                      : 'Pay at appointment',
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // ── Notes ─────────────────────────────────────────────────
          _SectionCard(
            title: 'Notes',
            trailing: _editingNotes
                ? null
                : IconButton(
                    icon: const Icon(Icons.edit_outlined, size: 16),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    onPressed: () => setState(() => _editingNotes = true),
                  ),
            child: _editingNotes
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      TextField(
                        controller: _notesController,
                        maxLines: 4,
                        minLines: 2,
                        decoration: const InputDecoration(
                          hintText: 'Add notes…',
                          border: OutlineInputBorder(),
                          contentPadding: EdgeInsets.all(10),
                        ),
                        autofocus: true,
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          TextButton(
                            onPressed: _savingNotes
                                ? null
                                : () {
                                    _notesController.text =
                                        _appt.notes ?? '';
                                    setState(() => _editingNotes = false);
                                  },
                            child: const Text('Cancel'),
                          ),
                          const SizedBox(width: 8),
                          FilledButton(
                            onPressed: _savingNotes ? null : _saveNotes,
                            child: _savingNotes
                                ? const SizedBox(
                                    height: 14,
                                    width: 14,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white),
                                  )
                                : const Text('Save'),
                          ),
                        ],
                      ),
                    ],
                  )
                : Text(
                    (_appt.notes?.isNotEmpty == true)
                        ? _appt.notes!
                        : 'No notes',
                    style: TextStyle(
                      color: (_appt.notes?.isNotEmpty == true)
                          ? Colors.grey[700]
                          : Colors.grey[400],
                    ),
                  ),
          ),

          const SizedBox(height: 24),

          // ── Payment confirm button ────────────────────────────────
          if (_appt.paymentStatus != 'CONFIRMED' && _appt.isActive) ...[
            FilledButton.icon(
              onPressed: _updatingPayment ? null : _confirmPayment,
              icon: _updatingPayment
                  ? const SizedBox(
                      height: 16,
                      width: 16,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.check_circle_outlined),
              label: const Text('Confirm payment received'),
              style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF059669)),
            ),
            const SizedBox(height: 12),
          ],

          // ── Status action buttons ─────────────────────────────────
          if (!isTerminal) ...[
            if (_appt.status == 'REQUESTED') ...[
              _StatusButton(
                label: 'Confirm appointment',
                icon: Icons.event_available_outlined,
                color: const Color(0xFF059669),
                loading: _updatingStatus,
                onPressed: () => _updateStatus('CONFIRMED'),
              ),
              const SizedBox(height: 8),
            ],
            if (_appt.status == 'CONFIRMED') ...[
              _StatusButton(
                label: 'Mark as completed',
                icon: Icons.task_alt_outlined,
                color: const Color(0xFF1A56DB),
                loading: _updatingStatus,
                onPressed: () => _updateStatus('COMPLETED'),
              ),
              const SizedBox(height: 8),
              _StatusButton(
                label: 'Mark as no-show',
                icon: Icons.person_off_outlined,
                color: const Color(0xFFDC2626),
                loading: _updatingStatus,
                onPressed: () => _updateStatus('NO_SHOW'),
              ),
              const SizedBox(height: 8),
            ],
            OutlinedButton.icon(
              onPressed:
                  _updatingStatus ? null : () => _updateStatus('CANCELLED'),
              icon: const Icon(Icons.cancel_outlined,
                  color: Color(0xFF6B7280)),
              label: const Text(
                'Cancel appointment',
                style: TextStyle(color: Color(0xFF6B7280)),
              ),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Color(0xFF6B7280)),
              ),
            ),
          ],

          const SizedBox(height: 16),
        ],
      ),
    );
  }

  String _timeLabel(DateTime dt) =>
      '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';

  IconData _statusIcon(String s) => switch (s) {
        'REQUESTED' => Icons.hourglass_empty_outlined,
        'CONFIRMED' => Icons.event_available_outlined,
        'COMPLETED' => Icons.task_alt_outlined,
        'CANCELLED' => Icons.cancel_outlined,
        'NO_SHOW' => Icons.person_off_outlined,
        _ => Icons.help_outline,
      };

  String _statusLabel(String s) => switch (s) {
        'REQUESTED' => 'Requested',
        'CONFIRMED' => 'Confirmed',
        'COMPLETED' => 'Completed',
        'CANCELLED' => 'Cancelled',
        'NO_SHOW' => 'No-show',
        _ => s,
      };

  String _paymentLabel(String s) => switch (s) {
        'PENDING' => 'Payment pending',
        'PAYMENT_RECEIVED' => 'Payment received',
        'CONFIRMED' => 'Payment confirmed',
        _ => s,
      };
}

class _StatusButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final bool loading;
  final VoidCallback onPressed;

  const _StatusButton({
    required this.label,
    required this.icon,
    required this.color,
    required this.loading,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return FilledButton.icon(
      onPressed: loading ? null : onPressed,
      icon: loading
          ? const SizedBox(
              height: 16,
              width: 16,
              child:
                  CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
            )
          : Icon(icon),
      label: Text(label),
      style: FilledButton.styleFrom(backgroundColor: color),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final Widget child;
  final Widget? trailing;
  const _SectionCard({required this.title, required this.child, this.trailing});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: Colors.grey[500],
                    letterSpacing: 0.5,
                  ),
                ),
                if (trailing != null) ...[
                  const Spacer(),
                  trailing!,
                ],
              ],
            ),
            const SizedBox(height: 10),
            child,
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String text;
  const _InfoRow(this.icon, this.text);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 16, color: Colors.grey[500]),
          const SizedBox(width: 10),
          Expanded(
            child: Text(text, style: const TextStyle(fontSize: 14)),
          ),
        ],
      ),
    );
  }
}
