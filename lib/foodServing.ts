import { scaleMacros } from "./nutrition";
import type { FoodItem, Lang, Macros } from "./types";

export interface ResolvedFoodServing {
  grams: number;
  label: string;
  macros: Macros;
}

export const SERVING_STEP = 0.5;
export const MIN_SERVINGS = 0.5;
export const MAX_SERVINGS = 20;

/** Move a review-card serving count in consistent half-serving steps. */
export function stepServingCount(current: number, direction: -1 | 1): number {
  const safeCurrent = Number.isFinite(current) ? current : 1;
  return Math.min(MAX_SERVINGS, Math.max(MIN_SERVINGS, Math.round((safeCurrent + direction * SERVING_STEP) * 2) / 2));
}

/** Resolves the catalog's default portion from its per-100 g nutrition. */
export function resolveFoodServing(food: FoodItem, lang: Lang): ResolvedFoodServing {
  const grams = food.serving?.grams ?? 100;
  const label = food.serving?.label[lang]
    || food.serving?.label.en
    || (lang === "zh" ? "每 100 克" : "per 100 g");
  return { grams, label, macros: scaleMacros(food.per100, grams) };
}

/** Resolves counted input without treating a multi-item serving as one item. */
export function resolveCountedFood(food: FoodItem, count: number, lang: Lang): ResolvedFoodServing {
  const serving = food.serving;
  const gramsPerUnit = serving
    ? serving.grams / Math.max(1, serving.unitCount ?? 1)
    : 100;
  const grams = gramsPerUnit * count;
  const unitLabel = serving?.unitLabel?.[lang] || serving?.unitLabel?.en;
  const fallbackLabel = serving?.label[lang] || serving?.label.en || "100 g";
  return {
    grams,
    label: `${count} × ${unitLabel || fallbackLabel}`,
    macros: scaleMacros(food.per100, grams),
  };
}
