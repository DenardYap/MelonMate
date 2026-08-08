import { describe, expect, it } from "vitest";
import { migrateLegacyCalorieData, repairInflatedCalorieData } from "../lib/calories";

describe("calorie data migration", () => {
  it("renames nested legacy calorie fields without changing their values", () => {
    const migrated = migrateLegacyCalorieData({
      goals: { kcal: 2_000, protein: 120 },
      logs: [{ macros: { kcal: 310, carbs: 28 } }],
      today: { kcal: 1_420, kcalGoal: 2_100 },
    });

    expect(migrated).toEqual({
      goals: { cal: 2_000, protein: 120 },
      logs: [{ macros: { cal: 310, carbs: 28 } }],
      today: { cal: 1_420, calGoal: 2_100 },
    });
  });

  it("repairs calorie values inflated by the short-lived scientific conversion", () => {
    expect(repairInflatedCalorieData({ goals: { cal: 2_000_000 }, meal: { cal: 480_000 } }))
      .toEqual({ goals: { cal: 2_000 }, meal: { cal: 480 } });
  });
});
