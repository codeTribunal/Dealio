import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_service.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_text_field.dart';
import 'projects_provider.dart';

final _displayFmt = DateFormat('d MMM yyyy');

class MilestoneFormScreen extends ConsumerStatefulWidget {
  final String projectId;
  const MilestoneFormScreen({super.key, required this.projectId});

  @override
  ConsumerState<MilestoneFormScreen> createState() => _MilestoneFormScreenState();
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
    return Scaffold(
      appBar: AppBar(title: const Text('Add milestone')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AppTextField(
              controller: _nameCtrl,
              label: 'Milestone name',
              hint: 'e.g. Initial design mockups',
            ),
            const SizedBox(height: 16),

            AppTextField(
              controller: _amountCtrl,
              label: 'Amount (UZS)',
              hint: '0',
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 16),

            AppTextField(
              controller: _dueDateCtrl,
              label: 'Due date',
              hint: 'Optional',
              readOnly: true,
              keyboardType: TextInputType.none,
              suffixIcon: _dueDate == null
                  ? const Icon(Icons.calendar_today_outlined, size: 18)
                  : IconButton(
                      icon: const Icon(Icons.clear, size: 18),
                      onPressed: () => setState(() {
                        _dueDate = null;
                        _dueDateCtrl.clear();
                      }),
                    ),
              onTap: _pickDueDate,
            ),
            const SizedBox(height: 24),

            if (_error != null) ...[
              Text(_error!, style: const TextStyle(color: Colors.red)),
              const SizedBox(height: 12),
            ],

            AppButton(
              label: 'Add milestone',
              loading: _saving,
              onPressed: _submit,
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _submit() async {
    final name = _nameCtrl.text.trim();
    if (name.isEmpty) {
      setState(() => _error = 'Name is required');
      return;
    }
    final amount = int.tryParse(_amountCtrl.text.trim().replaceAll(RegExp(r'\s'), ''));
    if (amount == null) {
      setState(() => _error = 'Enter a valid amount');
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
      await ref.read(projectDetailProvider(widget.projectId).notifier).refresh();
      if (mounted) context.pop();
    } catch (e) {
      setState(() {
        _saving = false;
        _error = e.toString();
      });
    }
  }
}
