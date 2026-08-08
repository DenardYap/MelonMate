import { describe, expect, it } from "vitest";
import { buildRestrictionOptions, recipeMatchesRestrictions, searchRestrictionOptions } from "../lib/ingredientRestrictions";
import type { Recipe } from "../lib/types";

function withIngredient(en: string, zh = ""): Recipe {
  return {
    id: en,
    name: { en: "Test recipe", zh: "測試食譜" },
    emoji: "🍱",
    cat: "asian",
    minutes: 20,
    difficulty: 1,
    servings: 4,
    perServing: { cal: 400, protein: 20, carbs: 40, fat: 12 },
    ingredients: [{ name: { en, zh }, amount: { en: "1 cup", zh: "1 杯" } }],
    tags: [],
  };
}

describe("ingredient restrictions", () => {
  it("matches a typed ingredient in English or Chinese", () => {
    const recipe = withIngredient("Cilantro and parsley", "香菜與巴西里");
    expect(recipeMatchesRestrictions(recipe, ["Cilantro"])).toBe(true);
    expect(recipeMatchesRestrictions(recipe, ["香菜"])).toBe(true);
  });

  it("expands a general nuts restriction without treating coconut as a tree nut", () => {
    expect(recipeMatchesRestrictions(withIngredient("Walnut pesto"), ["nuts"])).toBe(true);
    expect(recipeMatchesRestrictions(withIngredient("Coconut milk"), ["nuts"])).toBe(false);
  });

  it("does not confuse eggs with eggplant", () => {
    expect(recipeMatchesRestrictions(withIngredient("Eggplant"), ["eggs"])).toBe(false);
    expect(recipeMatchesRestrictions(withIngredient("Jammy eggs"), ["eggs"])).toBe(true);
  });

  it("builds a searchable dropdown from food and recipe ingredients", () => {
    const options = buildRestrictionOptions([], [withIngredient("Cilantro")]);
    expect(searchRestrictionOptions(options, "cilan")[0].label.en).toBe("Cilantro");
    expect(searchRestrictionOptions(options, "nuts")[0].group).toBe(true);
  });
});
