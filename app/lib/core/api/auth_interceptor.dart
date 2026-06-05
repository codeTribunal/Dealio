import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_notifier.dart';

class AuthInterceptor extends Interceptor {
  final Ref _ref;

  AuthInterceptor(this._ref);

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final token = _ref.read(authNotifierProvider).state?.token;
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    // A 401 from a protected resource means the session expired/was revoked →
    // clear and the router sends the user to the arrival screen. Auth endpoints
    // (login/enroll verify) return 401 for a bad code and are handled by the
    // caller, so they must NOT clear the session.
    final path = err.requestOptions.path;
    final isAuthEndpoint = path.contains('/auth/');
    if (err.response?.statusCode == 401 && !isAuthEndpoint) {
      _ref.read(authNotifierProvider).logout();
    }
    handler.next(err);
  }
}
