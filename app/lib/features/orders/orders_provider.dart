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

  OrdersFilter get filter => _filter;

  @override
  Future<List<Order>> build() async {
    return ref.read(apiServiceProvider).getOrders(status: _filter.status);
  }

  void setStatus(String? status) {
    _filter = _filter.copyWith(status: status);
    ref.invalidateSelf();
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
