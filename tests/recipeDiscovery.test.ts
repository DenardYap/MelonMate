import { describe, expect, it } from "vitest";
import { filterRecipes, paginateRecipes } from "../lib/recipeDiscovery";
import type { Recipe } from "../lib/types";

function recipe(id: string, en: string, zh: string, cat: Recipe["cat"], tags: string[]): Recipe {
  return {
    id,
    name: { en, zh },
    emoji: "🍱",
    cat,
    minutes: 20,
    difficulty: 1,
    servings: 4,
    perServing: { cal: 400, protein: 25, carbs: 40, fat: 12 },
    ingredients: [],
    tags,
  };
}

const recipes = [
  { ...recipe("fried-rice", "Chinese sausage fried rice", "香腸蛋炒飯", "asian", ["chinese", "highProtein"]), ingredients: [{ name: { en: "Cilantro", zh: "香菜" }, amount: { en: "1 bunch", zh: "1 把" } }] },
  recipe("tofu", "Lemongrass tofu jars", "香茅豆腐米線罐", "asian", ["vietnamese", "vegan"]),
  { ...recipe("salmon", "Dill salmon farro", "蒔蘿鮭魚法羅麥", "western", ["kosher", "easternEuropean"]), ingredients: [{ name: { en: "Walnuts", zh: "核桃" }, amount: { en: "1 cup", zh: "1 杯" } }] },
];

describe("recipe discovery", () => {
  it("searches both English and Chinese recipe names", () => {
    expect(filterRecipes(recipes, { query: "fried rice" }).map((item) => item.id)).toEqual(["fried-rice"]);
    expect(filterRecipes(recipes, { query: "香茅豆腐" }).map((item) => item.id)).toEqual(["tofu"]);
  });

  it("combines category, diet, and cuisine filters", () => {
    expect(filterRecipes(recipes, { category: "asian", diet: "vegan", cuisine: "vietnamese" }).map((item) => item.id)).toEqual(["tofu"]);
    expect(filterRecipes(recipes, { category: "western", diet: "vegan", cuisine: "easternEuropean" })).toEqual([]);
  });

  it("excludes recipes by ingredient name and general ingredient class", () => {
    expect(filterRecipes(recipes, { excludeIngredients: ["Cilantro"] }).map((item) => item.id)).toEqual(["tofu", "salmon"]);
    expect(filterRecipes(recipes, { excludeIngredients: ["nuts"] }).map((item) => item.id)).toEqual(["fried-rice", "tofu"]);
  });

  it("paginates results and clamps a stale page after the result set shrinks", () => {
    const many = Array.from({ length: 19 }, (_, index) => index + 1);
    expect(paginateRecipes(many, 2, 8)).toMatchObject({ items: [9, 10, 11, 12, 13, 14, 15, 16], page: 2, totalPages: 3, totalItems: 19 });
    expect(paginateRecipes(many.slice(0, 3), 3, 8)).toMatchObject({ items: [1, 2, 3], page: 1, totalPages: 1, totalItems: 3 });
  });
});
