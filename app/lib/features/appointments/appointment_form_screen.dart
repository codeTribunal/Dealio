import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_service.dart';
import '../../core/models/customer.dart';
import '../../core/models/service.dart';
import '../../core/models/staff.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/utils/format.dart';
import 'appointments_provider.dart';

final _displayFmt = DateFormat('d MMM yyyy');

class AppointmentFormScreen extends ConsumerStatefulWidget {
  const AppointmentFormScreen({super.key});

  @override
  ConsumerState<AppointmentFormScreen> createState() =>
      _AppointmentFormScreenState();
}

class _AppointmentFormScreenState extends ConsumerState<AppointmentFormScreen> {
  final _notesCtrl = TextEditingController();

  // Reference data
  List<Customer>? _customers;
  List<Service>? _services;
  List<Staff>? _staff;

  // Customer selection
  bool _customerManualMode = false;
  String _manualCustomerName = '';
  String? _selectedCustomerId;

  // Service selection — default to manual since the owner may not have
  // any services set up yet.
  bool _serviceManualMode = true;
  String _manualServiceName = '';
  String _manualServiceDuration = '60';
  String _manualServicePrice = '';
  String? _selectedServiceId;

  // Staff (optional)
  String? _selectedStaffId;

  // Scheduling
  DateTime? _date;
  TimeOfDay? _time;

