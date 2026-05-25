import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_notifier.dart';
import 'customization_provider.dart';
import 'settings_provider.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settingsAsync = ref.watch(settingsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: settingsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => _ErrorView(
          message: e.toString(),
          onRetry: () => ref.read(settingsProvider.notifier).refresh(),
        ),
        data: (data) => RefreshIndicator(
          onRefresh: () => ref.read(settingsProvider.notifier).refresh(),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _ProfileSection(data: data),
              const SizedBox(height: 12),
              _BusinessModeSection(data: data),
              if (data.business.mode.contains('SERVICES')) ...[
                const SizedBox(height: 12),
                const _ServicesSection(),
                const SizedBox(height: 12),
                const _StaffSection(),
              ],
              const SizedBox(height: 12),
              _PaymentSection(data: data),
              const SizedBox(height: 12),
              _BotSection(data: data),
              const SizedBox(height: 12),
              const _CustomerFieldsSection(),
              const SizedBox(height: 12),
              const _StagesSection(),
              const SizedBox(height: 12),
              const _CheckoutQuestionsSection(),
              const SizedBox(height: 12),
              _LanguageSection(data: data),
              const SizedBox(height: 12),
              _AccountSection(),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Profile section ──────────────────────────────────────────────────

class _ProfileSection extends ConsumerStatefulWidget {
  final SettingsState data;
  const _ProfileSection({required this.data});

  @override
  ConsumerState<_ProfileSection> createState() => _ProfileSectionState();
}

class _ProfileSectionState extends ConsumerState<_ProfileSection> {
  late final TextEditingController _nameCtrl;
  late final TextEditingController _descCtrl;
  bool _editing = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(text: widget.data.business.name);
    _descCtrl = TextEditingController(text: widget.data.business.description ?? '');
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_nameCtrl.text.trim().isEmpty) return;
    setState(() => _saving = true);
    try {
      await ref.read(settingsProvider.notifier).saveProfile(
            name: _nameCtrl.text.trim(),
            description: _descCtrl.text.trim(),
          );
      if (!mounted) return;
      setState(() {
        _editing = false;
        _saving = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
      );
    }
  }

  void _cancel() {
    setState(() {
      _nameCtrl.text = widget.data.business.name;
      _descCtrl.text = widget.data.business.description ?? '';
      _editing = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  'BUSINESS PROFILE',
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: Colors.grey[600],
                        letterSpacing: 0.5,
                        fontWeight: FontWeight.w600,
                      ),
                ),
                const Spacer(),
                if (!_editing)
                  IconButton(
                    icon: const Icon(Icons.edit_outlined, size: 18),
                    onPressed: () => setState(() => _editing = true),
                    tooltip: 'Edit profile',
                    visualDensity: VisualDensity.compact,
                  ),
              ],
            ),
            const SizedBox(height: 12),
            if (_editing) ...[
              TextField(
                controller: _nameCtrl,
                decoration: const InputDecoration(
                  labelText: 'Business name',
                  isDense: true,
                ),
                autofocus: true,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _descCtrl,
                decoration: const InputDecoration(
                  labelText: 'Description (optional)',
                  isDense: true,
                ),
                maxLines: 3,
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: _saving ? null : _cancel,
                    child: const Text('Cancel'),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(
                    onPressed: _saving ? null : _save,
                    child: _saving
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Save'),
                  ),
                ],
              ),
            ] else ...[
              Text(
                widget.data.business.name,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              if (widget.data.business.description != null &&
                  widget.data.business.description!.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  widget.data.business.description!,
                  style: TextStyle(color: Colors.grey[600], fontSize: 13),
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }
}

// ── Business mode section ────────────────────────────────────────────

class _BusinessModeSection extends ConsumerWidget {
  final SettingsState data;
  const _BusinessModeSection({required this.data});

  static const _modes = [
    ('PRODUCTS', 'Product selling', 'Sell physical or digital products via the bot'),
    ('SERVICES', 'Service / appointments', 'Accept bookings and manage appointments'),
    ('FREELANCE', 'Freelance / projects', 'Track project milestones and invoices'),
  ];

  Future<void> _toggle(BuildContext context, WidgetRef ref, String mode, List<String> current) async {
    final isOn = current.contains(mode);
    if (isOn && current.length == 1) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('You must have at least one mode active.')),
      );
      return;
    }
    final updated = isOn
        ? current.where((m) => m != mode).toList()
        : [...current, mode];
    try {
      await ref.read(settingsProvider.notifier).saveMode(updated);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final current = data.business.mode;

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'BUSINESS MODE',
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: Colors.grey[600],
                    letterSpacing: 0.5,
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 4),
            for (final (value, label, subtitle) in _modes)
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(label, style: const TextStyle(fontSize: 14)),
                subtitle: Text(subtitle,
                    style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                value: current.contains(value),
                onChanged: (_) => _toggle(context, ref, value, current),
                dense: true,
              ),
          ],
        ),
      ),
    );
  }
}

