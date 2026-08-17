import { beforeEach, describe, expect, it } from "vitest";
import { addDays, todayStr } from "./dates";
import { buildMemberSnapshot } from "./sync";
import { useStore } from "./store";
import type { FriendMealPlanSnapshot, Recipe, WorkoutPlan } from "./types";

const RECIPE: Recipe = {
  id: "eggs-on-toast",
  name: { en: "Eggs on toast", zh: "吐司配蛋" },
  emoji: "🍳",
  cat: "breakfast",
  minutes: 8,
  difficulty: 1,
  servings: 1,
  perServing: { cal: 310, protein: 19, carbs: 28, fat: 13 },
  ingredients: [
    { name: { en: "Eggs", zh: "雞蛋" }, amount: { en: "2", zh: "2 顆" } },
  ],
  tags: [],
  custom: true,
};

describe("friend content sharing", () => {
  beforeEach(() => {
    useStore.getState().resetAll();
  });

  it("publishes only the meal plan, workout plan, and recipes selected for a friend", () => {
    const store = useStore.getState();
    const planId = store.plans[0].id;
    store.addRecipe(RECIPE);
    store.planMeal(todayStr(), "breakfast", RECIPE.id, 1);
    store.updateProfile("p-me", { planId });
    store.updateFriendSharing("close-friend", { shareMealPlan: true, shareWorkoutPlan: true, workoutPlanId: planId, sharedRecipeIds: [RECIPE.id] });

    const snapshot = buildMemberSnapshot("close-friend");
    expect(snapshot.version).toBe(11);
    expect(snapshot.notificationDeviceId).toBe(store.ws.deviceId);
    expect(snapshot.mealPlan?.recipes.map((recipe) => recipe.id)).toContain(RECIPE.id);
    expect(snapshot.sharedRecipes?.map((recipe) => recipe.id)).toEqual([RECIPE.id]);
    expect(snapshot.workoutPlan?.plan.id).toBe(planId);
  });

  it("publishes the selected profile photo with friend progress", () => {
    const photoDataUrl = "data:image/jpeg;base64,cHJvZmlsZS1waG90bw==";
    useStore.getState().updateProfile("p-me", { photoDataUrl });

    expect(buildMemberSnapshot("friend-with-photo").photoDataUrl).toBe(photoDataUrl);
  });

  it("publishes a selected built-in avatar with friend progress", () => {
    const photoDataUrl = "/avatars/cantaloupe-cat.svg";
    useStore.getState().updateProfile("p-me", { photoDataUrl });

    expect(buildMemberSnapshot("friend-with-avatar").photoDataUrl).toBe(photoDataUrl);
  });

  it("shares a one-time daily snapshot only with the selected friend", () => {
    const store = useStore.getState();
    const today = todayStr();
    store.addLog({
      date: today,
      meal: "lunch",
      name: { en: "Protein bowl", zh: "蛋白碗" },
      emoji: "🥗",
      grams: 300,
      macros: { cal: 640, protein: 48, carbs: 62, fat: 20 },
      src: "food",
    });
    store.addWater(today, 5);
    store.applyHealthActivity({ date: today, steps: 9_432, standMinutes: 105, workouts: [] });

    const progress = useStore.getState().shareDailyProgress("progress-friend");

    expect(progress).toMatchObject({
      date: today,
      calories: 640,
      protein: 48,
      waterCups: 5,
      steps: 9_432,
      standMinutes: 105,
    });
    expect(buildMemberSnapshot("progress-friend").dailyProgress).toEqual(progress);
    expect(buildMemberSnapshot("different-friend").dailyProgress).toBeUndefined();
  });

  it("keeps sharing choices isolated per friend", () => {
    const store = useStore.getState();
    const planId = store.plans[0].id;
    store.addRecipe(RECIPE);
    store.planMeal(todayStr(), "breakfast", RECIPE.id, 1);
    store.updateProfile("p-me", { planId });
    store.updateFriendSharing("friend-with-plans", { shareMealPlan: true, shareWorkoutPlan: true, workoutPlanId: planId, sharedRecipeIds: [RECIPE.id] });
    const first = buildMemberSnapshot("friend-with-plans");
    const second = buildMemberSnapshot("friend-progress-only");

    expect(first.mealPlan?.recipes.map((recipe) => recipe.id)).toContain(RECIPE.id);
    expect(first.workoutPlan?.plan.id).toBe(planId);
    expect(first.sharedRecipes?.map((recipe) => recipe.id)).toEqual([RECIPE.id]);
    expect(second.mealPlan).toBeUndefined();
    expect(second.workoutPlan).toBeUndefined();
    expect(second.sharedRecipes).toBeUndefined();
  });

  it("publishes the workout plan selected for that friend", () => {
    const store = useStore.getState();
    const activePlanId = store.plans[0].id;
    const sharedPlanId = store.plans[1].id;
    store.updateProfile("p-me", { planId: activePlanId });
    store.updateFriendSharing("training-friend", {
      shareWorkoutPlan: true,
      workoutPlanId: sharedPlanId,
    });

    expect(buildMemberSnapshot("training-friend").workoutPlan?.plan.id).toBe(sharedPlanId);
    expect(useStore.getState().profiles[0].planId).toBe(activePlanId);
  });

  it("publishes bounded food logs, Apple Health activity, theme, and badges", () => {
    const store = useStore.getState();
    store.addLog({
      date: todayStr(),
      meal: "lunch",
      name: { en: "Apple", zh: "蘋果" },
      emoji: "🍎",
      grams: 100,
      macros: { cal: 52, protein: 0.3, carbs: 14, fat: 0.2 },
      src: "food",
    });
    store.applyHealthActivity({ date: todayStr(), steps: 8_000, standMinutes: 90, workouts: [] });
    store.updateFriendSharing("activity-friend", {
      shareFoodLogs: true,
      shareHealth: true,
      shareFarm: true,
    });

    const snapshot = buildMemberSnapshot("activity-friend");
    expect(snapshot.theme).toBe("honeydew");
    expect(snapshot.badges).toEqual([]);
    expect(snapshot.foodLogs?.[0].name.en).toBe("Apple");
    expect(snapshot.health?.[0]).toMatchObject({ steps: 8_000, standMinutes: 90 });
  });

  it("keeps personal activity private until each category is enabled for that friend", () => {
    const store = useStore.getState();
    store.addLog({
      date: todayStr(),
      meal: "lunch",
      name: { en: "Apple", zh: "蘋果" },
      emoji: "🍎",
      grams: 100,
      macros: { cal: 52, protein: 0.3, carbs: 14, fat: 0.2 },
      src: "food",
    });
    store.applyHealthActivity({ date: todayStr(), steps: 8_000, standMinutes: 90, workouts: [] });

    const privateSnapshot = buildMemberSnapshot("privacy-friend");
    expect(privateSnapshot).toMatchObject({ melons: 0, golden: 0 });
    expect(privateSnapshot.today).toBeUndefined();
    expect(privateSnapshot.foodLogs).toBeUndefined();
    expect(privateSnapshot.health).toBeUndefined();
    expect(privateSnapshot.workouts).toBeUndefined();
    expect(privateSnapshot.farm).toBeUndefined();
    expect(privateSnapshot.garden).toBeUndefined();
    expect(privateSnapshot.badges).toBeUndefined();

    store.updateFriendSharing("privacy-friend", {
      shareNutrition: true,
      shareFoodLogs: true,
      shareWorkoutHistory: true,
      shareHealth: true,
      shareFarm: true,
    });
    const sharedSnapshot = buildMemberSnapshot("privacy-friend");
    expect(sharedSnapshot.today?.cal).toBe(52);
    expect(sharedSnapshot.foodLogs?.[0].name.en).toBe("Apple");
    expect(sharedSnapshot.health?.[0].steps).toBe(8_000);
    expect(sharedSnapshot.workouts).toMatchObject({ completed: 0, recent: [] });
    expect(sharedSnapshot.farm).toBeDefined();
    expect(sharedSnapshot.garden).toHaveLength(7);
    expect(sharedSnapshot.badges).toEqual([]);
  });

  it("shares only weekly weight change and never an absolute weight", () => {
    const store = useStore.getState();
    const today = todayStr();
    useStore.setState({
      weights: {
        ...store.weights,
        [store.activeProfileId]: [
          { date: addDays(today, -7), value: 182.5 },
          { date: addDays(today, -3), value: 181 },
          { date: today, value: 179.5 },
        ],
      },
    });

    expect(buildMemberSnapshot("weight-friend").weightTrend).toBeUndefined();

    useStore.getState().updateFriendSharing("weight-friend", { shareWeightTrend: true });
    const snapshot = buildMemberSnapshot("weight-friend");

    expect(snapshot.weightTrend).toEqual({ change: -3, unit: "lb", days: 7, asOf: today });
    expect(Object.keys(snapshot.weightTrend ?? {})).toEqual(["change", "unit", "days", "asOf"]);
    expect(snapshot).not.toHaveProperty("weights");
  });

  it("adds and deletes a workout plan while clearing active sharing safely", () => {
    const source = structuredClone(useStore.getState().plans[0]);
    const customPlan = { ...source, id: "my-custom-plan", name: { en: "My plan", zh: "我的計畫" } };
    useStore.getState().addPlan(customPlan);
    useStore.getState().updateProfile("p-me", { planId: customPlan.id });
    useStore.getState().updateFriendSharing("training-friend", {
      shareWorkoutPlan: true,
      workoutPlanId: customPlan.id,
    });

    useStore.getState().deletePlan(customPlan.id);

    expect(useStore.getState().plans.some((plan) => plan.id === customPlan.id)).toBe(false);
    expect(useStore.getState().profiles[0].planId).toBe("");
    expect(useStore.getState().friendSharing["training-friend"].shareWorkoutPlan).toBe(false);
  });

  it("copies shared recipes and meal entries without duplicating the local recipe", () => {
    const snapshot: FriendMealPlanSnapshot = {
      days: [{ date: todayStr(), plan: { breakfast: [{ recipeId: RECIPE.id, servings: 2 }] } }],
      recipes: [RECIPE],
    };
    const initialRecipeCount = useStore.getState().recipes.length;

    const first = useStore.getState().importFriendMealPlan("friend.one", snapshot, "merge");
    const copiedMeal = useStore.getState().planner[todayStr()].breakfast?.[0];
    expect(first).toEqual({ meals: 1, recipes: 1 });
    expect(copiedMeal?.recipeId).toMatch(/^friend-friend-one-recipe-/);
    expect(copiedMeal?.servings).toBe(2);
    expect(useStore.getState().recipes).toHaveLength(initialRecipeCount + 1);

    useStore.getState().importFriendRecipe("friend.one", RECIPE);
    useStore.getState().importFriendMealPlan("friend.one", snapshot, "merge");
    expect(useStore.getState().recipes).toHaveLength(initialRecipeCount + 1);
    expect(useStore.getState().planner[todayStr()].breakfast).toHaveLength(1);
  });

  it("copies and selects a shared workout plan without importing it twice", () => {
    const source: WorkoutPlan = {
      ...structuredClone(useStore.getState().plans[0]),
      id: "friend-strength",
    };
    const initialPlanCount = useStore.getState().plans.length;

    const copiedId = useStore.getState().importFriendWorkoutPlan("friend.two", source, "lb");
    expect(useStore.getState().profiles[0].planId).toBe(copiedId);
    expect(useStore.getState().plans).toHaveLength(initialPlanCount + 1);

    useStore.getState().importFriendWorkoutPlan("friend.two", source, "lb");
    expect(useStore.getState().plans).toHaveLength(initialPlanCount + 1);
  });

  it("converts a friend's authored target weights into the local unit on import", () => {
    const source: WorkoutPlan = {
      id: "friend-custom",
      name: { en: "Friend custom", zh: "朋友自訂" },
      weeks: [{
        days: [{
          id: "day-one",
          name: { en: "Day one", zh: "第一天" },
          exercises: [{
            id: "bench",
            name: { en: "Bench press", zh: "臥推" },
            sets: 3,
            reps: "8",
            targetWeight: 100,
            seedWeight: 135,
          }],
        }],
      }],
    };
    useStore.getState().updateProfile("p-me", { unit: "kg" });

    const copiedId = useStore.getState().importFriendWorkoutPlan("friend.kg", source, "lb");
    const copied = useStore.getState().plans.find((plan) => plan.id === copiedId)!;

    expect(copied.weeks[0].days[0].exercises[0].targetWeight).toBe(45.4);
    expect(copied.weeks[0].days[0].exercises[0].seedWeight).toBe(135);
  });
});
