import 'package:flutter/foundation.dart';

class AppConfig {
  // Dev default targets the device's own localhost, bridged to the PC's
  // backend via `adb reverse tcp:3000 tcp:3000` (run once per device session).
  // This is independent of Wi-Fi / the PC's LAN IP / the firewall, so it
  // survives network changes. Override for LAN/emulator/tunnel/prod with:
  //   flutter run --dart-define=API_BASE_URL=http://<host>:3000/api/v1
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000/api/v1',
  );

  // True when API_BASE_URL was supplied via --dart-define (any value).
  static const bool _apiBaseOverridden =
      String.fromEnvironment('API_BASE_URL') != '';

  /// Release-build misconfiguration guard, called first thing in main().
  ///
  /// A release binary that silently falls back to the localhost dev default
  /// ships an app that can never reach the backend — and the failure would
  /// surface as vague network errors on customers' phones. Failing loudly at
  /// startup makes the broken build impossible to miss in pre-release
  /// testing. Debug/profile builds are unaffected.
  ///
  /// The pinned build command lives in app/build-release.md:
  ///   flutter build appbundle --release --dart-define=API_BASE_URL=<prod api>/api/v1
  static void assertReleaseConfig() {
    if (kReleaseMode && !_apiBaseOverridden) {
      throw StateError(
        'RELEASE BUILD MISCONFIGURED: API_BASE_URL was not provided via '
        '--dart-define, so this binary would target the localhost dev '
        'default. Rebuild with:\n'
        '  flutter build appbundle --release '
        '--dart-define=API_BASE_URL=https://<prod-api>/api/v1\n'
        'See app/build-release.md.',
      );
    }
  }

  // The public privacy policy served by the owner web app (web/app/privacy —
  // same document the in-app consent flow references). Domain pending Judah's
  // confirmation; the route is /privacy on the owner web app domain.
  static const String privacyPolicyUrl = 'https://dealio.uz/privacy';

  // PRODUCTS (product-seller) mode is deliberately parked for launch: Dealio
  // ships services and freelance first. When false, the Products option is
  // hidden in onboarding and in settings (except for a business already in
  // PRODUCTS mode), and the backend rejects new PRODUCTS selections. Existing
  // PRODUCTS businesses keep working and their bots keep serving. To un-park,
  // flip this to true (and the matching web + backend flags). The
  // catalog/checkout/order code path is left intact.
  static const bool productsModeEnabled = true;
}
