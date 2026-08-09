import { describe, expect, test } from "vitest";
import { parseVoiceFood, zhNumber } from "../lib/voice";
import { BUILTIN_FOODS } from "../lib/foods";
import { BUILTIN_RECIPES } from "../lib/recipes";

describe("zhNumber", () => {
  test("parses Chinese numerals", () => {
    expect(zhNumber("兩百五十")).toBe(250);
    expect(zhNumber("一百")).toBe(100);
    expect(zhNumber("三十")).toBe(30);
    expect(zhNumber("十二")).toBe(12);
    expect(zhNumber("半")).toBe(0.5);
    expect(zhNumber("250")).toBe(250);
    expect(zhNumber("abc")).toBeUndefined();
  });
});

describe("parseVoiceFood", () => {
  test("english food with explicit grams", () => {
    const hits = parseVoiceFood("chicken breast 200 grams", BUILTIN_FOODS, [], "en");
    expect(hits).toHaveLength(1);
    expect(hits[0].grams).toBe(200);
    expect(hits[0].macros.cal).toBe(240); // 120 cal / 100 g
  });

  test("chinese counted servings: 兩顆蛋 = 2 eggs", () => {
    const hits = parseVoiceFood("兩顆蛋", BUILTIN_FOODS, [], "zh");
    expect(hits).toHaveLength(1);
    expect(hits[0].grams).toBe(100); // 2 × 50 g USDA large eggs
  });

  test("single-char zh food match: 一碗飯 = a bowl of rice", () => {
    const hits = parseVoiceFood("一碗飯", BUILTIN_FOODS, [], "zh");
    expect(hits).toHaveLength(1);
    expect(hits[0].grams).toBe(200); // 1 bowl serving
    expect(hits[0].refId).toBe("white-rice");
  });

  test("spoken meal slot is detected", () => {
    const hits = parseVoiceFood("早餐 兩顆蛋", BUILTIN_FOODS, [], "zh");
    expect(hits[0].meal).toBe("breakfast");
  });

  test("multiple foods split on connectors", () => {
    const hits = parseVoiceFood("2 eggs and one banana", BUILTIN_FOODS, [], "en");
    expect(hits).toHaveLength(2);
    expect(hits[0].grams).toBe(100);
    expect(hits[1].grams).toBe(118);
  });

  test("counted items use one unit, not one multi-item catalog serving", () => {
    const wings = parseVoiceFood("3 chicken wings", BUILTIN_FOODS, [], "en");
    expect(wings).toHaveLength(1);
    expect(wings[0].grams).toBe(90); // the catalog serving is already 3 wings

    const bacon = parseVoiceFood("2 slices bacon", BUILTIN_FOODS, [], "en");
    expect(bacon).toHaveLength(1);
    expect(bacon[0].grams).toBe(16); // 2 cooked USDA slices at 8 g each
  });

  test("recipe names win over ingredient words", () => {
    const hits = parseVoiceFood("青醬雞肉義大利麵", BUILTIN_FOODS, BUILTIN_RECIPES, "zh");
    expect(hits).toHaveLength(1);
    expect(hits[0].refId).toBe("pesto-pasta");
  });

  test("unmatched text yields no hits", () => {
    expect(parseVoiceFood("xyzzy nothing here", BUILTIN_FOODS, [], "en")).toHaveLength(0);
  });
});
