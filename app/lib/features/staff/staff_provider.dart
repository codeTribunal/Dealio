import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_service.dart';
import '../../core/models/staff.dart';

class StaffNotifier extends AsyncNotifier<List<Staff>> {
  @override
  Future<List<Staff>> build() async {
    return ref.read(apiServiceProvider).getStaff();
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }

  Future<void> createStaff(
      String name, String? telegramHandle, List<String> serviceIds,
      {List<String> daysOff = const []}) async {
    await ref.read(apiServiceProvider).createStaff({
      'name': name,
      if (telegramHandle != null && telegramHandle.isNotEmpty)
        'telegramHandle': telegramHandle,
      'serviceIds': serviceIds,
      'daysOff': daysOff,
    });
    ref.invalidateSelf();
  }

  Future<void> updateStaff(String id, String name, String? telegramHandle,
      List<String> serviceIds,
      {List<String> daysOff = const []}) async {
    await ref.read(apiServiceProvider).updateStaff(id, {
      'name': name,
      if (telegramHandle != null && telegramHandle.isNotEmpty)
        'telegramHandle': telegramHandle,
      'serviceIds': serviceIds,
      'daysOff': daysOff,
    });
    ref.invalidateSelf();
  }

  Future<void> deleteStaff(String id) async {
    await ref.read(apiServiceProvider).deleteStaff(id);
    ref.invalidateSelf();
  }
}

final staffProvider =
    AsyncNotifierProvider<StaffNotifier, List<Staff>>(StaffNotifier.new);
