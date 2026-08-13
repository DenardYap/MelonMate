"use client";

import { App } from "@capacitor/app";
import { Capacitor, type PermissionState, type PluginListenerHandle } from "@capacitor/core";
import { Haptics, NotificationType } from "@capacitor/haptics";
import { LocalNotifications } from "@capacitor/local-notifications";
import { PushNotifications } from "@capacitor/push-notifications";
import { StatusBar, Style } from "@capacitor/status-bar";
import { apiFetch } from "./api";
import { connectAndSyncAppleHealth, shouldAutoSyncAppleHealth } from "./appleHealth";
import { useGardenStore } from "./gardenStore";
import {
  buildNativeCampaignNotifications,
  isAutomatedCampaignNotificationId,
  type CampaignPreferenceKey,
  type NativeCampaignPreferences,
} from "./nativeNotificationCampaigns";
import { useStore } from "./store";
import type { Lang } from "./types";

const SETTINGS_KEY = "melonmate-native-settings-v1";
const LEGACY_DAILY_REMINDER_ID = 7_001;
const HEALTH_REWARD_NOTIFICATION_ID_BASE = 400_000_000;
const HEALTH_AUTO_SYNC_INTERVAL_MS = 60_000;

interface NativeSettings {
  remoteNotifications: boolean;
  mealReminders: boolean;
  streakReminders: boolean;
  harvestReminders: boolean;
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
let storeUnsubscribers: (() => void)[] = [];
let campaignRefreshTimer: ReturnType<typeof setTimeout> | null = null;
let healthAutoSyncTimer: ReturnType<typeof setInterval> | null = null;
let campaignRefreshPromise: Promise<void> = Promise.resolve();
let sessionPushToken: string | null = null;
let pushTokenWaiters: ((token: string) => void)[] = [];
let launchUrlConsumed = false;

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

function readSettings(): NativeSettings {
  const fallback: NativeSettings = {
    remoteNotifications: false,
    mealReminders: false,
    streakReminders: false,
    harvestReminders: false,
  };
  if (typeof localStorage === "undefined") return fallback;
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") as Partial<NativeSettings> & {
      dailyReminder?: boolean;
    };
    return {
      ...fallback,
      ...saved,
      mealReminders: saved.mealReminders ?? saved.dailyReminder ?? false,
    };
  } catch {
    return fallback;
  }
}

