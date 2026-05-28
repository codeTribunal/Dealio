import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/models/customer.dart';
import '../../core/models/order.dart';
import '../../features/settings/customization_provider.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/utils/format.dart';
import '../../shared/utils/status_labels.dart';
import 'customer_detail_provider.dart';

class CustomerDetailScreen extends ConsumerStatefulWidget {
  final String customerId;
  const CustomerDetailScreen({super.key, required this.customerId});

  @override
  ConsumerState<CustomerDetailScreen> createState() =>
      _CustomerDetailScreenState();
}

class _CustomerDetailScreenState extends ConsumerState<CustomerDetailScreen> {
  final _notesCtrl = TextEditingController();
  bool _notesEditing = false;
  bool _notesSaving = false;
  String _originalNotes = '';

  @override
  void dispose() {
    _notesCtrl.dispose();
    super.dispose();
  }

  void _syncNotes(CustomerDetail c) {
    final notes = c.notes ?? '';
    if (!_notesEditing && _notesCtrl.text != notes) {
      _notesCtrl.text = notes;
      _originalNotes = notes;
    }
  }

  Future<void> _saveNotes() async {
    setState(() => _notesSaving = true);
    try {
      await ref
          .read(customerDetailProvider(widget.customerId).notifier)
          .saveNotes(_notesCtrl.text.trim());
      if (!mounted) return;
      setState(() {
        _notesEditing = false;
        _notesSaving = false;
        _originalNotes = _notesCtrl.text.trim();
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _notesSaving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(AppLocalizations.of(context)!.errorWithMessage(e.toString())), backgroundColor: Colors.red),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final customerAsync =
        ref.watch(customerDetailProvider(widget.customerId));
    final notifier =
        ref.read(customerDetailProvider(widget.customerId).notifier);

    return customerAsync.when(
      loading: () => Scaffold(
        appBar: AppBar(title: Text(l.customerDetailTitle)),
        body: const Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => _ErrorView(customerId: widget.customerId),
      data: (customer) {
        _syncNotes(customer);
        return Scaffold(
          appBar: AppBar(title: Text(customer.name)),
          body: RefreshIndicator(
            onRefresh: notifier.refresh,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _HeaderCard(customer: customer, notifier: notifier),
                const SizedBox(height: 12),
                _StatsRow(customer: customer),
                const SizedBox(height: 12),
                _RemindersCard(customer: customer, notifier: notifier),
                const SizedBox(height: 12),
                _NotesCard(
                  controller: _notesCtrl,
                  editing: _notesEditing,
                  saving: _notesSaving,
                  onEdit: () => setState(() => _notesEditing = true),
                  onCancel: () => setState(() {
                    _notesCtrl.text = _originalNotes;
                    _notesEditing = false;
                  }),
                  onSave: _saveNotes,
                ),
                const SizedBox(height: 12),
                _CustomFieldsCard(customer: customer, notifier: notifier),
                const SizedBox(height: 12),
                _OrderHistorySection(orders: customer.orders),
                const SizedBox(height: 32),
              ],
            ),
          ),
        );
      },
    );
  }
}

// ── Header card ───────────────────────────────────────────────────────

class _HeaderCard extends ConsumerWidget {
  final CustomerDetail customer;
  final CustomerDetailNotifier notifier;
  const _HeaderCard({required this.customer, required this.notifier});

  static const _tagPalette = [
    '#6366F1', '#EC4899', '#F59E0B', '#10B981',
    '#3B82F6', '#EF4444', '#8B5CF6', '#14B8A6',
  ];

