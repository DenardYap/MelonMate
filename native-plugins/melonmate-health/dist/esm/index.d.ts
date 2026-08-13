import type { Plugin } from "@capacitor/core";

export interface DailyActivityResult {
  steps: number;
  standMinutes: number;
  workouts: {
    id: string;
    activityType: string;
    durationMinutes: number;
    activeCalories: number;
    startedAt: number;
  }[];
}

export interface MelonMateHealthPlugin extends Plugin {
  isAvailable(): Promise<{ available: boolean }>;
  requestActivityAuthorization(): Promise<{ authorized: boolean }>;
  readDailyActivity(options: { date: string }): Promise<DailyActivityResult>;
}

export declare const MelonMateHealth: MelonMateHealthPlugin;
