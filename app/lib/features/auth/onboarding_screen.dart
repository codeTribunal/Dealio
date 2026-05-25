import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_service.dart';
import '../../core/auth/auth_notifier.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_text_field.dart';

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _cardController = TextEditingController();
  final _botTokenController = TextEditingController();
  final _botUsernameController = TextEditingController();

  final Set<String> _selectedModes = {'PRODUCTS'};
  String _cardBank = 'UZCARD';
  bool _loading = false;

  @override
  void dispose() {
    _nameController.dispose();
    _cardController.dispose();
    _botTokenController.dispose();
    _botUsernameController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedModes.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Select at least one business mode')),
      );
      return;
    }
    setState(() => _loading = true);
    try {
      final data = <String, dynamic>{
        'name': _nameController.text.trim(),
        'mode': _selectedModes.toList(),
        if (_cardController.text.trim().isNotEmpty)
          'cardNumber': _cardController.text.trim(),
        if (_cardController.text.trim().isNotEmpty) 'cardBank': _cardBank,
        if (_botTokenController.text.trim().isNotEmpty)
          'botToken': _botTokenController.text.trim(),
        if (_botUsernameController.text.trim().isNotEmpty)
          'botUsername': _botUsernameController.text.trim(),
      };

      final business = await ref.read(apiServiceProvider).createBusiness(data);
      ref.read(authNotifierProvider).setBusiness(business);

      if (!mounted) return;
      context.go('/home');
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Set up your business')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                AppTextField(
                  label: 'Business name',
                  hint: 'e.g. Maftuna Cakes',
                  controller: _nameController,
                  validator: (v) =>
                      v == null || v.trim().isEmpty ? 'Required' : null,
                ),
                const SizedBox(height: 24),
                Text(
                  'Business type',
                  style: Theme.of(context)
                      .textTheme
                      .labelMedium
                      ?.copyWith(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 8),
                _ModeSelector(
                  selected: _selectedModes,
                  onChanged: (modes) => setState(() {
                    _selectedModes
                      ..clear()
                      ..addAll(modes);
                  }),
                ),
                const SizedBox(height: 24),
                const Divider(),
                const SizedBox(height: 16),
                Text(
                  'Payment card (optional)',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: Colors.grey[700],
                      ),
                ),
                const SizedBox(height: 12),
                AppTextField(
                  label: 'Card number',
                  hint: '8600 0000 0000 0000',
                  controller: _cardController,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _BankButton(
                        label: 'Uzcard',
                        selected: _cardBank == 'UZCARD',
                        onTap: () => setState(() => _cardBank = 'UZCARD'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _BankButton(
                        label: 'Humo',
                        selected: _cardBank == 'HUMO',
                        onTap: () => setState(() => _cardBank = 'HUMO'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                const Divider(),
                const SizedBox(height: 16),
                Text(
                  'Telegram bot (optional)',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: Colors.grey[700],
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Get a bot token from @BotFather on Telegram',
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(color: Colors.grey),
                ),
                const SizedBox(height: 12),
                AppTextField(
                  label: 'Bot token',
                  hint: '123456:ABCdef...',
                  controller: _botTokenController,
                ),
                const SizedBox(height: 12),
                AppTextField(
                  label: 'Bot username',
                  hint: 'maftuna_cakes_bot',
                  controller: _botUsernameController,
                ),
                const SizedBox(height: 32),
                AppButton(
                  label: 'Create business',
                  onPressed: _submit,
                  loading: _loading,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ModeSelector extends StatelessWidget {
  final Set<String> selected;
  final void Function(Set<String>) onChanged;

  const _ModeSelector({required this.selected, required this.onChanged});

  static const _options = [
    ('PRODUCTS', 'Products', Icons.shopping_bag_outlined),
    ('SERVICES', 'Services', Icons.content_cut_outlined),
    ('FREELANCE', 'Freelance', Icons.laptop_outlined),
  ];

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 10,
      children: _options.map((opt) {
        final (value, label, icon) = opt;
        final isSelected = selected.contains(value);
        return FilterChip(
          label: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 16),
              const SizedBox(width: 4),
              Text(label),
            ],
          ),
          selected: isSelected,
          onSelected: (v) {
            final next = Set<String>.from(selected);
            v ? next.add(value) : next.remove(value);
            onChanged(next);
          },
        );
      }).toList(),
    );
  }
}

class _BankButton extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _BankButton({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: selected
              ? Theme.of(context).colorScheme.primary
              : const Color(0xFFF5F7FF),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: selected
                ? Theme.of(context).colorScheme.primary
                : const Color(0xFFE2E8F0),
          ),
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: selected ? Colors.white : Colors.black87,
            ),
          ),
        ),
      ),
    );
  }
}