// ── Payment section ──────────────────────────────────────────────────

class _PaymentSection extends ConsumerStatefulWidget {
  final SettingsState data;
  const _PaymentSection({required this.data});

  @override
  ConsumerState<_PaymentSection> createState() => _PaymentSectionState();
}

class _PaymentSectionState extends ConsumerState<_PaymentSection> {
  late final TextEditingController _cardCtrl;
  String _selectedBank = 'UZCARD';
  bool _editing = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _cardCtrl = TextEditingController(text: widget.data.business.cardNumber ?? '');
    _selectedBank = widget.data.business.cardBank ?? 'UZCARD';
  }

  @override
  void dispose() {
    _cardCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_cardCtrl.text.trim().isEmpty) return;
    setState(() => _saving = true);
    try {
      await ref.read(settingsProvider.notifier).savePayment(
            cardNumber: _cardCtrl.text.trim(),
            cardBank: _selectedBank,
          );
      if (!mounted) return;
      setState(() {
        _editing = false;
        _saving = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
      );
    }
  }

  void _cancel() {
    setState(() {
      _cardCtrl.text = widget.data.business.cardNumber ?? '';
      _selectedBank = widget.data.business.cardBank ?? 'UZCARD';
      _editing = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final hasCard = widget.data.business.cardNumber != null &&
        widget.data.business.cardNumber!.isNotEmpty;

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  'PAYMENT METHOD',
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: Colors.grey[600],
                        letterSpacing: 0.5,
                        fontWeight: FontWeight.w600,
                      ),
                ),
                const Spacer(),
                if (!_editing)
                  IconButton(
                    icon: const Icon(Icons.edit_outlined, size: 18),
                    onPressed: () => setState(() => _editing = true),
                    tooltip: 'Edit payment',
                    visualDensity: VisualDensity.compact,
                  ),
              ],
            ),
            const SizedBox(height: 12),
            if (_editing) ...[
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'UZCARD', label: Text('Uzcard')),
                  ButtonSegment(value: 'HUMO', label: Text('Humo')),
                ],
                selected: {_selectedBank},
                onSelectionChanged: (s) => setState(() => _selectedBank = s.first),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _cardCtrl,
                decoration: const InputDecoration(
                  labelText: 'Card number',
                  hintText: '8600 0000 0000 0000',
                  isDense: true,
                ),
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                maxLength: 16,
              ),
              const SizedBox(height: 4),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: _saving ? null : _cancel,
                    child: const Text('Cancel'),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(
                    onPressed: _saving ? null : _save,
                    child: _saving
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Save'),
                  ),
                ],
              ),
            ] else if (hasCard) ...[
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      widget.data.business.cardBank ?? 'UZCARD',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    _formatCardNumber(widget.data.business.cardNumber!),
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                      letterSpacing: 1,
                    ),
                  ),
                ],
              ),
            ] else ...[
              Text(
                'No payment card set. Customers will not be able to pay.',
                style: TextStyle(color: Colors.orange[700], fontSize: 13),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _formatCardNumber(String raw) {
    final digits = raw.replaceAll(' ', '');
    final buf = StringBuffer();
    for (int i = 0; i < digits.length; i++) {
      if (i > 0 && i % 4 == 0) buf.write(' ');
      buf.write(digits[i]);
    }
    return buf.toString();
  }
}

// ── Bot section ──────────────────────────────────────────────────────

class _BotSection extends StatelessWidget {
  final SettingsState data;
  const _BotSection({required this.data});

  @override
  Widget build(BuildContext context) {
    final hasBot = data.botUsername != null && data.botUsername!.isNotEmpty;

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'TELEGRAM BOT',
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: Colors.grey[600],
                    letterSpacing: 0.5,
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 12),
            if (!hasBot)
              Text(
                'No bot configured. Contact support to set up your bot.',
                style: TextStyle(color: Colors.grey[600], fontSize: 13),
              )
            else ...[
              Row(
                children: [
                  const Icon(Icons.telegram, size: 18, color: Color(0xFF229ED9)),
                  const SizedBox(width: 6),
                  Text(
                    '@${data.botUsername}',
                    style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
                  ),
                ],
              ),
              if (data.botLink != null) ...[
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.grey[100],
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.grey[300]!),
                        ),
                        child: Text(
                          data.botLink!,
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[700],
                            fontFamily: 'monospace',
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton(
                      icon: const Icon(Icons.copy_outlined, size: 18),
                      tooltip: 'Copy link',
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: data.botLink!));
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Bot link copied'),
                            duration: Duration(seconds: 2),
                          ),
                        );
                      },
                      visualDensity: VisualDensity.compact,
                    ),
                  ],
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }
}

