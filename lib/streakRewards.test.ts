import { describe, expect, it } from "vitest";
import { earnedStreakMilestones, STREAK_MILESTONES, streakMilestoneAt } from "./streakRewards";

describe("streak rewards", () => {
  it("defines increasing one-time milestones through day 90", () => {
    expect(STREAK_MILESTONES.map((milestone) => milestone.days)).toEqual([3, 7, 14, 30, 60, 90]);
    expect(STREAK_MILESTONES.map((milestone) => milestone.xp)).toEqual([15, 25, 40, 60, 75, 85]);
    expect(streakMilestoneAt(7)?.xp).toBe(25);
    expect(streakMilestoneAt(8)).toBeUndefined();
  });

  it("backfills badge claims from an existing best streak", () => {
    expect(earnedStreakMilestones(29)).toEqual([3, 7, 14]);
  });
});
