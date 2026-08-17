import { exKey } from "./nutrition";
import type {
  ExerciseEquipment,
  MuscleGroup,
  Profile,
  SetLog,
  TrainingFocus,
  WorkoutPlan,
  WorkoutSession,
  WeightUnit,
} from "./types";

const LB_PER_KG = 2.20462;

/** Converts a displayed weight while keeping user-entered values practical. */
export function convertWeightUnit(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value;
  const converted = from === "lb" ? value / LB_PER_KG : value * LB_PER_KG;
  return Math.round(converted * 10) / 10;
}

/** Converts user-authored target weights; imported seed weights remain canonical pounds. */
export function convertWorkoutPlanWeights(
  plan: WorkoutPlan,
  from: WeightUnit,
  to: WeightUnit
): WorkoutPlan {
  return {
    ...structuredClone(plan),
    weeks: plan.weeks.map((week) => ({
      days: week.days.map((day) => ({
        ...day,
        exercises: day.exercises.map((exercise) => ({
          ...exercise,
          targetWeight: exercise.targetWeight == null
            ? undefined
            : convertWeightUnit(exercise.targetWeight, from, to),
        })),
      })),
    })),
  };
}

/** Bundled plan seed weights were imported in pounds; convert before showing or logging them. */
export function seedWeightInUnit(seedWeight: number | undefined, unit: WeightUnit): number | undefined {
  if (seedWeight == null) return undefined;
  return convertWeightUnit(seedWeight, "lb", unit);
}

/**
 * Locates the next workout across weeks that may contain different numbers of
 * training days. Once the full plan is complete, the final populated week
 * repeats so a finished plan remains usable.
 */
export function nextWorkoutPosition(
  plan: WorkoutPlan,
  completedCount: number
): { weekIdx: number; dayIdx: number } | undefined {
  let remaining = Math.max(0, Math.floor(completedCount));
  let lastPopulatedWeek = -1;

  for (let weekIdx = 0; weekIdx < plan.weeks.length; weekIdx += 1) {
    const dayCount = plan.weeks[weekIdx].days.length;
    if (dayCount === 0) continue;
    lastPopulatedWeek = weekIdx;
    if (remaining < dayCount) return { weekIdx, dayIdx: remaining };
    remaining -= dayCount;
  }

  if (lastPopulatedWeek < 0) return undefined;
  return {
    weekIdx: lastPopulatedWeek,
    dayIdx: remaining % plan.weeks[lastPopulatedWeek].days.length,
  };
}

/**
 * Returns only the most recent completed occurrence of a workout day.
 * A day is identified by its plan and day index so an exercise performed on a
 * different day never leaks into the in-session "last time" comparison.
 */
export function lastCompletedSessionForDay(
  sessions: WorkoutSession[],
  planId: string,
  dayIdx: number,
  beforeStartedAt = Number.POSITIVE_INFINITY
): WorkoutSession | undefined {
  return sessions
    .filter(
      (session) =>
        Boolean(session.endedAt) &&
        session.planId === planId &&
        session.dayIdx === dayIdx &&
        session.startedAt < beforeStartedAt
    )
    .sort((a, b) => b.startedAt - a.startedAt)[0];
}

export function completedSets(sets: SetLog[]): SetLog[] {
  return sets.filter((set) => set.done);
}

export function compareSetPerformance(a: Pick<SetLog, "w" | "reps">, b: Pick<SetLog, "w" | "reps">): number {
  if (a.w !== b.w) return a.w - b.w;
  return a.reps - b.reps;
}

/** The most demanding completed set, using only values the person actually logged. */
export function topCompletedSet(sets: SetLog[]): SetLog | undefined {
  return completedSets(sets).reduce<SetLog | undefined>(
    (best, set) => (!best || compareSetPerformance(set, best) > 0 ? set : best),
    undefined
  );
}

export interface ExerciseHistoryItem {
  sessionId: string;
  date: string;
  startedAt: number;
  workoutName: { en: string; zh: string };
  sets: SetLog[];
}

