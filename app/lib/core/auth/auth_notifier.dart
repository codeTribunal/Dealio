import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/business.dart';
import '../models/user.dart';

const _kTokenKey = 'auth_token';

class AuthState {
  final String token;
  final User? user;
  final Business? business;

  const AuthState({required this.token, this.user, this.business});

  AuthState copyWith({User? user, Business? business}) => AuthState(
        token: token,
        user: user ?? this.user,
        business: business ?? this.business,
      );
}

class AuthNotifier extends ChangeNotifier {
  AuthState? _state;
  bool _initialized = false;
  // True once the business check after startup has completed (or is skipped for
  // unauthenticated users). The router must wait for this before navigating.
  bool _startupComplete = false;

  AuthState? get state => _state;
  bool get isAuthenticated => _state != null;
  bool get hasBusiness => _state?.business != null;

  /// True when the app is fully ready to navigate.
  /// The router uses this instead of isInitialized so it waits for the
  /// business check that SplashScreen performs after token validation.
  bool get isStartupComplete => _initialized && _startupComplete;

  Future<void> initialize() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(_kTokenKey);
    if (token != null) {
      _state = AuthState(token: token);
    } else {
      // Not authenticated — no business check needed, mark startup complete.
      _startupComplete = true;
    }
    _initialized = true;
    notifyListeners();
  }

  /// Called by SplashScreen after the business API call resolves.
  /// Pass the business if found (200), null if 404 or any error.
  void finishStartup(Business? business) {
    if (business != null && _state != null) {
      _state = _state!.copyWith(business: business);
    }
    _startupComplete = true;
    notifyListeners();
  }

  Future<void> setAuth(String token, {User? user, Business? business}) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kTokenKey, token);
    _state = AuthState(token: token, user: user, business: business);
    // setAuth is called after OTP — mark startup complete so router can act
    _startupComplete = true;
    notifyListeners();
  }

  void setBusiness(Business business) {
    if (_state == null) return;
    _state = _state!.copyWith(business: business);
    notifyListeners();
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kTokenKey);
    _state = null;
    _startupComplete = true;
    notifyListeners();
  }
}

final authNotifierProvider = ChangeNotifierProvider<AuthNotifier>((ref) {
  return AuthNotifier();
});
