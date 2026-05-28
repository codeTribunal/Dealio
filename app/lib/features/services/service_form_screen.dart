import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../l10n/app_localizations.dart';
import 'services_provider.dart';

class ServiceFormScreen extends ConsumerStatefulWidget {
  final String? serviceId;
  const ServiceFormScreen({super.key, this.serviceId});

  @override
  ConsumerState<ServiceFormScreen> createState() => _ServiceFormScreenState();
}

class _ServiceFormScreenState extends ConsumerState<ServiceFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameCtrl;
  late final TextEditingController _durationCtrl;
  late final TextEditingController _priceCtrl;
  bool _active = true;
  bool _saving = false;

  bool get _isEdit => widget.serviceId != null;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController();
    _durationCtrl = TextEditingController();
    _priceCtrl = TextEditingController();

    if (widget.serviceId != null) {
      final services = ref.read(servicesProvider).valueOrNull;
      if (services != null) {
        final idx = services.indexWhere((s) => s.id == widget.serviceId);
        if (idx >= 0) {
          final s = services[idx];
          _nameCtrl.text = s.name;
          _durationCtrl.text = s.durationMinutes.toString();
          _priceCtrl.text = s.price.toString();
          _active = s.active;
        }
      }
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _durationCtrl.dispose();
    _priceCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);

    final name = _nameCtrl.text.trim();
    final duration = int.parse(_durationCtrl.text.trim());
    final price = int.parse(_priceCtrl.text.trim());

    try {
      if (_isEdit) {
        await ref
            .read(servicesProvider.notifier)
            .updateService(widget.serviceId!, name, duration, price, _active);
      } else {
        await ref
            .read(servicesProvider.notifier)
            .createService(name, duration, price);
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

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(
        title: Text(_isEdit ? l.serviceFormEditTitle : l.serviceFormNewTitle),
        actions: [
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
              decoration: InputDecoration(labelText: l.serviceFormNameLabel),
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? l.formRequired : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _durationCtrl,
              decoration:
                  InputDecoration(labelText: l.serviceFormDurationLabel),
              keyboardType: TextInputType.number,
              validator: (v) {
                final n = int.tryParse(v?.trim() ?? '');
                return (n == null || n <= 0)
                    ? l.formPositiveInteger
                    : null;
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _priceCtrl,
              decoration: InputDecoration(labelText: l.serviceFormPriceLabel),
              keyboardType: TextInputType.number,
              validator: (v) {
                final n = int.tryParse(v?.trim() ?? '');
                return (n == null || n <= 0)
                    ? l.formPositiveInteger
                    : null;
              },
            ),
            const SizedBox(height: 8),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(l.commonActive),
              subtitle: Text(l.serviceFormActiveSubtitle),
              value: _active,
              onChanged: (v) => setState(() => _active = v),
            ),
          ],
        ),
      ),
    );
  }
}