  void _showAddTag(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final ctrl = TextEditingController();
    String pickedColor = _tagPalette[0];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.fromLTRB(
              20, 20, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(l.customerAddTag,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              const SizedBox(height: 12),
              TextField(
                controller: ctrl,
                autofocus: true,
                decoration: InputDecoration(
                  hintText: l.customerTagHint,
                  isDense: true,
                ),
                maxLength: 30,
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: _tagPalette.map((hex) {
                  final color = Color(int.parse('FF${hex.replaceFirst('#', '')}', radix: 16));
                  return GestureDetector(
                    onTap: () => setModalState(() => pickedColor = hex),
                    child: Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: color,
                        shape: BoxShape.circle,
                        border: pickedColor == hex
                            ? Border.all(color: Colors.black54, width: 2)
                            : null,
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () async {
                    final label = ctrl.text.trim();
                    if (label.isEmpty) return;
                    Navigator.pop(ctx);
                    try {
                      await notifier.addTag(label, pickedColor);
                    } catch (e) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                              content: Text(AppLocalizations.of(context)!.errorWithMessage(e.toString())),
                              backgroundColor: Colors.red),
                        );
                      }
                    }
                  },
                  child: Text(l.customerAddTag),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _parseColor(String hex) {
    try {
      return Color(int.parse('FF${hex.replaceFirst('#', '')}', radix: 16));
    } catch (_) {
      return const Color(0xFF6366F1);
    }
  }

  void _showChangeStage(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final stages = ref.read(stagesProvider).valueOrNull ?? [];
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
              child: Text(l.customerSetStage,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            ),
            ListTile(
              leading: const Icon(Icons.block_outlined, size: 18, color: Colors.grey),
              title: Text(l.customerNoStage),
              onTap: () async {
                Navigator.pop(ctx);
                try {
                  await notifier.setStage(null);
                } catch (e) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(AppLocalizations.of(context)!.errorWithMessage(e.toString())), backgroundColor: Colors.red),
                    );
                  }
                }
              },
            ),
            ...stages.map((s) {
              final color = _parseColor(s.color);
              return ListTile(
                leading: Container(
                  width: 14,
                  height: 14,
                  decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                ),
                title: Text(s.name),
                selected: customer.currentStage?.id == s.id,
                onTap: () async {
                  Navigator.pop(ctx);
                  try {
                    await notifier.setStage(s.id);
                  } catch (e) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(AppLocalizations.of(context)!.errorWithMessage(e.toString())), backgroundColor: Colors.red),
                      );
                    }
                  }
                },
              );
            }),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    ref.watch(stagesProvider); // keep stage list fresh
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor:
                      Theme.of(context).colorScheme.primaryContainer,
                  child: Text(
                    customer.name.isNotEmpty
                        ? customer.name[0].toUpperCase()
                        : '?',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        customer.name,
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      if (customer.telegramUsername != null)
                        _InfoRow(
                          icon: Icons.telegram,
                          text: '@${customer.telegramUsername}',
                          color: const Color(0xFF229ED9),
                        ),
                      if (customer.phone != null)
                        _InfoRow(
                          icon: Icons.phone_outlined,
                          text: customer.phone!,
                        ),
                      if (customer.birthday != null)
                        _InfoRow(
                          icon: Icons.cake_outlined,
                          text: DateFormat('d MMMM').format(customer.birthday!),
                        ),
                      _InfoRow(
                        icon: Icons.calendar_today_outlined,
                        text: l.customerSince(formatDate(customer.createdAt)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                ...customer.tags.map(
                  (tag) => _TagChip(
                    tag: tag,
                    onRemove: () async {
                      try {
                        await notifier.removeTag(tag.id);
                      } catch (e) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                                content: Text(AppLocalizations.of(context)!.errorWithMessage(e.toString())),
                                backgroundColor: Colors.red),
                          );
                        }
                      }
                    },
                  ),
                ),
                _AddTagChip(onTap: () => _showAddTag(context)),
              ],
            ),
            const SizedBox(height: 10),
            GestureDetector(
              onTap: () => _showChangeStage(context, ref),
              child: customer.currentStage != null
                  ? _StagePill(
                      name: customer.currentStage!.name,
                      color: _parseColor(customer.currentStage!.color),
                    )
                  : Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.add, size: 12, color: Colors.grey[400]),
                        const SizedBox(width: 4),
                        Text(l.customerSetStageShort,
                            style: TextStyle(
                                fontSize: 12, color: Colors.grey[400])),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StagePill extends StatelessWidget {
  final String name;
  final Color color;
  const _StagePill({required this.name, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 5),
          Text(name,
              style: TextStyle(
                  fontSize: 12, fontWeight: FontWeight.w600, color: color)),
        ],
      ),
    );
  }
}

class _TagChip extends StatelessWidget {
  final CustomerTag tag;
  final VoidCallback onRemove;
  const _TagChip({required this.tag, required this.onRemove});

