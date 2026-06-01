import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_service.dart';
import '../../core/icons/app_icon.dart';
import '../../core/theme/app_tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_card.dart';
import '../../shared/widgets/app_text_field.dart';
import 'projects_provider.dart';

final _displayFmt = DateFormat('d MMM yyyy');

class MilestoneFormScreen extends ConsumerStatefulWidget {
  final String projectId;
  const MilestoneFormScreen({super.key, required this.projectId});

  @override
  ConsumerState<MilestoneFormScreen> createState() =>
      _MilestoneFormScreenState();
}

class _MilestoneFormScreenState extends ConsumerState<MilestoneFormScreen> {
  final _nameCtrl = TextEditingController();
  final _amountCtrl = TextEditingController();
  final _dueDateCtrl = TextEditingController();

  DateTime? _dueDate;
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _amountCtrl.dispose();
    _dueDateCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDueDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _dueDate ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime(2035),
    );
    if (picked != null) {
      setState(() {
        _dueDate = picked;
        _dueDateCtrl.text = _displayFmt.format(picked);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l.milestoneFormTitle)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.s4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AppCard(
              child: Column(
                children: [
                  AppTextField(
                    controller: _nameCtrl,
                    label: l.milestoneNameLabel,
                    hint: l.milestoneNameHint,
                  ),
                  const SizedBox(height: AppSpacing.s4),
                  AppTextField(
                    controller: _amountCtrl,
                    label: l.milestoneAmountLabel,
                    hint: '0',
                    keyboardType: TextInputType.number,
                  ),
                  const SizedBox(height: AppSpacing.s4),
                  AppTextField(
                    controller: _dueDateCtrl,
                    label: l.milestoneDueDateLabel,
                    hint: l.commonOptionalLabel,
                    readOnly: true,
                    keyboardType: TextInputType.none,
                    suffixIcon: _dueDate == null
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
                              _dueDate = null;
                              _dueDateCtrl.clear();
                            }),
                          ),
                    onTap: _pickDueDate,
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
              label: l.milestoneAdd,
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

  Future<void> _submit() async {
    final l = AppLocalizations.of(context)!;
    final name = _nameCtrl.text.trim();
    if (name.isEmpty) {
      setState(() => _error = l.productFormNameRequired);
      return;
    }
    final amount =
        int.tryParse(_amountCtrl.text.trim().replaceAll(RegExp(r'\s'), ''));
    if (amount == null) {
      setState(() => _error = l.milestoneAmountInvalid);
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      final data = <String, dynamic>{
        'name': name,
        'amount': amount,
        if (_dueDate != null) 'dueDate': _dueDate!.toUtc().toIso8601String(),
      };

      await ref.read(apiServiceProvider).createMilestone(widget.projectId, data);
      await ref
          .read(projectDetailProvider(widget.projectId).notifier)
          .refresh();
      if (mounted) context.pop();
    } catch (e) {
      setState(() {
        _saving = false;
        _error = e.toString();
      });
    }
  }
}