function writeSettings(patch: Partial<NativeSettings>): NativeSettings {
  const next = { ...readSettings(), ...patch };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

function campaignPreferences(settings = readSettings()): NativeCampaignPreferences {
  return {
    mealReminders: settings.mealReminders,
    streakReminders: settings.streakReminders,
    harvestReminders: settings.harvestReminders,
  };
}

async function performCampaignRefresh(): Promise<void> {
  if (!isNativeApp()) return;
  const pending = await LocalNotifications.getPending().catch(() => ({ notifications: [] }));
  const stale = pending.notifications
    .filter((notification) => notification.id === LEGACY_DAILY_REMINDER_ID
      || isAutomatedCampaignNotificationId(notification.id))
    .map(({ id }) => ({ id }));
  if (stale.length > 0) await LocalNotifications.cancel({ notifications: stale }).catch(() => {});

  const permission = (await LocalNotifications.checkPermissions()).display;
  if (permission !== "granted") return;

  const settings = readSettings();
  const state = useStore.getState();
  const profileId = state.activeProfileId;
  const profile = state.profiles.find((item) => item.id === profileId) ?? state.profiles[0];
  if (!profile) return;
  const garden = useGardenStore.getState().gardens[profileId];
  const notifications = buildNativeCampaignNotifications(campaignPreferences(settings), {
    lang: state.lang,
    logs: state.logs[profileId] ?? [],
    calorieTarget: profile.goals.cal,
    streak: state.game[profileId]?.streak ?? 0,
    plots: garden?.plots ?? [],
  });
  if (notifications.length === 0) return;
  await LocalNotifications.schedule({
    notifications: notifications.map((notification) => ({
      id: notification.id,
      title: notification.title,
      body: notification.body,
      sound: "default",
      schedule: { at: notification.at },
      extra: notification.extra,
    })),
  });
}

export function refreshAutomatedNotifications(): Promise<void> {
  campaignRefreshPromise = campaignRefreshPromise
    .catch(() => {})
    .then(() => performCampaignRefresh());
  return campaignRefreshPromise;
}

function queueCampaignRefresh(delay = 150) {
  if (campaignRefreshTimer) clearTimeout(campaignRefreshTimer);
  campaignRefreshTimer = setTimeout(() => {
    campaignRefreshTimer = null;
    void refreshAutomatedNotifications();
  }, delay);
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
  if (!context) return;
  try {
    const response = await apiFetch("/api/push/register", {
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
    if (!response.ok) throw new Error(`push-registration-${response.status}`);
    sessionPushToken = token;
    pushTokenWaiters.splice(0).forEach((resolve) => resolve(token));
  } catch {
    // APNs registration still succeeded. The token is retained and retried
    // whenever the app becomes active or notifications are enabled again.
  }
}

async function currentPushToken(): Promise<string> {
  if (sessionPushToken) return sessionPushToken;
  await ensureNativeListeners();
  const token = new Promise<string>((resolve, reject) => {
    const waiter = (value: string) => {
      clearTimeout(timeout);
      resolve(value);
    };
    const timeout = setTimeout(() => {
      pushTokenWaiters = pushTokenWaiters.filter((candidate) => candidate !== waiter);
      reject(new Error("push-token-timeout"));
    }, 15_000);
    pushTokenWaiters.push(waiter);
  });
  await PushNotifications.register();
  return token;
}

function runAutomaticHealthSync() {
  if (!shouldAutoSyncAppleHealth()) return;
  void connectAndSyncAppleHealth().then((result) => {
    if (result.status === "synced") context?.onHealthSynced?.(result.xp);
  }).catch(() => {});
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
        queueCampaignRefresh(0);
        runAutomaticHealthSync();
      }),
    ];
    storeUnsubscribers = [
      useStore.subscribe(() => queueCampaignRefresh()),
      useGardenStore.subscribe(() => queueCampaignRefresh()),
    ];
    healthAutoSyncTimer ??= setInterval(runAutomaticHealthSync, HEALTH_AUTO_SYNC_INTERVAL_MS);
  })();
  return listenerSetup;
}

export async function initializeNativeApp(nextContext: NativeContext): Promise<() => void> {
  if (!isNativeApp()) return () => {};
  context = nextContext;
  await ensureNativeListeners();
  await StatusBar.setStyle({ style: Style.Light }).catch(() => {});
  await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});

  // Capacitor keeps returning the URL that originally launched this app process.
  // Providers can initialize again when a setting such as language changes, so
  // treating that URL as a fresh navigation would replay a stale deep link.
  if (!launchUrlConsumed) {
    launchUrlConsumed = true;
    const launch = await App.getLaunchUrl().catch(() => undefined);
    if (launch?.url) {
      const path = pathFromAppUrl(launch.url);
      if (path) nextContext.navigate(path);
    }
  }

  const settings = readSettings();
  if (settings.remoteNotifications) await PushNotifications.register().catch(() => {});
  await refreshAutomatedNotifications().catch(() => {});
  runAutomaticHealthSync();

  return () => {
    context = null;
  };
}

export async function notificationState(): Promise<{
  permission: PermissionState;
  campaigns: NativeCampaignPreferences;
}> {
  if (!isNativeApp()) {
    return {
      permission: "denied",
      campaigns: { mealReminders: false, streakReminders: false, harvestReminders: false },
    };
  }
  const permission = (await PushNotifications.checkPermissions()).receive;
  return { permission, campaigns: campaignPreferences() };
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
  }
  return permission;
}