  Color get _color {
    try {
      return Color(
          int.parse('FF${tag.color.replaceFirst('#', '')}', radix: 16));
    } catch (_) {
      return const Color(0xFF6366F1);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = _color;
    return GestureDetector(
      onLongPress: onRemove,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: c.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          tag.label,
          style: TextStyle(
              fontSize: 11, fontWeight: FontWeight.w600, color: c),
        ),
      ),
    );
  }
}

class _AddTagChip extends StatelessWidget {
  final VoidCallback onTap;
  const _AddTagChip({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding:
            const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          border:
              Border.all(color: Colors.grey[300]!, style: BorderStyle.solid),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.add, size: 12, color: Colors.grey[500]),
            const SizedBox(width: 3),
            Text(AppLocalizations.of(context)!.customerAddTag,
                style: TextStyle(fontSize: 11, color: Colors.grey[500])),
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String text;
  final Color? color;
  const _InfoRow({required this.icon, required this.text, this.color});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Row(
        children: [
          Icon(icon, size: 13, color: color ?? Colors.grey[500]),
          const SizedBox(width: 5),
          Expanded(
            child: Text(
              text,
              style: TextStyle(color: Colors.grey[700], fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Stats row ─────────────────────────────────────────────────────────

class _StatsRow extends StatelessWidget {
  final CustomerDetail customer;
  const _StatsRow({required this.customer});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final d = customer.daysSinceLastOrder;
    return Row(
      children: [
        Expanded(
          child: _StatCard(
            label: l.customerStatOrders,
            value: customer.totalOrders.toString(),
            icon: Icons.receipt_long_outlined,
            color: Colors.blue,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _StatCard(
            label: l.customerStatTotalSpent,
            value: formatUZS(customer.totalSpent),
            icon: Icons.payments_outlined,
            color: Colors.green,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _StatCard(
            label: l.customerStatLastOrder,
            value: d < 0 ? '—' : d == 0 ? l.commonToday : l.customerDaysAgo(d),
            icon: Icons.history_outlined,
            color: d > 30 ? Colors.orange : Colors.grey,
          ),
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 18),
            const SizedBox(height: 6),
            FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text(
                value,
                style: Theme.of(context)
                    .textTheme
                    .titleSmall
                    ?.copyWith(fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(color: Colors.grey[600]),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Reminders card ────────────────────────────────────────────────────

class _RemindersCard extends StatelessWidget {
  final CustomerDetail customer;
  final CustomerDetailNotifier notifier;
  const _RemindersCard({required this.customer, required this.notifier});

  void _showAddReminder(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final ctrl = TextEditingController();
    DateTime pickedDate =
        DateTime.now().add(const Duration(days: 1));

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.fromLTRB(
              20, 20, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(l.customerAddReminder,
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 16)),
              const SizedBox(height: 12),
              TextField(
                controller: ctrl,
                autofocus: true,
                decoration: InputDecoration(
                  hintText: l.customerReminderHint,
                  isDense: true,
                ),
                maxLength: 200,
              ),
              const SizedBox(height: 8),
              InkWell(
                onTap: () async {
                  final picked = await showDatePicker(
                    context: ctx,
                    initialDate: pickedDate,
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now()
                        .add(const Duration(days: 365)),
                  );
                  if (picked != null) {
                    setModalState(() => pickedDate = picked);
                  }
                },
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey[300]!),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.calendar_today_outlined,
                          size: 16),
                      const SizedBox(width: 8),
                      Text(DateFormat('d MMM yyyy')
                          .format(pickedDate)),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () async {
                    final note = ctrl.text.trim();
                    if (note.isEmpty) return;
                    Navigator.pop(ctx);
                    try {
                      await notifier.addReminder(note, pickedDate);
                    } catch (e) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                              content: Text(AppLocalizations.of(context)!.errorWithMessage(e.toString())),
                              backgroundColor: Colors.red),
                        );
                      }
                    }
                  },
                  child: Text(l.customerSaveReminder),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final pending = customer.reminders.where((r) => !r.done).toList();
    final done = customer.reminders.where((r) => r.done).toList();

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
                  l.settingsReminders,
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: Colors.grey[600],
                        letterSpacing: 0.5,
                        fontWeight: FontWeight.w600,
                      ),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.add_circle_outline, size: 20),
                  onPressed: () => _showAddReminder(context),
                  tooltip: l.customerAddReminder,
                  visualDensity: VisualDensity.compact,
                ),
              ],
            ),
            if (pending.isEmpty && done.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Text(
                  l.customerNoReminders,
                  style:
                      TextStyle(color: Colors.grey[400], fontSize: 13),
                ),
              ),
            ...pending.map((r) => _ReminderRow(
                  reminder: r,
                  onToggle: (v) => notifier.toggleReminder(r.id, v),
                )),
            if (done.isNotEmpty) ...[
              const Divider(height: 16),
              ...done.map((r) => _ReminderRow(
                    reminder: r,
                    onToggle: (v) => notifier.toggleReminder(r.id, v),
                  )),
            ],
          ],
        ),
      ),
    );
  }
}

class _ReminderRow extends StatelessWidget {
  final Reminder reminder;
  final ValueChanged<bool> onToggle;
  const _ReminderRow({required this.reminder, required this.onToggle});

