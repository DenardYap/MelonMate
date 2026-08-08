import { describe, expect, test } from "vitest";
import type { Profile, WorkoutPlan, WorkoutSession } from "../lib/types";
import { EXERCISE_LIBRARY } from "../lib/plans";
import {
  completedSets,
  exerciseProgressSeries,
  lastCompletedSessionForDay,
  recommendExercisePreset,
} from "../lib/workouts";

function session(
  id: string,
  planId: string,
  dayIdx: number,
  startedAt: number,
  ended = true
): WorkoutSession {
  return {
    id,
    date: `2026-08-0${startedAt}`,
    planId,
    weekIdx: 0,
    dayIdx,
    dayName: { en: `Day ${dayIdx + 1}`, zh: `第 ${dayIdx + 1} 天` },
    entries: [],
    startedAt,
    endedAt: ended ? startedAt + 1 : undefined,
    prs: 0,
  };
}

describe("workout history", () => {
  test("returns only the latest completed session for the same plan day", () => {
    const sessions = [
      session("same-old", "plan-a", 0, 1),
      session("different-day", "plan-a", 1, 4),
      session("different-plan", "plan-b", 0, 5),
      session("same-latest", "plan-a", 0, 6),
      session("open", "plan-a", 0, 7, false),
    ];

    expect(lastCompletedSessionForDay(sessions, "plan-a", 0)?.id).toBe("same-latest");
  });

  test("can exclude the current or future session by start time", () => {
    const sessions = [
      session("previous", "plan-a", 2, 2),
      session("current-complete", "plan-a", 2, 8),
    ];

    expect(lastCompletedSessionForDay(sessions, "plan-a", 2, 8)?.id).toBe("previous");
  });

  test("completed sets include bodyweight work with zero external weight", () => {
    const sets = [
      { w: 0, reps: 12, rpe: 8, done: true },
      { w: 100, reps: 8, done: false },
    ];

    expect(completedSets(sets)).toEqual([sets[0]]);
  });

  test("combines duplicate entries into one best progress point per session", () => {
    const workout = session("with-duplicates", "plan-a", 0, 1);
    workout.entries = [
      { key: "bench", name: { en: "Bench", zh: "臥推" }, targetSets: 1, targetReps: "5", sets: [{ w: 100, reps: 5, done: true }] },
      { key: "bench", name: { en: "Bench", zh: "臥推" }, targetSets: 1, targetReps: "5", sets: [{ w: 120, reps: 5, done: true }] },
    ];

    const series = exerciseProgressSeries([workout], "bench");
    expect(series.points).toHaveLength(1);
    expect(series.points[0].v).toBeGreaterThan(120);
  });
});

describe("exercise catalog and presets", () => {
  const profile: Profile = {
    id: "p",
    name: "Alex",
    emoji: "🍈",
    goals: { cal: 2200, protein: 140, carbs: 240, fat: 70 },
    planId: "plan-a",
    unit: "lb",
    age: 32,
    weightKg: 80,
    fitnessGoal: "gain",
    trainingFocus: "hypertrophy",
  };
  const bench = {
    historyKey: "barbellbenchpress",
    name: { en: "Barbell Bench Press", zh: "槓鈴臥推" },
    group: "chest" as const,
    equipment: "barbell" as const,
  };

  test("ships a broad searchable catalog containing common requested exercises", () => {
    expect(EXERCISE_LIBRARY.length).toBeGreaterThanOrEqual(150);
    const searchText = EXERCISE_LIBRARY.flatMap((exercise) => [exercise.en, ...(exercise.aliases ?? [])]).join(" ").toLowerCase();
    expect(searchText).toContain("seated leg curl");
    expect(searchText).toContain("deadlift");
    expect(searchText).toContain("bench press");
    expect(searchText).toContain("incline press");
    expect(searchText).toContain("cable pull");
  });

  test("uses hypertrophy-oriented reps and a conservative body-weight estimate", () => {
    const preset = recommendExercisePreset({ profile, exercise: bench, sessions: [] });
    expect(preset).toMatchObject({ sets: 3, reps: "10–12", rpe: 8, estimatedWeight: true });
    expect(preset.weight).toBeGreaterThan(0);
  });

  test("reduces volume and effort for an older profile", () => {
    const preset = recommendExercisePreset({ profile: { ...profile, age: 68 }, exercise: bench, sessions: [] });
    expect(preset.sets).toBe(2);
    expect(preset.rpe).toBe(7);
    expect(preset.weight).toBeLessThan(
      recommendExercisePreset({ profile, exercise: bench, sessions: [] }).weight!
    );
  });

  test("keeps the current plan prescription ahead of workout history", () => {
    const workout = session("history", "plan-a", 0, 1);
    workout.entries = [{
      key: bench.historyKey,
      name: bench.name,
      targetSets: 3,
      targetReps: "10",
      sets: [{ w: 90, reps: 12, rpe: 6, done: true }],
    }];
    const plan: WorkoutPlan = {
      id: "plan-a",
      name: { en: "Current plan", zh: "目前課表" },
      weeks: [{ days: [{ id: "d", name: { en: "Push", zh: "推" }, exercises: [{
        id: "bench",
        historyKey: bench.historyKey,
        name: bench.name,
        sets: 4,
        reps: "6",
        rpe: 7,
        targetWeight: 105,
        restMin: 2.5,
      }] }] }],
    };

    expect(recommendExercisePreset({ profile, exercise: bench, sessions: [workout], plan })).toMatchObject({
      sets: 4,
      reps: "6",
      rpe: 7,
      restMin: 2.5,
      weight: 105,
      sources: ["plan", "history"],
    });
  });
});
