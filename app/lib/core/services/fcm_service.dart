import 'package:firebase_messaging/firebase_messaging.dart';

import '../api/api_service.dart';

/// Gets the FCM device token and registers it with the backend.
/// Call after login and after app restart when already authenticated.
/// Errors are swallowed — push notifications are best-effort.
Future<void> registerFcmToken(ApiService api) async {
  try {
    final token = await FirebaseMessaging.instance.getToken();
    if (token == null) return;
    // Register with the DeviceToken table for multi-device support
    await api.registerDeviceToken(token);
  } catch (_) {
    // Non-fatal — app works fine without push notifications
  }
}
