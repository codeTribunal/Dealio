import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_service.dart';
import '../../core/models/service.dart';

class ServicesNotifier extends AsyncNotifier<List<Service>> {
  @override
  Future<List<Service>> build() async {
    return ref.read(apiServiceProvider).getServices();
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }

  Future<void> createService(String name, int durationMinutes, int price) async {
    await ref.read(apiServiceProvider).createService({
      'name': name,
      'durationMinutes': durationMinutes,
      'price': price,
    });
    ref.invalidateSelf();
  }

  Future<void> updateService(
      String id, String name, int durationMinutes, int price, bool active) async {
    await ref.read(apiServiceProvider).updateService(id, {
      'name': name,
      'durationMinutes': durationMinutes,
      'price': price,
      'active': active,
    });
    ref.invalidateSelf();
  }

  Future<void> toggleActive(String id, bool currentActive) async {
    await ref.read(apiServiceProvider).updateService(id, {'active': !currentActive});
    ref.invalidateSelf();
  }
}

final servicesProvider =
    AsyncNotifierProvider<ServicesNotifier, List<Service>>(ServicesNotifier.new);