/** Full completed-set history for an exercise, newest workout first. */
export function exerciseHistory(sessions: WorkoutSession[], key: string): ExerciseHistoryItem[] {
  return sessions
    .filter((session) => Boolean(session.endedAt))
    .map((session) => ({
      sessionId: session.id,
      date: session.date,
      startedAt: session.startedAt,
      workoutName: session.dayName,
      sets: session.entries
        .filter((entry) => entry.key === key)
        .flatMap((entry) => completedSets(entry.sets)),
    }))
    .filter((item) => item.sets.length > 0)
    .sort((a, b) => b.startedAt - a.startedAt);
}

export interface ExerciseChoiceLike {
  historyKey: string;
  name: { en: string; zh: string };
  group: MuscleGroup;
  equipment: ExerciseEquipment;
  timed?: boolean;
}

export interface ExercisePreset {
  sets: number;
  reps: string;
  rpe: number;
  restMin: number;
  weight?: number;
  sources: ("plan" | "history" | "profile")[];
  estimatedWeight: boolean;
}

/**
 * Suggest editable programming without treating demographic data as a strength test.
 * The current plan and actual history always outrank the conservative body-weight estimate.
 */
export function recommendExercisePreset({
  profile,
  exercise,
  sessions,
  plan,
}: {
  profile: Profile;
  exercise: ExerciseChoiceLike;
  sessions: WorkoutSession[];
  plan?: WorkoutPlan;
}): ExercisePreset {
  const focus = inferTrainingFocus(profile, plan);
  const base =
    focus === "strength"
      ? { sets: 4, reps: "5", rpe: 8, restMin: 3 }
      : focus === "hypertrophy"
        ? { sets: 3, reps: "10–12", rpe: 8, restMin: 1.5 }
        : { sets: 3, reps: "8–10", rpe: 7, restMin: 2 };

  if (exercise.timed) {
    base.sets = focus === "strength" ? 3 : base.sets;
    base.reps = "30 sec";
    base.restMin = 1;
  } else if (exercise.equipment === "bodyweight" && exercise.group === "core") {
    base.reps = focus === "strength" ? "8" : "12–15";
    base.restMin = 1;
  }

  if ((profile.age ?? 30) >= 60 || (profile.age ?? 30) < 18) {
    base.sets = Math.max(2, base.sets - 1);
    base.rpe = Math.max(6, base.rpe - 1);
    base.restMin = Math.max(base.restMin, 2);
  }

  const matchingPlanExercise = findPlanExercise(plan, exercise.historyKey);
  const sources: ExercisePreset["sources"] = [];
  if (matchingPlanExercise) {
    base.sets = matchingPlanExercise.sets;
    base.reps = matchingPlanExercise.reps;
    base.rpe = matchingPlanExercise.rpe ?? base.rpe;
    base.restMin = matchingPlanExercise.restMin ?? base.restMin;
    sources.push("plan");
  }

  const historyEntry = [...sessions]
    .filter((session) => Boolean(session.endedAt))
    .sort((a, b) => b.startedAt - a.startedAt)
    .flatMap((session) => session.entries)
    .find((entry) => entry.key === exercise.historyKey && entry.sets.some((set) => set.done));
  const historySets = historyEntry ? completedSets(historyEntry.sets) : [];

  const fixedPlanWeight = matchingPlanExercise?.targetWeight;
  let weight = fixedPlanWeight ?? seedWeightInUnit(matchingPlanExercise?.seedWeight, profile.unit);
  let estimatedWeight = false;
  if (historySets.length) {
    const lastSet = historySets[historySets.length - 1];
    if (lastSet.w > 0) {
      if (fixedPlanWeight == null) weight = lastSet.w;
      const rpeSets = historySets.filter((set) => set.rpe != null);
      const averageRpe = rpeSets.length
        ? rpeSets.reduce((sum, set) => sum + (set.rpe ?? 0), 0) / rpeSets.length
        : undefined;
      const repTarget = parseInt(base.reps, 10) || 1;
      if (fixedPlanWeight == null && averageRpe != null && averageRpe <= base.rpe - 1 && lastSet.reps >= repTarget) {
        weight = lastSet.w + (profile.unit === "kg" ? 2.5 : 5);
      }
      sources.push("history");
    }
  }

  if (weight == null) {
    weight = estimateStarterWeight(profile, exercise, focus);
    estimatedWeight = weight != null;
    if (profile.age != null || profile.weightKg != null || profile.trainingFocus != null || profile.fitnessGoal != null) {
      sources.push("profile");
    }
  }

  return {
    ...base,
    weight,
    sources: [...new Set(sources)],
    estimatedWeight,
  };
}

