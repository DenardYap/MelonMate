/// <reference types="@capacitor/push-notifications" />

import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.melonmate.app",
  appName: "MelonMate",
  webDir: "mobile-dist",
  ios: {
    // Let the web surface paint edge-to-edge. Interactive content handles the
    // iPhone safe areas with CSS env(safe-area-inset-*), so UIKit must not add
    // a second inset that exposes the native WKWebView background.
    contentInset: "never",
    preferredContentMode: "mobile",
    scrollEnabled: true,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "banner", "list"],
    },
    LocalNotifications: {
      smallIcon: "ic_stat_melonmate",
      iconColor: "#6d9d52",
    },
    StatusBar: {
      style: "LIGHT",
      overlaysWebView: true,
    },
  },
};

export default config;