// ── Language section ─────────────────────────────────────────────────

class _LanguageSection extends ConsumerWidget {
  final SettingsState data;
  const _LanguageSection({required this.data});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final current = data.business.language;

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'LANGUAGE',
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: Colors.grey[600],
                    letterSpacing: 0.5,
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 12),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'UZBEK', label: Text("O'zbek")),
                ButtonSegment(value: 'RUSSIAN', label: Text('Русский')),
              ],
              selected: {current},
              onSelectionChanged: (s) async {
                try {
                  await ref
                      .read(settingsProvider.notifier)
                      .saveLanguage(s.first);
                } catch (e) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Error: $e'),
                        backgroundColor: Colors.red,
                      ),
                    );
                  }
                }
              },
            ),
            const SizedBox(height: 8),
            Text(
              'This sets the language your Telegram bot uses with customers.',
              style: TextStyle(color: Colors.grey[500], fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Account section ──────────────────────────────────────────────────

class _AccountSection extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'ACCOUNT',
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: Colors.grey[600],
                    letterSpacing: 0.5,
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                icon: const Icon(Icons.logout, size: 18, color: Colors.red),
                label: const Text(
                  'Log out',
                  style: TextStyle(color: Colors.red),
                ),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Colors.red),
                  alignment: Alignment.centerLeft,
                ),
                onPressed: () async {
                  await ref.read(authNotifierProvider).logout();
                  if (context.mounted) context.go('/login');
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Customer fields section ──────────────────────────────────────────

class _CustomerFieldsSection extends ConsumerStatefulWidget {
  const _CustomerFieldsSection();

  @override
  ConsumerState<_CustomerFieldsSection> createState() =>
      _CustomerFieldsSectionState();
}

class _CustomerFieldsSectionState
    extends ConsumerState<_CustomerFieldsSection> {
  static const _typeIcons = {
    'TEXT': Icons.text_fields,
    'NUMBER': Icons.pin_outlined,
    'DATE': Icons.calendar_today_outlined,
    'YESNO': Icons.toggle_on_outlined,
  };

  Future<void> _addField() async {
    final result = await showDialog<({String name, String fieldType})>(
      context: context,
      builder: (_) => const _AddFieldDialog(),
    );
    if (result == null || !mounted) return;
    try {
      await ref
          .read(customFieldsProvider.notifier)
          .add(result.name, result.fieldType);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _removeField(String fieldId) async {
    try {
      await ref.read(customFieldsProvider.notifier).remove(fieldId);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final fieldsAsync = ref.watch(customFieldsProvider);

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  'CUSTOMER FIELDS',
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: Colors.grey[600],
                        letterSpacing: 0.5,
                        fontWeight: FontWeight.w600,
                      ),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.add, size: 20),
                  tooltip: 'Add field',
                  visualDensity: VisualDensity.compact,
                  onPressed: _addField,
                ),
              ],
            ),
            fieldsAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 8),
                child: LinearProgressIndicator(),
              ),
              error: (e, _) => Text('Error: $e',
                  style: const TextStyle(color: Colors.red, fontSize: 13)),
              data: (fields) {
                if (fields.isEmpty) {
                  return Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      'No custom fields. Add fields to collect extra info about customers.',
                      style: TextStyle(color: Colors.grey[500], fontSize: 12),
                    ),
                  );
                }
                return Column(
                  children: fields
                      .map((f) => _FieldTile(
                            field: f,
                            typeIcons: _typeIcons,
                            onDelete: () => _removeField(f.id),
                          ))
                      .toList(),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

// Dialog returns typed data — no Riverpod inside
class _AddFieldDialog extends StatefulWidget {
  const _AddFieldDialog();

  @override
  State<_AddFieldDialog> createState() => _AddFieldDialogState();
}

class _AddFieldDialogState extends State<_AddFieldDialog> {
  static const _fieldTypes = [
    ('TEXT', 'Text'),
    ('NUMBER', 'Number'),
    ('DATE', 'Date'),
    ('YESNO', 'Yes / No'),
  ];

  final _nameCtrl = TextEditingController();
  String _selectedType = 'TEXT';

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Add customer field'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: _nameCtrl,
            decoration: const InputDecoration(
              labelText: 'Field name',
              hintText: 'e.g. Company, Instagram handle',
              isDense: true,
            ),
            autofocus: true,
          ),
          const SizedBox(height: 16),
          Text('Field type',
              style: TextStyle(fontSize: 12, color: Colors.grey[600])),
          const SizedBox(height: 6),
          Wrap(
            spacing: 8,
            children: _fieldTypes.map((entry) {
              final (value, label) = entry;
              return ChoiceChip(
                label: Text(label),
                selected: _selectedType == value,
                onSelected: (_) => setState(() => _selectedType = value),
              );
            }).toList(),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: () {
            final name = _nameCtrl.text.trim();
            if (name.isEmpty) return;
            Navigator.pop(context, (name: name, fieldType: _selectedType));
          },
          child: const Text('Add'),
        ),
      ],
    );
  }
}

