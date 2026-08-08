import { addDays } from "./dates";
import type { DayPlan, MealPlanTemplate, MealSlot, PlannedMeal } from "./types";

export type MealPlanApplyMode = "merge" | "replace";

const MEAL_SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];

export function captureMealPlan(planner: Record<string, DayPlan>, weekStart: string): DayPlan[] {
  return Array.from({ length: 7 }, (_, index) => cloneDayPlan(planner[addDays(weekStart, index)] ?? {}));
}

export function mealPlanMealCount(days: DayPlan[]): number {
  return days.reduce(
    (total, day) => total + MEAL_SLOTS.reduce((dayTotal, slot) => dayTotal + (day[slot]?.length ?? 0), 0),
    0
  );
}

export function mealPlanRecipeIds(days: DayPlan[]): string[] {
  return Array.from(
    new Set(days.flatMap((day) => MEAL_SLOTS.flatMap((slot) => (day[slot] ?? []).map((meal) => meal.recipeId))))
  );
}

/** Add a recipe once per meal slot; a repeat selection updates its portions. */
export function upsertPlannedMeal(
  day: DayPlan,
  slot: MealSlot,
  recipeId: string,
  servings: number
): DayPlan {
  const next = cloneDayPlan(day);
  const items = next[slot] ?? [];
  const safeServings = Number.isFinite(servings) && servings > 0 ? servings : 1;
  const existingIndex = items.findIndex((meal) => meal.recipeId === recipeId);

  next[slot] = existingIndex === -1
    ? [...items, { recipeId, servings: safeServings }]
    : items.map((meal, index) => index === existingIndex ? { ...meal, servings: safeServings } : meal);
  return next;
}

/**
 * Versions before v10 confused a recipe's batch yield with planned portions.
 * Repair that exact default and collapse repeated adds of the same recipe.
 */
export function repairLegacyRecipeYieldMultipliers(
  planner: Record<string, DayPlan>,
  recipes: { id: string; servings: number }[]
): Record<string, DayPlan> {
  const yields = new Map(recipes.map((recipe) => [recipe.id, recipe.servings]));
  const repaired: Record<string, DayPlan> = {};

  for (const [date, day] of Object.entries(planner)) {
    const nextDay: DayPlan = {};
    for (const slot of MEAL_SLOTS) {
      const unique = new Map<string, PlannedMeal>();
      for (const meal of day[slot] ?? []) {
        const recipeYield = yields.get(meal.recipeId);
        const servings = recipeYield != null && recipeYield > 1 && meal.servings === recipeYield
          ? 1
          : meal.servings;
        unique.set(meal.recipeId, { ...meal, servings });
      }
      if (unique.size) nextDay[slot] = Array.from(unique.values());
    }
    repaired[date] = nextDay;
  }

  return repaired;
}

export function applyMealPlanTemplate(
  planner: Record<string, DayPlan>,
  template: Pick<MealPlanTemplate, "days">,
  weekStart: string,
  mode: MealPlanApplyMode
): Record<string, DayPlan> {
  const next = { ...planner };

  Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    const incoming = cloneDayPlan(template.days[index] ?? {});
    if (mode === "replace") {
      next[date] = incoming;
      return;
    }

    const current = cloneDayPlan(next[date] ?? {});
    for (const slot of MEAL_SLOTS) {
      const existing = current[slot] ?? [];
      const additions = (incoming[slot] ?? []).filter(
        (meal) => !existing.some((saved) => saved.recipeId === meal.recipeId)
      );
      if (existing.length || additions.length) current[slot] = [...existing, ...additions];
    }
    next[date] = current;
  });

  return next;
}

function cloneDayPlan(day: DayPlan): DayPlan {
  const clone: DayPlan = {};
  for (const slot of MEAL_SLOTS) {
    if (day[slot]?.length) clone[slot] = day[slot]!.map((meal) => ({ ...meal }));
  }
  return clone;
}
