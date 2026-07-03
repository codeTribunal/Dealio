import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'core/config/app_config.dart';
import 'core/locale/locale_provider.dart';
import 'core/router/router.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/app_tokens.dart';
import 'l10n/app_localizations.dart';
import 'shared/utils/format.dart';

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
  final l = AppLocalizations.of(context);
  final t = AppTokens.of(context);

  ScaffoldMessenger.of(context).showMaterialBanner(
    MaterialBanner(
      backgroundColor: t.surface,
      surfaceTintColor: Colors.transparent,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      content: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (notification.title != null)
            Text(
              notification.title!,
              style: TextStyle(
                fontWeight: AppFontWeights.bold,
                color: t.text1,
              ),
            ),
          if (notification.body != null)
            Text(notification.body!, style: TextStyle(color: t.text2)),
        ],
      ),
      actions: [
        if (route != null)
          TextButton(
            onPressed: () {
              ScaffoldMessenger.of(context).hideCurrentMaterialBanner();
              GoRouter.of(context).go(route);
            },
            style: TextButton.styleFrom(foregroundColor: t.accent),
            child: Text(l?.notificationView ?? 'View'),
          ),
        TextButton(
          onPressed: () =>
              ScaffoldMessenger.of(context).hideCurrentMaterialBanner(),
          style: TextButton.styleFrom(foregroundColor: t.text2),
          child: Text(l?.notificationDismiss ?? 'Dismiss'),
        ),
      ],
    ),
  );

  // Auto-dismiss after 4 seconds — capture messenger before the async gap
  final messenger = ScaffoldMessenger.of(context);
  Future.delayed(const Duration(seconds: 4), messenger.hideCurrentMaterialBanner);
}

void main() async {
  // Fail-fast: a release binary built without --dart-define=API_BASE_URL
  // would silently target the localhost dev default. Throws before any UI.
  AppConfig.assertReleaseConfig();

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
    final locale = ref.watch(localeProvider);
    setCurrencyLocale(locale.languageCode);

    return MaterialApp.router(
      title: 'Dealio',
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      // Default to light for now; a real light/dark toggle comes in a later phase.
      themeMode: ThemeMode.light,
      routerConfig: router,
      scaffoldMessengerKey: rootScaffoldMessengerKey,
      debugShowCheckedModeBanner: false,
      locale: locale,
      builder: (context, child) {
        return MediaQuery(
          data: MediaQuery.of(context).copyWith(alwaysUse24HourFormat: true),
          child: child!,
        );
      },
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: AppLocalizations.supportedLocales,
    );
  }
}
