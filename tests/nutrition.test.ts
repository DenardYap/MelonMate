import { describe, expect, test } from "vitest";
import {
  addMacros,
  est1RM,
  exKey,
  mulMacros,
  round2,
  scaleMacros,
  sumMacros,
} from "../lib/nutrition";

const egg = { cal: 143, protein: 12.6, carbs: 0.7, fat: 9.5 };

describe("nutrition math", () => {
  test("scaleMacros scales per-100g linearly with rounding", () => {
    const one = scaleMacros(egg, 55); // one egg
    expect(one).toMatchObject({ cal: 79, protein: 6.9, carbs: 0.4, fat: 5.2 });
    const zero = scaleMacros(egg, 0);
    expect(zero.cal).toBe(0);
  });

  test("mulMacros multiplies servings", () => {
    const two = mulMacros({ cal: 620, protein: 32, carbs: 68, fat: 22 }, 2);
    expect(two).toMatchObject({ cal: 1240, protein: 64, carbs: 136, fat: 44 });
  });

  test("addMacros / sumMacros accumulate", () => {
    const a = { cal: 100, protein: 10.5, carbs: 20, fat: 5 };
    const b = { cal: 50, protein: 4.4, carbs: 2, fat: 1 };
    expect(addMacros(a, b)).toMatchObject({ cal: 150, protein: 14.9 });
    expect(sumMacros([a, b, b])).toMatchObject({ cal: 200, protein: 19.3 });
  });

  test("optional micro fields survive scaling when present", () => {
    const withFiber = { ...egg, fiber: 2 };
    expect(scaleMacros(withFiber, 50).fiber).toBe(1);
    expect(scaleMacros(egg, 50).fiber).toBeUndefined();
  });

  test("est1RM uses Epley and passes through singles", () => {
    expect(est1RM(100, 10)).toBe(133);
    expect(est1RM(200, 1)).toBe(200);
    expect(est1RM(145, 6)).toBe(174);
  });

  test("exKey normalizes names into stable history keys", () => {
    expect(exKey("Back Squat")).toBe("back-squat");
    expect(exKey("EZ Bar Curl")).toBe("ez-bar-curl");
    expect(exKey("Single-Arm  Rope Tricep Extension")).toBe("single-arm-rope-tricep-extension");
    expect(exKey("槓鈴深蹲")).toBe("槓鈴深蹲");
    // en/zh variants of the same movement stay distinct but stable
    expect(exKey("Hammer Curl")).toBe(exKey("hammer curl"));
  });

  test("round2", () => {
    expect(round2(2.966)).toBe(2.97);
    expect(round2(2)).toBe(2);
  });
});