export async function sendPushTestNotification(): Promise<void> {
  if (!isNativeApp() || !context) throw new Error("native-context-unavailable");
  const permission = (await PushNotifications.checkPermissions()).receive;
  if (permission !== "granted") throw new Error("push-permission-not-granted");
  const token = await currentPushToken();
  const response = await apiFetch("/api/push/self-test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId: context.deviceId, token }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(payload.error || `push-test-${response.status}`);
  }
}

export async function setAutomatedCampaign(
  campaign: CampaignPreferenceKey,
  enabled: boolean
): Promise<boolean> {
  if (!isNativeApp()) return false;
  if (!enabled) {
    writeSettings({ [campaign]: false });
    await refreshAutomatedNotifications().catch(() => {});
    return false;
  }

  let permission = (await LocalNotifications.checkPermissions()).display;
  if (permission === "prompt" || permission === "prompt-with-rationale") {
    permission = (await LocalNotifications.requestPermissions()).display;
  }
  if (permission !== "granted") return false;
  writeSettings({ [campaign]: true });
  await refreshAutomatedNotifications();
  return true;
}

/** Backward-compatible alias for callers that treated the old reminder as a meal reminder. */
export async function setDailyReminder(enabled: boolean, _lang: Lang): Promise<boolean> {
  return setAutomatedCampaign("mealReminders", enabled);
}

export async function sendHealthRewardNotification(
  reward: {
    id: string;
    totalXp: number;
    stepXp: number;
    standXp: number;
    stepMilestones: number;
    standMilestones: number;
    workoutXp: number;
    workouts: { id: string; activityType: string }[];
  },
  lang: Lang
): Promise<boolean> {
  if (!isNativeApp() || reward.totalXp <= 0) return false;
  let permission = (await LocalNotifications.checkPermissions()).display;
  if (permission === "prompt" || permission === "prompt-with-rationale") {
    permission = (await LocalNotifications.requestPermissions()).display;
  }
  if (permission !== "granted") return false;

  const parts = lang === "zh"
    ? [
      reward.stepXp > 0 ? `${reward.stepMilestones} 個步數里程碑` : "",
      reward.standXp > 0 ? `${reward.standMilestones} 個站立里程碑` : "",
      reward.workoutXp > 0 ? `${reward.workouts.length} 次訓練` : "",
    ].filter(Boolean)
    : [
      reward.stepXp > 0 ? `${reward.stepMilestones} step milestone${reward.stepMilestones === 1 ? "" : "s"}` : "",
      reward.standXp > 0 ? `${reward.standMilestones} standing milestone${reward.standMilestones === 1 ? "" : "s"}` : "",
      reward.workoutXp > 0 ? `${reward.workouts.length} workout${reward.workouts.length === 1 ? "" : "s"}` : "",
    ].filter(Boolean);
  const numericId = HEALTH_REWARD_NOTIFICATION_ID_BASE
    + (Array.from(reward.id).reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 0) % 100_000_000);
  await LocalNotifications.schedule({
    notifications: [{
      id: numericId,
      title: lang === "zh" ? `活動獎勵 · +${reward.totalXp} XP` : `Activity reward · +${reward.totalXp} XP`,
      body: parts.join(lang === "zh" ? "、" : " and "),
      sound: "default",
      schedule: { at: new Date(Date.now() + 500) },
      extra: { path: "/", campaign: "health-reward" },
    }],
  });
  return true;
}

export async function successHaptic() {
  if (!isNativeApp()) return;
  await Haptics.notification({ type: NotificationType.Success }).catch(() => {});
}

export async function disposeNativeListeners() {
  if (campaignRefreshTimer) clearTimeout(campaignRefreshTimer);
  campaignRefreshTimer = null;
  if (healthAutoSyncTimer) clearInterval(healthAutoSyncTimer);
  healthAutoSyncTimer = null;
  await Promise.all(listenerHandles.map((handle) => handle.remove().catch(() => {})));
  listenerHandles = [];
  storeUnsubscribers.forEach((unsubscribe) => unsubscribe());
  storeUnsubscribers = [];
  pushTokenWaiters = [];
  sessionPushToken = null;
  listenerSetup = null;
}
