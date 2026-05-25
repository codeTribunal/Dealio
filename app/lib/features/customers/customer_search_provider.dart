import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_service.dart';
import '../../core/models/customer.dart';

final customerSearchQueryProvider = StateProvider<String>((ref) => '');

final customerSearchProvider = FutureProvider.autoDispose
    .family<List<CustomerSearchResult>, String>((ref, query) async {
  if (query.trim().length < 2) return [];
  final apiService = ref.read(apiServiceProvider);
  return apiService.searchCustomers(query);
});
