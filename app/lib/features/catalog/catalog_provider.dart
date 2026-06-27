import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_service.dart';
import '../../core/models/product.dart';

class CatalogNotifier extends AsyncNotifier<List<Product>> {
  @override
  Future<List<Product>> build() async {
    return ref.read(apiServiceProvider).getProducts();
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }

  void productSaved() => ref.invalidateSelf();

  Future<void> toggleActive(String productId) async {
    final current = state.valueOrNull ?? [];
    final idx = current.indexWhere((p) => p.id == productId);
    if (idx == -1) return;

    // Optimistic update so the switch feels instant
    final optimistic = List<Product>.of(current);
    optimistic[idx] = current[idx].copyWith(active: !current[idx].active);
    state = AsyncData(optimistic);

    try {
      final result =
          await ref.read(apiServiceProvider).toggleProduct(productId);
      final synced = List<Product>.of(state.valueOrNull ?? []);
      final syncIdx = synced.indexWhere((p) => p.id == productId);
      if (syncIdx != -1) {
        synced[syncIdx] = synced[syncIdx].copyWith(active: result.active);
        state = AsyncData(synced);
      }
    } catch (_) {
      state = AsyncData(current); // revert on error
      rethrow;
    }
  }

  Future<void> deleteProduct(String id) async {
    await ref.read(apiServiceProvider).deleteProduct(id);
    ref.invalidateSelf();
  }
}

final catalogProvider =
    AsyncNotifierProvider<CatalogNotifier, List<Product>>(CatalogNotifier.new);
