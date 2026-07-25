# Packaging Inner Circle for Android and iOS

The app now uses Capacitor as a native wrapper around the existing React/Vite build. The browser/Firebase Hosting version still builds from `dist`, and the native Android/iOS projects are synced from that same output.

## Prerequisites

- Node.js 20.19 or newer and npm
- JDK 17 or newer for Android (the project is verified with JDK 21)
- macOS and Xcode for iOS builds

Install the locked dependency set after cloning or moving the project:

```bash
npm ci
```

## Shared web build

```bash
npm run build
```

## Sync native projects

On Windows or for Android-only work:

```bash
npm run cap:sync
```

On macOS, sync iOS separately:

```bash
npm run cap:sync:ios
```

These commands build the web app, copy the latest `dist` files into the selected native project, and normalize generated Swift Package Manager paths for iOS. Windows may represent the tracked iOS package symlink as a small text file; macOS restores it as a real relative symlink when Git symlink support is enabled.

## Android debug APK

```bash
npm run cap:build:android
```

The debug APK is written to:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

For a signed Play Store App Bundle:

```bash
npm run cap:bundle:android
```

The release task always creates a named copy for Play Console uploads using the format
`Inner-Circle-v<version-name>-<version-code>.aab`. This is the file to upload. The generic
`app-release.aab` remains as Gradle's build artifact.

For example, version `1.2.0` with Play version code `13` produces:

```text
android/app/build/outputs/bundle/release/Inner-Circle-v1.2.0-13.aab
```

Before every Play release, increment both `versionName` and `versionCode` in
`android/app/build.gradle`.

## Release notes

Every AAB release must include copy/paste-ready Play Console release notes. Save the same notes in
`release-notes/` using the corresponding AAB filename, for example
`release-notes/Inner-Circle-v1.2.0-13.md`.

The build reads release signing credentials from `android/key.properties`. Keep that file and the referenced keystore private and backed up securely.

## iOS App Store build

The iOS project is scaffolded in `ios/`, but final build, signing, simulator testing, and App Store archive creation require macOS with Xcode.

```bash
npm run cap:open:ios
```

On the Mac, run `npm ci`, `npm run cap:sync:ios`, then open the iOS project in Xcode to configure signing and archive the app.

## App identity

- App name: `Inner Circle`
- App id / bundle id: `com.retaunfiltered.innercircle`
- Web assets directory: `dist`
