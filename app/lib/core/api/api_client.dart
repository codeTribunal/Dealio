import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/app_config.dart';
import 'auth_interceptor.dart';

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      // No global Content-Type — Dio sets it automatically only when there is a body.
      // Setting it globally causes Fastify to reject body-less PATCH/POST requests.
    ),
  );
  dio.interceptors.add(AuthInterceptor(ref));
  if (kDebugMode) {
    dio.interceptors.add(LogInterceptor(
      requestHeader: false,
      responseHeader: false,
      requestBody: true,
      responseBody: true,
      logPrint: (o) => debugPrint('[Dio] $o'),
    ));
  }
  return dio;
});
