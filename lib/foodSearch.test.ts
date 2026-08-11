import { describe, expect, it } from "vitest";
import { searchFoodCatalog } from "./foodSearch";
import { BUILTIN_FOODS } from "./foods";
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
  it("ships broad prepared-food and regional coverage", () => {
    expect(BUILTIN_FOODS.length).toBeGreaterThan(10_000);
    const pineappleCake = searchFoodCatalog("pineapple cake", BUILTIN_FOODS, [])[0];
    expect(pineappleCake).toMatchObject({
      kind: "food",
      item: {
        id: "tfda-Q0500501",
        name: { en: "Pineapple cake", zh: "鳳梨酥" },
        source: { name: "Taiwan FDA Food Nutrition Database" },
      },
    });
    expect(searchFoodCatalog("feng li su", BUILTIN_FOODS, [])[0].item.id).toBe("tfda-Q0500501");
  });

  it("finds long-tail ingredients by regional names, spellings, and additive numbers", () => {
    expect(searchFoodCatalog("rambutan", BUILTIN_FOODS, [])[0].item.id).toBe("rambutan");
    expect(searchFoodCatalog("belacan", BUILTIN_FOODS, [])[0]).toMatchObject({
      kind: "food",
      item: { id: "tfda-P1004701", name: { en: "Shrimp paste" } },
    });
    expect(searchFoodCatalog("gelatin", BUILTIN_FOODS, [])[0]).toMatchObject({
      kind: "food",
      item: { id: "longtail-gelatin-powder-unflavored" },
    });
    expect(searchFoodCatalog("carmine", BUILTIN_FOODS, [])[0]).toMatchObject({
      kind: "food",
      item: { id: "additive-carmine", traceIngredient: true },
    });
    expect(searchFoodCatalog("cochineal", BUILTIN_FOODS, [])[0].item.id).toBe("additive-carmine");
    expect(searchFoodCatalog("E120", BUILTIN_FOODS, [])[0].item.id).toBe("additive-carmine");
    expect(searchFoodCatalog("E415", BUILTIN_FOODS, [])[0].item.id).toBe("additive-xanthan-gum");
    expect(searchFoodCatalog("INS 621", BUILTIN_FOODS, [])[0]).toMatchObject({
      kind: "food",
      item: { name: { en: "Monosodium glutamate" } },
    });
    expect(searchFoodCatalog("baker's ammonia", BUILTIN_FOODS, [])[0].item.id).toBe("additive-ammonium-bicarbonate");
    expect(searchFoodCatalog("katsuobushi", BUILTIN_FOODS, [])[0].item.id).toBe("tfda-J0800401");
  });

  it("searches foods by name", () => {
    expect(searchFoodCatalog("eggs", [egg], [])[0]).toMatchObject({ kind: "food" });
    expect(searchFoodCatalog("egg", [egg], [toast])[0]).toMatchObject({ kind: "food" });
  });

  it("finds a curated recipe through its ingredients", () => {
    const result = searchFoodCatalog("sourdough", [egg], [toast])[0];
    expect(result).toMatchObject({ kind: "recipe", matchedOn: "Ingredient: Sourdough" });
  });

  it("finds a user's custom recipe by name", () => {
    const result = searchFoodCatalog("avocado toast", [egg], [toast])[0];
    expect(result).toMatchObject({ kind: "recipe", item: { id: "toast" }, matchedOn: "My recipe" });
  });

  it("prioritizes curated exact matches", () => {
    const custom = { ...egg, id: "mine", custom: true };
    expect(searchFoodCatalog("egg", [egg, custom], [toast])[0].item.id).toBe("mine");
  });

  it("collapses source rows that have the same visible food name", () => {
    const sourceVariant: FoodItem = {
      ...egg,
      id: "source-egg",
      name: { en: "Egg", zh: "雞卵" },
      source: { name: "Another nutrition source" },
    };
    const results = searchFoodCatalog("egg", [egg, sourceVariant], []);
    expect(results).toHaveLength(1);
    expect(results[0].item.id).toBe("egg");

    const appleResults = searchFoodCatalog("apple", BUILTIN_FOODS, [], 30);
    expect(appleResults[0].item.id).toBe("apple");
    expect(appleResults.filter((result) => result.item.name.en === "Apple")).toHaveLength(1);
  });

  it("does not collapse meaningfully different apple foods", () => {
    const apple: FoodItem = { ...egg, id: "apple", name: { en: "Apple", zh: "蘋果" } };
    const applesauce: FoodItem = { ...egg, id: "applesauce", name: { en: "Applesauce", zh: "蘋果醬" } };
    const results = searchFoodCatalog("apple", [apple, applesauce], []);
    expect(results.map((result) => result.item.id)).toEqual(["apple", "applesauce"]);
  });

  it("searches alternate and transliterated food names", () => {
    const pineappleCake: FoodItem = {
      ...egg,
      id: "pineapple-cake",
      name: { en: "Pineapple cake", zh: "鳳梨酥" },
      aliases: ["Feng li su", "凤梨酥"],
    };
    expect(searchFoodCatalog("feng li su", [pineappleCake], [])[0].item.id).toBe("pineapple-cake");
    expect(searchFoodCatalog("凤梨酥", [pineappleCake], [])[0].item.id).toBe("pineapple-cake");
  });
});