class _FieldTile extends StatelessWidget {
  final BusinessCustomField field;
  final Map<String, IconData> typeIcons;
  final VoidCallback onDelete;
  const _FieldTile(
      {required this.field, required this.typeIcons, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      dense: true,
      contentPadding: EdgeInsets.zero,
      leading: Icon(typeIcons[field.fieldType] ?? Icons.text_fields,
          size: 18, color: Colors.grey[600]),
      title: Text(field.name, style: const TextStyle(fontSize: 14)),
      subtitle: Text(field.fieldType.toLowerCase(),
          style: TextStyle(fontSize: 11, color: Colors.grey[500])),
      trailing: IconButton(
        icon: const Icon(Icons.delete_outline, size: 18, color: Colors.red),
        visualDensity: VisualDensity.compact,
        onPressed: onDelete,
      ),
    );
  }
}

// ── Stages section ────────────────────────────────────────────────────

class _StagesSection extends ConsumerStatefulWidget {
  const _StagesSection();

  @override
  ConsumerState<_StagesSection> createState() => _StagesSectionState();
}

class _StagesSectionState extends ConsumerState<_StagesSection> {
  Future<void> _addStage() async {
    final result = await showDialog<({String name, String color})>(
      context: context,
      builder: (_) => const _AddStageDialog(),
    );
    if (result == null || !mounted) return;
    try {
      await ref.read(stagesProvider.notifier).add(result.name, result.color);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _removeStage(String stageId) async {
    try {
      await ref.read(stagesProvider.notifier).remove(stageId);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final stagesAsync = ref.watch(stagesProvider);

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  'PIPELINE STAGES',
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: Colors.grey[600],
                        letterSpacing: 0.5,
                        fontWeight: FontWeight.w600,
                      ),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.add, size: 20),
                  tooltip: 'Add stage',
                  visualDensity: VisualDensity.compact,
                  onPressed: _addStage,
                ),
              ],
            ),
            stagesAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 8),
                child: LinearProgressIndicator(),
              ),
              error: (e, _) => Text('Error: $e',
                  style: const TextStyle(color: Colors.red, fontSize: 13)),
              data: (stages) {
                if (stages.isEmpty) {
                  return Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      'No pipeline stages. Add stages to track where customers are in your sales process.',
                      style: TextStyle(color: Colors.grey[500], fontSize: 12),
                    ),
                  );
                }
                return Column(
                  children: stages
                      .map((s) => _StageTile(
                            stage: s,
                            onDelete: () => _removeStage(s.id),
                          ))
                      .toList(),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

// Dialog returns typed data — no Riverpod inside
class _AddStageDialog extends StatefulWidget {
  const _AddStageDialog();

  @override
  State<_AddStageDialog> createState() => _AddStageDialogState();
}

class _AddStageDialogState extends State<_AddStageDialog> {
  static const _palette = [
    '#6366F1', '#8B5CF6', '#EC4899', '#EF4444',
    '#F97316', '#EAB308', '#22C55E', '#14B8A6',
    '#3B82F6', '#6B7280',
  ];

  final _nameCtrl = TextEditingController();
  String _selectedColor = _palette[0];

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Add pipeline stage'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: _nameCtrl,
            decoration: const InputDecoration(
              labelText: 'Stage name',
              hintText: 'e.g. Lead, Negotiating, Won',
              isDense: true,
            ),
            autofocus: true,
          ),
          const SizedBox(height: 16),
          Text('Color',
              style: TextStyle(fontSize: 12, color: Colors.grey[600])),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _palette.map((hex) {
              final color = Color(
                  int.parse('FF${hex.replaceFirst('#', '')}', radix: 16));
              return GestureDetector(
                onTap: () => setState(() => _selectedColor = hex),
                child: Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: color,
                    shape: BoxShape.circle,
                    border: _selectedColor == hex
                        ? Border.all(color: Colors.black, width: 2)
                        : null,
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: () {
            final name = _nameCtrl.text.trim();
            if (name.isEmpty) return;
            Navigator.pop(context, (name: name, color: _selectedColor));
          },
          child: const Text('Add'),
        ),
      ],
    );
  }
}

class _StageTile extends StatelessWidget {
  final CustomerStage stage;
  final VoidCallback onDelete;
  const _StageTile({required this.stage, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final color = Color(
        int.parse('FF${stage.color.replaceFirst('#', '')}', radix: 16));
    return ListTile(
      dense: true,
      contentPadding: EdgeInsets.zero,
      leading: Container(
        width: 14,
        height: 14,
        decoration: BoxDecoration(color: color, shape: BoxShape.circle),
      ),
      title: Text(stage.name, style: const TextStyle(fontSize: 14)),
      trailing: IconButton(
        icon: const Icon(Icons.delete_outline, size: 18, color: Colors.red),
        visualDensity: VisualDensity.compact,
        onPressed: onDelete,
      ),
    );
  }
}

// ── Checkout questions section ────────────────────────────────────────

class _CheckoutQuestionsSection extends ConsumerStatefulWidget {
  const _CheckoutQuestionsSection();

  @override
  ConsumerState<_CheckoutQuestionsSection> createState() =>
      _CheckoutQuestionsSectionState();
}

class _CheckoutQuestionsSectionState
    extends ConsumerState<_CheckoutQuestionsSection> {
  Future<void> _addQuestion() async {
    final result = await showDialog<({String question, bool required})>(
      context: context,
      builder: (_) => const _AddQuestionDialog(),
    );
    if (result == null || !mounted) return;
    try {
      await ref
          .read(checkoutQuestionsProvider.notifier)
          .add(result.question, result.required);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _removeQuestion(String id) async {
    try {
      await ref.read(checkoutQuestionsProvider.notifier).remove(id);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final questionsAsync = ref.watch(checkoutQuestionsProvider);

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  'CHECKOUT QUESTIONS',
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: Colors.grey[600],
                        letterSpacing: 0.5,
                        fontWeight: FontWeight.w600,
                      ),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.add, size: 20),
                  tooltip: 'Add question',
                  visualDensity: VisualDensity.compact,
                  onPressed: _addQuestion,
                ),
              ],
            ),
            questionsAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 8),
                child: LinearProgressIndicator(),
              ),
              error: (e, _) => Text('Error: $e',
                  style: const TextStyle(color: Colors.red, fontSize: 13)),
              data: (questions) {
                if (questions.isEmpty) {
                  return Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      'No checkout questions. Questions are asked in the Telegram bot during checkout.',
                      style: TextStyle(color: Colors.grey[500], fontSize: 12),
                    ),
                  );
                }
                return Column(
                  children: questions
                      .map((q) => _QuestionTile(
                            question: q,
                            onDelete: () => _removeQuestion(q.id),
                          ))
                      .toList(),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

// Dialog returns typed data — no Riverpod inside
class _AddQuestionDialog extends StatefulWidget {
  const _AddQuestionDialog();

  @override
  State<_AddQuestionDialog> createState() => _AddQuestionDialogState();
}

class _AddQuestionDialogState extends State<_AddQuestionDialog> {
  final _questionCtrl = TextEditingController();
  bool _isRequired = false;

  @override
  void dispose() {
    _questionCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Add checkout question'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: _questionCtrl,
            decoration: const InputDecoration(
              labelText: 'Question',
              hintText: 'e.g. Any allergies or special requests?',
              isDense: true,
            ),
            autofocus: true,
            maxLines: 3,
          ),
          const SizedBox(height: 12),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Required', style: TextStyle(fontSize: 14)),
            value: _isRequired,
            onChanged: (v) => setState(() => _isRequired = v),
            dense: true,
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: () {
            final text = _questionCtrl.text.trim();
            if (text.isEmpty) return;
            Navigator.pop(context, (question: text, required: _isRequired));
          },
          child: const Text('Add'),
        ),
      ],
    );
  }
}

