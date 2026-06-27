# Dev launcher: bridge the phone to the PC backend over USB, then run the app.
#
# Uses `adb reverse` so the device's localhost:3000 routes to the PC's
# localhost:3000 over the cable — independent of Wi-Fi, the PC's LAN IP, and the
# Windows Firewall. Run this instead of `flutter run` for on-device dev.
#
#   cd app
#   ./run-dev.ps1
#
# Re-run after unplugging/rebooting the phone (the reverse tunnel resets).

$ErrorActionPreference = 'Stop'

# Locate adb (it's not on PATH; ships with the Android SDK platform-tools).
$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
if (-not (Test-Path $adb)) { throw "adb not found at $adb — check your Android SDK location." }

Write-Host 'Devices:' -ForegroundColor Cyan
& $adb devices

Write-Host 'Setting reverse tunnel tcp:3000 -> PC localhost:3000 ...' -ForegroundColor Cyan
& $adb reverse tcp:3000 tcp:3000
& $adb reverse --list

# App defaults to http://localhost:3000/api/v1 (see lib/core/config/app_config.dart),
# which the tunnel above bridges to the PC backend. Pass --dart-define here to
# override for LAN/emulator/tunnel/prod instead.
flutter run