  // Payment
  String _paymentType = 'AT_APPOINTMENT';

  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadReferenceData();
  }

  @override
  void dispose() {
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadReferenceData() async {
    final api = ref.read(apiServiceProvider);
    // Load each list independently so a failure in one doesn't block the rest.
    try {
      final customers = await api.getCustomers();
      if (mounted) setState(() => _customers = customers);
    } catch (_) {
      if (mounted) setState(() => _customers = []);
    }
    try {
      final services = await api.getServices();
      if (mounted) {
        setState(() {
          _services = services;
          // If the owner already has services, default to picking one.
          if (services.isNotEmpty) _serviceManualMode = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _services = []);
    }
    try {
      final staff = await api.getStaff();
      if (mounted) setState(() => _staff = staff);
    } catch (_) {
      if (mounted) setState(() => _staff = []);
    }
  }

  List<Staff> get _availableStaff {
    final staff = _staff;
    if (staff == null) return const [];
    if (_serviceManualMode || _selectedServiceId == null) return staff;
    return staff
        .where((m) => m.services.any((s) => s.id == _selectedServiceId))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final hasServices = (_services?.isNotEmpty ?? false);
    final hasStaff = (_staff?.isNotEmpty ?? false);

    return Scaffold(
      appBar: AppBar(title: Text(l.apptFormTitle)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── Customer ──────────────────────────────────────────
            _label(l.apptFormCustomerLabel),
            Row(
              children: [
                _toggleButton(
                  label: l.apptFormSelectExisting,
                  selected: !_customerManualMode,
                  onTap: () => setState(() => _customerManualMode = false),
                ),
                const SizedBox(width: 8),
                _toggleButton(
                  label: l.apptFormEnterManually,
                  selected: _customerManualMode,
                  onTap: () => setState(() => _customerManualMode = true),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (!_customerManualMode)
              DropdownButtonFormField<String>(
                decoration: InputDecoration(
                  labelText: l.orderSectionCustomer,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                // ignore: deprecated_member_use
                value: _selectedCustomerId,
                hint: _customers == null
                    ? Text(l.commonLoading)
                    : Text(l.apptFormSelectCustomer),
                items: _customers
                    ?.map(
                      (c) => DropdownMenuItem<String>(
                        value: c.id,
                        child: Text(c.name),
                      ),
                    )
                    .toList(),
                onChanged: (v) => setState(() => _selectedCustomerId = v),
              )
            else
              TextFormField(
                decoration: InputDecoration(
                  labelText: l.apptFormCustomerNameLabel,
                  hintText: l.apptFormCustomerNameHint,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                onChanged: (v) => setState(() => _manualCustomerName = v),
              ),
            const SizedBox(height: 20),

            // ── Service ───────────────────────────────────────────
            _label(l.apptFormServiceLabel),
            if (hasServices)
              Row(
                children: [
                  _toggleButton(
                    label: l.apptFormEnterManually,
                    selected: _serviceManualMode,
                    onTap: () => setState(() => _serviceManualMode = true),
                  ),
                  const SizedBox(width: 8),
                  _toggleButton(
                    label: l.apptFormFromServices,
                    selected: !_serviceManualMode,
                    onTap: () => setState(() => _serviceManualMode = false),
                  ),
                ],
              ),
            if (hasServices) const SizedBox(height: 12),
            if (!_serviceManualMode && hasServices)
              DropdownButtonFormField<String>(
                decoration: InputDecoration(
                  labelText: l.apptFormServiceField,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                // ignore: deprecated_member_use
                value: _selectedServiceId,
                hint: Text(l.apptFormSelectService),
                items: _services
                    ?.map(
                      (s) => DropdownMenuItem<String>(
                        value: s.id,
                        child: Text(
                          '${s.name} — ${l.durationMinutes(s.durationMinutes)} — ${formatUZS(s.price)}',
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    )
                    .toList(),
                onChanged: (v) => setState(() {
                  _selectedServiceId = v;
                  _selectedStaffId = null;
                }),
              )
            else
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextFormField(
                    decoration: InputDecoration(
                      labelText: l.serviceFormNameLabel,
                      hintText: l.apptFormServiceNameHint,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    onChanged: (v) => setState(() => _manualServiceName = v),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          initialValue: _manualServiceDuration,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                            labelText: l.apptFormDurationLabel,
                            hintText: '60',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          onChanged: (v) =>
                              setState(() => _manualServiceDuration = v),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextFormField(
                          initialValue: _manualServicePrice,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                            labelText: l.serviceFormPriceLabel,
                            hintText: '0',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          onChanged: (v) =>
                              setState(() => _manualServicePrice = v),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            const SizedBox(height: 20),

            // ── Staff (optional) ──────────────────────────────────
            if (hasStaff) ...[
              _label(l.apptFormStaffLabel),
              DropdownButtonFormField<String?>(
                decoration: InputDecoration(
                  labelText: l.staffTitle,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                // ignore: deprecated_member_use
                value: _selectedStaffId,
                items: [
                  DropdownMenuItem<String?>(
                    value: null,
                    child: Text(l.apptFormAnyStaff),
                  ),
                  ..._availableStaff.map(
                    (m) => DropdownMenuItem<String?>(
                      value: m.id,
                      child: Text(m.name),
                    ),
                  ),
                ],
                onChanged: (v) => setState(() => _selectedStaffId = v),
              ),
              const SizedBox(height: 20),
            ],

            // ── Date & time ───────────────────────────────────────
            _label(l.apptFormWhenLabel),
            Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: _pickDate,
                    child: InputDecorator(
                      decoration: InputDecoration(
                        labelText: l.apptFormDateLabel,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: Text(
                        _date == null ? l.apptFormSelectDate : _displayFmt.format(_date!),
                        style: TextStyle(
                          color: _date == null ? Colors.grey.shade600 : null,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: InkWell(
                    onTap: _pickTime,
                    child: InputDecorator(
                      decoration: InputDecoration(
                        labelText: l.productFormTimeLabel,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: Text(
                        _time == null ? l.apptFormSelectTime : formatTimeOfDay(_time!),
                        style: TextStyle(
                          color: _time == null ? Colors.grey.shade600 : null,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // ── Payment ───────────────────────────────────────────
            _label(l.apptFormPaymentLabel),
            Row(
              children: [
                _toggleButton(
                  label: l.apptPayAtAppointment,
                  selected: _paymentType == 'AT_APPOINTMENT',
                  onTap: () => setState(() => _paymentType = 'AT_APPOINTMENT'),
                ),
                const SizedBox(width: 8),
                _toggleButton(
                  label: l.apptPayInAdvance,
                  selected: _paymentType == 'IN_ADVANCE',
                  onTap: () => setState(() => _paymentType = 'IN_ADVANCE'),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // ── Notes ─────────────────────────────────────────────
            _label(l.orderSectionNotes),
            TextFormField(
              controller: _notesCtrl,
              maxLines: 2,
              decoration: InputDecoration(
                hintText: l.apptFormNotesHint,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            const SizedBox(height: 24),

            if (_error != null) ...[
              Text(_error!, style: const TextStyle(color: Colors.red)),
              const SizedBox(height: 12),
            ],

            FilledButton(
              onPressed: _saving ? null : _submit,
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: _saving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text(l.apptFormCreate),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _label(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Align(
          alignment: Alignment.centerLeft,
          child: Text(
            text,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
          ),
        ),
      );

  Widget _toggleButton({
    required String label,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: selected ? const Color(0xFF1F2937) : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: selected ? const Color(0xFF1F2937) : Colors.grey.shade300,
            ),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: selected ? Colors.white : Colors.grey.shade700,
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _date ?? now,
      firstDate: DateTime(now.year, now.month, now.day),
      lastDate: DateTime(now.year + 2),
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _time ?? const TimeOfDay(hour: 9, minute: 0),
    );
    if (picked != null) setState(() => _time = picked);
  }

  Future<void> _submit() async {
    final l = AppLocalizations.of(context)!;
    if (!_customerManualMode && _selectedCustomerId == null) {
      setState(() => _error = l.apptErrSelectCustomer);
      return;
    }
    if (_customerManualMode && _manualCustomerName.trim().isEmpty) {
      setState(() => _error = l.apptErrEnterCustomer);
      return;
    }
    if (!_serviceManualMode && _selectedServiceId == null) {
      setState(() => _error = l.apptErrSelectService);
      return;
    }
    if (_serviceManualMode && _manualServiceName.trim().isEmpty) {
      setState(() => _error = l.apptErrEnterService);
      return;
    }
    if (_date == null || _time == null) {
      setState(() => _error = l.apptErrSelectDateTime);
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      final api = ref.read(apiServiceProvider);

      String customerId;
      if (_customerManualMode) {
        final customer =
            await api.createCustomer(name: _manualCustomerName.trim());
        customerId = customer.id;
      } else {
        customerId = _selectedCustomerId!;
      }

      String serviceId;
      if (_serviceManualMode) {
        final service = await api.createService({
          'name': _manualServiceName.trim(),
          'durationMinutes': int.tryParse(_manualServiceDuration) ?? 60,
          'price': int.tryParse(_manualServicePrice) ?? 0,
          'active': true,
        });
        serviceId = service.id;
      } else {
        serviceId = _selectedServiceId!;
      }

      final start = DateTime(
        _date!.year,
        _date!.month,
        _date!.day,
        _time!.hour,
        _time!.minute,
      );

      final data = <String, dynamic>{
        'customerId': customerId,
        'serviceId': serviceId,
        if (_selectedStaffId != null) 'staffId': _selectedStaffId,
        'startTime': start.toUtc().toIso8601String(),
        if (_notesCtrl.text.trim().isNotEmpty) 'notes': _notesCtrl.text.trim(),
        'paymentType': _paymentType,
      };

      await api.createAppointment(data);
      await ref.read(appointmentsProvider.notifier).refresh();
      if (mounted) context.pop();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _error = e.toString();
      });
    }
  }
}
