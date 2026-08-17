import { beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({
  syncWorkout: vi.fn(() => Promise.resolve({ supported: true, active: true })),
  endWorkout: vi.fn(() => Promise.resolve({ supported: true })),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => true,
    isPluginAvailable: () => true,
  },
  registerPlugin: () => native,
}));

import { endWorkoutLiveActivity, syncWorkoutLiveActivity } from "./workoutLiveActivity";

describe("workout Live Activity", () => {
  beforeEach(() => {
    native.syncWorkout.mockClear();
    native.endWorkout.mockClear();
  });

  it("syncs workout and rest state to the native activity", () => {
    syncWorkoutLiveActivity({
      sessionId: "session-1",
      workoutName: "Push day",
      startedAt: 1_700_000_000_000,
      completedSets: 4,
      totalSets: 12,
      restEndsAt: 1_700_000_090_000,
      language: "en",
    });

    expect(native.syncWorkout).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: "session-1",
      completedSets: 4,
      restEndsAt: 1_700_000_090_000,
    }));
  });

  it("ends the matching activity with the workout", () => {
    endWorkoutLiveActivity("session-1");

    expect(native.endWorkout).toHaveBeenCalledWith({ sessionId: "session-1" });
  });
});
