import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_service.dart';
import '../../core/models/business.dart';

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
  }

  Future<void> savePayment({
    required String cardNumber,
    required String cardBank,
  }) async {
    final current = state.valueOrNull;
    if (current == null) return;
    final result = await ref.read(apiServiceProvider).updatePayment(cardNumber, cardBank);
    state = AsyncData(
      current.copyWith(
        business: current.business.copyWith(
          cardNumber: result.cardNumber,
          cardBank: result.cardBank,
        ),
      ),
    );
  }

  Future<void> saveLanguage(String language) async {
    final current = state.valueOrNull;
    if (current == null) return;
    final updated = await ref.read(apiServiceProvider).updateBusiness({'language': language});
    state = AsyncData(current.copyWith(business: updated));
  }

  Future<void> saveMode(List<String> mode) async {
    final current = state.valueOrNull;
    if (current == null) return;
    final updated = await ref.read(apiServiceProvider).updateBusiness({'mode': mode});
    state = AsyncData(current.copyWith(business: updated));
  }
}

final settingsProvider =
    AsyncNotifierProvider<SettingsNotifier, SettingsState>(SettingsNotifier.new);
