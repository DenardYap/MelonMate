import { describe, expect, it } from "vitest";
import {
  clampPhotoConfidence,
  macrosForPhotoCalories,
  sanitizeFoodPhotoEstimate,
  type FoodPhotoEstimateItem,
} from "../lib/foodPhoto";

const estimate: FoodPhotoEstimateItem = {
  name: "Grilled chicken rice bowl",
  emoji: "🍚",
  portion_description: "One medium bowl",
  estimated_grams: 420,
  ref_id: "grilled-chicken-rice-bowl",
  cal: 600,
  protein_g: 40,
  carbs_g: 70,
  fat_g: 18,
  fiber_g: 6,
  sugar_g: 5,
  sodium_mg: 900,
  confidence_score: 78,
  assumptions: ["About one tablespoon of sauce"],
};

describe("food photo estimates", () => {
  it("clamps model confidence to a whole 0-100 score", () => {
    expect(clampPhotoConfidence(-12)).toBe(0);
    expect(clampPhotoConfidence(72.6)).toBe(73);
    expect(clampPhotoConfidence(118)).toBe(100);
  });

  it("scales macros when the user edits calories", () => {
    expect(macrosForPhotoCalories(estimate, 750)).toEqual({
      cal: 750,
      protein: 50,
      carbs: 87.5,
      fat: 22.5,
      fiber: 7.5,
      sugar: 6.3,
      sodiumMg: 1125,
    });
  });

  it("keeps zero-calorie edits valid and non-negative", () => {
    expect(macrosForPhotoCalories(estimate, 0)).toEqual({
      cal: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodiumMg: 0,
    });
  });

  it("preserves distinct foods and derives conservative photo confidence", () => {
    const result = sanitizeFoodPhotoEstimate({
      description: "A banana and an apple.",
      items: [
        {
          name: "Banana",
          emoji: "🍌",
          portion_description: "1 medium banana",
          estimated_grams: 118,
          ref_id: "banana",
          cal: 105,
          protein_g: 1.3,
          carbs_g: 27,
          fat_g: 0.4,
          fiber_g: 3.1,
          sugar_g: 14.4,
          sodium_mg: 1,
          confidence_score: 96,
          assumptions: ["Matched Banana from MelonMate food library"],
        },
        {
          name: "Apple",
          emoji: "🍎",
          portion_description: "1 medium apple",
          estimated_grams: 180,
          ref_id: "apple",
          cal: 94,
          protein_g: 0.5,
          carbs_g: 24.8,
          fat_g: 0.4,
          fiber_g: 4.3,
          sugar_g: 18.7,
          sodium_mg: 2,
          confidence_score: 91,
          assumptions: ["Matched Apple from MelonMate food library"],
        },
      ],
    });

    expect(result.items.map((item) => item.name)).toEqual(["Banana", "Apple"]);
    expect(result.items.map((item) => item.ref_id)).toEqual(["banana", "apple"]);
    expect(result.confidence_score).toBe(91);
    expect(result.assumptions).toEqual([
      "Banana: Matched Banana from MelonMate food library",
      "Apple: Matched Apple from MelonMate food library",
    ]);
  });
});
