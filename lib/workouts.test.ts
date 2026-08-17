import { describe, expect, it } from "vitest";
import type { SetLog, WorkoutPlan, WorkoutSession } from "./types";
import {
  exerciseHistory,
  exerciseProgressSeries,
  convertWeightUnit,
  nextWorkoutPosition,
  seedWeightInUnit,
  topCompletedSet,
} from "./workouts";

describe("weight unit conversion", () => {
  it("converts in both directions and leaves matching units unchanged", () => {
    expect(convertWeightUnit(100, "lb", "kg")).toBe(45.4);
    expect(convertWeightUnit(45.4, "kg", "lb")).toBe(100.1);
    expect(convertWeightUnit(75, "kg", "kg")).toBe(75);
  });
});

describe("bundled workout seed weights", () => {
  it("keeps imported pound values in pounds and converts them for kg profiles", () => {
    expect(seedWeightInUnit(100, "lb")).toBe(100);
    expect(seedWeightInUnit(100, "kg")).toBe(45.4);
  });
});

describe("custom workout plan progression", () => {
  const plan: WorkoutPlan = {
    id: "custom-plan",
    name: { en: "Custom", zh: "自訂" },
    weeks: [
      { days: [workoutDay("w1d1"), workoutDay("w1d2")] },
      { days: [workoutDay("w2d1")] },
      { days: [workoutDay("w3d1"), workoutDay("w3d2"), workoutDay("w3d3")] },
    ],
  };

  it("uses each custom week's actual day count", () => {
    expect(nextWorkoutPosition(plan, 0)).toEqual({ weekIdx: 0, dayIdx: 0 });
    expect(nextWorkoutPosition(plan, 2)).toEqual({ weekIdx: 1, dayIdx: 0 });
    expect(nextWorkoutPosition(plan, 3)).toEqual({ weekIdx: 2, dayIdx: 0 });
    expect(nextWorkoutPosition(plan, 5)).toEqual({ weekIdx: 2, dayIdx: 2 });
  });

  it("repeats the final populated week after the plan is complete", () => {
    expect(nextWorkoutPosition(plan, 6)).toEqual({ weekIdx: 2, dayIdx: 0 });
    expect(nextWorkoutPosition(plan, 7)).toEqual({ weekIdx: 2, dayIdx: 1 });
  });

  it("skips empty weeks and handles a plan with no workout days", () => {
    const withEmptyWeek = { ...plan, weeks: [plan.weeks[0], { days: [] }, plan.weeks[2]] };
    expect(nextWorkoutPosition(withEmptyWeek, 2)).toEqual({ weekIdx: 2, dayIdx: 0 });
    expect(nextWorkoutPosition({ ...plan, weeks: [{ days: [] }] }, 0)).toBeUndefined();
  });
});

describe("exercise performance history", () => {
  it("charts the heaviest completed set instead of an estimated one-rep max", () => {
    const sessions = [
      session("older", "2026-08-01", 1, [
        { w: 100, reps: 10, rpe: 8, done: true },
        { w: 110, reps: 5, rpe: 9, done: true },
      ]),
      session("newer", "2026-08-08", 2, [
        { w: 115, reps: 4, rpe: 8, done: true },
        { w: 125, reps: 2, rpe: 9, done: false },
      ]),
    ];

    expect(exerciseProgressSeries(sessions, "bench")).toEqual({
      metric: "topWeight",
      points: [
        { date: "2026-08-01", v: 110, weight: 110, reps: 5, rpe: 9 },
        { date: "2026-08-08", v: 115, weight: 115, reps: 4, rpe: 8 },
      ],
    });
  });

  it("uses best reps for unweighted movements and keeps full history newest first", () => {
    const sessions = [
      session("older", "2026-08-01", 1, [{ w: 0, reps: 12, rpe: 7, done: true }]),
      session("newer", "2026-08-08", 2, [
        { w: 0, reps: 15, rpe: 8, done: true },
        { w: 0, reps: 10, done: false },
      ]),
    ];

    expect(exerciseProgressSeries(sessions, "bench").points.map((point) => point.v)).toEqual([12, 15]);
    expect(exerciseHistory(sessions, "bench").map((item) => item.sessionId)).toEqual(["newer", "older"]);
    expect(exerciseHistory(sessions, "bench")[0].sets).toHaveLength(1);
  });

  it("breaks an equal-weight top-set tie using reps", () => {
    const sets: SetLog[] = [
      { w: 100, reps: 6, done: true },
      { w: 100, reps: 8, rpe: 9, done: true },
      { w: 120, reps: 2, done: false },
    ];
    expect(topCompletedSet(sets)).toMatchObject({ w: 100, reps: 8, rpe: 9 });
  });
});

function workoutDay(id: string) {
  return { id, name: { en: id, zh: id }, exercises: [] };
}

function session(id: string, date: string, startedAt: number, sets: SetLog[]): WorkoutSession {
  return {
    id,
    date,
    planId: "plan",
    weekIdx: 0,
    dayIdx: 0,
    dayName: { en: "Push", zh: "推" },
    entries: [{
      key: "bench",
      name: { en: "Bench press", zh: "臥推" },
      targetSets: sets.length,
      targetReps: "8",
      sets,
    }],
    startedAt,
    endedAt: startedAt + 1,
    prs: 0,
  };
}
