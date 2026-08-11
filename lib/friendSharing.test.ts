import { beforeEach, describe, expect, it } from "vitest";
import { todayStr } from "./dates";
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

  it("keeps plans private by default and publishes only opted-in content", () => {
    const store = useStore.getState();
    const planId = store.plans[0].id;
    store.addRecipe(RECIPE);
    store.planMeal(todayStr(), "breakfast", RECIPE.id, 1);
    store.updateProfile("p-me", { planId });

    const privateSnapshot = buildMemberSnapshot();
    expect(privateSnapshot.version).toBe(6);
    expect(privateSnapshot.mealPlan).toBeUndefined();
    expect(privateSnapshot.workoutPlan).toBeUndefined();
    expect(privateSnapshot.sharedRecipes).toBeUndefined();

    useStore.getState().toggleSharedRecipe(RECIPE.id);
    useStore.getState().updateProfile("p-me", {
      shareMealPlan: true,
      shareWorkoutPlan: true,
    });

    const sharedSnapshot = buildMemberSnapshot();
    expect(sharedSnapshot.mealPlan?.recipes.map((recipe) => recipe.id)).toContain(RECIPE.id);
    expect(sharedSnapshot.sharedRecipes?.map((recipe) => recipe.id)).toEqual([RECIPE.id]);
    expect(sharedSnapshot.workoutPlan?.plan.id).toBe(planId);
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

  it("publishes different optional content to each friend", () => {
    const store = useStore.getState();
    const planId = store.plans[0].id;
    store.addRecipe(RECIPE);
    store.planMeal(todayStr(), "breakfast", RECIPE.id, 1);
    store.updateProfile("p-me", { planId });
    store.updateFriendSharing("friend-with-plans", {
      shareMealPlan: true,
      shareWorkoutPlan: true,
      sharedRecipeIds: [RECIPE.id],
    });

    const shared = buildMemberSnapshot("friend-with-plans");
    const privateSnapshot = buildMemberSnapshot("friend-progress-only");

    expect(shared.mealPlan?.recipes.map((recipe) => recipe.id)).toContain(RECIPE.id);
    expect(shared.workoutPlan?.plan.id).toBe(planId);
    expect(shared.sharedRecipes?.map((recipe) => recipe.id)).toEqual([RECIPE.id]);
    expect(privateSnapshot.mealPlan).toBeUndefined();
    expect(privateSnapshot.workoutPlan).toBeUndefined();
    expect(privateSnapshot.sharedRecipes).toBeUndefined();
  });

  it("can share a specific workout plan without changing the active plan", () => {
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

    const copiedId = useStore.getState().importFriendWorkoutPlan("friend.two", source);
    expect(useStore.getState().profiles[0].planId).toBe(copiedId);
    expect(useStore.getState().plans).toHaveLength(initialPlanCount + 1);

    useStore.getState().importFriendWorkoutPlan("friend.two", source);
    expect(useStore.getState().plans).toHaveLength(initialPlanCount + 1);
  });
});