  @override
  Widget build(BuildContext context) {
    final isOverdue = reminder.isOverdue;
    final isDueToday = reminder.isDueToday;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Checkbox(
            value: reminder.done,
            onChanged: (v) => onToggle(v ?? false),
            visualDensity: VisualDensity.compact,
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(4)),
          ),
          const SizedBox(width: 4),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  reminder.note,
                  style: TextStyle(
                    fontSize: 13,
                    decoration: reminder.done
                        ? TextDecoration.lineThrough
                        : null,
                    color: reminder.done ? Colors.grey[400] : null,
                  ),
                ),
                Text(
                  DateFormat('d MMM yyyy').format(reminder.dueDate),
                  style: TextStyle(
                    fontSize: 11,
                    color: isOverdue
                        ? Colors.red[600]
                        : isDueToday
                            ? Colors.orange[700]
                            : Colors.grey[400],
                    fontWeight: (isOverdue || isDueToday) && !reminder.done
                        ? FontWeight.w600
                        : FontWeight.normal,
                  ),
                ),
              ],
            ),
          ),
          if (isOverdue && !reminder.done)
            const Icon(Icons.alarm, size: 14, color: Colors.red),
        ],
      ),
    );
  }
}

// ── Notes card ────────────────────────────────────────────────────────

class _NotesCard extends StatelessWidget {
  final TextEditingController controller;
  final bool editing;
  final bool saving;
  final VoidCallback onEdit;
  final VoidCallback onCancel;
  final VoidCallback onSave;

