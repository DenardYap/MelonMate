"use client";

import { App } from "@capacitor/app";
import { Capacitor, type PermissionState, type PluginListenerHandle } from "@capacitor/core";
import { Haptics, NotificationType } from "@capacitor/haptics";
import { LocalNotifications } from "@capacitor/local-notifications";
import { PushNotifications } from "@capacitor/push-notifications";
import { StatusBar, Style } from "@capacitor/status-bar";
import { apiFetch } from "./api";
import { connectAndSyncAppleHealth, shouldAutoSyncAppleHealth } from "./appleHealth";
import type { Lang } from "./types";

const SETTINGS_KEY = "melonmate-native-settings-v1";
const PUSH_TOKEN_KEY = "melonmate-apns-token";
const DAILY_REMINDER_ID = 7_001;

interface NativeSettings {
  remoteNotifications: boolean;
  dailyReminder: boolean;
}

interface NativeContext {
  deviceId: string;
  lang: Lang;
  navigate: (path: string) => void;
  onHealthSynced?: (xp: number) => void;
}

let context: NativeContext | null = null;
let listenerSetup: Promise<void> | null = null;
let listenerHandles: PluginListenerHandle[] = [];

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

function readSettings(): NativeSettings {
  if (typeof localStorage === "undefined") return { remoteNotifications: false, dailyReminder: false };
  try {
    return {
      remoteNotifications: false,
      dailyReminder: false,
      ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") as Partial<NativeSettings>),
    };
  } catch {
    return { remoteNotifications: false, dailyReminder: false };
  }
}

function writeSettings(patch: Partial<NativeSettings>): NativeSettings {
  const next = { ...readSettings(), ...patch };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

function safePath(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function pathFromAppUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "melonmate:") return null;
    const route = `/${url.hostname}${url.pathname === "/" ? "" : url.pathname}`;
    return `${route}${url.search}`;
  } catch {
    return null;
  }
}

async function uploadPushToken(token: string) {
  localStorage.setItem(PUSH_TOKEN_KEY, token);
  if (!context) return;
  try {
    await apiFetch("/api/push/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        deviceId: context.deviceId,
        platform: Capacitor.getPlatform(),
        lang: context.lang,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    });
  } catch {
    // APNs registration still succeeded. The token is retained and retried
    // whenever the app becomes active or notifications are enabled again.
  }
}

async function ensureNativeListeners() {
  if (!isNativeApp()) return;
  if (listenerSetup) return listenerSetup;
  listenerSetup = (async () => {
    listenerHandles = [
      await PushNotifications.addListener("registration", ({ value }) => void uploadPushToken(value)),
      await PushNotifications.addListener("registrationError", ({ error }) => {
        console.error("APNs registration failed", error);
      }),
      await PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
        const path = safePath(notification.data?.path);
        if (path) context?.navigate(path);
      }),
      await LocalNotifications.addListener("localNotificationActionPerformed", ({ notification }) => {
        const path = safePath(notification.extra?.path);
        if (path) context?.navigate(path);
      }),
      await App.addListener("appUrlOpen", ({ url }) => {
        const path = pathFromAppUrl(url);
        if (path) context?.navigate(path);
      }),
      await App.addListener("appStateChange", ({ isActive }) => {
        if (!isActive) return;
        const settings = readSettings();
        if (settings.remoteNotifications) void PushNotifications.register();
        if (shouldAutoSyncAppleHealth()) {
          void connectAndSyncAppleHealth().then((result) => {
            if (result.status === "synced") context?.onHealthSynced?.(result.xp);
          }).catch(() => {});
        }
      }),
    ];
  })();
  return listenerSetup;
}

export async function initializeNativeApp(nextContext: NativeContext): Promise<() => void> {
  if (!isNativeApp()) return () => {};
  context = nextContext;
  await ensureNativeListeners();
  await StatusBar.setStyle({ style: Style.Light }).catch(() => {});
  await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});

  const launch = await App.getLaunchUrl().catch(() => undefined);
  if (launch?.url) {
    const path = pathFromAppUrl(launch.url);
    if (path) nextContext.navigate(path);
  }

  const settings = readSettings();
  if (settings.remoteNotifications) await PushNotifications.register().catch(() => {});
  if (settings.dailyReminder) await scheduleDailyReminder(nextContext.lang).catch(() => {});
  if (shouldAutoSyncAppleHealth()) {
    void connectAndSyncAppleHealth().then((result) => {
      if (result.status === "synced") nextContext.onHealthSynced?.(result.xp);
    }).catch(() => {});
  }

  return () => {
    context = null;
  };
}

export async function notificationState(): Promise<{
  permission: PermissionState;
  dailyReminder: boolean;
}> {
  if (!isNativeApp()) return { permission: "denied", dailyReminder: false };
  const permission = (await PushNotifications.checkPermissions()).receive;
  return { permission, dailyReminder: readSettings().dailyReminder };
}

export async function enablePushNotifications(): Promise<PermissionState> {
  if (!isNativeApp()) return "denied";
  await ensureNativeListeners();
  let permission = (await PushNotifications.checkPermissions()).receive;
  if (permission === "prompt" || permission === "prompt-with-rationale") {
    permission = (await PushNotifications.requestPermissions()).receive;
  }
  if (permission === "granted") {
    writeSettings({ remoteNotifications: true });
    await PushNotifications.register();
    const savedToken = localStorage.getItem(PUSH_TOKEN_KEY);
    if (savedToken) void uploadPushToken(savedToken);
  }
  return permission;
}

export async function setDailyReminder(enabled: boolean, lang: Lang): Promise<boolean> {
  if (!isNativeApp()) return false;
  if (!enabled) {
    writeSettings({ dailyReminder: false });
    await LocalNotifications.cancel({ notifications: [{ id: DAILY_REMINDER_ID }] });
    return false;
  }

  let permission = (await LocalNotifications.checkPermissions()).display;
  if (permission === "prompt" || permission === "prompt-with-rationale") {
    permission = (await LocalNotifications.requestPermissions()).display;
  }
  if (permission !== "granted") return false;
  writeSettings({ dailyReminder: true });
  await scheduleDailyReminder(lang);
  return true;
}

async function scheduleDailyReminder(lang: Lang) {
  await LocalNotifications.cancel({ notifications: [{ id: DAILY_REMINDER_ID }] }).catch(() => {});
  await LocalNotifications.schedule({
    notifications: [{
      id: DAILY_REMINDER_ID,
      title: lang === "zh" ? "今天的瓜園在等你" : "Your melon farm is waiting",
      body: lang === "zh" ? "記錄晚餐並看看今天的 XP 進度。" : "Log dinner and check today's XP progress.",
      schedule: { on: { hour: 19, minute: 0 }, repeats: true },
      extra: { path: "/add?meal=dinner&source=notification" },
    }],
  });
}

export async function successHaptic() {
  if (!isNativeApp()) return;
  await Haptics.notification({ type: NotificationType.Success }).catch(() => {});
}

export async function disposeNativeListeners() {
  await Promise.all(listenerHandles.map((handle) => handle.remove().catch(() => {})));
  listenerHandles = [];
  listenerSetup = null;
}
