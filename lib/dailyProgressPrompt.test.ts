import { describe, expect, it } from "vitest";
import { millisecondsUntilDailyProgressPrompt, shouldPromptDailyProgress } from "./dailyProgressPrompt";

describe("daily friend progress prompt", () => {
  it("appears at or after 10 PM when progress has not been shared", () => {
    const now = new Date(2026, 7, 17, 22, 5);
    expect(shouldPromptDailyProgress({ now, lastPromptDate: null, friendCount: 2, sharedToday: false })).toBe(true);
  });

  it("does not interrupt workouts, repeat after dismissal, or appear without friends", () => {
    const now = new Date(2026, 7, 17, 22, 5);
    expect(shouldPromptDailyProgress({ now, lastPromptDate: "2026-08-17", friendCount: 2, sharedToday: false })).toBe(false);
    expect(shouldPromptDailyProgress({ now, lastPromptDate: null, friendCount: 0, sharedToday: false })).toBe(false);
    expect(shouldPromptDailyProgress({ now, lastPromptDate: null, friendCount: 2, sharedToday: false, workoutInProgress: true })).toBe(false);
    expect(shouldPromptDailyProgress({ now, lastPromptDate: null, friendCount: 2, sharedToday: true })).toBe(false);
  });

  it("schedules the next 10 PM boundary", () => {
    expect(millisecondsUntilDailyProgressPrompt(new Date(2026, 7, 17, 21, 30))).toBe(30 * 60 * 1000);
    expect(millisecondsUntilDailyProgressPrompt(new Date(2026, 7, 17, 22, 30))).toBe(23.5 * 60 * 60 * 1000);
  });
});
