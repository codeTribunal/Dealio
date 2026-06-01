import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/icons/app_icon.dart';
import '../../core/theme/app_tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/utils/format.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_card.dart';
import '../services/services_provider.dart';
import 'staff_provider.dart';

class StaffFormScreen extends ConsumerStatefulWidget {
  final String? staffId;
  const StaffFormScreen({super.key, this.staffId});

  @override
  ConsumerState<StaffFormScreen> createState() => _StaffFormScreenState();
}

class _StaffFormScreenState extends ConsumerState<StaffFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameCtrl;
  late final TextEditingController _telegramCtrl;
  final Set<String> _selectedServiceIds = {};
  // Whole-day offs as date-only 'YYYY-MM-DD' strings.
  final Set<String> _daysOff = {};
  bool _saving = false;
  bool _servicesError = false;

  bool get _isEdit => widget.staffId != null;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController();
    _telegramCtrl = TextEditingController();

    if (widget.staffId != null) {
      final staff = ref.read(staffProvider).valueOrNull;
      if (staff != null) {
        final idx = staff.indexWhere((s) => s.id == widget.staffId);
        if (idx >= 0) {
          final member = staff[idx];
          _nameCtrl.text = member.name;
          _telegramCtrl.text = member.telegramHandle ?? '';
          _selectedServiceIds.addAll(member.services.map((s) => s.id));
          // daysOff arrive as ISO datetimes (UTC midnight) — keep date-only.
          _daysOff.addAll(member.daysOff.map((d) => d.split('T').first));
        }
      }
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _telegramCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final formValid = _formKey.currentState!.validate();
    final hasServices = _selectedServiceIds.isNotEmpty;

    if (!hasServices) setState(() => _servicesError = true);
    if (!formValid || !hasServices) return;

    setState(() => _saving = true);

    final name = _nameCtrl.text.trim();
    final telegram = _telegramCtrl.text.trim().replaceAll('@', '');
    final serviceIds = _selectedServiceIds.toList();
    final daysOff = _daysOff.toList()..sort();

    try {
      if (_isEdit) {
        await ref.read(staffProvider.notifier).updateStaff(
              widget.staffId!,
              name,
              telegram.isNotEmpty ? telegram : null,
              serviceIds,
              daysOff: daysOff,
            );
      } else {
        await ref.read(staffProvider.notifier).createStaff(
              name,
              telegram.isNotEmpty ? telegram : null,
              serviceIds,
              daysOff: daysOff,
            );
      }
      if (mounted) context.pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(e.toString()),
              backgroundColor: AppTokens.of(context).error),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _addDayOff() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: now,
      firstDate: DateTime(now.year, now.month, now.day),
      lastDate: DateTime(now.year + 2),
    );
    if (picked == null) return;
    // Store date-only (YYYY-MM-DD); the backend coerces to a date.
    final iso =
        '${picked.year.toString().padLeft(4, '0')}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
    setState(() => _daysOff.add(iso));
  }

  Future<void> _confirmDelete() async {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final name = _nameCtrl.text.trim().isNotEmpty
        ? _nameCtrl.text.trim()
        : l.staffThisMember;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: t.surface,
        title: Text(l.staffDeleteTitle(name), style: TextStyle(color: t.text1)),
        content: Text(l.staffDeleteConfirm, style: TextStyle(color: t.text2)),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text(l.buttonCancel, style: TextStyle(color: t.text2)),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text(l.buttonDelete, style: TextStyle(color: t.errorStrong)),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    try {
      await ref.read(staffProvider.notifier).deleteStaff(widget.staffId!);
      if (mounted) context.go('/staff');
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
    final t = AppTokens.of(context);
    final servicesAsync = ref.watch(servicesProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(_isEdit ? l.staffFormEditTitle : l.staffFormNewTitle),
        actions: [
          if (_isEdit)
            TextButton(
              onPressed: _saving ? null : _confirmDelete,
              style: TextButton.styleFrom(foregroundColor: t.errorStrong),
              child: Text(l.buttonDelete),
            ),
          TextButton(
            onPressed: _saving ? null : _save,
            child: Text(l.buttonSave),
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.s4),
          children: [
            // ── Identity card ─────────────────────────────────────
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _FieldLabel(l.staffFormNameLabel),
                  TextFormField(
                    controller: _nameCtrl,
                    style: TextStyle(color: t.text1),
                    decoration: _decoration(context),
                    validator: (v) => (v == null || v.trim().isEmpty)
                        ? l.formRequired
                        : null,
                  ),
                  const SizedBox(height: AppSpacing.s4),
                  _FieldLabel(l.staffFormTelegramLabel),
                  TextFormField(
                    controller: _telegramCtrl,
                    style: TextStyle(color: t.text1),
                    decoration: _decoration(context, hint: '@username'),
                  ),
                ],
              ),
            ),

            const SizedBox(height: AppSpacing.s3),

            // ── Services multi-select card ────────────────────────
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  AppCardHeader(title: l.staffFormServicesLabel),
                  const SizedBox(height: AppSpacing.s2),
                  servicesAsync.when(
                    loading: () => const LinearProgressIndicator(),
                    error: (e, _) => Text(
                      l.errorWithMessage(e.toString()),
                      style: TextStyle(
                          color: t.errorStrong, fontSize: AppTextSizes.sm),
                    ),
                    data: (services) {
                      if (services.isEmpty) {
                        return Text(
                          l.staffNoServicesAvailable,
                          style: TextStyle(
                              color: t.text3, fontSize: AppTextSizes.sm),
                        );
                      }
                      return Wrap(
                        spacing: AppSpacing.s2,
                        runSpacing: AppSpacing.s1,
                        children: services.map((service) {
                          final selected =
                              _selectedServiceIds.contains(service.id);
                          return _ServiceToggleChip(
                            label: service.name,
                            selected: selected,
                            onTap: () {
                              setState(() {
                                if (selected) {
                                  _selectedServiceIds.remove(service.id);
                                } else {
                                  _selectedServiceIds.add(service.id);
                                }
                                if (_selectedServiceIds.isNotEmpty) {
                                  _servicesError = false;
                                }
                              });
                            },
                          );
                        }).toList(),
                      );
                    },
                  ),
                  if (_servicesError) ...[
                    const SizedBox(height: AppSpacing.s1),
                    Text(
                      l.staffSelectService,
                      style: TextStyle(
                        color: t.errorStrong,
                        fontSize: AppTextSizes.caption,
                      ),
                    ),
                  ],
                ],
              ),
            ),

            const SizedBox(height: AppSpacing.s3),

            // ── Days off card ─────────────────────────────────────
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  AppCardHeader(title: l.staffFormDaysOffLabel),
                  const SizedBox(height: AppSpacing.s1),
                  Text(
                    l.staffFormDaysOffHint,
                    style:
                        TextStyle(color: t.text3, fontSize: AppTextSizes.caption),
                  ),
                  const SizedBox(height: AppSpacing.s2),
                  if (_daysOff.isNotEmpty)
                    Wrap(
                      spacing: AppSpacing.s2,
                      runSpacing: AppSpacing.s1,
                      children: (_daysOff.toList()..sort()).map((date) {
                        return _DayOffChip(
                          label: formatDate(DateTime.parse(date)),
                          onRemove: () => setState(() => _daysOff.remove(date)),
                        );
                      }).toList(),
                    ),
                  const SizedBox(height: AppSpacing.s2),
                  AppButton(
                    label: l.staffFormAddDayOff,
                    variant: AppButtonVariant.secondary,
                    size: AppButtonSize.sm,
                    leftIcon: AppIconName.calendar,
                    onPressed: _addDayOff,
                  ),
                ],
              ),
            ),

            const SizedBox(height: AppSpacing.s5),

            AppButton(
              label: l.buttonSave,
              fullWidth: true,
              loading: _saving,
              onPressed: _saving ? null : _save,
            ),
            const SizedBox(height: AppSpacing.s6),
          ],
        ),
      ),
    );
  }
}

