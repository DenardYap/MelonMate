import { describe, expect, it } from "vitest";
import {
  applyMealPlanTemplate,
  captureMealPlan,
  mealPlanMealCount,
  mealPlanRecipeIds,
  repairLegacyRecipeYieldMultipliers,
  upsertPlannedMeal,
} from "../lib/mealPlans";
import type { DayPlan } from "../lib/types";

describe("reusable meal plans", () => {
  it("captures a dated week as seven relative days", () => {
    const planner: Record<string, DayPlan> = {
      "2026-08-03": { breakfast: [{ recipeId: "oats", servings: 1 }] },
      "2026-08-05": { dinner: [{ recipeId: "hotpot", servings: 2 }] },
    };
    const days = captureMealPlan(planner, "2026-08-03");
    expect(days).toHaveLength(7);
    expect(days[0].breakfast?.[0].recipeId).toBe("oats");
    expect(days[2].dinner?.[0].servings).toBe(2);
    expect(mealPlanMealCount(days)).toBe(2);
    expect(mealPlanRecipeIds(days)).toEqual(["oats", "hotpot"]);
  });

  it("reuses a template on another week without duplicating merge matches", () => {
    const template = { days: [{ lunch: [{ recipeId: "tofu", servings: 1 }] }] };
    const planner = { "2026-08-10": { lunch: [{ recipeId: "tofu", servings: 2 }] } };
    const merged = applyMealPlanTemplate(planner, template, "2026-08-10", "merge");
    expect(merged["2026-08-10"].lunch).toEqual([{ recipeId: "tofu", servings: 2 }]);
    expect(planner["2026-08-10"].lunch).toEqual([{ recipeId: "tofu", servings: 2 }]);
  });

  it("can explicitly replace the target week", () => {
    const template = { days: [{ dinner: [{ recipeId: "congee", servings: 1 }] }] };
    const planner = { "2026-08-10": { lunch: [{ recipeId: "tofu", servings: 2 }] } };
    const replaced = applyMealPlanTemplate(planner, template, "2026-08-10", "replace");
    expect(replaced["2026-08-10"]).toEqual({ dinner: [{ recipeId: "congee", servings: 1 }] });
  });

  it("keeps one planned entry per recipe and updates its portions", () => {
    const first = upsertPlannedMeal({}, "dinner", "hotpot", 1);
    const second = upsertPlannedMeal(first, "dinner", "hotpot", 2);

    expect(second.dinner).toEqual([{ recipeId: "hotpot", servings: 2 }]);
  });

  it("repairs legacy batch-yield multipliers and duplicate adds", () => {
    const planner: Record<string, DayPlan> = {
      "2026-08-03": {
        lunch: [
          { recipeId: "hotpot", servings: 4 },
          { recipeId: "hotpot", servings: 4 },
          { recipeId: "tofu", servings: 3 },
        ],
      },
    };

    const repaired = repairLegacyRecipeYieldMultipliers(planner, [
      { id: "hotpot", servings: 4 },
      { id: "tofu", servings: 2 },
    ]);

    expect(repaired["2026-08-03"].lunch).toEqual([
      { recipeId: "hotpot", servings: 1 },
      { recipeId: "tofu", servings: 3 },
    ]);
  });
});
