import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_service.dart';
import '../../core/models/customer.dart';
import '../../l10n/app_localizations.dart';
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
  bool _customerManualMode = false;
  String _manualCustomerName = '';
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
    final l = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(title: Text(l.projectFormTitle)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Client selection
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                l.projectClient,
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _customerManualMode = false),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      decoration: BoxDecoration(
                        color: !_customerManualMode
                            ? const Color(0xFF1F2937)
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: !_customerManualMode
                              ? const Color(0xFF1F2937)
                              : Colors.grey.shade300,
                        ),
                      ),
                      child: Text(
                        l.apptFormSelectExisting,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: !_customerManualMode
                              ? Colors.white
                              : Colors.grey.shade700,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _customerManualMode = true),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      decoration: BoxDecoration(
                        color: _customerManualMode
                            ? const Color(0xFF1F2937)
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: _customerManualMode
                              ? const Color(0xFF1F2937)
                              : Colors.grey.shade300,
                        ),
                      ),
                      child: Text(
                        l.apptFormEnterManually,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: _customerManualMode
                              ? Colors.white
                              : Colors.grey.shade700,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (!_customerManualMode)
              DropdownButtonFormField<Customer>(
                decoration: InputDecoration(
                  labelText: l.projectClient,
                  border: const OutlineInputBorder(),
                ),
                // ignore: deprecated_member_use
                value: _selectedCustomer,
                hint: _customers == null
                    ? Text(l.commonLoading)
                    : Text(l.projectSelectClient),
                items: _customers
                    ?.map(
                      (c) => DropdownMenuItem<Customer>(
                        value: c,
                        child: Text(c.name),
                      ),
                    )
                    .toList(),
                onChanged: (c) => setState(() => _selectedCustomer = c),
              )
            else
              TextFormField(
                decoration: InputDecoration(
                  labelText: l.projectClientNameLabel,
                  hintText: l.projectClientNameHint,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                onChanged: (v) => setState(() => _manualCustomerName = v),
              ),
            const SizedBox(height: 16),

            AppTextField(
              controller: _nameCtrl,
              label: l.projectNameLabel,
              hint: l.projectNameHint,
            ),
            const SizedBox(height: 16),

            AppTextField(
              controller: _descCtrl,
              label: l.projectScope,
              hint: l.projectScopeHint,
              maxLines: 4,
            ),
            const SizedBox(height: 16),

            AppTextField(
              controller: _priceCtrl,
              label: l.projectPriceLabel,
              hint: '0',
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 16),

            AppTextField(
              controller: _termsCtrl,
              label: l.projectPaymentTerms,
              hint: l.projectTermsHint,
              maxLines: 2,
            ),
            const SizedBox(height: 16),

            Row(
              children: [
                Expanded(
                  child: AppTextField(
                    controller: _startCtrl,
                    label: l.projectStartDate,
                    hint: l.commonOptionalLabel,
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
                    label: l.projectDeadline,
                    hint: l.commonOptionalLabel,
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
              label: l.projectFormCreate,
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
    final l = AppLocalizations.of(context)!;
    if (!_customerManualMode && _selectedCustomer == null) {
      setState(() => _error = l.projectErrSelectClient);
      return;
    }
    if (_customerManualMode && _manualCustomerName.trim().isEmpty) {
      setState(() => _error = l.projectErrEnterClient);
      return;
    }
    final name = _nameCtrl.text.trim();
    if (name.isEmpty) {
      setState(() => _error = l.projectErrNameRequired);
      return;
    }
    final price = int.tryParse(_priceCtrl.text.trim().replaceAll(RegExp(r'\s'), ''));
    if (price == null) {
      setState(() => _error = l.productFormPriceInvalid);
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      String customerId;
      if (_customerManualMode) {
        final customer = await ref
            .read(apiServiceProvider)
            .createCustomer(name: _manualCustomerName.trim());
        customerId = customer.id;
      } else {
        customerId = _selectedCustomer!.id;
      }

      final data = <String, dynamic>{
        'customerId': customerId,
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
