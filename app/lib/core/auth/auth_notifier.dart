import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/business.dart';
import '../models/user.dart';

const _kTokenKey = 'auth_token';

/// Decode the `exp` (seconds since epoch) from a JWT payload, or null.
int? _jwtExp(String token) {
  try {
    final parts = token.split('.');
    if (parts.length != 3) return null;
    var payload = parts[1].replaceAll('-', '+').replaceAll('_', '/');
    // base64 requires length to be a multiple of 4 — pad it.
    payload = payload.padRight((payload.length + 3) ~/ 4 * 4, '=');
    final json = jsonDecode(utf8.decode(base64.decode(payload)))
        as Map<String, dynamic>;
    final exp = json['exp'];
    return exp is int ? exp : null;
  } catch (_) {
    return null;
  }
}

/// Decode the `phone` claim from a JWT payload, or null. The token is signed as
/// { userId, phone }, so this works even on cold start when the User object
/// hasn't been re-fetched.
String? _jwtPhone(String token) {
  try {
    final parts = token.split('.');
    if (parts.length != 3) return null;
    var payload = parts[1].replaceAll('-', '+').replaceAll('_', '/');
    payload = payload.padRight((payload.length + 3) ~/ 4 * 4, '=');
    final json = jsonDecode(utf8.decode(base64.decode(payload)))
        as Map<String, dynamic>;
    final phone = json['phone'];
    return phone is String ? phone : null;
  } catch (_) {
    return null;
  }
}

/// True if the token is present but past its `exp`. Unknown/undecodable tokens
/// are treated as NOT expired (the server will reject them with a 401).
bool _isExpired(String token) {
  final exp = _jwtExp(token);
  if (exp == null) return false;
  return exp * 1000 <= DateTime.now().millisecondsSinceEpoch;
}

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

  /// The owner's phone — from the logged-in user, falling back to the JWT claim
  /// (the User object isn't restored on cold start, but the token carries it).
  String? get phone =>
      _state?.user?.phone ?? (_state != null ? _jwtPhone(_state!.token) : null);

  /// True when the app is fully ready to navigate.
  /// The router uses this instead of isInitialized so it waits for the
  /// business check that SplashScreen performs after token validation.
  bool get isStartupComplete => _initialized && _startupComplete;

  Future<void> initialize() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(_kTokenKey);
    if (token != null && !_isExpired(token)) {
      // Valid (present + unexpired) token → restore the session so a returning
      // user goes straight to the app on cold start.
      _state = AuthState(token: token);
    } else {
      // No token, or an expired one → clear it and show the arrival screen.
      if (token != null) await prefs.remove(_kTokenKey);
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
