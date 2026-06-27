import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/icons/app_icon.dart';
import '../../core/models/customer.dart';
import '../../core/theme/app_tokens.dart';
import '../../features/settings/customization_provider.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/utils/format.dart';
import '../../shared/widgets/app_avatar.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_card.dart';
import '../../shared/widgets/app_dialog.dart';
import '../../shared/widgets/app_spinner.dart';
import '../../shared/widgets/app_checkbox.dart';
import '../../shared/widgets/app_switch.dart';
import 'customer_detail_provider.dart';
import 'customers_provider.dart';

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
        SnackBar(
            content: Text(
                AppLocalizations.of(context)!.errorWithMessage(e.toString())),
            backgroundColor: AppTokens.of(context).error),
      );
    }
  }

  Future<void> _confirmDelete() async {
    final l = AppLocalizations.of(context)!;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AppDialog(
        title: l.deleteCustomerTitle,
        content: Text(l.deleteCustomerBody),
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
    if (confirmed != true || !mounted) return;
    try {
      await ref.read(customersProvider.notifier).delete(widget.customerId);
      if (mounted) context.go('/customers');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(e.toString()),
              backgroundColor: AppTokens.of(context).error),
        );
      }
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
        body: const Center(child: AppSpinner(size: 32)),
      ),
      error: (e, _) => _ErrorView(customerId: widget.customerId),
      data: (customer) {
        _syncNotes(customer);
        final t = AppTokens.of(context);
        return Scaffold(
          appBar: AppBar(
            title: Text(customer.name),
            actions: [
              TextButton(
                onPressed: _confirmDelete,
                style: TextButton.styleFrom(foregroundColor: t.errorStrong),
                child: Text(l.buttonDelete),
              ),
            ],
          ),
          body: RefreshIndicator(
            color: t.accent,
            onRefresh: notifier.refresh,
            child: ListView(
              padding: const EdgeInsets.all(AppSpacing.s4),
              children: [
                _HeaderCard(customer: customer, notifier: notifier),
                const SizedBox(height: AppSpacing.s3),
                _StatsRow(customer: customer),
                const SizedBox(height: AppSpacing.s3),
                _RemindersCard(customer: customer, notifier: notifier),
                const SizedBox(height: AppSpacing.s3),
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
                const SizedBox(height: AppSpacing.s3),
                _CustomFieldsCard(customer: customer, notifier: notifier),
                const SizedBox(height: AppSpacing.s6),
              ],
            ),
          ),
        );
      },
    );
  }
}

// ── Helpers ───────────────────────────────────────────────────────────

