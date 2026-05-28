import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_service.dart';
import '../../l10n/app_localizations.dart';

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
          content: Text(AppLocalizations.of(context)!.errorWithMessage(e.toString())),
          backgroundColor: Colors.red,
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

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.isEditing
            ? l.productFormEditTitle
            : l.productFormNewTitle),
        actions: [
          if (_saving)
            const Padding(
              padding: EdgeInsets.all(16),
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            )
          else
            TextButton(
              onPressed: _save,
              child: Text(l.buttonSave),
            ),
        ],
      ),
      body: _buildBody(l),
    );
  }

  Widget _buildBody(AppLocalizations l) {
    if (_loadingProduct) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_loadError != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 12),
              Text(_loadError!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              TextButton(
                  onPressed: _loadProduct, child: Text(l.buttonRetry)),
            ],
          ),
        ),
      );
    }

    return Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ── Name ──────────────────────────────────────────────
          TextFormField(
            controller: _nameCtrl,
            decoration: InputDecoration(
              labelText: l.productFormNameLabel,
              hintText: l.productFormNameHint,
            ),
            textCapitalization: TextCapitalization.sentences,
            validator: (v) =>
                (v == null || v.trim().isEmpty) ? l.productFormNameRequired : null,
          ),

          const SizedBox(height: 16),

          // ── Price ─────────────────────────────────────────────
          TextFormField(
            controller: _priceCtrl,
            decoration: InputDecoration(
              labelText: l.productFormPriceLabel,
              suffixText: 'UZS',
              hintText: '150000',
            ),
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            validator: (v) {
              if (v == null || v.trim().isEmpty) return l.productFormPriceRequired;
              final n = int.tryParse(v.trim());
              if (n == null || n <= 0) return l.productFormPriceInvalid;
              return null;
            },
          ),

          const SizedBox(height: 16),

          // ── Description ───────────────────────────────────────
          TextFormField(
            controller: _descCtrl,
            decoration: InputDecoration(
              labelText: l.productFormDescLabel,
              hintText: l.productFormDescHint,
            ),
            textCapitalization: TextCapitalization.sentences,
            maxLines: 3,
          ),

          const SizedBox(height: 16),

          // ── Stock ─────────────────────────────────────────────
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  controller: _stockCtrl,
                  enabled: !_unlimited,
                  decoration: InputDecoration(
                    labelText: l.productFormStockLabel,
                    hintText: l.productFormStockHint,
                  ),
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  validator: (v) {
                    if (_unlimited) return null;
                    if (v != null && v.trim().isNotEmpty) {
                      final n = int.tryParse(v.trim());
                      if (n == null || n < 0) return l.productFormStockInvalid;
                    }
                    return null;
                  },
                ),
              ),
              const SizedBox(width: 16),
              Column(
                children: [
                  Text(l.stockUnlimited,
                      style: const TextStyle(fontSize: 12)),
                  Switch(
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

          const SizedBox(height: 16),

          // ── Prep time ─────────────────────────────────────────
          Row(
            children: [
              SizedBox(
                width: 80,
                child: TextFormField(
                  initialValue: _prepTimeValue,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    labelText: l.productFormTimeLabel,
                    hintText: '2',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onChanged: (v) => setState(() => _prepTimeValue = v),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: DropdownButtonFormField<String>(
                  // ignore: deprecated_member_use
                  value: _prepTimeUnit,
                  decoration: InputDecoration(
                    labelText: l.productFormUnitLabel,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  items: [
                    DropdownMenuItem(value: 'minutes', child: Text(l.prepUnitMinutes)),
                    DropdownMenuItem(value: 'hours', child: Text(l.prepUnitHours)),
                    DropdownMenuItem(value: 'days', child: Text(l.prepUnitDays)),
                    DropdownMenuItem(value: 'weeks', child: Text(l.prepUnitWeeks)),
                  ],
                  onChanged: (v) => setState(() => _prepTimeUnit = v ?? 'hours'),
                ),
              ),
            ],
          ),

          const SizedBox(height: 8),

          // ── Active toggle ─────────────────────────────────────
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(l.commonActive),
            subtitle: Text(
              _active ? l.productFormActiveOn : l.productFormActiveOff,
              style: TextStyle(color: Colors.grey[600], fontSize: 12),
            ),
            value: _active,
            onChanged: (v) => setState(() => _active = v),
          ),

          const SizedBox(height: 24),

          // ── Save button (bottom of scroll) ────────────────────
          FilledButton(
            onPressed: _saving ? null : _save,
            style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14)),
            child: Text(widget.isEditing ? l.buttonSaveChanges : l.productFormCreate),
          ),

          const SizedBox(height: 32),
        ],
      ),
    );
  }
}
