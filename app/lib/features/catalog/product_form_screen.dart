import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_service.dart';
import '../../core/icons/app_icon.dart';
import '../../core/theme/app_tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/utils/format.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_card.dart';
import '../../shared/widgets/app_dialog.dart';
import '../../shared/widgets/app_spinner.dart';
import '../../shared/widgets/app_switch.dart';
import 'catalog_provider.dart';

class ProductFormScreen extends ConsumerStatefulWidget {
  final String? productId;
  const ProductFormScreen({super.key, this.productId});

  bool get isEditing => productId != null;

  @override
  ConsumerState<ProductFormScreen> createState() => _ProductFormScreenState();
}

class _ProductFormScreenState extends ConsumerState<ProductFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _priceCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _stockCtrl = TextEditingController();

  String _prepTimeValue = '';
  String _prepTimeUnit = 'hours';

  bool _unlimited = false;
  bool _active = true;
  bool _loadingProduct = false;
  bool _saving = false;
  String? _loadError;

  @override
  void initState() {
    super.initState();
    if (widget.isEditing) _loadProduct();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _priceCtrl.dispose();
    _descCtrl.dispose();
    _stockCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadProduct() async {
    setState(() {
      _loadingProduct = true;
      _loadError = null;
    });
    try {
      final product =
          await ref.read(apiServiceProvider).getProduct(widget.productId!);
      if (!mounted) return;
      _nameCtrl.text = product.name;
      _priceCtrl.text = product.price.toString();
      _descCtrl.text = product.description ?? '';
      _stockCtrl.text = product.stockQty?.toString() ?? '';
      if (product.prepTime != null) {
        final parts = product.prepTime!.split(' ');
        if (parts.length >= 2) {
          _prepTimeValue = parts[0];
          _prepTimeUnit = parts[1];
        }
      }
      setState(() {
        _unlimited = product.unlimited;
        _active = product.active;
        _loadingProduct = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadError = e.toString();
        _loadingProduct = false;
      });
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);

    final data = _buildData();
    try {
      if (widget.isEditing) {
        await ref
            .read(apiServiceProvider)
            .updateProduct(widget.productId!, data);
      } else {
        await ref.read(apiServiceProvider).createProduct(data);
      }
      if (mounted) context.pop();
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
              AppLocalizations.of(context)!.errorWithMessage(e.toString())),
          backgroundColor: AppTokens.of(context).error,
        ),
      );
    }
  }

  Map<String, dynamic> _buildData() {
    final data = <String, dynamic>{
      'name': _nameCtrl.text.trim(),
      'price': int.parse(_priceCtrl.text.trim()),
      'unlimited': _unlimited,
      'active': _active,
    };
    final desc = _descCtrl.text.trim();
    if (desc.isNotEmpty) data['description'] = desc;
    if (_prepTimeValue.isNotEmpty) {
      data['prepTime'] = '$_prepTimeValue $_prepTimeUnit';
    }
    if (!_unlimited) {
      final stock = _stockCtrl.text.trim();
      if (stock.isNotEmpty) data['stockQty'] = int.parse(stock);
    }
    return data;
  }

  // Soft-delete (edit mode only), mirroring the Edit Service screen: confirm
  // dialog → DELETE via the catalog provider (which invalidates the list) → pop.
  Future<void> _confirmDelete() async {
    final l = AppLocalizations.of(context)!;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AppDialog(
        title: l.productDeleteTitle,
        content: Text(l.productDeleteConfirm),
        actions: [
          AppButton(
            label: l.buttonCancel,
            variant: AppButtonVariant.ghost,
            size: AppButtonSize.sm,
            onPressed: () => Navigator.of(ctx).pop(false),
          ),
          AppButton(
            label: l.buttonDelete,
            variant: AppButtonVariant.danger,
            size: AppButtonSize.sm,
            onPressed: () => Navigator.of(ctx).pop(true),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    try {
      await ref.read(catalogProvider.notifier).deleteProduct(widget.productId!);
      if (mounted) context.pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(e.toString()),
              backgroundColor: AppTokens.of(context).error),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.isEditing
            ? l.productFormEditTitle
            : l.productFormNewTitle),
      ),
      body: _buildBody(l),
    );
  }

  Widget _buildBody(AppLocalizations l) {
    final t = AppTokens.of(context);
    if (_loadingProduct) {
      return const Center(child: AppSpinner(size: 32));
    }
    if (_loadError != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.s5),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AppIcon(name: AppIconName.close, size: 48, color: t.errorStrong),
              const SizedBox(height: AppSpacing.s3),
              Text(_loadError!,
                  textAlign: TextAlign.center,
                  style: TextStyle(color: t.text2)),
              const SizedBox(height: AppSpacing.s4),
              AppButton(
                label: l.buttonRetry,
                variant: AppButtonVariant.secondary,
                size: AppButtonSize.sm,
                onPressed: _loadProduct,
              ),
            ],
          ),
        ),
      );
    }

    return Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.all(AppSpacing.s4),
        children: [
          // ── Details card: name / price / description ──────────
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _FieldLabel(l.productFormNameLabel),
                TextFormField(
                  controller: _nameCtrl,
                  style: TextStyle(color: t.text1),
                  decoration:
                      _decoration(context, hint: l.productFormNameHint),
                  textCapitalization: TextCapitalization.sentences,
                  validator: (v) => (v == null || v.trim().isEmpty)
                      ? l.productFormNameRequired
                      : null,
                ),
                const SizedBox(height: AppSpacing.s4),
                _FieldLabel(l.productFormPriceLabel),
                TextFormField(
                  controller: _priceCtrl,
                  style: TextStyle(color: t.text1),
                  decoration: _decoration(context,
                      hint: '150000', suffixText: currencyWord()),
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) {
                      return l.productFormPriceRequired;
                    }
                    final n = int.tryParse(v.trim());
                    if (n == null || n <= 0) return l.productFormPriceInvalid;
                    return null;
                  },
                ),
                const SizedBox(height: AppSpacing.s4),
                _FieldLabel(l.productFormDescLabel),
                TextFormField(
                  controller: _descCtrl,
                  style: TextStyle(color: t.text1),
                  decoration:
                      _decoration(context, hint: l.productFormDescHint),
                  textCapitalization: TextCapitalization.sentences,
                  maxLines: 3,
                ),
              ],
            ),
          ),

          const SizedBox(height: AppSpacing.s3),

          // ── Stock card ────────────────────────────────────────
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _FieldLabel(l.productFormStockLabel),
                          TextFormField(
                            controller: _stockCtrl,
                            enabled: !_unlimited,
                            style: TextStyle(color: t.text1),
                            decoration: _decoration(context,
                                hint: l.productFormStockHint),
                            keyboardType: TextInputType.number,
                            inputFormatters: [
                              FilteringTextInputFormatter.digitsOnly
                            ],
                            validator: (v) {
                              if (_unlimited) return null;
                              if (v != null && v.trim().isNotEmpty) {
                                final n = int.tryParse(v.trim());
                                if (n == null || n < 0) {
                                  return l.productFormStockInvalid;
                                }
                              }
                              return null;
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: AppSpacing.s4),
                    Column(
                      children: [
                        Text(l.stockUnlimited,
                            style: TextStyle(
                                fontSize: AppTextSizes.caption,
                                color: t.text2)),
                        AppSwitch(
                          value: _unlimited,
                          onChanged: (v) => setState(() {
                            _unlimited = v;
                            if (v) _stockCtrl.clear();
                          }),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: AppSpacing.s3),

          // ── Prep time card (number input + unit dropdown — UNCHANGED logic) ──
          AppCard(
            child: Row(
              children: [
                SizedBox(
                  width: 80,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _FieldLabel(l.productFormTimeLabel),
                      TextFormField(
                        initialValue: _prepTimeValue,
                        keyboardType: TextInputType.number,
                        style: TextStyle(color: t.text1),
                        decoration: _decoration(context, hint: '2'),
                        onChanged: (v) => setState(() => _prepTimeValue = v),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: AppSpacing.s2),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _FieldLabel(l.productFormUnitLabel),
                      DropdownButtonFormField<String>(
                        // ignore: deprecated_member_use
                        value: _prepTimeUnit,
                        style: TextStyle(color: t.text1),
                        dropdownColor: t.surface,
                        borderRadius: AppRadii.md,
                        decoration: _decoration(context),
                        items: [
                          DropdownMenuItem(
                              value: 'minutes',
                              child: Text(l.prepUnitMinutes)),
                          DropdownMenuItem(
                              value: 'hours', child: Text(l.prepUnitHours)),
                          DropdownMenuItem(
                              value: 'days', child: Text(l.prepUnitDays)),
                          DropdownMenuItem(
                              value: 'weeks', child: Text(l.prepUnitWeeks)),
                        ],
                        onChanged: (v) =>
                            setState(() => _prepTimeUnit = v ?? 'hours'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: AppSpacing.s3),

          // ── Active toggle card ────────────────────────────────
          AppCard(
            padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.s4, vertical: AppSpacing.s2),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(l.commonActive, style: TextStyle(color: t.text1)),
                      Text(
                        _active ? l.productFormActiveOn : l.productFormActiveOff,
                        style: TextStyle(
                            color: t.text2, fontSize: AppTextSizes.caption),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: AppSpacing.s3),
                AppSwitch(
                  value: _active,
                  onChanged: (v) => setState(() => _active = v),
                ),
              ],
            ),
          ),

          const SizedBox(height: AppSpacing.s5),

          // ── Save button ───────────────────────────────────────
          AppButton(
            label: widget.isEditing ? l.buttonSaveChanges : l.productFormCreate,
            fullWidth: true,
            loading: _saving,
            onPressed: _saving ? null : _save,
          ),

          // Edit mode only: danger soft-delete below Save (mirrors Edit Service).
          if (widget.isEditing) ...[
            const SizedBox(height: AppSpacing.s3),
            AppButton(
              label: l.productDeleteButton,
              variant: AppButtonVariant.danger,
              fullWidth: true,
              onPressed: _saving ? null : _confirmDelete,
            ),
          ],

          const SizedBox(height: AppSpacing.s6),
        ],
      ),
    );
  }
}

// ── Field helpers ───────────────────────────────────────────────────

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

InputDecoration _decoration(
  BuildContext context, {
  String? hint,
  String? suffixText,
}) {
  final t = AppTokens.of(context);
  OutlineInputBorder border(Color color, [double width = 1]) =>
      OutlineInputBorder(
        borderRadius: AppRadii.md,
        borderSide: BorderSide(color: color, width: width),
      );
  return InputDecoration(
    hintText: hint,
    hintStyle: TextStyle(color: t.text3),
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
