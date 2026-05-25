import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_service.dart';
import '../../core/models/customer.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_text_field.dart';
import 'projects_provider.dart';

final _displayFmt = DateFormat('d MMM yyyy');

class ProjectFormScreen extends ConsumerStatefulWidget {
  const ProjectFormScreen({super.key});

  @override
  ConsumerState<ProjectFormScreen> createState() => _ProjectFormScreenState();
}

class _ProjectFormScreenState extends ConsumerState<ProjectFormScreen> {
  final _nameCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _priceCtrl = TextEditingController();
  final _termsCtrl = TextEditingController();
  final _startCtrl = TextEditingController();
  final _deadlineCtrl = TextEditingController();

  DateTime? _startDate;
  DateTime? _deadline;

  Customer? _selectedCustomer;
  List<Customer>? _customers;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadCustomers();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    _priceCtrl.dispose();
    _termsCtrl.dispose();
    _startCtrl.dispose();
    _deadlineCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadCustomers() async {
    try {
      final list = await ref.read(apiServiceProvider).getCustomers();
      if (mounted) setState(() => _customers = list);
    } catch (_) {
      // show empty state in dropdown
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('New project')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Client selection
            DropdownButtonFormField<Customer>(
              decoration: const InputDecoration(
                labelText: 'Client',
                border: OutlineInputBorder(),
              ),
              // ignore: deprecated_member_use
              value: _selectedCustomer,
              hint: _customers == null
                  ? const Text('Loading...')
                  : const Text('Select a client'),
              items: _customers
                  ?.map(
                    (c) => DropdownMenuItem<Customer>(
                      value: c,
                      child: Text(c.name),
                    ),
                  )
                  .toList(),
              onChanged: (c) => setState(() => _selectedCustomer = c),
            ),
            const SizedBox(height: 16),

            AppTextField(
              controller: _nameCtrl,
              label: 'Project name',
              hint: 'e.g. Brand identity redesign',
            ),
            const SizedBox(height: 16),

            AppTextField(
              controller: _descCtrl,
              label: 'Scope of work',
              hint: 'Describe deliverables...',
              maxLines: 4,
            ),
            const SizedBox(height: 16),

            AppTextField(
              controller: _priceCtrl,
              label: 'Total agreed price (UZS)',
              hint: '0',
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 16),

            AppTextField(
              controller: _termsCtrl,
              label: 'Payment terms',
              hint: 'e.g. 50% upfront, 50% on delivery',
              maxLines: 2,
            ),
            const SizedBox(height: 16),

            Row(
              children: [
                Expanded(
                  child: AppTextField(
                    controller: _startCtrl,
                    label: 'Start date',
                    hint: 'Optional',
                    readOnly: true,
                    keyboardType: TextInputType.none,
                    suffixIcon: _startDate == null
                        ? const Icon(Icons.calendar_today_outlined, size: 18)
                        : IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: () => setState(() {
                              _startDate = null;
                              _startCtrl.clear();
                            }),
                          ),
                    onTap: () => _pickDate(
                      initial: _startDate,
                      onPicked: (d) => setState(() {
                        _startDate = d;
                        _startCtrl.text = _displayFmt.format(d);
                      }),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: AppTextField(
                    controller: _deadlineCtrl,
                    label: 'Deadline',
                    hint: 'Optional',
                    readOnly: true,
                    keyboardType: TextInputType.none,
                    suffixIcon: _deadline == null
                        ? const Icon(Icons.calendar_today_outlined, size: 18)
                        : IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: () => setState(() {
                              _deadline = null;
                              _deadlineCtrl.clear();
                            }),
                          ),
                    onTap: () => _pickDate(
                      initial: _deadline,
                      onPicked: (d) => setState(() {
                        _deadline = d;
                        _deadlineCtrl.text = _displayFmt.format(d);
                      }),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            if (_error != null) ...[
              Text(_error!, style: const TextStyle(color: Colors.red)),
              const SizedBox(height: 12),
            ],

            AppButton(
              label: 'Create project',
              loading: _saving,
              onPressed: _submit,
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickDate({
    required DateTime? initial,
    required ValueChanged<DateTime> onPicked,
  }) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: initial ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime(2035),
    );
    if (picked != null) onPicked(picked);
  }

  Future<void> _submit() async {
    if (_selectedCustomer == null) {
      setState(() => _error = 'Please select a client');
      return;
    }
    final name = _nameCtrl.text.trim();
    if (name.isEmpty) {
      setState(() => _error = 'Project name is required');
      return;
    }
    final price = int.tryParse(_priceCtrl.text.trim().replaceAll(RegExp(r'\s'), ''));
    if (price == null) {
      setState(() => _error = 'Enter a valid price');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      final data = <String, dynamic>{
        'customerId': _selectedCustomer!.id,
        'name': name,
        if (_descCtrl.text.trim().isNotEmpty) 'description': _descCtrl.text.trim(),
        'totalPrice': price,
        if (_termsCtrl.text.trim().isNotEmpty) 'paymentTerms': _termsCtrl.text.trim(),
        if (_startDate != null) 'startDate': _startDate!.toUtc().toIso8601String(),
        if (_deadline != null) 'deadline': _deadline!.toUtc().toIso8601String(),
      };

      final project = await ref.read(apiServiceProvider).createProject(data);
      ref.invalidate(projectsProvider);
      if (mounted) context.pushReplacement('/projects/${project.id}');
    } catch (e) {
      setState(() {
        _saving = false;
        _error = e.toString();
      });
    }
  }
}
