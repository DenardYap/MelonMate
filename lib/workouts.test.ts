import { describe, expect, it } from "vitest";
import { seedWeightInUnit } from "./workouts";

describe("bundled workout seed weights", () => {
  it("keeps imported pound values in pounds and converts them for kg profiles", () => {
    expect(seedWeightInUnit(100, "lb")).toBe(100);
    expect(seedWeightInUnit(100, "kg")).toBe(45.5);
  });
});
