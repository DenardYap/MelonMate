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
    healthPlugin.readDailyActivity.mockReset().mockResolvedValue({ steps: 1_500, standMinutes: 0 });
    useStore.getState().resetAll();
    useHealthRewardQueue.setState({ pending: [] });
  });

  it("stores 1,500 steps, awards the 1,000-step milestone, and queues its popup", async () => {
    const result = await connectAndSyncAppleHealth("2026-08-09");

    expect(result).toEqual({ status: "synced", xp: 7, steps: 1_500, standMinutes: 0 });
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
      { status: "synced", xp: 7, steps: 1_500, standMinutes: 0 },
      { status: "synced", xp: 7, steps: 1_500, standMinutes: 0 },
    ]);
    expect(healthPlugin.readDailyActivity).toHaveBeenCalledTimes(1);
  });
});
