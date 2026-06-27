# Peptide Vault

**Peptide Vault** is a beautiful, mobile-first Progressive Web App (PWA) that serves as a reconstitution calculator and dosage tracking tool for research peptides. It provides precise measurements for syringe draws and helps users track vial capacity, dosage schedules, and injection histories completely offline.

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
6. **Fully Offline Persistence**: Persists all records inside the browser via IndexedDB with Dexie.
7. **PWA Installed Experience**: Add to home screen support, custom icons, standalone display mode, and offline asset caching.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) (v18 or higher recommended)
- `npm` (packaged with Node.js)

### Installation

Clone or locate this directory, and download dependencies:
```bash
npm install
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

- The app stores data entirely client-side inside the browser's **IndexedDB** engine using **Dexie.js**.
- No credentials, cloud accounts, or backend servers are utilized, ensuring complete privacy of research data.
- Clearing browser data, caching, or resetting the app via browser settings can wipe IndexedDB. It is recommended to perform manual backups or maintain physical paper logs of vital logs if browser data needs to be cleared.

---

## Future Feature List

- **Cloud Sync & Backups**: Optional encrypted cloud synchronization for multiple device usage.
- **Push Notifications**: Scheduled alert warnings when an injection is due today.
- **Barcode & Label Scanning**: Quick peptide scanning to prefill reconstitution values.
- **Multi-vial management**: Tracking multiple vials of the same peptide.
- **Detailed Analytics**: Graphs of doses over time and schedule adherence charts.
