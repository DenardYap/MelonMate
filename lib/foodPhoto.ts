import type { Macros } from "./types";

export interface FoodPhotoEstimateItem {
  name: string;
  emoji: string;
  portion_description: string;
  estimated_grams: number;
  /** Catalog/Open Food Facts id when a retrieved candidate was selected. */
  ref_id: string | null;
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

export interface FoodPhotoEstimate {
  /** Short plain-language description of everything identified in the image. */
  description: string;
  /** Conservative overall confidence derived from the least-certain item. */
  confidence_score: number;
  /** Candidate provenance and estimation caveats, prefixed with the relevant item. */
  assumptions: string[];
  /** One entry per distinct food or drink; repeated identical items may be grouped. */
  items: FoodPhotoEstimateItem[];
}

export interface FoodPhotoModelEstimate {
  description: string;
  items: FoodPhotoEstimateItem[];
}

export function clampPhotoConfidence(value: number): number {
  return Math.min(100, Math.max(0, Math.round(Number(value) || 0)));
}

/** Validate-by-normalization at the API boundary and derive conservative rollups. */
export function sanitizeFoodPhotoEstimate(estimate: FoodPhotoModelEstimate): FoodPhotoEstimate {
  const safe = (value: number, decimals = 1) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    const factor = 10 ** decimals;
    return Math.max(0, Math.round(numeric * factor) / factor);
  };
  const items = estimate.items.slice(0, 12).map((item): FoodPhotoEstimateItem => ({
    name: String(item.name).trim().slice(0, 100) || "Food",
    emoji: String(item.emoji || "🍽️").trim().slice(0, 8),
    portion_description: String(item.portion_description).trim().slice(0, 180) || "Visible portion",
    estimated_grams: Math.max(1, Math.round(Number(item.estimated_grams) || 1)),
    ref_id: item.ref_id ? String(item.ref_id).slice(0, 120) : null,
    cal: Math.round(safe(item.cal, 0)),
    protein_g: safe(item.protein_g),
    carbs_g: safe(item.carbs_g),
    fat_g: safe(item.fat_g),
    fiber_g: safe(item.fiber_g),
    sugar_g: safe(item.sugar_g),
    sodium_mg: Math.round(safe(item.sodium_mg, 0)),
    confidence_score: clampPhotoConfidence(item.confidence_score),
    assumptions: (Array.isArray(item.assumptions) ? item.assumptions : [])
      .map((assumption) => String(assumption).trim())
      .filter(Boolean)
      .slice(0, 4),
  }));

  return {
    description: estimate.description.trim().slice(0, 220),
    confidence_score: items.length ? Math.min(...items.map((item) => item.confidence_score)) : 0,
    assumptions: items.flatMap((item) =>
      item.assumptions.map((assumption) => `${item.name}: ${assumption}`)
    ).slice(0, 12),
    items,
  };
}

/** Keep the nutrition estimate internally consistent when the user edits calories. */
export function macrosForPhotoCalories(
  estimate: FoodPhotoEstimateItem,
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
