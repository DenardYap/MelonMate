import { describe, expect, test } from "vitest";
import { BUILTIN_FOODS } from "../lib/foods";
import { resolveCountedFood, resolveFoodServing } from "../lib/foodServing";
import { searchFoodCatalog } from "../lib/foodSearch";

const byId = (id: string) => {
  const food = BUILTIN_FOODS.find((item) => item.id === id);
  if (!food) throw new Error(`Missing built-in food: ${id}`);
  return food;
};

describe("built-in food nutrition", () => {
  test("ships a comprehensive ingredient bank", () => {
    expect(BUILTIN_FOODS.length).toBeGreaterThanOrEqual(3500);
    expect(BUILTIN_FOODS.filter((food) => food.source?.name === "USDA FoodData Central").length).toBeGreaterThanOrEqual(3500);
  });

  test.each([
    ["mangoes", "mango"],
    ["rambutan", "rambutan"],
    ["lychee", "lychee"],
    ["venison", "venison"],
    ["cilantro", "cilantro"],
    ["zucchini", "zucchini"],
    ["jackfruit", "jackfruit"],
    ["durian", "durian"],
    ["quinoa", "quinoa"],
    ["octopus", "octopus"],
  ])("finds %s and its common-name variants", (query, expectedName) => {
    const results = searchFoodCatalog(query, BUILTIN_FOODS, [], 10);
    expect(results.some((result) => result.item.name.en.toLowerCase().includes(expectedName))).toBe(true);
  });

  test("every ingredient has a unique, valid nutrition record and serving", () => {
    expect(new Set(BUILTIN_FOODS.map((food) => food.id)).size).toBe(BUILTIN_FOODS.length);
    for (const food of BUILTIN_FOODS) {
      expect(food.serving, food.id).toBeDefined();
      expect(food.serving!.grams, food.id).toBeGreaterThan(0);
      expect(food.per100.cal, food.id).toBeGreaterThanOrEqual(0);
      expect(food.per100.protein, food.id).toBeGreaterThanOrEqual(0);
      expect(food.per100.carbs, food.id).toBeGreaterThanOrEqual(0);
      expect(food.per100.fat, food.id).toBeGreaterThanOrEqual(0);
      expect(food.per100.protein + food.per100.carbs + food.per100.fat, food.id).toBeLessThanOrEqual(105);
      if (food.serving!.unitCount != null) {
        expect(food.serving!.unitCount, food.id).toBeGreaterThan(1);
        expect(food.serving!.unitLabel, food.id).toBeDefined();
      }
    }
  });

  test.each([
    ["egg", 50, 72],
    ["bacon", 16, 87],
    ["spinach", 30, 7],
    ["green-peas", 145, 117],
    ["cucumber", 52, 8],
    ["blueberry", 74, 42],
    ["strawberry", 60, 19],
    ["grapes", 151, 104],
    ["milk", 244, 149],
    ["cheese", 28, 113],
    ["black-coffee", 237, 2],
  ])("%s uses its audited standard portion", (id, grams, cal) => {
    const serving = resolveFoodServing(byId(id as string), "en");
    expect(serving.grams).toBe(grams);
    expect(serving.macros.cal).toBe(cal);
  });

  test("counted multi-item foods resolve one physical unit at a time", () => {
    expect(resolveCountedFood(byId("chicken-wings"), 3, "en").grams).toBe(90);
    expect(resolveCountedFood(byId("shrimp"), 6, "en").grams).toBe(85);
    expect(resolveCountedFood(byId("fish-balls"), 4, "en").grams).toBe(80);
    expect(resolveCountedFood(byId("bacon"), 2, "en").grams).toBe(16);
    expect(resolveCountedFood(byId("strawberry"), 5, "en").grams).toBe(60);
  });
});
