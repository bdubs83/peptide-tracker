# Packaging Inner Circle for Android and iOS

The app now uses Capacitor as a native wrapper around the existing React/Vite build. The browser/Firebase Hosting version still builds from `dist`, and the native Android/iOS projects are synced from that same output.

## Shared web build

```bash
npm run build
```

## Sync native projects

```bash
npm run cap:sync
```

This builds the web app and copies the latest `dist` files into both native projects.

## Android debug APK

```bash
npm run cap:build:android
```

The debug APK is written to:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

For Play Store release, open the Android project and create a signed release bundle:

```bash
npm run cap:open:android
```

Then use Android Studio's signed app bundle flow.

## iOS App Store build

The iOS project is scaffolded in `ios/`, but final build, signing, simulator testing, and App Store archive creation require macOS with Xcode.

```bash
npm run cap:open:ios
```

On the Mac, run `npm install`, `npm run cap:sync`, then open the iOS project in Xcode to configure signing and archive the app.

## App identity

- App name: `Inner Circle`
- App id / bundle id: `com.retaunfiltered.innercircle`
- Web assets directory: `dist`
