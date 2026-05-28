import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _localeKey = 'app_locale';

class LocaleNotifier extends StateNotifier<Locale> {
  LocaleNotifier() : super(_resolveInitial()) {
    _load();
  }

  static Locale _resolveInitial() {
    // Default to Uzbek; overridden by stored pref or device language.
    final device =
        WidgetsBinding.instance.platformDispatcher.locale.languageCode;
    if (device == 'ru') return const Locale('ru');
    if (device == 'en') return const Locale('en');
    return const Locale('uz');
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_localeKey);
    if (saved != null) {
      state = Locale(saved);
    }
  }

  Future<void> setLocale(String code) async {
    state = Locale(code);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_localeKey, code);
  }

  /// Sync the app locale to the business language, but only if the user has
  /// never manually picked a language (no stored preference). Once the user
  /// chooses a language in Settings, [setLocale] writes the pref and the
  /// business language no longer overrides it.
  Future<void> syncFromBusinessLanguage(String languageEnum) async {
    final prefs = await SharedPreferences.getInstance();
    if (prefs.getString(_localeKey) != null) return;
    state = Locale(enumToCode(languageEnum));
  }

  /// Map business.language enum to a locale code.
  static String enumToCode(String languageEnum) {
    switch (languageEnum) {
      case 'RUSSIAN':
        return 'ru';
      case 'ENGLISH':
        return 'en';
      case 'UZBEK':
      default:
        return 'uz';
    }
  }

  /// Map a locale code to the business.language enum value.
  static String codeToEnum(String code) {
    switch (code) {
      case 'ru':
        return 'RUSSIAN';
      case 'en':
        return 'ENGLISH';
      case 'uz':
      default:
        return 'UZBEK';
    }
  }
}

final localeProvider = StateNotifierProvider<LocaleNotifier, Locale>(
  (ref) => LocaleNotifier(),
);
