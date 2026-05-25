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

  AuthState? get state => _state;
  bool get isAuthenticated => _state != null;
  bool get isInitialized => _initialized;
  String? get token => _state?.token;

  Future<void> initialize() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(_kTokenKey);
    if (token != null) {
      _state = AuthState(token: token);
    }
    _initialized = true;
    notifyListeners();
  }

  Future<void> setAuth(String token, {User? user, Business? business}) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kTokenKey, token);
    _state = AuthState(token: token, user: user, business: business);
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
    notifyListeners();
  }
}

final authNotifierProvider = ChangeNotifierProvider<AuthNotifier>((ref) {
  return AuthNotifier();
});
