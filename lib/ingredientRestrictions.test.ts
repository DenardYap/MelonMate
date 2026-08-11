import { describe, expect, it } from "vitest";
import { buildRestrictionOptions, recipeMatchesRestrictions } from "./ingredientRestrictions";
import { filterRecipes } from "./recipeDiscovery";
import { BUILTIN_RECIPES } from "./recipes";
import type { Recipe } from "./types";

function recipe(id: string, en: string, zh: string): Recipe {
  return {
    id,
    name: { en: id, zh: id },
    emoji: "🍽️",
    cat: "asian",
    minutes: 20,
    difficulty: 1,
    servings: 2,
    perServing: { cal: 300, protein: 20, carbs: 30, fat: 10 },
    ingredients: [{ name: { en, zh }, amount: { en: "1 cup", zh: "1 杯" } }],
    tags: [],
  };
}

const cilantroRecipes = [
  recipe("cilantro-salsa", "Cilantro salsa", "香菜莎莎醬"),
  recipe("coriander-chutney", "Fresh coriander chutney", "芫荽酸辣醬"),
  recipe("parsley-salad", "Parsley", "巴西里"),
];

describe("ingredient restrictions", () => {
  it.each(["cilantro", "coriander", "香菜", "芫荽"])(
    "treats %s as the same bilingual ingredient restriction",
    (restriction) => {
      expect(
        filterRecipes(cilantroRecipes, { excludeIngredients: [restriction] }).map(({ id }) => id)
      ).toEqual(["parsley-salad"]);
    }
  );

  it("matches a Chinese restriction against an English-only cilantro ingredient name", () => {
    const englishOnly = recipe("english-only", "Cilantro", "");
    expect(recipeMatchesRestrictions(englishOnly, ["香菜"])).toBe(true);
  });

  it("produces the same recommendation pool for English and Chinese cilantro input", () => {
    const withEnglish = filterRecipes(BUILTIN_RECIPES, { excludeIngredients: ["cilantro"] });
    const withChinese = filterRecipes(BUILTIN_RECIPES, { excludeIngredients: ["香菜"] });

    expect(withEnglish.length).toBeLessThan(BUILTIN_RECIPES.length);
    expect(withChinese.map(({ id }) => id)).toEqual(withEnglish.map(({ id }) => id));
  });

  it("offers cilantro as a bilingual restriction option", () => {
    const option = buildRestrictionOptions([], []).find(({ value }) => value === "cilantro");
    expect(option).toMatchObject({ label: { en: "Cilantro", zh: "香菜" } });
  });
});
