import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_service.dart';

class OnboardingState {
  final int step;
  final String businessName;
  final List<String> modes;
  final String language;
  final String botToken;
  final String botUsername;
  final String botName;
  final String cardNumber;
  final String cardBank;
  final bool verifyingToken;
  final bool tokenVerified;
  final String? tokenError;
  final bool completing;
  final bool completed;
  final String? completionError;
  final String botLink;

  const OnboardingState({
    this.step = 1,
    this.businessName = '',
    this.modes = const ['PRODUCTS'],
    this.language = 'UZBEK',
    this.botToken = '',
    this.botUsername = '',
    this.botName = '',
    this.cardNumber = '',
    this.cardBank = 'UZCARD',
    this.verifyingToken = false,
    this.tokenVerified = false,
    this.tokenError,
    this.completing = false,
    this.completed = false,
    this.completionError,
    this.botLink = '',
  });

  OnboardingState copyWith({
    int? step,
    String? businessName,
    List<String>? modes,
    String? language,
    String? botToken,
    String? botUsername,
    String? botName,
    String? cardNumber,
    String? cardBank,
    bool? verifyingToken,
    bool? tokenVerified,
    String? tokenError,
    bool clearTokenError = false,
    bool? completing,
    bool? completed,
    String? completionError,
    bool clearCompletionError = false,
    String? botLink,
  }) {
    return OnboardingState(
      step: step ?? this.step,
      businessName: businessName ?? this.businessName,
      modes: modes ?? this.modes,
      language: language ?? this.language,
      botToken: botToken ?? this.botToken,
      botUsername: botUsername ?? this.botUsername,
      botName: botName ?? this.botName,
      cardNumber: cardNumber ?? this.cardNumber,
      cardBank: cardBank ?? this.cardBank,
      verifyingToken: verifyingToken ?? this.verifyingToken,
      tokenVerified: tokenVerified ?? this.tokenVerified,
      tokenError: clearTokenError ? null : (tokenError ?? this.tokenError),
      completing: completing ?? this.completing,
      completed: completed ?? this.completed,
      completionError: clearCompletionError
          ? null
          : (completionError ?? this.completionError),
      botLink: botLink ?? this.botLink,
    );
  }
}

class OnboardingNotifier extends StateNotifier<OnboardingState> {
  final ApiService _api;

  OnboardingNotifier(this._api) : super(const OnboardingState());

  void setStep(int step) => state = state.copyWith(step: step);

  void setBusinessName(String name) =>
      state = state.copyWith(businessName: name);

  void toggleMode(String mode) {
    final current = List<String>.from(state.modes);
    if (current.contains(mode)) {
      if (current.length == 1) return; // prevent removing last mode
      current.remove(mode);
    } else {
      current.add(mode);
    }
    state = state.copyWith(modes: current);
  }

  void setLanguage(String language) =>
      state = state.copyWith(language: language);

  void setBotToken(String token) {
    state = state.copyWith(
      botToken: token,
      tokenVerified: false,
      clearTokenError: true,
    );
  }

  void setCardNumber(String number) => state = state.copyWith(cardNumber: number);

  void setCardBank(String bank) => state = state.copyWith(cardBank: bank);

  Future<void> verifyBotToken() async {
    if (state.botToken.isEmpty) return;
    state = state.copyWith(verifyingToken: true, tokenVerified: false, clearTokenError: true);
    try {
      final result = await _api.verifyBotToken(state.botToken);
      state = state.copyWith(
        verifyingToken: false,
        tokenVerified: result.valid,
        botUsername: result.botUsername,
        botName: result.botName,
      );
    } catch (e) {
      state = state.copyWith(
        verifyingToken: false,
        tokenVerified: false,
        tokenError: e.toString(),
      );
    }
  }

  Future<void> complete() async {
    state = state.copyWith(completing: true, clearCompletionError: true);
    try {
      final result = await _api.completeOnboarding(
        businessName: state.businessName,
        modes: state.modes,
        language: state.language,
        botToken: state.botToken,
        cardNumber: state.cardNumber.isNotEmpty ? state.cardNumber : null,
        cardBank: state.cardNumber.isNotEmpty ? state.cardBank : null,
      );
      state = state.copyWith(
        completing: false,
        completed: true,
        botUsername: result.botUsername,
        botLink: result.botLink,
      );
    } catch (e) {
      state = state.copyWith(
        completing: false,
        completionError: e.toString(),
      );
    }
  }

  void reset() => state = const OnboardingState();
}

final onboardingProvider =
    StateNotifierProvider.autoDispose<OnboardingNotifier, OnboardingState>(
  (ref) => OnboardingNotifier(ref.read(apiServiceProvider)),
);
