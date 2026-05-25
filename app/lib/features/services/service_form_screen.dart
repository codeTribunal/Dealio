import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

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
    return Scaffold(
      appBar: AppBar(
        title: Text(_isEdit ? 'Edit service' : 'New service'),
        actions: [
          TextButton(
            onPressed: _saving ? null : _save,
            style: TextButton.styleFrom(
              foregroundColor: Colors.white,
              textStyle: const TextStyle(
                  fontWeight: FontWeight.bold, fontSize: 16),
            ),
            child: const Text('Save'),
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
              decoration: const InputDecoration(labelText: 'Service name'),
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _durationCtrl,
              decoration:
                  const InputDecoration(labelText: 'Duration (minutes)'),
              keyboardType: TextInputType.number,
              validator: (v) {
                final n = int.tryParse(v?.trim() ?? '');
                return (n == null || n <= 0)
                    ? 'Enter a positive integer'
                    : null;
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _priceCtrl,
              decoration: const InputDecoration(labelText: 'Price (UZS)'),
              keyboardType: TextInputType.number,
              validator: (v) {
                final n = int.tryParse(v?.trim() ?? '');
                return (n == null || n <= 0)
                    ? 'Enter a positive integer'
                    : null;
              },
            ),
            const SizedBox(height: 8),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Active'),
              subtitle:
                  const Text('Visible to customers in the bot'),
              value: _active,
              onChanged: (v) => setState(() => _active = v),
            ),
          ],
        ),
      ),
    );
  }
}
