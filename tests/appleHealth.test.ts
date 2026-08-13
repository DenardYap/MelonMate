import { beforeEach, describe, expect, it, vi } from "vitest";

const healthPlugin = vi.hoisted(() => ({
  isAvailable: vi.fn(),
  requestActivityAuthorization: vi.fn(),
  readDailyActivity: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => true,
    isPluginAvailable: (name: string) => name === "MelonMateHealth",
  },
}));

vi.mock("@melonmate/capacitor-health", () => ({ MelonMateHealth: healthPlugin }));

import { connectAndSyncAppleHealth, isAppleHealthConnected } from "../lib/appleHealth";
import { useHealthRewardQueue } from "../lib/healthRewards";
import { useStore } from "../lib/store";

const storage = new Map<string, string>();

describe("Apple Health sync", () => {
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });
    healthPlugin.isAvailable.mockReset().mockResolvedValue({ available: true });
    healthPlugin.requestActivityAuthorization.mockReset().mockResolvedValue({ authorized: true });
    healthPlugin.readDailyActivity.mockReset().mockResolvedValue({ steps: 1_500, standMinutes: 0, workouts: [] });
    useStore.getState().resetAll();
    useHealthRewardQueue.setState({ pending: [] });
  });

  it("stores 1,500 steps, awards the 1,000-step milestone, and queues its popup", async () => {
    const result = await connectAndSyncAppleHealth("2026-08-09");

    expect(result).toEqual({ status: "synced", xp: 7, steps: 1_500, standMinutes: 0, workouts: [] });
    expect(useStore.getState().health["p-me"]["2026-08-09"].steps).toBe(1_500);
    expect(useStore.getState().game["p-me"].xp).toBe(7);
    expect(useHealthRewardQueue.getState().pending[0]).toMatchObject({
      stepXp: 7,
      standXp: 0,
      stepMilestones: 1,
      totalXp: 7,
    });
    expect(isAppleHealthConnected()).toBe(true);
  });

  it("combines closely spaced step and standing milestones into one popup", async () => {
    healthPlugin.readDailyActivity
      .mockResolvedValueOnce({ steps: 1_500, standMinutes: 10 })
      .mockResolvedValueOnce({ steps: 3_500, standMinutes: 30 });

    await connectAndSyncAppleHealth("2026-08-09");
    const firstRewardId = useHealthRewardQueue.getState().pending[0].id;
    await connectAndSyncAppleHealth("2026-08-09");

    expect(useStore.getState().game["p-me"].xp).toBe(32);
    expect(useHealthRewardQueue.getState().pending).toHaveLength(1);
    expect(useHealthRewardQueue.getState().pending[0]).toMatchObject({
      id: firstRewardId,
      steps: 3_500,
      standMinutes: 30,
      stepXp: 20,
      standXp: 12,
      stepMilestones: 3,
      standMilestones: 3,
      totalXp: 32,
    });
  });

  it("syncs workout type, duration, calories, and rewards each workout only once", async () => {
    const pilates = {
      id: "workout-pilates",
      activityType: "Pilates",
      durationMinutes: 45,
      activeCalories: 210.4,
      startedAt: 1_754_736_000_000,
    };
    healthPlugin.readDailyActivity.mockResolvedValue({ steps: 0, standMinutes: 0, workouts: [pilates] });

    const first = await connectAndSyncAppleHealth("2026-08-09");
    const second = await connectAndSyncAppleHealth("2026-08-09");

    expect(first).toMatchObject({ status: "synced", xp: 90, workouts: [pilates] });
    expect(second).toMatchObject({ status: "synced", xp: 0, workouts: [pilates] });
    expect(useStore.getState().health["p-me"]["2026-08-09"].workouts).toEqual([pilates]);
    expect(useHealthRewardQueue.getState().pending[0]).toMatchObject({
      workoutXp: 90,
      workouts: [pilates],
      totalXp: 90,
    });
  });

  it("keeps the connected state and returns an actionable error when reading fails", async () => {
    healthPlugin.readDailyActivity.mockRejectedValueOnce(new Error("HealthKit query failed"));

    const result = await connectAndSyncAppleHealth("2026-08-09");

    expect(result).toEqual({ status: "error", xp: 0, error: "HealthKit query failed" });
    expect(isAppleHealthConnected()).toBe(true);
  });

  it("does not request authorization again after a successful connection", async () => {
    await connectAndSyncAppleHealth("2026-08-09");
    await connectAndSyncAppleHealth("2026-08-09");

    expect(healthPlugin.requestActivityAuthorization).toHaveBeenCalledTimes(1);
    expect(healthPlugin.readDailyActivity).toHaveBeenCalledTimes(2);
  });

  it("deduplicates overlapping automatic sync requests", async () => {
    let resolveActivity: ((activity: { steps: number; standMinutes: number }) => void) | undefined;
    healthPlugin.readDailyActivity.mockReturnValueOnce(new Promise((resolve) => {
      resolveActivity = resolve;
    }));

    const first = connectAndSyncAppleHealth("2026-08-09");
    const second = connectAndSyncAppleHealth("2026-08-09");
    resolveActivity?.({ steps: 1_500, standMinutes: 0 });

    await expect(Promise.all([first, second])).resolves.toEqual([
      { status: "synced", xp: 7, steps: 1_500, standMinutes: 0, workouts: [] },
      { status: "synced", xp: 7, steps: 1_500, standMinutes: 0, workouts: [] },
    ]);
    expect(healthPlugin.readDailyActivity).toHaveBeenCalledTimes(1);
  });
});
