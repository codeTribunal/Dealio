import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_service.dart';
import '../../core/icons/app_icon.dart';
import '../../core/models/customer.dart';
import '../../core/theme/app_tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_card.dart';
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
    final t = AppTokens.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l.projectFormTitle)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.s4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── Client card ───────────────────────────────────────
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _FieldLabel(l.projectClient),
                  Row(
                    children: [
                      _toggleButton(
                        label: l.apptFormSelectExisting,
                        selected: !_customerManualMode,
                        onTap: () =>
                            setState(() => _customerManualMode = false),
                      ),
                      const SizedBox(width: AppSpacing.s2),
                      _toggleButton(
                        label: l.apptFormEnterManually,
                        selected: _customerManualMode,
                        onTap: () =>
                            setState(() => _customerManualMode = true),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.s3),
                  if (!_customerManualMode)
                    DropdownButtonFormField<Customer>(
                      decoration: _decoration(context),
                      dropdownColor: t.surface,
                      borderRadius: AppRadii.md,
                      style: TextStyle(color: t.text1),
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
                      style: TextStyle(color: t.text1),
                      decoration: _decoration(context,
                          hint: l.projectClientNameHint),
                      onChanged: (v) => setState(() => _manualCustomerName = v),
                    ),
                ],
              ),
            ),

            const SizedBox(height: AppSpacing.s3),

            // ── Details card ──────────────────────────────────────
            AppCard(
              child: Column(
                children: [
                  AppTextField(
                    controller: _nameCtrl,
                    label: l.projectNameLabel,
                    hint: l.projectNameHint,
                  ),
                  const SizedBox(height: AppSpacing.s4),
                  AppTextField(
                    controller: _descCtrl,
                    label: l.projectScope,
                    hint: l.projectScopeHint,
                    maxLines: 4,
                  ),
                  const SizedBox(height: AppSpacing.s4),
                  AppTextField(
                    controller: _priceCtrl,
                    label: l.projectPriceLabel,
                    hint: '0',
                    keyboardType: TextInputType.number,
                  ),
                  const SizedBox(height: AppSpacing.s4),
                  AppTextField(
                    controller: _termsCtrl,
                    label: l.projectPaymentTerms,
                    hint: l.projectTermsHint,
                    maxLines: 2,
                  ),
                ],
              ),
            ),

            const SizedBox(height: AppSpacing.s3),

            // ── Dates card ────────────────────────────────────────
            AppCard(
              child: Row(
                children: [
                  Expanded(
                    child: AppTextField(
                      controller: _startCtrl,
                      label: l.projectStartDate,
                      hint: l.commonOptionalLabel,
                      readOnly: true,
                      keyboardType: TextInputType.none,
                      suffixIcon: _startDate == null
                          ? Padding(
                              padding:
                                  const EdgeInsets.only(right: AppSpacing.s2),
                              child: AppIcon(
                                  name: AppIconName.calendar,
                                  size: 18,
                                  color: t.text2),
                            )
                          : IconButton(
                              icon: AppIcon(
                                  name: AppIconName.close,
                                  size: 18,
                                  color: t.text2),
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
                  const SizedBox(width: AppSpacing.s3),
                  Expanded(
                    child: AppTextField(
                      controller: _deadlineCtrl,
                      label: l.projectDeadline,
                      hint: l.commonOptionalLabel,
                      readOnly: true,
                      keyboardType: TextInputType.none,
                      suffixIcon: _deadline == null
                          ? Padding(
                              padding:
                                  const EdgeInsets.only(right: AppSpacing.s2),
                              child: AppIcon(
                                  name: AppIconName.calendar,
                                  size: 18,
                                  color: t.text2),
                            )
                          : IconButton(
                              icon: AppIcon(
                                  name: AppIconName.close,
                                  size: 18,
                                  color: t.text2),
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
            ),

            const SizedBox(height: AppSpacing.s5),

            if (_error != null) ...[
              Text(_error!, style: TextStyle(color: t.errorStrong)),
              const SizedBox(height: AppSpacing.s3),
            ],

            AppButton(
              label: l.projectFormCreate,
              fullWidth: true,
              loading: _saving,
              onPressed: _submit,
            ),
            const SizedBox(height: AppSpacing.s6),
          ],
        ),
      ),
    );
  }

  Widget _toggleButton({
    required String label,
    required bool selected,
    required VoidCallback onTap,
  }) {
    final t = AppTokens.of(context);
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: AppMotion.durFast,
          curve: AppMotion.ease,
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.s2),
          decoration: BoxDecoration(
            color: selected ? t.accentSoft : t.surface,
            borderRadius: AppRadii.sm,
            border: Border.all(color: selected ? t.accent : t.border),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: AppTextSizes.caption,
              fontWeight: AppFontWeights.semibold,
              color: selected ? t.accent : t.text2,
            ),
          ),
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
    final price =
        int.tryParse(_priceCtrl.text.trim().replaceAll(RegExp(r'\s'), ''));
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
        if (_descCtrl.text.trim().isNotEmpty)
          'description': _descCtrl.text.trim(),
        'totalPrice': price,
        if (_termsCtrl.text.trim().isNotEmpty)
          'paymentTerms': _termsCtrl.text.trim(),
        if (_startDate != null)
          'startDate': _startDate!.toUtc().toIso8601String(),
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
  );
}
