import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_service.dart';

/// Owner reminder settings (appointment / delivery / deadline toggles and
/// timing). Backed by GET/PATCH /business/reminder-settings — values are
/// merged with server defaults, so any missing key comes back populated.
class ReminderSettingsNotifier extends AsyncNotifier<Map<String, dynamic>> {
  @override
  Future<Map<String, dynamic>> build() async {
    return ref.read(apiServiceProvider).getReminderSettings();
  }

  /// Optimistically applies a single setting change, persisting it to the API.
  /// On failure the previous value is restored and the error rethrown so the
  /// UI can surface it.
  Future<void> updateSetting(String key, Object value) async {
    final current = state.valueOrNull;
    if (current == null) return;

    final previous = Map<String, dynamic>.from(current);
    state = AsyncData({...current, key: value});

    try {
      await ref.read(apiServiceProvider).updateReminderSettings({key: value});
    } catch (_) {
      state = AsyncData(previous);
      rethrow;
    }
  }
}

final reminderSettingsProvider =
    AsyncNotifierProvider<ReminderSettingsNotifier, Map<String, dynamic>>(
  ReminderSettingsNotifier.new,
);
