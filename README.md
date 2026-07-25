# Peptide Vault

**Peptide Vault** is a local-first, mobile-first Progressive Web App (PWA) that serves as a reconstitution calculator and dosage tracking tool for research peptides. Core tracking works offline, with optional Firebase accounts and cloud synchronization when a user enables them.

---

## Safety Disclaimer

> [!WARNING]
> This app is for tracking and calculation support only. It does not provide medical advice, dosing recommendations, diagnosis, or treatment guidance. Users are responsible for verifying all calculations with a qualified medical professional. All dosages, reconstitution quantities, and syringe configurations are inputted solely by the user.

---

## Key Features

1. **Reconstitution Calculator**: Calculates concentrations (mg/mL, mcg/mL), dosage draw (mL, units), doses per vial, and vial percentage. Validates inputs and warns when draws exceed syringe size.
2. **Peptide Vault**: Displays cards of all active peptides on hand, showing active doses, syringe draws, next due injection dates, and estimated days remaining until the vial is empty.
3. **Flexible Schedules**: Supports "Every X Days" routines and "Days of Week" schedules with custom anchor dates (start dates or last injection dates).
4. **Log Injection Events**: Log injections as completed (taken), skipped, or missed, with support for past manual adjustments.
5. **Interactive Calendar**: Grid view (monthly & weekly toggles) highlighting due dates and past completions, with quick-log checkboxes.
6. **Local-First Persistence**: Persists records inside the browser via IndexedDB with Dexie and supports optional Firebase cloud synchronization.
7. **PWA Installed Experience**: Add to home screen support, custom icons, standalone display mode, and offline asset caching.
8. **Device Reminders**: Schedules native iOS/Android reminders ahead of time so they can fire while the app is backgrounded.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 20.19 or newer
- `npm` (packaged with Node.js)
- JDK 17 or newer for Android builds (Android Studio's bundled JDK is supported)
- macOS and Xcode for iOS builds

### Installation

Clone or locate this directory, and download dependencies:
```bash
npm ci
```

### Development Server

Run the development server locally:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your web browser.

### Build and Package

Compile static web assets (with service worker) for production:
```bash
npm run build
```

Preview the production bundle locally:
```bash
npm run preview
```

### Firebase Hosting

This project is ready for Firebase Hosting. The upload target is the `dist/` folder created by the production build.

Recommended Windows flow:

1. Run `INSTALL_FIREBASE_TOOLS.bat` once.
2. Run `FIREBASE_LOGIN.bat` once.
3. Run `SET_FIREBASE_PROJECT.bat` and paste your Firebase project ID.
4. Run `DEPLOY_TO_FIREBASE.bat` whenever you want to build and upload the app.

Optional local production check:
```bash
npm run build
npm run preview
```

---

## Offline Storage Notes

- The app stores its working data client-side inside the browser's **IndexedDB** engine using **Dexie.js**.
- Account creation and cloud sync are optional. When enabled, selected records are transmitted to Firebase under the signed-in user's account.
- COA attachments are limited to 500 KiB because they are included in local backups and synchronized stock records.
- Clearing browser data, caching, or resetting the app via browser settings can wipe IndexedDB. It is recommended to perform manual backups or maintain physical paper logs of vital logs if browser data needs to be cleared.

---

## Future Feature List

- **Barcode & Label Scanning**: Quick peptide scanning to prefill reconstitution values.
- **Detailed Analytics**: Graphs of doses over time and schedule adherence charts.
