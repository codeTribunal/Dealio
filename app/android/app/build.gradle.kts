import java.io.FileInputStream
import java.util.Properties

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
    id("com.google.gms.google-services")
}

// Upload-keystore credentials, loaded from app/android/key.properties (gitignored,
// never committed). rootProject for this module is app/android, so
// rootProject.file("key.properties") resolves to app/android/key.properties.
val keystorePropertiesFile = rootProject.file("key.properties")
val keystoreProperties = Properties()
val hasKeystore = keystorePropertiesFile.exists()
if (hasKeystore) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}

// SHIP-2 fail-fast: a release build MUST be signed with the upload keystore, never
// with debug keys. If key.properties is missing when a release/bundle task is
// requested, stop the build with a clear message instead of silently producing a
// debug-signed artifact. The guard is scoped to the requested task names, so debug
// builds and `flutter run` are unaffected — a naive throw inside buildTypes would
// evaluate on every Gradle invocation and break dev builds.
val isReleaseBuild = gradle.startParameter.taskNames.any { it.lowercase().contains("release") }
if (isReleaseBuild && !hasKeystore) {
    throw GradleException(
        "Release signing is not configured: app/android/key.properties is missing. " +
            "Create it with storeFile, storePassword, keyAlias and keyPassword pointing " +
            "at the upload keystore before building a release. Refusing to sign a release " +
            "build with debug keys."
    )
}

android {
    namespace = "uz.dealio.app"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "uz.dealio.app"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        create("release") {
            // Populated only when key.properties exists. The fail-fast guard above
            // already stops a release build when it does not, and debug builds do
            // not use this config, so leaving it empty for a keystore-less debug
            // build is safe (avoids an NPE at configuration time).
            if (hasKeystore) {
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
                storeFile = file(keystoreProperties["storeFile"] as String)
                storePassword = keystoreProperties["storePassword"] as String
            }
        }
    }

    buildTypes {
        release {
            // Sign release builds with the upload keystore (see signingConfigs above).
            signingConfig = signingConfigs.getByName("release")
        }
    }
}

flutter {
    source = "../.."
}
