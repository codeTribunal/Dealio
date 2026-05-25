import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_service.dart';

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
  final _prepCtrl = TextEditingController();

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
    _prepCtrl.dispose();
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
      _prepCtrl.text = product.prepTime ?? '';
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
          content: Text('Error: $e'),
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
    final prep = _prepCtrl.text.trim();
    if (prep.isNotEmpty) data['prepTime'] = prep;
    if (!_unlimited) {
      final stock = _stockCtrl.text.trim();
      if (stock.isNotEmpty) data['stockQty'] = int.parse(stock);
    }
    return data;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.isEditing ? 'Edit Product' : 'New Product'),
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
              child: const Text('Save'),
            ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
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
                  onPressed: _loadProduct, child: const Text('Retry')),
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
            decoration: const InputDecoration(
              labelText: 'Product name *',
              hintText: 'e.g. Chocolate Cake',
            ),
            textCapitalization: TextCapitalization.sentences,
            validator: (v) =>
                (v == null || v.trim().isEmpty) ? 'Name is required' : null,
          ),

          const SizedBox(height: 16),

          // ── Price ─────────────────────────────────────────────
          TextFormField(
            controller: _priceCtrl,
            decoration: const InputDecoration(
              labelText: 'Price *',
              suffixText: 'UZS',
              hintText: '150000',
            ),
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            validator: (v) {
              if (v == null || v.trim().isEmpty) return 'Price is required';
              final n = int.tryParse(v.trim());
              if (n == null || n <= 0) return 'Enter a valid price';
              return null;
            },
          ),

          const SizedBox(height: 16),

          // ── Description ───────────────────────────────────────
          TextFormField(
            controller: _descCtrl,
            decoration: const InputDecoration(
              labelText: 'Description',
              hintText: 'Optional product description',
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
                  decoration: const InputDecoration(
                    labelText: 'Stock quantity',
                    hintText: 'e.g. 10',
                  ),
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  validator: (v) {
                    if (_unlimited) return null;
                    if (v != null && v.trim().isNotEmpty) {
                      final n = int.tryParse(v.trim());
                      if (n == null || n < 0) return 'Enter 0 or more';
                    }
                    return null;
                  },
                ),
              ),
              const SizedBox(width: 16),
              Column(
                children: [
                  const Text('Unlimited',
                      style: TextStyle(fontSize: 12)),
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
          TextFormField(
            controller: _prepCtrl,
            decoration: const InputDecoration(
              labelText: 'Preparation time',
              hintText: 'e.g. 1 day, 2 hours',
            ),
          ),

          const SizedBox(height: 8),

          // ── Active toggle ─────────────────────────────────────
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Active'),
            subtitle: Text(
              _active
                  ? 'Product is visible in the bot catalog'
                  : 'Product is hidden from customers',
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
            child: Text(widget.isEditing ? 'Save changes' : 'Create product'),
          ),

          const SizedBox(height: 32),
        ],
      ),
    );
  }
}
