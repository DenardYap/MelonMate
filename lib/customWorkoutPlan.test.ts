import { beforeEach, describe, expect, it } from "vitest";
import { todayStr } from "./dates";
import { makeSessionEntries, openSession, useStore } from "./store";
import type { WorkoutPlan } from "./types";
import { nextWorkoutPosition } from "./workouts";

describe("custom workout plan launch", () => {
  beforeEach(() => {
    useStore.getState().resetAll();
  });

  it("selects a newly created plan and carries every exercise into workout mode", () => {
    const plan: WorkoutPlan = {
      id: "new-custom-plan",
      name: { en: "My custom plan", zh: "我的自訂計畫" },
      weeks: [{
        days: [{
          id: "custom-day-one",
          name: { en: "Day one", zh: "第一天" },
          exercises: [
            {
              id: "custom-squat",
              historyKey: "custom-squat",
              name: { en: "Custom squat", zh: "自訂深蹲" },
              sets: 3,
              reps: "8",
              targetWeight: 100,
            },
            {
              id: "custom-curl",
              historyKey: "custom-curl",
              name: { en: "Custom curl", zh: "自訂彎舉" },
              sets: 2,
              reps: "12",
              targetWeight: 20,
            },
          ],
        }],
      }],
    };

    useStore.getState().addPlan(plan, true);
    const selectedState = useStore.getState();
    const selectedPlan = selectedState.plans.find(
      (item) => item.id === selectedState.profiles[0].planId
    );
    const position = selectedPlan && nextWorkoutPosition(selectedPlan, 0);
    const day = position && selectedPlan?.weeks[position.weekIdx]?.days[position.dayIdx];

    expect(selectedPlan?.id).toBe(plan.id);
    expect(day?.exercises).toHaveLength(2);

    const entries = makeSessionEntries(day?.exercises ?? [], selectedState, {
      planId: plan.id,
      dayIdx: position?.dayIdx ?? 0,
    });
    selectedState.startSession({
      date: todayStr(),
      planId: plan.id,
      weekIdx: position?.weekIdx ?? 0,
      dayIdx: position?.dayIdx ?? 0,
      dayName: day?.name ?? { en: "Day one", zh: "第一天" },
      entries,
    });

    expect(openSession(useStore.getState())?.entries.map((entry) => entry.name.en)).toEqual([
      "Custom squat",
      "Custom curl",
    ]);
  });
});
