import { describe, expect, it } from "vitest";
import { searchFoodCatalog } from "./foodSearch";
import type { FoodItem, Recipe } from "./types";

const egg: FoodItem = {
  id: "egg",
  name: { en: "Egg", zh: "雞蛋" },
  emoji: "🥚",
  cat: "protein",
  per100: { cal: 143, protein: 13, carbs: 1, fat: 10 },
};

const toast: Recipe = {
  id: "toast",
  name: { en: "Avocado toast", zh: "酪梨吐司" },
  emoji: "🥑",
  cat: "breakfast",
  minutes: 10,
  difficulty: 1,
  servings: 1,
  perServing: { cal: 320, protein: 9, carbs: 34, fat: 18 },
  ingredients: [{ name: { en: "Sourdough", zh: "酸種麵包" }, amount: { en: "1 slice", zh: "1 片" } }],
  tags: [],
  custom: true,
};

describe("searchFoodCatalog", () => {
  it("searches foods by name", () => {
    expect(searchFoodCatalog("eggs", [egg], [])[0]).toMatchObject({ kind: "food" });
    expect(searchFoodCatalog("egg", [egg], [toast])[0]).toMatchObject({ kind: "food" });
  });

  it("finds a curated recipe through its ingredients", () => {
    const result = searchFoodCatalog("sourdough", [egg], [toast])[0];
    expect(result).toMatchObject({ kind: "recipe", matchedOn: "Ingredient: Sourdough" });
  });

  it("prioritizes curated exact matches", () => {
    const custom = { ...egg, id: "mine", custom: true };
    expect(searchFoodCatalog("egg", [egg, custom], [toast])[0].item.id).toBe("mine");
  });
});
