import { describe, expect, test } from "vitest";
import { actionPreviewLines, actionTitle, type AgentAction } from "../lib/agent";

describe("Honey action previews", () => {
  test("summarizes a food log before it is applied", () => {
    const action: AgentAction = {
      id: "food-1",
      kind: "log_food",
      payload: {
        name: "Eggs and toast",
        emoji: "🍳",
        meal: "breakfast",
        grams: 170,
        cal: 310,
        protein: 19.2,
        carbs: 28,
        fat: 13.5,
        fiber: 3,
        sugar: 2,
        sodiumMg: 430,
      },
    };

    expect(actionTitle(action, "en")).toBe("Log Eggs and toast");
    expect(actionPreviewLines(action, "en")).toEqual([
      "310 cal · P 19.2g · C 28g · F 13.5g",
      "Breakfast · 170 g",
    ]);
  });

  test("only shows daily targets that will change", () => {
    const action: AgentAction = {
      id: "targets-1",
      kind: "update_daily_targets",
      payload: { cal: 2100, protein: null, carbs: null, fat: 70, waterCups: null },
    };

    expect(actionPreviewLines(action, "en")).toEqual(["Calories 2,100 cal", "Fat 70g"]);
  });

  test("summarizes a recipe's time and servings", () => {
    const action: AgentAction = {
      id: "recipe-1",
      kind: "draft_recipe",
      payload: {
        name: "Lemon chicken bowl",
        emoji: "🍋",
        category: "western",
        minutes: 25,
        difficulty: 1,
        servings: 2,
        cal: 540,
        protein: 44,
        carbs: 58,
        fat: 13,
        ingredients: [{ name: "Chicken breast", amount: "12 oz", category: "protein" }],
        steps: ["Cook the chicken.", "Assemble the bowl."],
        tags: ["high-protein"],
      },
    };

    expect(actionPreviewLines(action, "en")[0]).toBe("25 min · 2 servings");
  });
});
