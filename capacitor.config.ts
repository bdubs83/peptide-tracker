/// <reference types="@capacitor-firebase/authentication" />

import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.retaunfiltered.innercircle",
  appName: "Inner Circle",
  webDir: "dist",
  bundledWebRuntime: false,
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: true,
      providers: ["apple.com", "google.com"],
    },
    LocalNotifications: {
      iconColor: "#6366f1",
      presentationOptions: ["badge", "sound", "banner", "list"],
    },
  },
  experimental: {
    ios: {
      spm: {
        packageOptions: {
          "@capacitor-firebase/authentication": {
            symlink: true,
          },
        },
      },
    },
  },
};

export default config;
