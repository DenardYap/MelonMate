import { beforeEach, describe, expect, it } from "vitest";
import { addDays, todayStr } from "./dates";
import { DAILY_XP_REWARD, FOOD_LOG_XP_REWARD, MAX_DAILY_REWARDED_FOOD_LOGS } from "./game";
import { useStore } from "./store";

const PROFILE = "p-me";

function foodLog(date = todayStr()) {
  return {
    date,
    meal: "breakfast" as const,
    name: { en: "Test food", zh: "測試食物" },
    macros: { cal: 100, protein: 5, carbs: 10, fat: 2 },
    src: "manual" as const,
  };
}

describe("healthy-action XP store", () => {
  beforeEach(() => {
    useStore.getState().resetAll();
  });

  it("awards each of the first six food logs and prevents add/delete farming", () => {
    const store = useStore.getState();
    const rewards = Array.from(
      { length: MAX_DAILY_REWARDED_FOOD_LOGS + 1 },
      () => store.addLog(foodLog())
    );

    expect(rewards).toEqual([
      ...Array.from({ length: MAX_DAILY_REWARDED_FOOD_LOGS }, () => FOOD_LOG_XP_REWARD),
      0,
    ]);
    expect(useStore.getState().game[PROFILE].xp).toBe(
      FOOD_LOG_XP_REWARD * MAX_DAILY_REWARDED_FOOD_LOGS
    );

    const first = useStore.getState().logs[PROFILE][0];
    useStore.getState().removeLog(first.id);
    expect(useStore.getState().game[PROFILE].xp).toBe(
      FOOD_LOG_XP_REWARD * (MAX_DAILY_REWARDED_FOOD_LOGS - 1)
    );
    expect(useStore.getState().addLog(foodLog())).toBe(0);
  });

  it("adds the large nutrition reward only when a closed day qualifies", () => {
    const yesterday = addDays(todayStr(), -1);
    const store = useStore.getState();
    store.addLog(foodLog(yesterday));
    store.addLog(foodLog(yesterday));
    store.addLog(foodLog(yesterday));

    useStore.setState((state) => ({
      game: {
        ...state.game,
        [PROFILE]: { ...state.game[PROFILE], lastEval: addDays(yesterday, -1) },
      },
    }));
    useStore.getState().reconcileGame();

    expect(useStore.getState().game[PROFILE].xp).toBe(3 * FOOD_LOG_XP_REWARD + DAILY_XP_REWARD);
  });

  it("awards only newly crossed steps and standing milestones", () => {
    const store = useStore.getState();
    expect(store.applyHealthActivity({ date: todayStr(), steps: 9_500, standMinutes: 60 })).toBe(107);
    expect(useStore.getState().applyHealthActivity({ date: todayStr(), steps: 9_500, standMinutes: 60 })).toBe(0);
    expect(useStore.getState().applyHealthActivity({ date: todayStr(), steps: 12_000, standMinutes: 90 })).toBe(61);
    expect(useStore.getState().game[PROFILE].xp).toBe(168);
  });
});
