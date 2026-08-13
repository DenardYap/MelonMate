import { describe, expect, it } from "vitest";
import { RECENT_FOOD_HISTORY_LIMIT, recentFoodHistory } from "./recentFoods";
import type { LogEntry } from "./types";

function entry(id: string, at: number, name = id): LogEntry {
  return {
    id,
    at,
    date: "2026-08-12",
    meal: "lunch",
    name: { en: name, zh: name === "Tomato" ? "番茄" : name },
    macros: { cal: 10, protein: 1, carbs: 2, fat: 0 },
  };
}

describe("recent food history", () => {
  it("keeps the newest entry for each food in newest-first order", () => {
    expect(recentFoodHistory([
      entry("older", 10, "Tomato"),
      entry("newest", 30, "Egg"),
      entry("repeat", 20, "Tomato"),
    ]).map((item) => item.id)).toEqual(["newest", "repeat"]);
  });

  it("deduplicates catalog foods by reference id even when their display names differ", () => {
    const older = { ...entry("older", 10, "Egg"), refId: "food-egg" };
    const newer = { ...entry("newer", 20, "Large egg"), refId: "food-egg" };
    expect(recentFoodHistory([older, newer]).map((item) => item.id)).toEqual(["newer"]);
  });

  it("keeps a substantial bounded history and filters either localized name", () => {
    const many = Array.from({ length: 120 }, (_, index) => entry(String(index), index, `Food ${index}`));
    expect(recentFoodHistory(many)).toHaveLength(RECENT_FOOD_HISTORY_LIMIT);
    expect(recentFoodHistory([entry("tomato", 1, "Tomato")], "番茄").map((item) => item.id)).toEqual(["tomato"]);
    expect(recentFoodHistory(many, "", 0)).toEqual([]);
  });
});
