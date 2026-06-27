# Packaging Peptide Vault as an Android APK with Capacitor

This guide explains how to bundle the "Peptide Vault" PWA into a native Android APK using Capacitor.

## Prerequisites

1. **Node.js**: Installed on your development machine.
2. **Android Studio**: Installed, with SDK Platforms and Build Tools configured.
3. **Java Development Kit (JDK)**: JDK 17 or higher (usually bundled with Android Studio).

## Step-by-Step Build Guide

1. **Build the Production Web App**
   Compile the React Vite app into static assets:
   ```bash
   npm run build
   ```
   This will create a `dist/` directory containing all CSS, JS, HTML, and PWA assets.

2. **Install Capacitor Core and CLI**
   Add Capacitor's core dependencies to your project:
   ```bash
   npm install @capacitor/core @capacitor/cli
   ```

3. **Initialize Capacitor**
   Initialize Capacitor with the app name, package ID, and compiled asset directory (`dist`):
   ```bash
   npx cap init "Peptide Vault" "com.thewrightremodel.peptidevault" --web-dir=dist
   ```

4. **Add the Android Platform**
   Install and link the Capacitor Android adapter:
   ```bash
   npm install @capacitor/android
   npx cap add android
   ```

5. **Sync Web Assets**
   Copy all the compiled PWA assets from `dist/` into the native Android template directory:
   ```bash
   npx cap sync android
   ```

6. **Open in Android Studio**
   Open Android Studio focused on the native Capacitor Android codebase:
   ```bash
   npx cap open android
   ```

7. **Compile the APK**
   Inside Android Studio, compile the APK:
   - Go to **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
   - The compiled `.apk` file will be generated in `android/app/build/outputs/apk/debug/app-debug.apk`.
   - To sign the APK for distribution, go to **Build** > **Generate Signed Bundle / APK...** and follow the standard signing prompts.
