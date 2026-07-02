import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_service.dart';
import '../../core/models/customer.dart' show Customer;
import '../../core/models/product.dart';
import '../../core/theme/app_tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/utils/format.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_card.dart';
import '../../shared/widgets/app_spinner.dart';
import '../../shared/widgets/app_text_field.dart';
import '../customers/customers_provider.dart';
import '../home/home_provider.dart';
import 'orders_provider.dart';

/// Active products for the line-item picker.
final _orderFormProductsProvider = FutureProvider.autoDispose<List<Product>>(
  (ref) => ref.read(apiServiceProvider).getProducts(),
);

/// Manual order creation. Customer section is pick-existing OR type-new (name +
/// optional phone); a typed-new customer is created as a real Customer (null
/// telegramUserId) then the order attaches to it. Reached from the Orders list.
class OrderFormScreen extends ConsumerStatefulWidget {
  const OrderFormScreen({super.key});

  @override
  ConsumerState<OrderFormScreen> createState() => _OrderFormScreenState();
}

class _OrderFormScreenState extends ConsumerState<OrderFormScreen> {
  bool _newCustomer = false;
  String? _customerId;
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();

  final _qty = <String, int>{}; // productId → quantity
  String _deliveryMethod = 'PICKUP';
  final _addressCtrl = TextEditingController();
  DateTime? _deliveryDate;
  final _notesCtrl = TextEditingController();

  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _addressCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  int _total(List<Product> products) {
    var sum = 0;
    for (final p in products) {
      sum += (p.price) * (_qty[p.id] ?? 0);
    }
    return sum;
  }

