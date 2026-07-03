# R8/ProGuard rules for the Dealio release build (minifyEnabled +
# shrinkResources). Flutter's Gradle plugin and each AAR's consumer rules
# cover most cases; the rules here pin the two areas we depend on directly.

# ── Flutter engine + embedding ───────────────────────────────────────────────
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.plugins.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.embedding.** { *; }
-dontwarn io.flutter.embedding.**

# Flutter references Play Core for deferred components; we don't ship it, so
# silence the missing-class warnings instead of pulling the dependency in.
-dontwarn com.google.android.play.core.**

# ── firebase_messaging (push notifications) ──────────────────────────────────
# FCM uses reflection for its service + message payload classes; keep them so
# background message handling survives shrinking.
-keep class com.google.firebase.messaging.** { *; }
-keep class com.google.firebase.iid.** { *; }
-dontwarn com.google.firebase.messaging.**
