import { describe, expect, it } from "vitest";
import {
  DAILY_XP_REWARD,
  combinedXp,
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
});

describe("Apple Health XP milestones", () => {
  it("grows each 3,000-step reward by roughly 35 percent", () => {
    expect([1, 2, 3, 4, 5].map(xpForStepTier)).toEqual([20, 27, 36, 49, 66]);
    expect(stepTierFromCount(8_999)).toBe(2);
    expect(stepTierFromCount(9_000)).toBe(3);
    expect(stepXpBetweenTiers(0, 3)).toBe(83);
  });

  it("awards standing XP in 30-minute increments", () => {
    expect(standTierFromMinutes(59)).toBe(1);
    expect(standTierFromMinutes(60)).toBe(2);
    expect(standXpBetweenTiers(0, 2)).toBe(24);
  });
});

describe("level unlocks", () => {
  it("combines healthy-day and farm-earned XP into one level", () => {
    const xp = combinedXp(50, 190);
    expect(xp).toBe(240);
    expect(levelFromXp(xp)).toBe(3);
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
