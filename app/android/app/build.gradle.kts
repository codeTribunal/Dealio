import java.io.FileInputStream
import java.util.Properties

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
    id("com.google.gms.google-services")
}

// ── Release signing ──────────────────────────────────────────────────────────
// android/key.properties (gitignored, alongside the *.jks ignore) supplies the
// upload keystore. Judah creates both — the exact keytool command and the
// key.properties template live in app/build-release.md. A release build
// WITHOUT key.properties fails below with a clear message; it must never
// silently fall back to debug signing (a debug-signed bundle can't be
// uploaded to Play, and a silently-wrong signature wastes a release cycle).
val keystorePropertiesFile = rootProject.file("key.properties")
val keystoreProperties = Properties().apply {
    if (keystorePropertiesFile.exists()) {
        load(FileInputStream(keystorePropertiesFile))
    }
}

android {
    namespace = "uz.dealio.crm"
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
        applicationId = "uz.dealio.crm"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        create("release") {
            if (keystorePropertiesFile.exists()) {
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
                storeFile = rootProject.file(keystoreProperties["storeFile"] as String)
                storePassword = keystoreProperties["storePassword"] as String
            }
        }
    }

    buildTypes {
        release {
            // Guard only when a release task was actually requested —
            // configuration runs for every Gradle invocation, and a missing
            // keystore must not break debug/profile `flutter run`.
            val releaseRequested = gradle.startParameter.taskNames.any {
                it.contains("release", ignoreCase = true)
            }
            if (releaseRequested && !keystorePropertiesFile.exists()) {
                throw GradleException(
                    "RELEASE SIGNING NOT CONFIGURED\n" +
                        "android/key.properties is missing, so this release build cannot be " +
                        "signed with the upload keystore.\n" +
                        "Refusing to fall back to debug signing.\n" +
                        "Create the keystore + key.properties as documented in app/build-release.md.",
                )
            }
            signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }
}

flutter {
    source = "../.."
}
