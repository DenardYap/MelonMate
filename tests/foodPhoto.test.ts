import { describe, expect, it } from "vitest";
import {
  clampPhotoConfidence,
  macrosForPhotoCalories,
  type FoodPhotoEstimate,
} from "../lib/foodPhoto";

const estimate: FoodPhotoEstimate = {
  name: "Grilled chicken rice bowl",
  emoji: "🍚",
  description: "Grilled chicken served over rice with vegetables and sauce.",
  portion_description: "One medium bowl",
  estimated_grams: 420,
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
});
