import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_service.dart';
import '../../core/models/customer.dart';

class CustomersNotifier extends AsyncNotifier<List<Customer>> {
  String _searchQuery = '';

  String get searchQuery => _searchQuery;

  @override
  Future<List<Customer>> build() async {
    return ref.read(apiServiceProvider).getCustomers();
  }

  void setSearch(String query) {
    _searchQuery = query;
    state = state; // client-side filter — no API call needed
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }

  List<Customer> get filteredCustomers {
    final all = state.valueOrNull ?? [];
    final q = _searchQuery.trim().toLowerCase();
    if (q.isEmpty) return all;
    return all.where((c) {
      return c.name.toLowerCase().contains(q) ||
          (c.telegramUsername?.toLowerCase().contains(q) ?? false) ||
          (c.phone?.contains(q) ?? false);
    }).toList();
  }
}

final customersProvider =
    AsyncNotifierProvider<CustomersNotifier, List<Customer>>(
  CustomersNotifier.new,
);
