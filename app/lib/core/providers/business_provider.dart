import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_service.dart';
import '../models/business.dart';

class BusinessNotifier extends AsyncNotifier<Business> {
  @override
  Future<Business> build() async {
    return ref.read(apiServiceProvider).getBusiness();
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(
      () => ref.read(apiServiceProvider).getBusiness(),
    );
  }
}

final businessProvider =
    AsyncNotifierProvider<BusinessNotifier, Business>(BusinessNotifier.new);
