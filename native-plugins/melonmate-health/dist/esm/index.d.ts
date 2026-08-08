import type { Plugin } from "@capacitor/core";

export interface DailyActivityResult {
  steps: number;
  standMinutes: number;
}

export interface MelonMateHealthPlugin extends Plugin {
  isAvailable(): Promise<{ available: boolean }>;
  requestActivityAuthorization(): Promise<{ authorized: boolean }>;
  readDailyActivity(options: { date: string }): Promise<DailyActivityResult>;
}

export declare const MelonMateHealth: MelonMateHealthPlugin;