Color _parseHex(BuildContext context, String hex) {
  try {
    return Color(int.parse('FF${hex.replaceFirst('#', '')}', radix: 16));
  } catch (_) {
    return AppTokens.of(context).accent;
  }
}

// ── Header card ───────────────────────────────────────────────────────

class _HeaderCard extends ConsumerWidget {
  final CustomerDetail customer;
  final CustomerDetailNotifier notifier;
  const _HeaderCard({required this.customer, required this.notifier});

  static const _tagPalette = [
    '#6366F1', '#EC4899', '#F59E0B', '#10B981',
    '#3C83F6', '#EF4444', '#8B5CF6', '#14B8A6',
  ];

  void _showAddTag(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final ctrl = TextEditingController();
    String pickedColor = _tagPalette[0];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: t.surface,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.fromLTRB(AppSpacing.s5, AppSpacing.s5,
              AppSpacing.s5, MediaQuery.of(ctx).viewInsets.bottom + AppSpacing.s5),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(l.customerAddTag,
                  style: TextStyle(
                      fontWeight: AppFontWeights.bold,
                      fontSize: AppTextSizes.base,
                      color: t.text1)),
              const SizedBox(height: AppSpacing.s3),
              TextField(
                controller: ctrl,
                autofocus: true,
                style: TextStyle(color: t.text1),
                decoration: InputDecoration(
                  hintText: l.customerTagHint,
                  isDense: true,
                ),
                maxLength: 30,
              ),
              const SizedBox(height: AppSpacing.s2),
              Wrap(
                spacing: AppSpacing.s2,
                children: _tagPalette.map((hex) {
                  final color = _parseHex(ctx, hex);
                  return GestureDetector(
                    onTap: () => setModalState(() => pickedColor = hex),
                    child: Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: color,
                        shape: BoxShape.circle,
                        border: pickedColor == hex
                            ? Border.all(color: t.text1, width: 2)
                            : null,
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: AppSpacing.s4),
              AppButton(
                label: l.customerAddTag,
                fullWidth: true,
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
                            content: Text(AppLocalizations.of(context)!
                                .errorWithMessage(e.toString())),
                            backgroundColor: t.error),
                      );
                    }
                  }
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showChangeStage(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final stages = ref.read(stagesProvider).valueOrNull ?? [];
    showModalBottomSheet(
      context: context,
      backgroundColor: t.surface,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(AppSpacing.s5, AppSpacing.s5,
                  AppSpacing.s5, AppSpacing.s2),
              child: Text(l.customerSetStage,
                  style: TextStyle(
                      fontWeight: AppFontWeights.bold,
                      fontSize: AppTextSizes.base,
                      color: t.text1)),
            ),
            ListTile(
              leading: AppIcon(name: AppIconName.close, size: 18, color: t.text3),
              title: Text(l.customerNoStage, style: TextStyle(color: t.text1)),
              onTap: () async {
                Navigator.pop(ctx);
                try {
                  await notifier.setStage(null);
                } catch (e) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                          content: Text(AppLocalizations.of(context)!
                              .errorWithMessage(e.toString())),
                          backgroundColor: t.error),
                    );
                  }
                }
              },
            ),
            ...stages.map((s) {
              final color = _parseHex(ctx, s.color);
              return ListTile(
                leading: Container(
                  width: 14,
                  height: 14,
                  decoration:
                      BoxDecoration(color: color, shape: BoxShape.circle),
                ),
                title: Text(s.name, style: TextStyle(color: t.text1)),
                selected: customer.currentStage?.id == s.id,
                onTap: () async {
                  Navigator.pop(ctx);
                  try {
                    await notifier.setStage(s.id);
                  } catch (e) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                            content: Text(AppLocalizations.of(context)!
                                .errorWithMessage(e.toString())),
                            backgroundColor: t.error),
                      );
                    }
                  }
                },
              );
            }),
            const SizedBox(height: AppSpacing.s2),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    ref.watch(stagesProvider); // keep stage list fresh
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AppAvatar(name: customer.name, size: AppAvatarSize.lg),
              const SizedBox(width: AppSpacing.s4),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      customer.name,
                      style: TextStyle(
                          fontWeight: AppFontWeights.bold,
                          fontSize: AppTextSizes.base,
                          color: t.text1),
                    ),
                    if (customer.telegramUsername != null)
                      _InfoRow(
                        icon: AppIconName.inbox,
                        text: '@${customer.telegramUsername}',
                        color: t.accent,
                      ),
                    if (customer.phone != null)
                      _InfoRow(
                        icon: AppIconName.customers,
                        text: customer.phone!,
                      ),
                    if (customer.birthday != null)
                      _InfoRow(
                        icon: AppIconName.calendar,
                        text: DateFormat('d MMMM').format(customer.birthday!),
                      ),
                    _InfoRow(
                      icon: AppIconName.calendar,
                      text: l.customerSince(formatDate(customer.createdAt)),
                      color: t.text3,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.s3),
          Wrap(
            spacing: AppSpacing.s2,
            runSpacing: AppSpacing.s2,
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
                              content: Text(AppLocalizations.of(context)!
                                  .errorWithMessage(e.toString())),
                              backgroundColor: t.error),
                        );
                      }
                    }
                  },
                ),
              ),
              _AddTagChip(onTap: () => _showAddTag(context)),
            ],
          ),
          const SizedBox(height: AppSpacing.s3),
          GestureDetector(
            onTap: () => _showChangeStage(context, ref),
            child: customer.currentStage != null
                ? _StagePill(
                    name: customer.currentStage!.name,
                    color: _parseHex(context, customer.currentStage!.color),
                  )
                : Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      AppIcon(name: AppIconName.add, size: 14, color: t.text3),
                      const SizedBox(width: AppSpacing.s1),
                      Text(l.customerSetStageShort,
                          style: TextStyle(
                              fontSize: AppTextSizes.caption, color: t.text3)),
                    ],
                  ),
          ),
        ],
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
      padding:
          const EdgeInsets.symmetric(horizontal: AppSpacing.s3, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: AppRadii.pill,
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
          const SizedBox(width: AppSpacing.s1),
          Text(name,
              style: TextStyle(
                  fontSize: AppTextSizes.caption,
                  fontWeight: AppFontWeights.semibold,
                  color: color)),
        ],
      ),
    );
  }
}