function inferTrainingFocus(profile: Profile, plan?: WorkoutPlan): TrainingFocus {
  if (profile.trainingFocus) return profile.trainingFocus;
  if (plan?.focus) return plan.focus;
  if (plan?.name.en.toLowerCase().includes("hypertrophy")) return "hypertrophy";
  if (plan?.name.en.toLowerCase().includes("strength")) return "strength";
  return profile.fitnessGoal === "gain" ? "hypertrophy" : "general";
}

function findPlanExercise(plan: WorkoutPlan | undefined, historyKey: string) {
  if (!plan) return undefined;
  for (const week of plan.weeks) {
    for (const day of week.days) {
      const match = day.exercises.find(
        (exercise) => (exercise.historyKey ?? exKey(exercise.name.en)) === historyKey
      );
      if (match) return match;
    }
  }
  return undefined;
}

function estimateStarterWeight(
  profile: Profile,
  exercise: ExerciseChoiceLike,
  focus: TrainingFocus
): number | undefined {
  if (
    !profile.weightKg ||
    exercise.equipment === "bodyweight" ||
    exercise.equipment === "band" ||
    exercise.equipment === "other" ||
    exercise.name.en.toLowerCase().includes("assisted")
  ) {
    return undefined;
  }

  const byGroup: Record<MuscleGroup, number> = {
    quads: 0.45,
    hams: 0.5,
    chest: 0.32,
    back: 0.34,
    shoulders: 0.2,
    arms: 0.13,
    core: 0.12,
    calves: 0.36,
  };
  const byEquipment: Record<ExerciseEquipment, number> = {
    barbell: 1,
    dumbbell: 0.42,
    machine: 0.8,
    cable: 0.48,
    bodyweight: 0,
    kettlebell: 0.42,
    band: 0,
    smith: 0.9,
    landmine: 0.55,
    other: 0,
  };
  const age = profile.age ?? 30;
  const ageFactor = age >= 70 ? 0.55 : age >= 60 ? 0.65 : age >= 50 ? 0.78 : age >= 40 ? 0.9 : age < 18 ? 0.65 : 1;
  const focusFactor = focus === "strength" ? 1 : focus === "hypertrophy" ? 0.78 : 0.68;
  const goalFactor = profile.fitnessGoal === "lose" ? 0.9 : 1;
  const kg = profile.weightKg * byGroup[exercise.group] * byEquipment[exercise.equipment] * ageFactor * focusFactor * goalFactor;
  const value = profile.unit === "kg" ? kg : kg * 2.20462;
  const increment = profile.unit === "kg" ? 2.5 : 5;
  return Math.max(increment, Math.round(value / increment) * increment);
}

export function exerciseProgressSeries(sessions: WorkoutSession[], key: string) {
  const matchingEntries = sessions.flatMap((session) => session.entries.filter((entry) => entry.key === key));
  const weighted = matchingEntries.some((entry) => entry.sets.some((set) => set.done && set.w > 0));
  const points: { date: string; v: number; weight: number; reps: number; rpe?: number }[] = [];

  for (const session of sessions) {
    const sets = session.entries
      .filter((entry) => entry.key === key)
      .flatMap((entry) => completedSets(entry.sets))
      .filter((set) => !weighted || set.w > 0);
    const topSet = topCompletedSet(sets);
    if (!topSet) continue;
    const value = weighted ? topSet.w : topSet.reps;
    if (value > 0) points.push({
      date: session.date,
      v: value,
      weight: topSet.w,
      reps: topSet.reps,
      rpe: topSet.rpe,
    });
  }

  return { points, metric: weighted ? ("topWeight" as const) : ("reps" as const) };
}
