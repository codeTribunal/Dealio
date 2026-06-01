import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_service.dart';
import '../../core/models/blocked_slot.dart';

/// Upcoming blocked slots (from now onward). The `from` filter uses the current
/// instant, which is timezone-independent, so no Tashkent conversion is needed
/// here — only when building/displaying wall-clock times.
class BlockedTimeNotifier extends AsyncNotifier<List<BlockedSlot>> {
  @override
  Future<List<BlockedSlot>> build() async {
    final from = DateTime.now().toUtc().toIso8601String();
    return ref.read(apiServiceProvider).getBlockedSlots(from: from);
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }

  Future<void> add({
    String? staffId,
    required String startTime,
    required String endTime,
    String? reason,
  }) async {
    await ref.read(apiServiceProvider).createBlockedSlot({
      if (staffId != null) 'staffId': staffId,
      'startTime': startTime,
      'endTime': endTime,
      if (reason != null && reason.isNotEmpty) 'reason': reason,
    });
    ref.invalidateSelf();
    await future;
  }

  Future<void> remove(String id) async {
    await ref.read(apiServiceProvider).deleteBlockedSlot(id);
    ref.invalidateSelf();
    await future;
  }
}

final blockedTimeProvider =
    AsyncNotifierProvider<BlockedTimeNotifier, List<BlockedSlot>>(
        BlockedTimeNotifier.new);
