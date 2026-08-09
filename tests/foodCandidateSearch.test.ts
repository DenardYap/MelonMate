import { afterEach, describe, expect, test, vi } from "vitest";
import {
  sanitizeProvidedCandidates,
  searchFoodCandidates,
} from "../lib/server/foodCandidateSearch";

describe("agent food candidate retrieval", () => {
  afterEach(() => vi.unstubAllGlobals());

  test("fuzzy-matches misspelled local foods", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("OFF unavailable")));
    const candidates = await searchFoodCandidates(["chiken brest"], [], 5);
    expect(candidates.some((candidate) => candidate.id === "chicken-breast")).toBe(true);
    expect(candidates.length).toBeLessThanOrEqual(5);
  });

  test("finds a concise catalog food inside a verbose visual query", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("OFF unavailable")));
    const candidates = await searchFoodCandidates(["whole watermelon with vine and leaves"], [], 30);
    expect(candidates.some((candidate) => candidate.id === "watermelon")).toBe(true);
  });

  test("maps relevant Open Food Facts search results with serving nutrition", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      products: [{
        code: "1234567890123",
        product_name_en: "Acme Protein Crisps",
        brands: "Acme",
        serving_quantity: 40,
        serving_size: "1 bag (40 g)",
        nutriments: {
          "energy-kcal_100g": 400,
          proteins_100g: 25,
          carbohydrates_100g: 50,
          fat_100g: 10,
        },
      }],
    }), { status: 200, headers: { "Content-Type": "application/json" } })));

    const candidates = await searchFoodCandidates(["Acme Protein Crisps"], [], 30);
    expect(candidates).toContainEqual(expect.objectContaining({
      id: "off-1234567890123",
      kind: "open_food_facts",
      source: "Open Food Facts",
      serving: "1 bag (40 g)",
      grams: 40,
      cal: 160,
      protein: 10,
      carbs: 20,
      fat: 4,
    }));
    expect(candidates.length).toBeLessThanOrEqual(30);
  });

  test("rejects malformed caller-provided candidates", () => {
    expect(sanitizeProvidedCandidates([{ id: "bad", name: "Missing nutrition" }])).toEqual([]);
  });
});
