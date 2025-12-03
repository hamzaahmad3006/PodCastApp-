# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# ===== OneSignal Push Notifications =====
-keep class com.onesignal.** { *; }
-keep interface com.onesignal.** { *; }
-dontwarn com.onesignal.**
-dontwarn com.google.android.gms.**

# OneSignal SDK
-keepattributes *Annotation*
-keepattributes Signature
-keep class com.onesignal.OneSignal { *; }
-keep class com.onesignal.OneSignalPackagePrivateHelper { *; }

# Google Play Services (required for OneSignal)
-keep class com.google.android.gms.** { *; }
-keep interface com.google.android.gms.** { *; }
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# React Native
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep,allowobfuscation @interface com.facebook.common.internal.DoNotStrip
-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keep @com.facebook.common.internal.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
    @com.facebook.common.internal.DoNotStrip *;
}

# Hermes
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# AsyncStorage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# React Native Track Player
-keep class com.doublesymmetry.** { *; }
-dontwarn com.doublesymmetry.**

# Supabase / Network
-keepattributes Exceptions, InnerClasses
-keepclassmembers class * {
    @retrofit2.http.* <methods>;
}