  Future<void> _submit(List<Product> products) async {
    final l = AppLocalizations.of(context)!;

    final items = [
      for (final p in products)
        if ((_qty[p.id] ?? 0) > 0)
          {'productId': p.id, 'quantity': _qty[p.id], 'price': p.price},
    ];
    if (items.isEmpty) {
      setState(() => _error = l.orderErrItems);
      return;
    }
    if (_newCustomer && _nameCtrl.text.trim().isEmpty) {
      setState(() => _error = l.orderErrSelectCustomer);
      return;
    }
    if (!_newCustomer && _customerId == null) {
      setState(() => _error = l.orderErrSelectCustomer);
      return;
    }
    if (_deliveryMethod == 'DELIVERY' && _addressCtrl.text.trim().isEmpty) {
      setState(() => _error = l.orderErrAddress);
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    final api = ref.read(apiServiceProvider);
    try {
      // Walk-in: create the customer first (real record, no Telegram), then
      // attach the order. A failed order leaves a usable, pickable customer.
      String customerId;
      if (_newCustomer) {
        final phone = _phoneCtrl.text.trim();
        final created = await api.createCustomer(
          name: _nameCtrl.text.trim(),
          phone: phone.isEmpty ? null : phone,
        );
        customerId = created.id;
        ref.invalidate(customersProvider);
      } else {
        customerId = _customerId!;
      }

      await api.createOrder(
        customerId: customerId,
        items: items,
        deliveryMethod: _deliveryMethod,
        deliveryAddress: _addressCtrl.text.trim(),
        deliveryDate: _deliveryDate?.toUtc().toIso8601String(),
        notes: _notesCtrl.text.trim(),
      );

      // Stale-list discipline: refresh orders + home so the new order shows.
      ref.invalidate(ordersProvider);
      ref.invalidate(homeProvider);

      if (!mounted) return;
      context.pop();
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        // 402 = customer/order plan limit. _wrap only keeps the error CODE, so
        // show a friendly localized message rather than "PLAN_LIMIT_REACHED".
        _error = e.statusCode == 402 ? l.orderLimitReached : l.orderCreateError;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _error = l.orderCreateError;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final customersAsync = ref.watch(customersProvider);
    final productsAsync = ref.watch(_orderFormProductsProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l.orderNewTitle)),
      body: productsAsync.when(
        loading: () => const Center(child: AppSpinner(size: 32)),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.s5),
            child: Text(e.toString(), style: TextStyle(color: t.text2)),
          ),
        ),
        data: (products) {
          final customers = customersAsync.valueOrNull ?? const <Customer>[];
          final total = _total(products);
          return Column(
            children: [
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(AppSpacing.s4),
                  children: [
                    // ── Customer ──────────────────────────────────
                    _SectionLabel(l.orderSectionCustomer),
                    Row(
                      children: [
                        Expanded(
                          child: _ModeChip(
                            label: l.orderCustomerExisting,
                            selected: !_newCustomer,
                            onTap: () => setState(() => _newCustomer = false),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.s2),
                        Expanded(
                          child: _ModeChip(
                            label: l.orderCustomerNew,
                            selected: _newCustomer,
                            onTap: () => setState(() => _newCustomer = true),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.s3),
                    if (_newCustomer) ...[
                      AppTextField(
                        label: l.customerFormName,
                        hint: l.customerFormNameHint,
                        controller: _nameCtrl,
                      ),
                      const SizedBox(height: AppSpacing.s3),
                      AppTextField(
                        label: l.customerFormPhone,
                        hint: l.customerFormPhoneHint,
                        controller: _phoneCtrl,
                        keyboardType: TextInputType.phone,
                      ),
                    ] else
                      DropdownButtonFormField<String>(
                        initialValue: _customerId,
                        isExpanded: true,
                        decoration: _decoration(context, l.orderSelectCustomer),
                        items: [
                          for (final c in customers)
                            DropdownMenuItem(value: c.id, child: Text(c.name)),
                        ],
                        onChanged: (v) => setState(() => _customerId = v),
                      ),

                    const SizedBox(height: AppSpacing.s5),

                    // ── Products ──────────────────────────────────
                    _SectionLabel(l.orderSectionItems),
                    if (products.isEmpty)
                      Text(l.orderNoProducts,
                          style: TextStyle(
                              color: t.text2, fontSize: AppTextSizes.sm))
                    else
                      ...products.map((p) => _ProductRow(
                            product: p,
                            qty: _qty[p.id] ?? 0,
                            onChanged: (q) => setState(() {
                              if (q <= 0) {
                                _qty.remove(p.id);
                              } else {
                                _qty[p.id] = q;
                              }
                            }),
                          )),

                    const SizedBox(height: AppSpacing.s5),

                    // ── Delivery ──────────────────────────────────
                    _SectionLabel(l.orderSectionDelivery),
                    Row(
                      children: [
                        Expanded(
                          child: _ModeChip(
                            label: l.orderDeliveryPickup,
                            selected: _deliveryMethod == 'PICKUP',
                            onTap: () =>
                                setState(() => _deliveryMethod = 'PICKUP'),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.s2),
                        Expanded(
                          child: _ModeChip(
                            label: l.orderDeliveryDelivery,
                            selected: _deliveryMethod == 'DELIVERY',
                            onTap: () =>
                                setState(() => _deliveryMethod = 'DELIVERY'),
                          ),
                        ),
                      ],
                    ),
                    if (_deliveryMethod == 'DELIVERY') ...[
                      const SizedBox(height: AppSpacing.s3),
                      AppTextField(
                        label: l.orderAddressLabel,
                        controller: _addressCtrl,
                      ),
                    ],
                    const SizedBox(height: AppSpacing.s3),
                    // Delivery date (optional)
                    InkWell(
                      borderRadius: AppRadii.md,
                      onTap: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: _deliveryDate ?? DateTime.now(),
                          firstDate:
                              DateTime.now().subtract(const Duration(days: 365)),
                          lastDate:
                              DateTime.now().add(const Duration(days: 365)),
                        );
                        if (picked != null) {
                          setState(() => _deliveryDate = picked);
                        }
                      },
                      child: InputDecorator(
                        decoration: _decoration(context, l.orderDateLabel),
                        child: Text(
                          _deliveryDate != null
                              ? formatDate(_deliveryDate!)
                              : '—',
                          style: TextStyle(
                              color: _deliveryDate != null ? t.text1 : t.text3),
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.s5),

                    // ── Notes ─────────────────────────────────────
                    _SectionLabel(l.orderSectionNotes),
                    AppTextField(
                      label: l.commonOptional,
                      controller: _notesCtrl,
                      maxLines: 3,
                    ),

                    if (_error != null) ...[
                      const SizedBox(height: AppSpacing.s4),
                      Text(_error!,
                          style: TextStyle(
                              color: t.errorStrong, fontSize: AppTextSizes.sm)),
                    ],
                  ],
                ),
              ),

              // ── Total + submit ──────────────────────────────────
              Container(
                padding: EdgeInsets.fromLTRB(AppSpacing.s4, AppSpacing.s3,
                    AppSpacing.s4, AppSpacing.s3 + MediaQuery.of(context).padding.bottom),
                decoration: BoxDecoration(
                  color: t.surface,
                  border: Border(top: BorderSide(color: t.border)),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(l.commonTotal,
                            style: TextStyle(
                                color: t.text2, fontSize: AppTextSizes.sm)),
                        Text(formatUZS(total),
                            style: TextStyle(
                                fontWeight: AppFontWeights.bold,
                                fontSize: AppTextSizes.base,
                                color: t.text1)),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.s3),
                    AppButton(
                      label: l.orderCreate,
                      fullWidth: true,
                      loading: _saving,
                      onPressed: _saving ? null : () => _submit(products),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

InputDecoration _decoration(BuildContext context, String label) {
  final t = AppTokens.of(context);
  OutlineInputBorder border(Color c, [double w = 1]) => OutlineInputBorder(
        borderRadius: AppRadii.md,
        borderSide: BorderSide(color: c, width: w),
      );
  return InputDecoration(
    labelText: label,
    labelStyle: TextStyle(color: t.text2),
    isDense: true,
    filled: true,
    fillColor: t.surface,
    border: border(t.border),
    enabledBorder: border(t.border),
    focusedBorder: border(t.accent, 2),
  );
}

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);
  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.s2),
      child: Text(
        text,
        style: TextStyle(
          fontWeight: AppFontWeights.bold,
          fontSize: AppTextSizes.sm,
          color: t.text1,
        ),
      ),
    );
  }
}

class _ModeChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _ModeChip(
      {required this.label, required this.selected, required this.onTap});
  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        alignment: Alignment.center,
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.s3),
        decoration: BoxDecoration(
          color: selected ? t.accentSoft : t.surface,
          borderRadius: AppRadii.md,
          border: Border.all(color: selected ? t.accent : t.border),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontWeight: AppFontWeights.semibold,
            fontSize: AppTextSizes.sm,
            color: selected ? t.accent : t.text2,
          ),
        ),
      ),
    );
  }
}

