import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_service.dart';
import '../../core/models/order.dart';

// ── Filter state ─────────────────────────────────────────────────

class OrdersFilter {
  final String? status;
  final String searchQuery;

  const OrdersFilter({this.status, this.searchQuery = ''});

  OrdersFilter copyWith({Object? status = _sentinel, String? searchQuery}) {
    return OrdersFilter(
      status: status == _sentinel ? this.status : status as String?,
      searchQuery: searchQuery ?? this.searchQuery,
    );
  }
}

const _sentinel = Object();

// ── Provider ─────────────────────────────────────────────────────

class OrdersNotifier extends AsyncNotifier<List<Order>> {
  OrdersFilter _filter = const OrdersFilter();
  bool _showDeleted = false;

  OrdersFilter get filter => _filter;
  bool get showDeleted => _showDeleted;

  @override
  Future<List<Order>> build() async {
    return ref
        .read(apiServiceProvider)
        .getOrders(status: _filter.status, includeDeleted: _showDeleted);
  }

  void setStatus(String? status) {
    _filter = _filter.copyWith(status: status);
    ref.invalidateSelf();
  }

  void setShowDeleted(bool value) {
    _showDeleted = value;
    ref.invalidateSelf();
  }

  Future<void> delete(String id) async {
    await ref.read(apiServiceProvider).deleteOrder(id);
    ref.invalidateSelf();
    await future;
  }

  Future<void> restore(String id) async {
    await ref.read(apiServiceProvider).restoreOrder(id);
    ref.invalidateSelf();
    await future;
  }

  void setSearch(String query) {
    _filter = _filter.copyWith(searchQuery: query);
    // Search is client-side — no API call needed, just notify listeners
    state = state; // triggers rebuild
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }

  // Returns the loaded orders filtered by the current search query.
  List<Order> get filteredOrders {
    final all = state.valueOrNull ?? [];
    final q = _filter.searchQuery.trim().toLowerCase();
    if (q.isEmpty) return all;
    return all.where((o) {
      return o.customer.name.toLowerCase().contains(q) ||
          o.orderNumber.toString().contains(q);
    }).toList();
  }
}

final ordersProvider =
    AsyncNotifierProvider<OrdersNotifier, List<Order>>(OrdersNotifier.new);
