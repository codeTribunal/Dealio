import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_service.dart';
import '../../core/models/business.dart';
import '../../core/providers/business_provider.dart';

class SettingsState {
  final Business business;
  final String? botUsername;
  final String? botLink;

  const SettingsState({
    required this.business,
    this.botUsername,
    this.botLink,
  });

  SettingsState copyWith({
    Business? business,
    String? botUsername,
    String? botLink,
  }) =>
      SettingsState(
        business: business ?? this.business,
        botUsername: botUsername ?? this.botUsername,
        botLink: botLink ?? this.botLink,
      );
}

class SettingsNotifier extends AsyncNotifier<SettingsState> {
  @override
  Future<SettingsState> build() async {
    final api = ref.read(apiServiceProvider);
    final business = await api.getBusiness();
    final botInfo = await api.getBotInfo();
    return SettingsState(
      business: business,
      botUsername: botInfo.botUsername,
      botLink: botInfo.botLink,
    );
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => build());
  }

  Future<void> saveProfile({
    required String name,
    String? description,
  }) async {
    final current = state.valueOrNull;
    if (current == null) return;
    final updated = await ref.read(apiServiceProvider).updateBusiness({
      'name': name,
      if (description != null && description.isNotEmpty) 'description': description,
      if (description != null && description.isEmpty) 'description': null,
    });
    state = AsyncData(current.copyWith(business: updated));
    ref.invalidate(businessProvider);
  }

  /// Change the Telegram bot token; updates the shown username/link on success.
  Future<void> saveBotToken(String botToken) async {
    final current = state.valueOrNull;
    if (current == null) return;
    final result = await ref.read(apiServiceProvider).updateBotToken(botToken);
    state = AsyncData(
      current.copyWith(
        botUsername: result.botUsername,
        botLink: result.botLink,
        business: result.botUsername != null
            ? current.business.copyWith(botUsername: result.botUsername)
            : current.business,
      ),
    );
    ref.invalidate(businessProvider);
  }

  Future<void> saveLanguage(String language) async {
    final current = state.valueOrNull;
    if (current == null) return;
    final updated = await ref.read(apiServiceProvider).updateBusiness({'language': language});
    state = AsyncData(current.copyWith(business: updated));
    ref.invalidate(businessProvider);
  }

  Future<void> saveWorkingHours(
    Map<String, dynamic> workingHours,
    int bufferMinutes,
  ) async {
    final current = state.valueOrNull;
    if (current == null) return;
    final updated = await ref.read(apiServiceProvider).updateBusiness({
      'workingHours': workingHours,
      'bufferMinutes': bufferMinutes,
    });
    state = AsyncData(current.copyWith(business: updated));
    ref.invalidate(businessProvider);
  }

  Future<void> saveMode(String mode) async {
    final current = state.valueOrNull;
    if (current == null) return;
    final updated = await ref.read(apiServiceProvider).updateBusiness({'mode': mode});
    state = AsyncData(current.copyWith(business: updated));
    ref.invalidate(businessProvider);
  }

  Future<void> enableCalendarSync() async {
    final current = state.valueOrNull;
    if (current == null) return;
    final token = await ref.read(apiServiceProvider).generateCalendarToken();
    state = AsyncData(
      current.copyWith(business: current.business.copyWith(calendarToken: token)),
    );
    ref.invalidate(businessProvider);
  }

  Future<void> disableCalendarSync() async {
    final current = state.valueOrNull;
    if (current == null) return;
    await ref.read(apiServiceProvider).disableCalendarSync();
    state = AsyncData(
      current.copyWith(
        business: current.business.copyWith(clearCalendarToken: true),
      ),
    );
    ref.invalidate(businessProvider);
  }
}

final settingsProvider =
    AsyncNotifierProvider<SettingsNotifier, SettingsState>(SettingsNotifier.new);
