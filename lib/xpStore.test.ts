import { beforeEach, describe, expect, it } from "vitest";
import { addDays, todayStr } from "./dates";
import {
  DAILY_XP_REWARD,
  DAILY_XP_CAP,
  FOOD_LOG_XP_REWARD,
  MAX_DAILY_REWARDED_FOOD_LOGS,
  MAX_TOTAL_XP,
  WEIGHT_LOG_XP_REWARD,
} from "./game";
import { migrateHealthActivityWorkouts, migrateHealthXpClaimTiers, useStore } from "./store";
import { STREAK_MILESTONES } from "./streakRewards";

const PROFILE = "p-me";

function foodLog(date = todayStr(), calories = 100) {
  return {
    date,
    meal: "breakfast" as const,
    name: { en: "Test food", zh: "測試食物" },
    macros: { cal: calories, protein: 5, carbs: 10, fat: 2 },
    src: "manual" as const,
  };
}

describe("healthy-action XP store", () => {
  beforeEach(() => {
    useStore.getState().resetAll();
  });

  it("grandfathers historical Farm XP exactly once", () => {
    useStore.setState((state) => ({
      game: {
        ...state.game,
        [PROFILE]: {
          ...state.game[PROFILE],
          xp: 700,
        },
      },
    }));

    expect(useStore.getState().grandfatherLegacyFarmXp({ [PROFILE]: 2_500 })).toBe(2_500);
    expect(useStore.getState().game[PROFILE]).toMatchObject({
      xp: 3_200,
      legacyFarmXpConverted: 2_500,
    });
    expect(useStore.getState().grandfatherLegacyFarmXp({ [PROFILE]: 2_500 })).toBe(0);
    expect(useStore.getState().game[PROFILE].xp).toBe(3_200);
  });

  it("only converts newly discovered historical Farm XP and respects the total cap", () => {
    useStore.setState((state) => ({
      game: {
        ...state.game,
        [PROFILE]: {
          ...state.game[PROFILE],
          xp: MAX_TOTAL_XP - 100,
          legacyFarmXpConverted: 2_000,
        },
      },
    }));

    expect(useStore.getState().grandfatherLegacyFarmXp({ [PROFILE]: 2_500 })).toBe(100);
    expect(useStore.getState().game[PROFILE]).toMatchObject({
      xp: MAX_TOTAL_XP,
      legacyFarmXpConverted: 2_500,
    });
    expect(useStore.getState().grandfatherLegacyFarmXp({ [PROFILE]: 2_250 })).toBe(0);
  });

  it("awards each allowed food log and prevents add/delete farming", () => {
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
    store.addLog(foodLog(yesterday, 5_000));
    store.addLog(foodLog(yesterday, 5_000));
    store.addLog(foodLog(yesterday, 5_000));
    store.addLog(foodLog(yesterday, 5_000));

    useStore.setState((state) => ({
      game: {
        ...state.game,
        [PROFILE]: { ...state.game[PROFILE], lastEval: addDays(yesterday, -1) },
      },
    }));
    useStore.getState().reconcileGame();

    expect(useStore.getState().game[PROFILE].xp).toBe(4 * FOOD_LOG_XP_REWARD + DAILY_XP_REWARD);
  });

  it("counts consecutive tracked days without requiring four logs or a calorie target", () => {
    const first = addDays(todayStr(), -2);
    const second = addDays(todayStr(), -1);
    const store = useStore.getState();
    store.addLog(foodLog(first, 5_000));
    store.addLog(foodLog(second, 5_000));
    useStore.setState((state) => ({
      game: {
        ...state.game,
        [PROFILE]: { ...state.game[PROFILE], lastEval: addDays(first, -1) },
      },
    }));

    useStore.getState().reconcileGame();

    const game = useStore.getState().game[PROFILE];
    expect(game.streak).toBe(2);
    expect(game.best).toBe(2);
    expect(game.xp).toBe(2 * FOOD_LOG_XP_REWARD);
  });

  it("breaks a tracking streak on a day with no food logs", () => {
    const first = addDays(todayStr(), -3);
    const last = addDays(todayStr(), -1);
    const store = useStore.getState();
    store.addLog(foodLog(first));
    store.addLog(foodLog(last));
    useStore.setState((state) => ({
      game: {
        ...state.game,
        [PROFILE]: { ...state.game[PROFILE], lastEval: addDays(first, -1) },
      },
    }));

    useStore.getState().reconcileGame();

    expect(useStore.getState().game[PROFILE]).toMatchObject({ streak: 1, best: 1 });
  });

  it("awards a one-time XP badge at a streak milestone", () => {
    const store = useStore.getState();
    const dates = [addDays(todayStr(), -3), addDays(todayStr(), -2), addDays(todayStr(), -1)];
    dates.forEach((date) => {
      store.addLog(foodLog(date));
      store.addLog(foodLog(date));
      store.addLog(foodLog(date));
      store.addLog(foodLog(date));
    });
    useStore.setState((state) => ({
      game: {
        ...state.game,
        [PROFILE]: { ...state.game[PROFILE], lastEval: addDays(dates[0], -1) },
      },
    }));

    useStore.getState().reconcileGame();

    const milestone = STREAK_MILESTONES[0];
    const game = useStore.getState().game[PROFILE];
    expect(game.streak).toBe(3);
    expect(game.xp).toBe(dates.length * (4 * FOOD_LOG_XP_REWARD + DAILY_XP_REWARD) + milestone.xp);
    expect(game.streakMilestoneClaims).toEqual([milestone.days]);
    expect(game.pendingStreakRewards).toEqual([{ days: milestone.days, xp: milestone.xp, date: dates[2] }]);

    useStore.getState().reconcileGame();
    expect(useStore.getState().game[PROFILE].xp).toBe(game.xp);
    useStore.getState().acknowledgeStreakReward(milestone.days);
    expect(useStore.getState().game[PROFILE].pendingStreakRewards).toEqual([]);
    expect(useStore.getState().game[PROFILE].streakMilestoneClaims).toEqual([milestone.days]);
  });

  it("awards weight logging XP only once per local day", () => {
    const store = useStore.getState();

    expect(store.logWeight(170)).toBe(WEIGHT_LOG_XP_REWARD);
    expect(useStore.getState().logWeight(169.5)).toBe(0);
    expect(useStore.getState().weights[PROFILE]).toEqual([
      { date: todayStr(), value: 169.5 },
    ]);
    expect(useStore.getState().game[PROFILE].xp).toBe(WEIGHT_LOG_XP_REWARD);
    expect(useStore.getState().game[PROFILE].weightXpClaims).toEqual({
      [todayStr()]: true,
    });
  });

  it("awards only newly crossed steps and standing milestones", () => {
    const store = useStore.getState();
    expect(store.applyHealthActivity({ date: todayStr(), steps: 9_500, standMinutes: 60 })).toBe(107);
    expect(useStore.getState().applyHealthActivity({ date: todayStr(), steps: 9_500, standMinutes: 60 })).toBe(0);
    expect(useStore.getState().applyHealthActivity({ date: todayStr(), steps: 12_000, standMinutes: 90 })).toBe(61);
    expect(useStore.getState().game[PROFILE].xp).toBe(168);
  });

  it("awards XP when an in-app workout session is finished", () => {
    const store = useStore.getState();
    const sessionId = store.startSession({
      date: todayStr(),
      planId: "test-plan",
      weekIdx: 0,
      dayIdx: 0,
      dayName: { en: "Test workout", zh: "測試訓練" },
      entries: [{
        key: "squat",
        name: { en: "Squat", zh: "深蹲" },
        targetSets: 2,
        targetReps: "5",
        sets: [
          { w: 100, reps: 5, done: true },
          { w: 100, reps: 5, done: true },
        ],
      }],
    });

    const result = useStore.getState().finishSession(sessionId);

    expect(result).toMatchObject({ xp: 18, completedSets: 2, completedExercises: 1 });
    expect(useStore.getState().game[PROFILE].xp).toBe(18);
  });

  it("enforces one shared daily cap across Health and food rewards", () => {
    const store = useStore.getState();
    expect(store.applyHealthActivity({
      date: todayStr(),
      steps: 30_000,
      standMinutes: 240,
      workouts: [{ id: "long-workout", activityType: "Pilates", durationMinutes: 180, activeCalories: 500, startedAt: Date.now() }],
    })).toBe(DAILY_XP_CAP);
    expect(useStore.getState().addLog(foodLog())).toBe(0);
    expect(useStore.getState().game[PROFILE].xp).toBe(DAILY_XP_CAP);
  });

  it("preserves already-claimed Health XP when upgrading to smaller milestones", () => {
    const migrated = migrateHealthXpClaimTiers({
      game: {
        [PROFILE]: {
          streak: 0,
          best: 0,
          melons: 0,
          golden: 0,
          xp: 107,
          lastEval: "2026-08-08",
          history: {},
          healthXpClaims: {
            "2026-08-09": { stepTier: 3, standTier: 2 },
          },
        },
      },
    });

    expect(migrated.game?.[PROFILE].healthXpClaims?.["2026-08-09"]).toEqual({
      stepTier: 9,
      standTier: 6,
    });
  });

  it("repairs Health history saved before workouts were available", () => {
    const migrated = migrateHealthActivityWorkouts({
      health: {
        [PROFILE]: {
          "2026-08-09": {
            date: "2026-08-09",
            steps: 8_200,
            standMinutes: 75,
            syncedAt: 1,
            source: "apple-health",
          },
        },
      },
    } as unknown as Partial<ReturnType<typeof useStore.getState>>);

    expect(migrated.health?.[PROFILE]["2026-08-09"].workouts).toEqual([]);
  });
});
