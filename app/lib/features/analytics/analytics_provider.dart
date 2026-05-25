import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_service.dart';
import '../../core/models/analytics.dart';

class AnalyticsNotifier extends AsyncNotifier<AnalyticsData> {
  @override
  Future<AnalyticsData> build() async {
    return ref.read(apiServiceProvider).getAnalytics();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => ref.read(apiServiceProvider).getAnalytics());
  }
}

final analyticsProvider =
    AsyncNotifierProvider<AnalyticsNotifier, AnalyticsData>(AnalyticsNotifier.new);
