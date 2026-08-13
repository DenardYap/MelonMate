import { describe, expect, it } from "vitest";
import {
  DAILY_XP_REWARD,
  DAILY_XP_CAP,
  MAX_PLAYER_LEVEL,
  MAX_TOTAL_XP,
  combinedXp,
  dailyXpAward,
  healthRewardBetweenTiers,
  healthWorkoutXp,
  inAppWorkoutXp,
  isDailyXpEligible,
  levelFromXp,
  levelProgressFromXp,
  standTierFromMinutes,
  standXpBetweenTiers,
  stepTierFromCount,
  stepXpBetweenTiers,
  xpForLevel,
  xpForStepTier,
} from "./game";
import { isThemeUnlocked } from "./themes";

describe("daily XP", () => {
  it("makes the nutrition goal the largest single daily reward", () => {
    expect(DAILY_XP_REWARD).toBe(200);
  });

  it("requires at least three logged items", () => {
    expect(isDailyXpEligible(2, 1_600, 2_000)).toBe(false);
    expect(isDailyXpEligible(3, 1_600, 2_000)).toBe(true);
  });

  it("allows the target but rejects calories over it", () => {
    expect(isDailyXpEligible(3, 2_000, 2_000)).toBe(true);
    expect(isDailyXpEligible(3, 2_001, 2_000)).toBe(false);
  });

  it("caps all food and fitness rewards at 300 XP per day", () => {
    expect(DAILY_XP_CAP).toBe(300);
    expect(dailyXpAward(250, 290, 50)).toBe(10);
    expect(dailyXpAward(250, 300, 50)).toBe(0);
  });
});

describe("Apple Health XP milestones", () => {
  it("splits each growing 3,000-step reward across 1,000-step milestones", () => {
    expect([1, 2, 3, 4, 5, 6].map(xpForStepTier)).toEqual([7, 6, 7, 9, 9, 9]);
    expect(stepTierFromCount(8_999)).toBe(8);
    expect(stepTierFromCount(9_000)).toBe(9);
    expect(stepXpBetweenTiers(0, 9)).toBe(83);
  });

  it("awards proportionately scaled standing XP in 10-minute increments", () => {
    expect(standTierFromMinutes(59)).toBe(5);
    expect(standTierFromMinutes(60)).toBe(6);
    expect(standXpBetweenTiers(0, 6)).toBe(24);
  });

  it("reports a step reward breakdown for a newly crossed 1,000-step milestone", () => {
    expect(healthRewardBetweenTiers(
      { stepTier: 0, standTier: 0 },
      { stepTier: 1, standTier: 0 }
    )).toEqual({
      stepXp: 7,
      standXp: 0,
      stepMilestones: 1,
      standMilestones: 0,
      totalXp: 7,
    });
  });

  it("scales completed workout XP with duration", () => {
    expect(healthWorkoutXp(20)).toBe(40);
    expect(healthWorkoutXp(45)).toBe(90);
  });
});

describe("in-app workout XP", () => {
  it("rewards completed sets and fully finished exercises", () => {
    expect(inAppWorkoutXp([
      { sets: [{ done: true }, { done: true }] },
      { sets: [{ done: true }, { done: false }] },
    ])).toEqual({ xp: 21, completedSets: 3, completedExercises: 1 });
  });
});

describe("level unlocks", () => {
  it("ignores legacy farm XP and caps the current progression track", () => {
    const xp = combinedXp(50, 190);
    expect(xp).toBe(50);
    expect(combinedXp(MAX_TOTAL_XP + 1_000)).toBe(MAX_TOTAL_XP);
    expect(levelFromXp(MAX_TOTAL_XP + 1_000)).toBe(MAX_PLAYER_LEVEL);
  });

  it("reports progress within the current level", () => {
    expect(levelProgressFromXp(100)).toEqual({
      level: 2,
      totalXp: 100,
      earned: 40,
      needed: 180,
      progress: 40 / 180,
    });
  });

  it("uses the same XP thresholds everywhere", () => {
    expect(levelFromXp(xpForLevel(4))).toBe(4);
    expect(levelFromXp(xpForLevel(4) - 1)).toBe(3);
  });

  it("keeps rare themes locked until their level", () => {
    expect(isThemeUnlocked("hami", 3)).toBe(false);
    expect(isThemeUnlocked("hami", 4)).toBe(true);
    expect(isThemeUnlocked("moon-gold", 5)).toBe(false);
    expect(isThemeUnlocked("moon-gold", 6)).toBe(true);
    expect(isThemeUnlocked("densuke", 11)).toBe(false);
    expect(isThemeUnlocked("densuke", 12)).toBe(true);
  });
});
