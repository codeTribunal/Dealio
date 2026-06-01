import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_card.dart';
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
              content: Text(e.toString()),
              backgroundColor: AppTokens.of(context).error),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(_isEdit ? l.serviceFormEditTitle : l.serviceFormNewTitle),
        actions: [
          TextButton(
            onPressed: _saving ? null : _save,
            child: Text(l.buttonSave),
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.s4),
          children: [
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _FieldLabel(l.serviceFormNameLabel),
                  TextFormField(
                    controller: _nameCtrl,
                    style: TextStyle(color: t.text1),
                    decoration: _decoration(context),
                    validator: (v) => (v == null || v.trim().isEmpty)
                        ? l.formRequired
                        : null,
                  ),
                  const SizedBox(height: AppSpacing.s4),
                  _FieldLabel(l.serviceFormDurationLabel),
                  TextFormField(
                    controller: _durationCtrl,
                    style: TextStyle(color: t.text1),
                    decoration: _decoration(context),
                    keyboardType: TextInputType.number,
                    validator: (v) {
                      final n = int.tryParse(v?.trim() ?? '');
                      return (n == null || n <= 0)
                          ? l.formPositiveInteger
                          : null;
                    },
                  ),
                  const SizedBox(height: AppSpacing.s4),
                  _FieldLabel(l.serviceFormPriceLabel),
                  TextFormField(
                    controller: _priceCtrl,
                    style: TextStyle(color: t.text1),
                    decoration: _decoration(context, suffixText: 'UZS'),
                    keyboardType: TextInputType.number,
                    validator: (v) {
                      final n = int.tryParse(v?.trim() ?? '');
                      return (n == null || n <= 0)
                          ? l.formPositiveInteger
                          : null;
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.s3),
            AppCard(
              padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.s4, vertical: AppSpacing.s2),
              child: SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(l.commonActive, style: TextStyle(color: t.text1)),
                subtitle: Text(l.serviceFormActiveSubtitle,
                    style:
                        TextStyle(color: t.text2, fontSize: AppTextSizes.caption)),
                value: _active,
                activeThumbColor: t.accent,
                onChanged: (v) => setState(() => _active = v),
              ),
            ),
            const SizedBox(height: AppSpacing.s5),
            AppButton(
              label: l.buttonSave,
              fullWidth: true,
              loading: _saving,
              onPressed: _saving ? null : _save,
            ),
            const SizedBox(height: AppSpacing.s6),
          ],
        ),
      ),
    );
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

InputDecoration _decoration(BuildContext context, {String? suffixText}) {
  final t = AppTokens.of(context);
  OutlineInputBorder border(Color color, [double width = 1]) =>
      OutlineInputBorder(
        borderRadius: AppRadii.md,
        borderSide: BorderSide(color: color, width: width),
      );
  return InputDecoration(
    suffixText: suffixText,
    filled: true,
    fillColor: t.surface,
    isDense: true,
    contentPadding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.s4, vertical: AppSpacing.s3),
    border: border(t.border),
    enabledBorder: border(t.border),
    focusedBorder: border(t.accent, 2),
    errorBorder: border(t.error),
    focusedErrorBorder: border(t.error, 2),
    errorStyle: TextStyle(color: t.errorStrong),
  );
}
