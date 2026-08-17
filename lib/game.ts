export const MIN_DAILY_ITEMS = 4;
export const FOOD_LOG_XP_REWARD = 5;
export const MAX_DAILY_REWARDED_FOOD_LOGS = 8;
export const WEIGHT_LOG_XP_REWARD = 5;
export const DAILY_XP_REWARD = 200;

/**
 * Level 20 is the end of the current progression track. A perfect 300 XP day
 * reaches it in 73 days, keeping the complete track inside the intended
 * 60–90 day window without rewarding repetitive logging.
 */
export const MAX_PLAYER_LEVEL = 20;
export const DAILY_XP_CAP = 300;
export const MAX_TOTAL_XP = (MAX_PLAYER_LEVEL - 1) ** 2 * 60;

export const STEP_INCREMENT = 1_000;
export const STEP_DAILY_TIER_CAP = 30;
export const STEP_XP_BASE = 20;
export const STEP_XP_GROWTH = 1.35;
export const STEP_XP_PER_TIER_CAP = 150;
const STEP_REWARD_SPLIT = 3;

export const STAND_MINUTES_INCREMENT = 10;
export const STAND_DAILY_TIER_CAP = 24;
export const STAND_XP_PER_TIER = 4;

export const HEALTH_WORKOUT_XP_PER_MINUTE = 2;
export const HEALTH_WORKOUT_REWARDED_MINUTES_CAP = 180;
export const IN_APP_WORKOUT_SET_XP = 3;
export const IN_APP_WORKOUT_EXERCISE_XP = 12;

/** Farm activity is Dew-only; player XP comes from food and fitness. */
export function combinedXp(healthyDayXp: number, _legacyFarmXp = 0): number {
  return Math.min(MAX_TOTAL_XP, Math.max(0, healthyDayXp));
}

export function dailyXpAward(
  currentXp: number,
  alreadyAwardedToday: number,
  requestedXp: number
): number {
  return Math.max(0, Math.min(
    Math.floor(Math.max(0, requestedXp)),
    DAILY_XP_CAP - Math.max(0, alreadyAwardedToday),
    MAX_TOTAL_XP - Math.max(0, currentXp)
  ));
}

/** Level curve shared by the garden, friends, and theme collection. */
export function levelFromXp(xp: number): number {
  return Math.min(MAX_PLAYER_LEVEL, Math.floor(Math.sqrt(Math.max(0, xp) / 60)) + 1);
}

/** Total XP required to arrive at a level. */
export function xpForLevel(level: number): number {
  return Math.min(MAX_TOTAL_XP, Math.max(0, level - 1) ** 2 * 60);
}

export function levelProgressFromXp(xp: number) {
  const totalXp = Math.max(0, xp);
  const level = levelFromXp(totalXp);
  const levelStartXp = xpForLevel(level);
  const nextLevelXp = level >= MAX_PLAYER_LEVEL ? MAX_TOTAL_XP : xpForLevel(level + 1);
  const earned = totalXp - levelStartXp;
  const needed = nextLevelXp - levelStartXp;

  return {
    level,
    totalXp,
    earned: level >= MAX_PLAYER_LEVEL ? MAX_TOTAL_XP : earned,
    needed: level >= MAX_PLAYER_LEVEL ? MAX_TOTAL_XP : needed,
    progress: level >= MAX_PLAYER_LEVEL ? 1 : needed > 0 ? Math.min(1, earned / needed) : 0,
  };
}

export function stepTierFromCount(steps: number): number {
  return Math.min(STEP_DAILY_TIER_CAP, Math.floor(Math.max(0, steps) / STEP_INCREMENT));
}

/**
 * The reward for crossing one 1,000-step milestone. Each former 3,000-step
 * reward is split across three tiers so the XP curve stays proportionate.
 */
export function xpForStepTier(tier: number): number {
  if (tier < 1) return 0;
  const wholeTier = Math.ceil(tier / STEP_REWARD_SPLIT);
  const wholeTierReward = Math.min(
    STEP_XP_PER_TIER_CAP,
    Math.round(STEP_XP_BASE * STEP_XP_GROWTH ** (wholeTier - 1))
  );
  const splitPosition = (tier - 1) % STEP_REWARD_SPLIT;
  return Math.round(wholeTierReward * (splitPosition + 1) / STEP_REWARD_SPLIT)
    - Math.round(wholeTierReward * splitPosition / STEP_REWARD_SPLIT);
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

export interface HealthMilestoneTiers {
  stepTier: number;
  standTier: number;
}

export interface HealthRewardBreakdown {
  stepXp: number;
  standXp: number;
  stepMilestones: number;
  standMilestones: number;
  totalXp: number;
}

export function healthRewardBetweenTiers(
  previous: HealthMilestoneTiers,
  current: HealthMilestoneTiers
): HealthRewardBreakdown {
  const previousStepTier = Math.max(0, Math.min(STEP_DAILY_TIER_CAP, Math.floor(previous.stepTier)));
  const currentStepTier = Math.max(previousStepTier, Math.min(STEP_DAILY_TIER_CAP, Math.floor(current.stepTier)));
  const previousStandTier = Math.max(0, Math.min(STAND_DAILY_TIER_CAP, Math.floor(previous.standTier)));
  const currentStandTier = Math.max(previousStandTier, Math.min(STAND_DAILY_TIER_CAP, Math.floor(current.standTier)));
  const stepXp = stepXpBetweenTiers(previousStepTier, currentStepTier);
  const standXp = standXpBetweenTiers(previousStandTier, currentStandTier);
  return {
    stepXp,
    standXp,
    stepMilestones: currentStepTier - previousStepTier,
    standMilestones: currentStandTier - previousStandTier,
    totalXp: stepXp + standXp,
  };
}

/** Completed HealthKit workouts scale directly with active workout time. */
export function healthWorkoutXp(durationMinutes: number): number {
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return 0;
  return Math.round(Math.min(HEALTH_WORKOUT_REWARDED_MINUTES_CAP, durationMinutes) * HEALTH_WORKOUT_XP_PER_MINUTE);
}

/** In-app sessions reward every completed set plus a bonus for finishing all sets of an exercise. */
export function inAppWorkoutXp(
  entries: { sets: { done: boolean }[] }[]
): { xp: number; completedSets: number; completedExercises: number } {
  const completedSets = entries.reduce(
    (total, entry) => total + entry.sets.filter((set) => set.done).length,
    0
  );
  const completedExercises = entries.filter(
    (entry) => entry.sets.length > 0 && entry.sets.every((set) => set.done)
  ).length;
  return {
    xp: completedSets * IN_APP_WORKOUT_SET_XP + completedExercises * IN_APP_WORKOUT_EXERCISE_XP,
    completedSets,
    completedExercises,
  };
}

/** The daily food bonus depends only on consistently logging four items. */
export function isDailyXpEligible(itemCount: number): boolean {
  return itemCount >= MIN_DAILY_ITEMS;
}

/** A tracking streak advances on any day where at least one food was logged. */
export function isTrackingDay(itemCount: number): boolean {
  return itemCount > 0;
}
