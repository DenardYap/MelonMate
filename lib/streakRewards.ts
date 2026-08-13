import type { BiText } from "./types";

export interface StreakMilestone {
  days: number;
  xp: number;
  name: BiText;
}

/** One-time streak badges. Day 90 fills the 85 XP left on a typical goal day. */
export const STREAK_MILESTONES: readonly StreakMilestone[] = [
  { days: 3, xp: 15, name: { en: "First Flame", zh: "初燃之火" } },
  { days: 7, xp: 25, name: { en: "Week in Bloom", zh: "一週盛放" } },
  { days: 14, xp: 40, name: { en: "Steady Sprout", zh: "恆心新芽" } },
  { days: 30, xp: 60, name: { en: "Moonlong Momentum", zh: "月行不息" } },
  { days: 60, xp: 75, name: { en: "Habit in Full Bloom", zh: "習慣盛放" } },
  { days: 90, xp: 85, name: { en: "Ninety-Day Radiance", zh: "九十日光輝" } },
] as const;

export function streakMilestoneAt(days: number): StreakMilestone | undefined {
  return STREAK_MILESTONES.find((milestone) => milestone.days === days);
}

export function earnedStreakMilestones(bestStreak: number): number[] {
  return STREAK_MILESTONES.filter((milestone) => milestone.days <= bestStreak).map((milestone) => milestone.days);
}
