import { describe, expect, it } from "vitest";
import { estimateDailyTargets, recommendRecipes, recommendWorkoutPlans, selectedRecipesForProfile } from "../lib/onboarding";
import { BUILTIN_RECIPES } from "../lib/recipes";
import type { Recipe, WorkoutPlan } from "../lib/types";

describe("onboarding recommendations", () => {
  it("adjusts calories in the requested direction", () => {
    const base = { gender: "female" as const, age: 30, heightCm: 165, weightKg: 65, activityLevel: "moderate" as const };
    const maintain = estimateDailyTargets({ ...base, fitnessGoal: "maintain", weeklyChangeKg: 0 });
    const lose = estimateDailyTargets({ ...base, fitnessGoal: "lose", weeklyChangeKg: 0.25 });
    const gain = estimateDailyTargets({ ...base, fitnessGoal: "gain", weeklyChangeKg: 0.25 });
    expect(lose.goals.cal).toBeLessThan(maintain.goals.cal);
    expect(gain.goals.cal).toBeGreaterThan(maintain.goals.cal);
    expect(lose.goals.protein).toBeGreaterThan(0);
  });

  it("prefers the requested training frequency and focus", () => {
    const plans = [
      { id: "a", daysPerWeek: 3, focus: "general", goals: ["maintain"] },
      { id: "b", daysPerWeek: 6, focus: "hypertrophy", goals: ["gain"] },
    ] as WorkoutPlan[];
    expect(recommendWorkoutPlans({ trainingDays: 6, trainingFocus: "hypertrophy", fitnessGoal: "gain" }, plans, 1)[0].id).toBe("b");
  });

  it("prioritizes the user's goal over an exact focus match", () => {
    const plans = [
      { id: "mass", daysPerWeek: 6, focus: "hypertrophy", goals: ["gain"] },
      { id: "cut", daysPerWeek: 6, focus: "general", goals: ["lose"] },
    ] as WorkoutPlan[];
    expect(recommendWorkoutPlans({ trainingDays: 6, trainingFocus: "hypertrophy", fitnessGoal: "lose" }, plans, 1)[0].id).toBe("cut");
  });

  it("matches diet and cuisine tags", () => {
    const recipes = [
      { id: "a", tags: ["mealPrep"] },
      { id: "b", tags: ["halal", "vietnamese", "mealPrep"] },
    ] as Recipe[];
    expect(recommendRecipes({ dietPreferences: ["halal"], cuisinePreferences: ["vietnamese"] }, recipes, 1)[0].id).toBe("b");
  });

  it("offers multiple Chinese cuisine matches", () => {
    const matches = recommendRecipes({ cuisinePreferences: ["chinese"] }, BUILTIN_RECIPES, 3);
    expect(matches.filter((recipe) => recipe.tags.includes("chinese"))).toHaveLength(3);
  });

  it("keeps unselected catalog recipes out of the personal library", () => {
    const recipes = [
      { id: "chawanmushi" },
      { id: "picked" },
      { id: "mine", custom: true },
    ] as Recipe[];
    expect(selectedRecipesForProfile({ selectedRecipeIds: ["picked"] }, recipes).map((recipe) => recipe.id)).toEqual(["picked", "mine"]);
    expect(selectedRecipesForProfile({ selectedRecipeIds: [] }, recipes).map((recipe) => recipe.id)).toEqual(["mine"]);
  });
});