class _ProductRow extends StatelessWidget {
  final Product product;
  final int qty;
  final ValueChanged<int> onChanged;
  const _ProductRow(
      {required this.product, required this.qty, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.s2),
      child: AppCard(
        padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.s3, vertical: AppSpacing.s2),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(product.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                          fontWeight: AppFontWeights.semibold,
                          fontSize: AppTextSizes.sm,
                          color: t.text1)),
                  Text(formatUZS(product.price),
                      style: TextStyle(
                          color: t.text2, fontSize: AppTextSizes.caption)),
                ],
              ),
            ),
            _StepperButton(
                icon: Icons.remove,
                onTap: qty > 0 ? () => onChanged(qty - 1) : null),
            SizedBox(
              width: 28,
              child: Text('$qty',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      fontWeight: AppFontWeights.bold, color: t.text1)),
            ),
            _StepperButton(icon: Icons.add, onTap: () => onChanged(qty + 1)),
          ],
        ),
      ),
    );
  }
}

class _StepperButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onTap;
  const _StepperButton({required this.icon, this.onTap});
  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return InkWell(
      onTap: onTap,
      borderRadius: AppRadii.sm,
      child: Container(
        width: 32,
        height: 32,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: onTap == null ? t.surface : t.accentSoft,
          borderRadius: AppRadii.sm,
        ),
        child: Icon(icon,
            size: 18, color: onTap == null ? t.text3 : t.accent),
      ),
    );
  }
}
