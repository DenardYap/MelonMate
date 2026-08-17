import { beforeEach, describe, expect, it } from "vitest";
import { todayStr } from "./dates";
import { useStore } from "./store";
import type { WorkoutPlan } from "./types";

describe("profile weight unit changes", () => {
  beforeEach(() => {
    useStore.getState().resetAll();
  });

  it("converts body-weight history, authored plan targets, and workout sessions", () => {
    const plan: WorkoutPlan = {
      id: "weighted-custom-plan",
      name: { en: "Weighted custom", zh: "自訂重量" },
      weeks: [{
        days: [{
          id: "day-one",
          name: { en: "Day one", zh: "第一天" },
          exercises: [{
            id: "squat",
            name: { en: "Squat", zh: "深蹲" },
            sets: 1,
            reps: "5",
            targetWeight: 100,
            seedWeight: 155,
          }],
        }],
      }],
    };
    const store = useStore.getState();
    store.addPlan(plan);
    store.logWeight(180);
    const sessionId = store.startSession({
      date: todayStr(),
      planId: plan.id,
      weekIdx: 0,
      dayIdx: 0,
      dayName: plan.weeks[0].days[0].name,
      entries: [{
        key: "squat",
        name: { en: "Squat", zh: "深蹲" },
        targetSets: 1,
        targetReps: "5",
        targetWeight: 100,
        sets: [{ w: 100, reps: 5, done: false }],
      }],
    });

    store.updateProfile("p-me", { unit: "kg" });

    const state = useStore.getState();
    const convertedPlan = state.plans.find((item) => item.id === plan.id)!;
    const convertedSession = state.sessions["p-me"].find((item) => item.id === sessionId)!;
    expect(state.profiles[0].unit).toBe("kg");
    expect(state.weights["p-me"][0].value).toBe(81.6);
    expect(convertedPlan.weeks[0].days[0].exercises[0]).toMatchObject({
      targetWeight: 45.4,
      seedWeight: 155,
    });
    expect(convertedSession.entries[0].targetWeight).toBe(45.4);
    expect(convertedSession.entries[0].sets[0].w).toBe(45.4);
  });

  it("also converts existing data when the unit changes through personal setup", () => {
    const store = useStore.getState();
    store.logWeight(150);

    store.completeOnboarding({
      lang: "en",
      profile: { unit: "kg" },
    });

    const state = useStore.getState();
    expect(state.profiles[0].unit).toBe("kg");
    expect(state.weights["p-me"][0].value).toBe(68);
  });
});
