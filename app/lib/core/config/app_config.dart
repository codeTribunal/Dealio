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

  static const String privacyPolicyUrl = 'https://[yourdomain]/privacy';
}
