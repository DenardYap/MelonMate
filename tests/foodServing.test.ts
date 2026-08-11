import { describe, expect, it } from "vitest";
import { MAX_SERVINGS, MIN_SERVINGS, stepServingCount } from "../lib/foodServing";

describe("food serving stepper", () => {
  it("moves in half-serving increments", () => {
    expect(stepServingCount(1, 1)).toBe(1.5);
    expect(stepServingCount(1.5, -1)).toBe(1);
  });

  it("stays within the supported serving range", () => {
    expect(stepServingCount(MIN_SERVINGS, -1)).toBe(MIN_SERVINGS);
    expect(stepServingCount(MAX_SERVINGS, 1)).toBe(MAX_SERVINGS);
  });
});
