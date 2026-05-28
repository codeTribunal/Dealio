import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../l10n/app_localizations.dart';
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
    final telegram =
        _telegramCtrl.text.trim().replaceAll('@', '');
    final serviceIds = _selectedServiceIds.toList();

    try {
      if (_isEdit) {
        await ref.read(staffProvider.notifier).updateStaff(
              widget.staffId!,
              name,
              telegram.isNotEmpty ? telegram : null,
              serviceIds,
            );
      } else {
        await ref.read(staffProvider.notifier).createStaff(
              name,
              telegram.isNotEmpty ? telegram : null,
              serviceIds,
            );
      }
      if (mounted) context.pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(e.toString()), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _confirmDelete() async {
    final l = AppLocalizations.of(context)!;
    final name = _nameCtrl.text.trim().isNotEmpty
        ? _nameCtrl.text.trim()
        : l.staffThisMember;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l.staffDeleteTitle(name)),
        content: Text(l.staffDeleteConfirm),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text(l.buttonCancel),
          ),
          TextButton(
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text(l.buttonDelete),
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
              content: Text(e.toString()), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final servicesAsync = ref.watch(servicesProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(_isEdit ? l.staffFormEditTitle : l.staffFormNewTitle),
        actions: [
          if (_isEdit)
            TextButton(
              onPressed: _saving ? null : _confirmDelete,
              style: TextButton.styleFrom(foregroundColor: Colors.red),
              child: Text(l.buttonDelete),
            ),
          TextButton(
            onPressed: _saving ? null : _save,
            style: TextButton.styleFrom(
              foregroundColor: Colors.white,
              textStyle: const TextStyle(
                  fontWeight: FontWeight.bold, fontSize: 16),
            ),
            child: Text(l.buttonSave),
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _nameCtrl,
              decoration: InputDecoration(labelText: l.staffFormNameLabel),
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? l.formRequired : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _telegramCtrl,
              decoration: InputDecoration(
                labelText: l.staffFormTelegramLabel,
                hintText: '@username',
              ),
            ),
            const SizedBox(height: 24),
            Text(
              l.staffFormServicesLabel,
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: Colors.grey[700],
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 8),
            servicesAsync.when(
              loading: () => const LinearProgressIndicator(),
              error: (e, _) => Text(
                l.errorWithMessage(e.toString()),
                style: const TextStyle(color: Colors.red, fontSize: 13),
              ),
              data: (services) {
                if (services.isEmpty) {
                  return Text(
                    l.staffNoServicesAvailable,
                    style:
                        TextStyle(color: Colors.grey[500], fontSize: 13),
                  );
                }
                return Wrap(
                  spacing: 8,
                  runSpacing: 4,
                  children: services.map((service) {
                    final selected =
                        _selectedServiceIds.contains(service.id);
                    return FilterChip(
                      label: Text(service.name),
                      selected: selected,
                      onSelected: (isSelected) {
                        setState(() {
                          if (isSelected) {
                            _selectedServiceIds.add(service.id);
                          } else {
                            _selectedServiceIds.remove(service.id);
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
              const SizedBox(height: 4),
              Text(
                l.staffSelectService,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.error,
                  fontSize: 12,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
