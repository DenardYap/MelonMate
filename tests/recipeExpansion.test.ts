import { describe, expect, it } from "vitest";
import { BUILTIN_RECIPES } from "../lib/recipes";
import { EXPANDED_MEAL_PREP_RECIPES } from "../lib/recipeExpansion";

const CUISINES = ["chinese", "taiwanese", "vietnamese", "korean", "japanese", "thai", "indian", "middleEastern", "mediterranean", "mexican", "westAfrican", "easternEuropean"];
const DIETS = ["highProtein", "vegetarian", "vegan", "keto", "halal", "kosher", "glutenFree", "dairyFree", "lowFODMAP", "paleo"];

describe("expanded meal-prep catalog", () => {
  it("adds at least 100 unique reusable recipes", () => {
    expect(EXPANDED_MEAL_PREP_RECIPES.length).toBeGreaterThanOrEqual(100);
    expect(new Set(BUILTIN_RECIPES.map((recipe) => recipe.id)).size).toBe(BUILTIN_RECIPES.length);
    expect(EXPANDED_MEAL_PREP_RECIPES.every((recipe) => recipe.servings === 4 && recipe.tags.includes("mealPrep"))).toBe(true);
  });

  it.each(CUISINES)("adds substantial %s cuisine coverage", (cuisine) => {
    expect(EXPANDED_MEAL_PREP_RECIPES.filter((recipe) => recipe.tags.includes(cuisine))).toHaveLength(10);
  });

  it.each(DIETS)("adds multiple %s meal-prep choices", (diet) => {
    expect(EXPANDED_MEAL_PREP_RECIPES.filter((recipe) => recipe.tags.includes(diet)).length).toBeGreaterThanOrEqual(12);
  });
});
