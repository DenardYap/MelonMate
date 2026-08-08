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
    expect(privateSnapshot.version).toBe(4);
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
