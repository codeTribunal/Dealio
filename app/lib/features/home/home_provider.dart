import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_service.dart';
import '../../core/auth/auth_notifier.dart';
import '../../core/models/customer.dart';

class HomeNotifier extends AsyncNotifier<HomeData> {
  @override
  Future<HomeData> build() async {
    final api = ref.read(apiServiceProvider);
    final business = await api.getBusiness();
    // Sync into auth state so mode-aware widgets (e.g. quick-actions grid)
    // can read business.mode without a separate provider.
    ref.read(authNotifierProvider).setBusiness(business);
    return api.getHome(business.name);
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }
}

final homeProvider =
    AsyncNotifierProvider<HomeNotifier, HomeData>(HomeNotifier.new);
