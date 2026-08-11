import { describe, expect, it } from "vitest";
import {
  caloriesFromMacros,
  macrosForRecipeAmount,
  routineMatches,
  searchCurrentRecipes,
} from "./customRecipes";
import type { Recipe } from "./types";

function recipe(patch: Partial<Recipe> = {}): Recipe {
  return {
    id: "custom-rice",
    name: { en: "Weekend chicken fried rice", zh: "週末雞肉炒飯" },
    emoji: "cutlery",
    cat: "custom",
    minutes: 20,
    difficulty: 1,
    servings: 1,
    perServing: { cal: 250, protein: 20, carbs: 30, fat: 6 },
    nutritionBasis: { amount: 100, unit: "g" },
    routine: { days: [0, 6], meal: "lunch" },
    ingredients: [{ name: { en: "chicken", zh: "雞肉" }, amount: { en: "100 g", zh: "100 克" } }],
    tags: ["meal prep"],
    custom: true,
    ...patch,
  };
}

describe("custom recipe nutrition", () => {
  it("auto-calculates calories from macros", () => {
    expect(caloriesFromMacros({ protein: 20, carbs: 30, fat: 6 })).toBe(254);
  });

  it("scales a 100 g basis to an exact logged amount", () => {
    expect(macrosForRecipeAmount(recipe(), 150)).toEqual({ cal: 375, protein: 30, carbs: 45, fat: 9 });
  });
});

describe("current recipe discovery", () => {
  it("searches custom names, ingredients, and tags but excludes bundled recipes", () => {
    const bundled = recipe({ id: "bundled", name: { en: "Chicken soup", zh: "雞湯" }, custom: false });
    expect(searchCurrentRecipes("fried rice", [bundled, recipe()]).map((item) => item.id)).toEqual(["custom-rice"]);
    expect(searchCurrentRecipes("meal prep", [recipe()]).map((item) => item.id)).toEqual(["custom-rice"]);
  });

  it("matches the selected weekday and meal", () => {
    const saturday = new Date("2026-08-08T12:00:00");
    expect(routineMatches(recipe(), saturday, "lunch")).toBe(true);
    expect(routineMatches(recipe(), saturday, "breakfast")).toBe(false);
  });
});
