"use client";

import { todayStr } from "./dates";
import { useStore } from "./store";
import { Capacitor } from "@capacitor/core";
import { MelonMateHealth } from "@melonmate/capacitor-health";

const HEALTH_CONNECTED_KEY = "melonmate-health-connected";

/**
 * Legacy bridge contract retained for browser-based native shells. The
 * Capacitor build uses the typed MelonMateHealth plugin above.
 */
export interface AppleHealthBridge {
  isAvailable: () => Promise<boolean>;
  requestActivityAuthorization: () => Promise<boolean>;
  readDailyActivity: (date: string) => Promise<{ steps: number; standMinutes: number }>;
}

declare global {
  interface Window {
    MelonMateHealth?: AppleHealthBridge;
  }
}

export function hasAppleHealthBridge(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("MelonMateHealth")
    || (typeof window !== "undefined" && Boolean(window.MelonMateHealth));
}

export function shouldAutoSyncAppleHealth(): boolean {
  return typeof localStorage !== "undefined" && localStorage.getItem(HEALTH_CONNECTED_KEY) === "1";
}

export async function connectAndSyncAppleHealth(date = todayStr()): Promise<
  | { status: "unavailable" | "denied"; xp: 0 }
  | { status: "synced"; xp: number; steps: number; standMinutes: number }
> {
  let activity: { steps: number; standMinutes: number };
  if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("MelonMateHealth")) {
    const availability = await MelonMateHealth.isAvailable();
    if (!availability.available) return { status: "unavailable", xp: 0 };
    const permission = await MelonMateHealth.requestActivityAuthorization();
    if (!permission.authorized) return { status: "denied", xp: 0 };
    activity = await MelonMateHealth.readDailyActivity({ date });
  } else {
    const bridge = typeof window === "undefined" ? undefined : window.MelonMateHealth;
    if (!bridge || !(await bridge.isAvailable())) return { status: "unavailable", xp: 0 };
    if (!(await bridge.requestActivityAuthorization())) return { status: "denied", xp: 0 };
    activity = await bridge.readDailyActivity(date);
  }
  localStorage.setItem(HEALTH_CONNECTED_KEY, "1");
  const xp = useStore.getState().applyHealthActivity({
    date,
    steps: activity.steps,
    standMinutes: activity.standMinutes,
  });
  return { status: "synced", xp, ...activity };
}