class _TagChip extends StatelessWidget {
  final CustomerTag tag;
  final VoidCallback onRemove;
  const _TagChip({required this.tag, required this.onRemove});

  @override
  Widget build(BuildContext context) {
    final c = _parseHex(context, tag.color);
    return GestureDetector(
      onLongPress: onRemove,
      child: Container(
        padding:
            const EdgeInsets.symmetric(horizontal: AppSpacing.s3, vertical: 5),
        decoration: BoxDecoration(
          color: c.withValues(alpha: 0.12),
          borderRadius: AppRadii.pill,
        ),
        child: Text(
          tag.label,
          style: TextStyle(
              fontSize: AppTextSizes.caption,
              fontWeight: AppFontWeights.semibold,
              color: c),
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
    final t = AppTokens.of(context);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding:
            const EdgeInsets.symmetric(horizontal: AppSpacing.s3, vertical: 5),
        decoration: BoxDecoration(
          border: Border.all(color: t.border),
          borderRadius: AppRadii.pill,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppIcon(name: AppIconName.add, size: 12, color: t.text2),
            const SizedBox(width: AppSpacing.s1),
            Text(AppLocalizations.of(context)!.customerAddTag,
                style: TextStyle(
                    fontSize: AppTextSizes.caption, color: t.text2)),
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final AppIconName icon;
  final String text;
  final Color? color;
  const _InfoRow({required this.icon, required this.text, this.color});

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return Padding(
      padding: const EdgeInsets.only(top: AppSpacing.s1),
      child: Row(
        children: [
          AppIcon(name: icon, size: 14, color: color ?? t.text3),
          const SizedBox(width: AppSpacing.s1),
          Expanded(
            child: Text(
              text,
              style: TextStyle(color: t.text2, fontSize: AppTextSizes.sm),
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
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: _StatCard(
            label: l.customerStatOrders,
            value: customer.totalOrders.toString(),
            muted: customer.totalOrders == 0,
          ),
        ),
        const SizedBox(width: AppSpacing.s3),
        Expanded(
          child: _StatCard(
            label: l.customerStatTotalSpent,
            value: formatUZS(customer.totalSpent),
            money: true,
            muted: customer.totalSpent == 0,
          ),
        ),
        const SizedBox(width: AppSpacing.s3),
        Expanded(
          child: _StatCard(
            label: l.customerStatLastOrder,
            value: d < 0
                ? '—'
                : d == 0
                    ? l.commonToday
                    : l.customerDaysAgo(d),
            muted: d < 0,
          ),
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final bool money;
  // A zero/absent value: rendered in the muted color so all three "no data
  // yet" cells (0, 0 so'm, —) share one consistent empty-state treatment and a
  // zero amount never reads as positive (green) money.
  final bool muted;
  const _StatCard({
    required this.label,
    required this.value,
    this.money = false,
    this.muted = false,
  });

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    final valueColor =
        muted ? t.text3 : (money ? t.successStrong : t.text1);
    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.s3),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: TextStyle(
                fontSize: AppTextSizes.lg,
                fontWeight: AppFontWeights.bold,
                color: valueColor,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.s1),
          Text(
            label,
            style:
                TextStyle(color: t.text2, fontSize: AppTextSizes.caption),
          ),
        ],
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
    final t = AppTokens.of(context);
    final ctrl = TextEditingController();
    DateTime pickedDate = DateTime.now().add(const Duration(days: 1));

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: t.surface,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.fromLTRB(AppSpacing.s5, AppSpacing.s5,
              AppSpacing.s5, MediaQuery.of(ctx).viewInsets.bottom + AppSpacing.s5),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(l.customerAddReminder,
                  style: TextStyle(
                      fontWeight: AppFontWeights.bold,
                      fontSize: AppTextSizes.base,
                      color: t.text1)),
              const SizedBox(height: AppSpacing.s3),
              TextField(
                controller: ctrl,
                autofocus: true,
                style: TextStyle(color: t.text1),
                decoration: InputDecoration(
                  hintText: l.customerReminderHint,
                  isDense: true,
                ),
                maxLength: 200,
              ),
              const SizedBox(height: AppSpacing.s2),
              InkWell(
                onTap: () async {
                  final picked = await showDatePicker(
                    context: ctx,
                    initialDate: pickedDate,
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 365)),
                  );
                  if (picked != null) {
                    setModalState(() => pickedDate = picked);
                  }
                },
                borderRadius: AppRadii.sm,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.s3, vertical: AppSpacing.s3),
                  decoration: BoxDecoration(
                    border: Border.all(color: t.border),
                    borderRadius: AppRadii.sm,
                  ),
                  child: Row(
                    children: [
                      AppIcon(
                          name: AppIconName.calendar, size: 16, color: t.text2),
                      const SizedBox(width: AppSpacing.s2),
                      Text(DateFormat('d MMM yyyy').format(pickedDate),
                          style: TextStyle(color: t.text1)),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.s4),
              AppButton(
                label: l.customerSaveReminder,
                fullWidth: true,
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
                            content: Text(AppLocalizations.of(context)!
                                .errorWithMessage(e.toString())),
                            backgroundColor: t.error),
                      );
                    }
                  }
                },
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
    final t = AppTokens.of(context);

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppCardHeader(
            title: l.settingsReminders,
            trailing: IconButton(
              icon: AppIcon(name: AppIconName.add, size: 20, color: t.accent),
              onPressed: () => _showAddReminder(context),
              tooltip: l.customerAddReminder,
              visualDensity: VisualDensity.compact,
            ),
          ),
          if (pending.isEmpty && done.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: AppSpacing.s2),
              child: Text(
                l.customerNoReminders,
                style:
                    TextStyle(color: t.text3, fontSize: AppTextSizes.sm),
              ),
            ),
          ...pending.map((r) => _ReminderRow(
                reminder: r,
                onToggle: (v) => notifier.toggleReminder(r.id, v),
              )),
          if (done.isNotEmpty) ...[
            const Divider(height: AppSpacing.s4),
            ...done.map((r) => _ReminderRow(
                  reminder: r,
                  onToggle: (v) => notifier.toggleReminder(r.id, v),
                )),
          ],
        ],
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
    final t = AppTokens.of(context);
    final isOverdue = reminder.isOverdue;
    final isDueToday = reminder.isDueToday;
    final dateColor = isOverdue
        ? t.errorStrong
        : isDueToday
            ? t.warningStrong
            : t.text3;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.s1),
      child: Row(
        children: [
          AppCheckbox(
            value: reminder.done,
            onChanged: (v) => onToggle(v),
          ),
          const SizedBox(width: AppSpacing.s1),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  reminder.note,
                  style: TextStyle(
                    fontSize: AppTextSizes.sm,
                    decoration:
                        reminder.done ? TextDecoration.lineThrough : null,
                    color: reminder.done ? t.text3 : t.text1,
                  ),
                ),
                Text(
                  DateFormat('d MMM yyyy').format(reminder.dueDate),
                  style: TextStyle(
                    fontSize: AppTextSizes.caption,
                    color: dateColor,
                    fontWeight: (isOverdue || isDueToday) && !reminder.done
                        ? AppFontWeights.semibold
                        : AppFontWeights.regular,
                  ),
                ),
              ],
            ),
          ),
          if (isOverdue && !reminder.done)
            AppIcon(name: AppIconName.bell, size: 14, color: t.errorStrong),
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
    final t = AppTokens.of(context);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppCardHeader(
            title: l.customerNotesLabel,
            trailing: !editing
                ? IconButton(
                    icon: AppIcon(
                        name: AppIconName.settings, size: 18, color: t.text2),
                    onPressed: onEdit,
                    visualDensity: VisualDensity.compact,
                  )
                : null,
          ),
          const SizedBox(height: AppSpacing.s2),
          if (editing)
            TextField(
              controller: controller,
              maxLines: 4,
              autofocus: true,
              style: TextStyle(color: t.text1),
              decoration: InputDecoration(
                hintText: l.customerNotesHint,
                isDense: true,
              ),
            )
          else
            Text(
              controller.text.isEmpty ? l.customerNoNotes : controller.text,
              style: TextStyle(
                color: controller.text.isEmpty ? t.text3 : t.text1,
                fontSize: AppTextSizes.sm,
              ),
            ),
          if (editing) ...[
            const SizedBox(height: AppSpacing.s3),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                AppButton(
                  label: l.buttonCancel,
                  variant: AppButtonVariant.ghost,
                  size: AppButtonSize.sm,
                  onPressed: saving ? null : onCancel,
                ),
                const SizedBox(width: AppSpacing.s2),
                AppButton(
                  label: l.buttonSave,
                  variant: AppButtonVariant.secondary,
                  size: AppButtonSize.sm,
                  loading: saving,
                  onPressed: saving ? null : onSave,
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

// ── Custom fields card ────────────────────────────────────────────────

class _CustomFieldsCard extends ConsumerStatefulWidget {
  final CustomerDetail customer;
  final CustomerDetailNotifier notifier;
  const _CustomFieldsCard({required this.customer, required this.notifier});

  @override
  ConsumerState<_CustomFieldsCard> createState() => _CustomFieldsCardState();
}

class _CustomFieldsCardState extends ConsumerState<_CustomFieldsCard> {
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
          SnackBar(
              content: Text(AppLocalizations.of(context)!
                  .errorWithMessage(e.toString())),
              backgroundColor: AppTokens.of(context).error),
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
    final t = AppTokens.of(context);
    final fieldsAsync = ref.watch(customFieldsProvider);

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppCardHeader(title: l.customerCustomFields),
          fieldsAsync.when(
            loading: () => const Padding(
              padding: EdgeInsets.symmetric(vertical: AppSpacing.s2),
              child: LinearProgressIndicator(),
            ),
            error: (e, _) => Text(l.errorWithMessage(e.toString()),
                style: TextStyle(color: t.errorStrong, fontSize: AppTextSizes.caption)),
            data: (fields) {
              if (fields.isEmpty) {
                return Padding(
                  padding: const EdgeInsets.only(top: AppSpacing.s2),
                  child: Text(
                    l.customerNoCustomFields,
                    style:
                        TextStyle(color: t.text3, fontSize: AppTextSizes.sm),
                  ),
                );
              }
              return Column(
                children: fields.map((field) {
                  final value = _currentValue(field.id);
                  final isEditing = _editing[field.id] ?? false;

                  return Padding(
                    padding: const EdgeInsets.only(top: AppSpacing.s3),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(field.name,
                            style: TextStyle(
                                color: t.text2,
                                fontSize: AppTextSizes.caption)),
                        const SizedBox(height: AppSpacing.s1),
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
    final t = AppTokens.of(context);
    if (field.fieldType == 'YESNO') {
      final isBool = value == 'true';
      return Row(
        children: [
          AppSwitch(
            value: isBool,
            onChanged: (v) => onSave(v.toString()),
          ),
          Text(isBool ? l.commonYes : l.commonNo,
              style: TextStyle(fontSize: AppTextSizes.sm, color: t.text1)),
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
        borderRadius: AppRadii.sm,
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
                    fontSize: AppTextSizes.sm,
                    color: value.isEmpty ? t.text3 : t.text1)),
            const SizedBox(width: AppSpacing.s1),
            AppIcon(name: AppIconName.calendar, size: 14, color: t.text3),
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
              style: TextStyle(color: t.text1),
              keyboardType: field.fieldType == 'NUMBER'
                  ? TextInputType.number
                  : TextInputType.text,
              decoration: const InputDecoration(isDense: true),
              onSubmitted: onSave,
            ),
          ),
          IconButton(
            icon: AppIcon(
                name: AppIconName.paid, size: 18, color: t.successStrong),
            visualDensity: VisualDensity.compact,
            onPressed: () => onSave(ctrl.text.trim()),
          ),
          IconButton(
            icon: AppIcon(name: AppIconName.close, size: 18, color: t.text2),
            visualDensity: VisualDensity.compact,
            onPressed: onCancel,
          ),
        ],
      );
    }

    return InkWell(
      borderRadius: AppRadii.sm,
      onTap: onEdit,
      child: Row(
        children: [
          Text(
            value.isEmpty ? l.customerTapToSet : value,
            style: TextStyle(
              fontSize: AppTextSizes.sm,
              color: value.isEmpty ? t.text3 : t.text1,
            ),
          ),
          const SizedBox(width: AppSpacing.s1),
          AppIcon(name: AppIconName.settings, size: 13, color: t.text3),
        ],
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
    final t = AppTokens.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l.customerDetailTitle)),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.s5),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AppIcon(name: AppIconName.close, size: 64, color: t.text3),
              const SizedBox(height: AppSpacing.s4),
              Text(
                l.customerLoadError,
                style: TextStyle(
                    fontSize: AppTextSizes.lg,
                    fontWeight: AppFontWeights.bold,
                    color: t.text1),
              ),
              const SizedBox(height: AppSpacing.s2),
              Text(
                l.customerLoadErrorHint,
                style: TextStyle(fontSize: AppTextSizes.sm, color: t.text2),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.s5),
              AppButton(
                label: l.buttonRetry,
                onPressed: () =>
                    ref.invalidate(customerDetailProvider(customerId)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
