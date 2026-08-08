import type { Macros } from "./types";

export interface FoodPhotoEstimate {
  name: string;
  emoji: string;
  /** Short plain-language description of the food visible in the image. */
  description: string;
  portion_description: string;
  estimated_grams: number;
  cal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
  /** Calibrated visual confidence from 0 (very uncertain) to 100 (very certain). */
  confidence_score: number;
  assumptions: string[];
}

export function clampPhotoConfidence(value: number): number {
  return Math.min(100, Math.max(0, Math.round(Number(value) || 0)));
}

/** Keep the nutrition estimate internally consistent when the user edits calories. */
export function macrosForPhotoCalories(
  estimate: FoodPhotoEstimate,
  editedCalories: number
): Macros {
  const cal = Math.min(20_000, Math.max(0, Math.round(Number(editedCalories) || 0)));
  const factor = estimate.cal > 0 ? cal / estimate.cal : 1;
  const oneDecimal = (value: number) => Math.round(Math.max(0, value * factor) * 10) / 10;

  return {
    cal,
    protein: oneDecimal(estimate.protein_g),
    carbs: oneDecimal(estimate.carbs_g),
    fat: oneDecimal(estimate.fat_g),
    fiber: oneDecimal(estimate.fiber_g),
    sugar: oneDecimal(estimate.sugar_g),
    sodiumMg: Math.round(Math.max(0, estimate.sodium_mg * factor)),
  };
}
