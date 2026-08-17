"use client";

import { todayStr } from "./dates";
import { healthRewardBetweenTiers, healthWorkoutXp, standTierFromMinutes, stepTierFromCount } from "./game";
import { useHealthRewardQueue } from "./healthRewards";
import { useStore } from "./store";
import { Capacitor } from "@capacitor/core";
import { MelonMateHealth } from "@melonmate/capacitor-health";
import type { HealthWorkout } from "./types";

// v2 includes workout read access. Existing step-only connections are asked
// once for the newly added workout permission after upgrading.
const HEALTH_CONNECTED_KEY = "melonmate-health-connected-v2";

export type AppleHealthSyncResult =
  | { status: "unavailable" | "denied"; xp: 0 }
  | { status: "error"; xp: 0; error: string }
  | { status: "synced"; xp: number; steps: number; standMinutes: number; workouts: HealthWorkout[] };

const activeHealthSyncs = new Map<string, Promise<AppleHealthSyncResult>>();

/**
 * Legacy bridge contract retained for browser-based native shells. The
 * Capacitor build uses the typed MelonMateHealth plugin above.
 */
export interface AppleHealthBridge {
  isAvailable: () => Promise<boolean>;
  requestActivityAuthorization: () => Promise<boolean>;
  readDailyActivity: (date: string) => Promise<{ steps: number; standMinutes: number; workouts?: HealthWorkout[] }>;
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

export function isAppleHealthConnected(): boolean {
  return shouldAutoSyncAppleHealth();
}

function rememberAppleHealthConnection() {
  if (typeof localStorage !== "undefined") localStorage.setItem(HEALTH_CONNECTED_KEY, "1");
}

function healthSyncError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Apple Health could not be read";
}

async function performAppleHealthSync(date: string): Promise<AppleHealthSyncResult> {
  try {
    let activity: { steps: number; standMinutes: number; workouts?: HealthWorkout[] };
    const alreadyConnected = shouldAutoSyncAppleHealth();
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("MelonMateHealth")) {
      const availability = await MelonMateHealth.isAvailable();
      if (!availability.available) return { status: "unavailable", xp: 0 };
      if (!alreadyConnected) {
        const permission = await MelonMateHealth.requestActivityAuthorization();
        if (!permission.authorized) return { status: "denied", xp: 0 };
        rememberAppleHealthConnection();
      }
      activity = await MelonMateHealth.readDailyActivity({ date });
    } else {
      const bridge = typeof window === "undefined" ? undefined : window.MelonMateHealth;
      if (!bridge || !(await bridge.isAvailable())) return { status: "unavailable", xp: 0 };
      if (!alreadyConnected) {
        if (!(await bridge.requestActivityAuthorization())) return { status: "denied", xp: 0 };
        rememberAppleHealthConnection();
      }
      activity = await bridge.readDailyActivity(date);
    }

    const steps = Number.isFinite(activity.steps) ? Math.max(0, Math.round(activity.steps)) : 0;
    const standMinutes = Number.isFinite(activity.standMinutes) ? Math.max(0, Math.round(activity.standMinutes)) : 0;
    const workouts = (activity.workouts ?? []).filter((workout) =>
      Boolean(workout.id)
      && Number.isFinite(workout.durationMinutes)
      && workout.durationMinutes > 0
    ).map((workout) => ({
      ...workout,
      durationMinutes: Math.max(0, workout.durationMinutes),
      activeCalories: Number.isFinite(workout.activeCalories) ? Math.max(0, workout.activeCalories) : 0,
      startedAt: Number.isFinite(workout.startedAt) ? workout.startedAt : 0,
    }));
    rememberAppleHealthConnection();

    const state = useStore.getState();
    const profileId = state.activeProfileId;
    const previous = state.game[profileId]?.healthXpClaims?.[date] ?? { stepTier: 0, standTier: 0 };
    const reward = healthRewardBetweenTiers(previous, {
      stepTier: stepTierFromCount(steps),
      standTier: standTierFromMinutes(standMinutes),
    });
    const alreadyRewardedWorkoutIds = new Set(previous.workoutIds ?? []);
    const newlyCompletedWorkouts = workouts.filter((workout) => !alreadyRewardedWorkoutIds.has(workout.id));
    const workoutXp = newlyCompletedWorkouts.reduce(
      (total, workout) => total + healthWorkoutXp(workout.durationMinutes),
      0
    );
    const xp = state.applyHealthActivity({ date, steps, standMinutes, workouts });
    if (xp > 0) {
      let remainingXp = xp;
      const stepXp = Math.min(reward.stepXp, remainingXp);
      remainingXp -= stepXp;
      const standXp = Math.min(reward.standXp, remainingXp);
      remainingXp -= standXp;
      const awardedWorkoutXp = Math.min(workoutXp, remainingXp);
      const savedWorkouts = useStore.getState().health?.[profileId]?.[date]?.workouts ?? [];
      const awardedWorkouts = newlyCompletedWorkouts.map((workout) =>
        savedWorkouts.find((savedWorkout) => savedWorkout.id === workout.id) ?? workout
      );
      useHealthRewardQueue.getState().enqueue({
        ...reward,
        stepXp,
        standXp,
        workoutXp: awardedWorkoutXp,
        workouts: awardedWorkouts,
        totalXp: xp,
        date,
        steps,
        standMinutes,
      });
    }
    return { status: "synced", xp, steps, standMinutes, workouts };
  } catch (error) {
    return { status: "error", xp: 0, error: healthSyncError(error) };
  }
}

export function connectAndSyncAppleHealth(date = todayStr()): Promise<AppleHealthSyncResult> {
  const active = activeHealthSyncs.get(date);
  if (active) return active;
  const sync = performAppleHealthSync(date).finally(() => {
    if (activeHealthSyncs.get(date) === sync) activeHealthSyncs.delete(date);
  });
  activeHealthSyncs.set(date, sync);
  return sync;
}
