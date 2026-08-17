"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";

interface WorkoutLiveActivityState {
  sessionId: string;
  workoutName: string;
  startedAt: number;
  completedSets: number;
  totalSets: number;
  restEndsAt?: number;
  language: "en" | "zh";
}

interface MelonMateWorkoutActivityPlugin {
  syncWorkout(options: WorkoutLiveActivityState): Promise<{ supported: boolean; active: boolean }>;
  endWorkout(options: { sessionId: string }): Promise<{ supported: boolean }>;
}

const MelonMateWorkoutActivity = registerPlugin<MelonMateWorkoutActivityPlugin>("MelonMateWorkoutActivity");

function pluginAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("MelonMateWorkoutActivity");
}

export function syncWorkoutLiveActivity(state: WorkoutLiveActivityState): void {
  if (!pluginAvailable()) return;
  void MelonMateWorkoutActivity.syncWorkout(state).catch(() => {});
}

export function endWorkoutLiveActivity(sessionId: string): void {
  if (!pluginAvailable()) return;
  void MelonMateWorkoutActivity.endWorkout({ sessionId }).catch(() => {});
}
