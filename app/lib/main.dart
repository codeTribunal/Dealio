import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'core/router/router.dart';
import 'core/theme/app_theme.dart';

// Handles FCM messages that arrive while the app is fully terminated.
// Must be a top-level function.
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
}

/// Converts the FCM data map to a route path for tap navigation.
String? _routeFromData(Map<String, dynamic> data) {
  final type = data['type'] as String?;
  if (type == 'order') {
    final id = data['orderId'] as String?;
    return id != null ? '/orders/$id' : '/orders';
  }
  if (type == 'appointment') return '/appointments';
  if (type == 'project') {
    final id = data['projectId'] as String?;
    return id != null ? '/projects/$id' : '/projects';
  }
  if (type == 'message') {
    final id = data['customerId'] as String?;
    return id != null ? '/messages/$id' : '/messages';
  }
  return null;
}

void _navigateForMessage(RemoteMessage message) {
  final route = _routeFromData(message.data);
  if (route == null) return;
  final context = rootNavigatorKey.currentContext;
  if (context == null) return;
  GoRouter.of(context).go(route);
}

void _showForegroundBanner(RemoteMessage message) {
  final notification = message.notification;
  if (notification == null) return;

  final context = rootNavigatorKey.currentContext;
  if (context == null) return;

  final route = _routeFromData(message.data);

  ScaffoldMessenger.of(context).showMaterialBanner(
    MaterialBanner(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      content: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (notification.title != null)
            Text(
              notification.title!,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          if (notification.body != null)
            Text(notification.body!),
        ],
      ),
      actions: [
        if (route != null)
          TextButton(
            onPressed: () {
              ScaffoldMessenger.of(context).hideCurrentMaterialBanner();
              GoRouter.of(context).go(route);
            },
            child: const Text('VIEW'),
          ),
        TextButton(
          onPressed: () =>
              ScaffoldMessenger.of(context).hideCurrentMaterialBanner(),
          child: const Text('DISMISS'),
        ),
      ],
    ),
  );

  // Auto-dismiss after 4 seconds — capture messenger before the async gap
  final messenger = ScaffoldMessenger.of(context);
  Future.delayed(const Duration(seconds: 4), messenger.hideCurrentMaterialBanner);
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();

  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

  await FirebaseMessaging.instance.requestPermission(
    alert: true,
    badge: true,
    sound: true,
  );

  runApp(const ProviderScope(child: App()));
}

class App extends ConsumerStatefulWidget {
  const App({super.key});

  @override
  ConsumerState<App> createState() => _AppState();
}

class _AppState extends ConsumerState<App> {
  @override
  void initState() {
    super.initState();
    _setupFcmHandlers();
  }

  void _setupFcmHandlers() {
    // Foreground: show a banner inside the app
    FirebaseMessaging.onMessage.listen(_showForegroundBanner);

    // Background → app tap: navigate to the relevant screen
    FirebaseMessaging.onMessageOpenedApp.listen(_navigateForMessage);

    // Terminated → app tap: navigate once the widget tree is ready
    FirebaseMessaging.instance.getInitialMessage().then((message) {
      if (message == null) return;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _navigateForMessage(message);
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'Uzbek CRM',
      theme: AppTheme.light,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('uz'),
        Locale('ru'),
        Locale('en'),
      ],
    );
  }
}