  const _NotesCard({
    required this.controller,
    required this.editing,
    required this.saving,
    required this.onEdit,
    required this.onCancel,
    required this.onSave,
  });

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
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
                  l.customerNotesLabel,
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: Colors.grey[600],
                        letterSpacing: 0.5,
                        fontWeight: FontWeight.w600,
                      ),
                ),
                const Spacer(),
                if (!editing)
                  IconButton(
                    icon: const Icon(Icons.edit_outlined, size: 18),
                    onPressed: onEdit,
                    visualDensity: VisualDensity.compact,
                  ),
              ],
            ),
            const SizedBox(height: 8),
            if (editing)
              TextField(
                controller: controller,
                maxLines: 4,
                autofocus: true,
                decoration: InputDecoration(
                  hintText: l.customerNotesHint,
                  isDense: true,
                ),
              )
            else
              Text(
                controller.text.isEmpty
                    ? l.customerNoNotes
                    : controller.text,
                style: TextStyle(
                  color: controller.text.isEmpty
                      ? Colors.grey[400]
                      : Colors.grey[800],
                  fontSize: 14,
                ),
              ),
            if (editing) ...[
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: saving ? null : onCancel,
                    child: Text(l.buttonCancel),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(
                    onPressed: saving ? null : onSave,
                    child: saving
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child:
                                CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(l.buttonSave),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ── Custom fields card (typed, from BusinessCustomField definitions) ──

class _CustomFieldsCard extends ConsumerStatefulWidget {
  final CustomerDetail customer;
  final CustomerDetailNotifier notifier;
  const _CustomFieldsCard({required this.customer, required this.notifier});

  @override
  ConsumerState<_CustomFieldsCard> createState() => _CustomFieldsCardState();
}

class _CustomFieldsCardState extends ConsumerState<_CustomFieldsCard> {
  // fieldId → editing controller (for TEXT/NUMBER)
  final Map<String, TextEditingController> _ctrls = {};
  final Map<String, bool> _editing = {};

  @override
  void dispose() {
    for (final c in _ctrls.values) {
      c.dispose();
    }
    super.dispose();
  }

  TextEditingController _ctrl(String fieldId, String currentValue) {
    return _ctrls.putIfAbsent(
        fieldId, () => TextEditingController(text: currentValue));
  }

  Future<void> _save(String fieldId, String value) async {
    try {
      await widget.notifier.setFieldValues({fieldId: value});
      if (mounted) setState(() => _editing[fieldId] = false);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(AppLocalizations.of(context)!.errorWithMessage(e.toString())), backgroundColor: Colors.red),
        );
      }
    }
  }

  String _currentValue(String fieldId) {
    return widget.customer.fieldValues
            .where((fv) => fv.fieldId == fieldId)
            .map((fv) => fv.value)
            .firstOrNull ??
        '';
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final fieldsAsync = ref.watch(customFieldsProvider);

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              l.customerCustomFields,
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: Colors.grey[600],
                    letterSpacing: 0.5,
                    fontWeight: FontWeight.w600,
                  ),
            ),
            fieldsAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 8),
                child: LinearProgressIndicator(),
              ),
              error: (e, _) => Text(l.errorWithMessage(e.toString()),
                  style: const TextStyle(color: Colors.red, fontSize: 12)),
              data: (fields) {
                if (fields.isEmpty) {
                  return Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(
                      l.customerNoCustomFields,
                      style: TextStyle(color: Colors.grey[400], fontSize: 13),
                    ),
                  );
                }
                return Column(
                  children: fields.map((field) {
                    final value = _currentValue(field.id);
                    final isEditing = _editing[field.id] ?? false;

                    return Padding(
                      padding: const EdgeInsets.only(top: 10),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(field.name,
                              style: TextStyle(
                                  color: Colors.grey[600], fontSize: 12)),
                          const SizedBox(height: 4),
                          _FieldValueEditor(
                            field: field,
                            value: value,
                            isEditing: isEditing,
                            ctrl: _ctrl(field.id, value),
                            onEdit: () => setState(() {
                              _ctrls[field.id]?.text = value;
                              _editing[field.id] = true;
                            }),
                            onCancel: () =>
                                setState(() => _editing[field.id] = false),
                            onSave: (v) => _save(field.id, v),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _FieldValueEditor extends StatelessWidget {
  final BusinessCustomField field;
  final String value;
  final bool isEditing;
  final TextEditingController ctrl;
  final VoidCallback onEdit;
  final VoidCallback onCancel;
  final ValueChanged<String> onSave;

  const _FieldValueEditor({
    required this.field,
    required this.value,
    required this.isEditing,
    required this.ctrl,
    required this.onEdit,
    required this.onCancel,
    required this.onSave,
  });

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    if (field.fieldType == 'YESNO') {
      final isBool = value == 'true';
      return Row(
        children: [
          Switch(
            value: isBool,
            onChanged: (v) => onSave(v.toString()),
          ),
          Text(isBool ? l.commonYes : l.commonNo,
              style: const TextStyle(fontSize: 13)),
        ],
      );
    }

    if (field.fieldType == 'DATE') {
      final displayDate = value.isNotEmpty
          ? () {
              try {
                return DateFormat('d MMM yyyy').format(DateTime.parse(value));
              } catch (_) {
                return value;
              }
            }()
          : '—';
      return InkWell(
        borderRadius: BorderRadius.circular(6),
        onTap: () async {
          final picked = await showDatePicker(
            context: context,
            initialDate: value.isNotEmpty
                ? DateTime.tryParse(value) ?? DateTime.now()
                : DateTime.now(),
            firstDate: DateTime(1900),
            lastDate: DateTime(2100),
          );
          if (picked != null) {
            onSave(picked.toIso8601String().substring(0, 10));
          }
        },
        child: Row(
          children: [
            Text(displayDate,
                style: TextStyle(
                    fontSize: 14,
                    color: value.isEmpty ? Colors.grey[400] : null)),
            const SizedBox(width: 6),
            Icon(Icons.edit_calendar_outlined,
                size: 14, color: Colors.grey[400]),
          ],
        ),
      );
    }

    // TEXT or NUMBER
    if (isEditing) {
      return Row(
        children: [
          Expanded(
            child: TextField(
              controller: ctrl,
              autofocus: true,
              keyboardType: field.fieldType == 'NUMBER'
                  ? TextInputType.number
                  : TextInputType.text,
              decoration: const InputDecoration(isDense: true),
              onSubmitted: onSave,
            ),
          ),
          IconButton(
            icon: const Icon(Icons.check, size: 18, color: Colors.green),
            visualDensity: VisualDensity.compact,
            onPressed: () => onSave(ctrl.text.trim()),
          ),
          IconButton(
            icon: const Icon(Icons.close, size: 18),
            visualDensity: VisualDensity.compact,
            onPressed: onCancel,
          ),
        ],
      );
    }

    return InkWell(
      borderRadius: BorderRadius.circular(6),
      onTap: onEdit,
      child: Row(
        children: [
          Text(
            value.isEmpty ? l.customerTapToSet : value,
            style: TextStyle(
              fontSize: 14,
              color: value.isEmpty ? Colors.grey[400] : null,
            ),
          ),
          const SizedBox(width: 6),
          Icon(Icons.edit_outlined, size: 13, color: Colors.grey[400]),
        ],
      ),
    );
  }
}

// ── Order history ─────────────────────────────────────────────────────

class _OrderHistorySection extends StatelessWidget {
  final List<Order> orders;
  const _OrderHistorySection({required this.orders});

  static const _statusColor = {
    'NEW': Color(0xFF1A56DB),
    'PREPARING': Color(0xFFD97706),
    'READY': Color(0xFF059669),
    'DELIVERED': Color(0xFF6B7280),
    'CANCELLED': Color(0xFFDC2626),
  };

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
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
                  l.customerOrderHistory,
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: Colors.grey[600],
                        letterSpacing: 0.5,
                        fontWeight: FontWeight.w600,
                      ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.primaryContainer,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    orders.length.toString(),
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                ),
              ],
            ),
            if (orders.isEmpty) ...[
              const SizedBox(height: 16),
              Center(
                child: Text(
                  l.ordersEmpty,
                  style: TextStyle(color: Colors.grey[400]),
                ),
              ),
            ] else ...[
              const SizedBox(height: 8),
              ...orders.map(
                (o) => _OrderRow(
                  order: o,
                  statusColor: _statusColor[o.orderStatus] ??
                      const Color(0xFF6B7280),
                  statusLabel: orderStatusLabel(l, o.orderStatus),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _OrderRow extends StatelessWidget {
  final Order order;
  final Color statusColor;
  final String statusLabel;
  const _OrderRow({
    required this.order,
    required this.statusColor,
    required this.statusLabel,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => context.push('/orders/${order.id}'),
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: statusColor.withValues(alpha: 0.1),
              ),
              child: Center(
                child: Text(
                  '#${order.orderNumber}',
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                    color: statusColor,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    order.items
                        .map((i) => '${i.productName} ×${i.quantity}')
                        .join(', '),
                    style: const TextStyle(fontSize: 13),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    formatDateTime(order.createdAt),
                    style: TextStyle(
                        color: Colors.grey[500], fontSize: 11),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  formatUZS(order.total),
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 12),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    statusLabel,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: statusColor,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ── Error view ────────────────────────────────────────────────────────

class _ErrorView extends ConsumerWidget {
  final String customerId;
  const _ErrorView({required this.customerId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(title: Text(l.customerDetailTitle)),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.wifi_off_outlined, size: 64, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            Text(
              l.customerLoadError,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              l.customerLoadErrorHint,
              style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => ref.invalidate(customerDetailProvider(customerId)),
              child: Text(l.buttonRetry),
            ),
          ],
        ),
      ),
    );
  }
}
