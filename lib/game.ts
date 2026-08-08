export const MIN_DAILY_ITEMS = 3;
export const FOOD_LOG_XP_REWARD = 5;
export const MAX_DAILY_REWARDED_FOOD_LOGS = 6;
export const DAILY_XP_REWARD = 200;

export const STEP_INCREMENT = 3_000;
export const STEP_DAILY_TIER_CAP = 10;
export const STEP_XP_BASE = 20;
export const STEP_XP_GROWTH = 1.35;
export const STEP_XP_PER_TIER_CAP = 150;

export const STAND_MINUTES_INCREMENT = 30;
export const STAND_DAILY_TIER_CAP = 8;
export const STAND_XP_PER_TIER = 12;

/** Healthy-day XP and farm-earned XP now contribute to one user total. */
export function combinedXp(healthyDayXp: number, farmEarnedXp: number): number {
  return Math.max(0, healthyDayXp) + Math.max(0, farmEarnedXp);
}

/** Level curve shared by the garden, friends, and theme collection. */
export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 60)) + 1;
}

/** Total XP required to arrive at a level. */
export function xpForLevel(level: number): number {
  return Math.max(0, level - 1) ** 2 * 60;
}

export function levelProgressFromXp(xp: number) {
  const totalXp = Math.max(0, xp);
  const level = levelFromXp(totalXp);
  const levelStartXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const earned = totalXp - levelStartXp;
  const needed = nextLevelXp - levelStartXp;

  return {
    level,
    totalXp,
    earned,
    needed,
    progress: needed > 0 ? Math.min(1, earned / needed) : 0,
  };
}

export function stepTierFromCount(steps: number): number {
  return Math.min(STEP_DAILY_TIER_CAP, Math.floor(Math.max(0, steps) / STEP_INCREMENT));
}

/** The reward for crossing one 3,000-step milestone. */
export function xpForStepTier(tier: number): number {
  if (tier < 1) return 0;
  return Math.min(
    STEP_XP_PER_TIER_CAP,
    Math.round(STEP_XP_BASE * STEP_XP_GROWTH ** (tier - 1))
  );
}

export function stepXpBetweenTiers(previousTier: number, currentTier: number): number {
  const from = Math.max(0, Math.min(STEP_DAILY_TIER_CAP, Math.floor(previousTier)));
  const to = Math.max(from, Math.min(STEP_DAILY_TIER_CAP, Math.floor(currentTier)));
  let xp = 0;
  for (let tier = from + 1; tier <= to; tier += 1) xp += xpForStepTier(tier);
  return xp;
}

export function standTierFromMinutes(minutes: number): number {
  return Math.min(
    STAND_DAILY_TIER_CAP,
    Math.floor(Math.max(0, minutes) / STAND_MINUTES_INCREMENT)
  );
}

export function standXpBetweenTiers(previousTier: number, currentTier: number): number {
  const from = Math.max(0, Math.min(STAND_DAILY_TIER_CAP, Math.floor(previousTier)));
  const to = Math.max(from, Math.min(STAND_DAILY_TIER_CAP, Math.floor(currentTier)));
  return (to - from) * STAND_XP_PER_TIER;
}

/** A day qualifies after 3+ logged items without exceeding the calorie cap. */
export function isDailyXpEligible(
  itemCount: number,
  totalCal: number,
  calorieTarget: number
): boolean {
  return itemCount >= MIN_DAILY_ITEMS && calorieTarget > 0 && totalCal <= calorieTarget;
}
