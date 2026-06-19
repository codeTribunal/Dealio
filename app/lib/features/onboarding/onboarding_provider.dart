import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_service.dart';
import '../../core/auth/auth_notifier.dart';
import '../../core/models/business.dart';
import '../../core/models/user.dart';

class OnboardingState {
  final int step;
  final String businessName;
  // Single business mode (scalar). Only 'SERVICES' | 'FREELANCE' are selectable.
  final String mode;
  final String language;
  final String botToken;
  final String botUsername;
  final String botName;
  final bool verifyingToken;
  final bool tokenVerified;
  final String? tokenError;
  final bool completing;
  final bool completed;
  final String? completionError;
  final String botLink;

  // Step 5 — Telegram verification (owner auth).
  final String enrollToken;
  final String botDeepLink;
  final bool enrollLoading;
  final bool linkExpired;
  final String code;
  final bool generalConsent;
  final bool crossBorderConsent;
  final bool enrolled;
  final String? enrollError;

  const OnboardingState({
    this.step = 1,
    this.businessName = '',
    // Product-seller mode disabled — default to SERVICES (only SERVICES/FREELANCE selectable).
    this.mode = 'SERVICES',
    this.language = 'UZBEK',
    this.botToken = '',
    this.botUsername = '',
    this.botName = '',
    this.verifyingToken = false,
    this.tokenVerified = false,
    this.tokenError,
    this.completing = false,
    this.completed = false,
    this.completionError,
    this.botLink = '',
    this.enrollToken = '',
    this.botDeepLink = '',
    this.enrollLoading = false,
    this.linkExpired = false,
    this.code = '',
    this.generalConsent = false,
    this.crossBorderConsent = false,
    this.enrolled = false,
    this.enrollError,
  });

  OnboardingState copyWith({
    int? step,
    String? businessName,
    String? mode,
    String? language,
    String? botToken,
    String? botUsername,
    String? botName,
    bool? verifyingToken,
    bool? tokenVerified,
    String? tokenError,
    bool clearTokenError = false,
    bool? completing,
    bool? completed,
    String? completionError,
    bool clearCompletionError = false,
    String? botLink,
    String? enrollToken,
    String? botDeepLink,
    bool? enrollLoading,
    bool? linkExpired,
    String? code,
    bool? generalConsent,
    bool? crossBorderConsent,
    bool? enrolled,
    String? enrollError,
    bool clearEnrollError = false,
  }) {
    return OnboardingState(
      step: step ?? this.step,
      businessName: businessName ?? this.businessName,
      mode: mode ?? this.mode,
      language: language ?? this.language,
      botToken: botToken ?? this.botToken,
      botUsername: botUsername ?? this.botUsername,
      botName: botName ?? this.botName,
      verifyingToken: verifyingToken ?? this.verifyingToken,
      tokenVerified: tokenVerified ?? this.tokenVerified,
      tokenError: clearTokenError ? null : (tokenError ?? this.tokenError),
      completing: completing ?? this.completing,
      completed: completed ?? this.completed,
      completionError: clearCompletionError
          ? null
          : (completionError ?? this.completionError),
      botLink: botLink ?? this.botLink,
      enrollToken: enrollToken ?? this.enrollToken,
      botDeepLink: botDeepLink ?? this.botDeepLink,
      enrollLoading: enrollLoading ?? this.enrollLoading,
      linkExpired: linkExpired ?? this.linkExpired,
      code: code ?? this.code,
      generalConsent: generalConsent ?? this.generalConsent,
      crossBorderConsent: crossBorderConsent ?? this.crossBorderConsent,
      enrolled: enrolled ?? this.enrolled,
      enrollError: clearEnrollError ? null : (enrollError ?? this.enrollError),
    );
  }
}

class OnboardingNotifier extends StateNotifier<OnboardingState> {
  final Ref _ref;
  ApiService get _api => _ref.read(apiServiceProvider);

  OnboardingNotifier(this._ref) : super(const OnboardingState());

  void setStep(int step) => state = state.copyWith(step: step);

  void setBusinessName(String name) =>
      state = state.copyWith(businessName: name);

  // Single-select: a business is created with exactly one mode (SERVICES or FREELANCE).
  void toggleMode(String mode) {
    state = state.copyWith(mode: mode);
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

  // ── Step 5: Telegram verification ───────────────────────────────────────

  void setCode(String code) => state = state.copyWith(code: code);

  void setGeneralConsent(bool v) =>
      state = state.copyWith(generalConsent: v);

  void setCrossBorderConsent(bool v) =>
      state = state.copyWith(crossBorderConsent: v);

  /// Move to the verification step and request a fresh enrollment deep link.
  void goToVerify() {
    state = state.copyWith(step: 4);
    startEnrollment();
  }

  Future<void> startEnrollment() async {
    state = state.copyWith(
        enrollLoading: true, linkExpired: false, clearEnrollError: true);
    try {
      final res = await _api.enrollStart();
      state = state.copyWith(
        enrollLoading: false,
        enrollToken: res.token,
        botDeepLink: res.botDeepLink,
      );
    } catch (_) {
      state = state.copyWith(enrollLoading: false, enrollError: 'ENROLL_START_FAILED');
    }
  }

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

  /// Verify the Telegram code (+ consents) → store the 30-day JWT → create the
  /// business bound to the now-authenticated user → done. If verification
  /// already succeeded once, a retry only re-runs business creation (the code
  /// is single-use). Returns true on full success.
  Future<void> verifyAndComplete() async {
    if (!state.enrolled &&
        (state.code.length < 6 ||
            !state.generalConsent ||
            !state.crossBorderConsent)) {
      return;
    }
    state = state.copyWith(completing: true, clearEnrollError: true);
    try {
      if (!state.enrolled) {
        final auth = await _api.enrollVerify(
          token: state.enrollToken,
          code: state.code,
          generalConsent: state.generalConsent,
          crossBorderConsent: state.crossBorderConsent,
        );
        await _ref.read(authNotifierProvider).setAuth(
              auth.token,
              user: User.fromJson(auth.user),
              business: auth.business != null
                  ? Business.fromJson(auth.business!)
                  : null,
            );
        state = state.copyWith(enrolled: true);
      }

      final result = await _api.completeOnboarding(
        businessName: state.businessName,
        mode: state.mode,
        language: state.language,
        botToken: state.botToken,
      );

      // Bind the freshly-created business to auth state BEFORE showing the done
      // screen so the router lets the user into /home (not back to onboarding).
      try {
        final business = await _api.getBusiness();
        _ref.read(authNotifierProvider).setBusiness(business);
      } catch (_) {
        // Best-effort; the screen's listener also refetches on completion.
      }

      state = state.copyWith(
        completing: false,
        completed: true,
        botUsername: result.botUsername,
        botLink: result.botLink,
      );
    } catch (e) {
      final msg = e.toString();
      final isApiExpired = !state.enrolled && RegExp('link|expired', caseSensitive: false).hasMatch(msg);
      final isBadCode = !state.enrolled &&
          ((e is ApiException && e.statusCode == 401) ||
              RegExp('code', caseSensitive: false).hasMatch(msg));
      state = state.copyWith(
        completing: false,
        linkExpired: isApiExpired ? true : state.linkExpired,
        enrollError: isApiExpired
            ? 'LINK_EXPIRED'
            : isBadCode
                ? 'INVALID_CODE'
                : msg,
      );
    }
  }

  void reset() => state = const OnboardingState();
}

final onboardingProvider =
    StateNotifierProvider.autoDispose<OnboardingNotifier, OnboardingState>(
  (ref) => OnboardingNotifier(ref),
);
