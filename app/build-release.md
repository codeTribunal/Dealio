# Dealio Android — release build

Everything release-specific in one place. The build **fails on purpose** if
either of the two prerequisites below is missing — a silent fallback (debug
signing, localhost API) is worse than a failed build.

## 1. One-time: create the upload keystore (Judah)

```
keytool -genkey -v -keystore ~/dealio-upload-key.jks -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

(on Windows PowerShell use `$env:USERPROFILE\dealio-upload-key.jks` as the path)

> **BACK THIS FILE UP — OFF THIS MACHINE.** The keystore + its passwords are
> the only way to sign updates for the Play listing. Losing it means losing
> the ability to update the app on Google Play. Store a copy (and the
> passwords) in a password manager / encrypted backup NOW, before the first
> upload.

Then create `app/android/key.properties` (already gitignored — never commit
it, never share it):

```
storePassword=<store password>
keyPassword=<key password>
keyAlias=upload
storeFile=C:\\Users\\<you>\\dealio-upload-key.jks
```

`storeFile` may be absolute (recommended) or relative to `app/android/`.

Without this file, `flutter build appbundle --release` fails with
`RELEASE SIGNING NOT CONFIGURED` — that is the guard working, not a bug.
Debug builds (`flutter run`) are unaffected.

## 2. Every release: the pinned build command

```
flutter build appbundle --release --dart-define=API_BASE_URL=<prod api>/api/v1
```

Example (final host pending confirmation):

```
flutter build appbundle --release --dart-define=API_BASE_URL=https://api.dealio.uz/api/v1
```

`API_BASE_URL` is **required** for release: a release binary started without
it throws `RELEASE BUILD MISCONFIGURED` at startup (see
`lib/core/config/app_config.dart`) instead of silently shipping the
localhost dev default. Debug/profile builds keep the dev default and are
unaffected.

Output: `build/app/outputs/bundle/release/app-release.aab` → upload in Play
Console. The Play listing icon is `assets/branding/play_store_512.png`
(uploaded manually in the Console, not part of the bundle).

## 3. What release builds do differently

- Signed with the upload keystore from `android/key.properties`
  (`android/app/build.gradle.kts`, hard-fails when absent).
- `minifyEnabled` + `shrinkResources` with rules in
  `android/app/proguard-rules.pro` (Flutter engine + firebase_messaging keeps).
- `INTERNET` permission is declared in the **main** manifest — release builds
  do not inherit it from the debug/profile manifests.