class _DayOffChip extends StatelessWidget {
  final String label;
  final VoidCallback onRemove;
  const _DayOffChip({required this.label, required this.onRemove});

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return Container(
      padding: const EdgeInsets.only(
          left: AppSpacing.s3, right: AppSpacing.s1, top: 2, bottom: 2),
      decoration: BoxDecoration(
        color: t.accentSoft,
        borderRadius: AppRadii.pill,
        border: Border.all(color: t.accent),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: AppTextSizes.sm,
              fontWeight: AppFontWeights.semibold,
              color: t.accent,
            ),
          ),
          const SizedBox(width: 2),
          GestureDetector(
            onTap: onRemove,
            child: Padding(
              padding: const EdgeInsets.all(4),
              child: AppIcon(name: AppIconName.close, size: 14, color: t.accent),
            ),
          ),
        ],
      ),
    );
  }
}

class _ServiceToggleChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _ServiceToggleChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: AppMotion.durFast,
        curve: AppMotion.ease,
        padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.s3, vertical: AppSpacing.s2),
        decoration: BoxDecoration(
          color: selected ? t.accentSoft : t.surface,
          borderRadius: AppRadii.pill,
          border: Border.all(color: selected ? t.accent : t.border),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: AppTextSizes.sm,
            fontWeight: AppFontWeights.semibold,
            color: selected ? t.accent : t.text2,
          ),
        ),
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  final String text;
  const _FieldLabel(this.text);

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.s2),
      child: Text(
        text,
        style: TextStyle(
          fontSize: AppTextSizes.caption,
          fontWeight: AppFontWeights.semibold,
          color: t.text2,
        ),
      ),
    );
  }
}

InputDecoration _decoration(BuildContext context, {String? hint}) {
  final t = AppTokens.of(context);
  OutlineInputBorder border(Color color, [double width = 1]) =>
      OutlineInputBorder(
        borderRadius: AppRadii.md,
        borderSide: BorderSide(color: color, width: width),
      );
  return InputDecoration(
    hintText: hint,
    hintStyle: TextStyle(color: t.text3),
    filled: true,
    fillColor: t.surface,
    isDense: true,
    contentPadding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.s4, vertical: AppSpacing.s3),
    border: border(t.border),
    enabledBorder: border(t.border),
    focusedBorder: border(t.accent, 2),
    errorBorder: border(t.error),
    focusedErrorBorder: border(t.error, 2),
    errorStyle: TextStyle(color: t.errorStrong),
  );
}