class _QuestionTile extends StatelessWidget {
  final CheckoutQuestion question;
  final VoidCallback onDelete;
  const _QuestionTile({required this.question, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      dense: true,
      contentPadding: EdgeInsets.zero,
      leading: Icon(
        question.required
            ? Icons.help_outline
            : Icons.help_center_outlined,
        size: 18,
        color: question.required ? Colors.orange[700] : Colors.grey[400],
      ),
      title: Text(question.question,
          style: const TextStyle(fontSize: 13), maxLines: 2),
      subtitle: Text(
        question.required ? 'Required' : 'Optional',
        style: TextStyle(
            fontSize: 11,
            color:
                question.required ? Colors.orange[700] : Colors.grey[500]),
      ),
      trailing: IconButton(
        icon: const Icon(Icons.delete_outline, size: 18, color: Colors.red),
        visualDensity: VisualDensity.compact,
        onPressed: onDelete,
      ),
    );
  }
}

// ── Services section ─────────────────────────────────────────────────

class _ServicesSection extends StatelessWidget {
  const _ServicesSection();

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'SERVICES',
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: Colors.grey[600],
                    letterSpacing: 0.5,
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 8),
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Manage services'),
              trailing: const Icon(Icons.chevron_right),
              dense: true,
              onTap: () => context.push('/services'),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Staff section ─────────────────────────────────────────────────────

class _StaffSection extends StatelessWidget {
  const _StaffSection();

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'STAFF',
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: Colors.grey[600],
                    letterSpacing: 0.5,
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 8),
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Manage staff'),
              trailing: const Icon(Icons.chevron_right),
              dense: true,
              onTap: () => context.push('/staff'),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Error view ───────────────────────────────────────────────────────

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            TextButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}
