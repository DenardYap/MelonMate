import { describe, expect, it } from "vitest";
import { exerciseMovement } from "./exerciseMovement";

describe("exercise movement icons", () => {
  it.each([
    ["Back Squat", "squat"],
    ["Dumbbell Biceps Curl", "curl"],
    ["Romanian Deadlift", "hinge"],
    ["Barbell Bench Press", "bench"],
    ["Outdoor Running", "run"],
    ["Lat Pulldown", "pull"],
    ["啞鈴走路弓步", "lunge"],
  ] as const)("classifies %s as %s", (name, movement) => {
    expect(exerciseMovement(name)).toBe(movement);
  });

  it("uses the muscle group for custom names", () => {
    expect(exerciseMovement("My favorite movement", "core")).toBe("core");
    expect(exerciseMovement("My favorite movement", "back")).toBe("pull");
  });

  it("does not show a biceps icon for leg curls", () => {
    expect(exerciseMovement("Lying Leg Curl", "hams")).toBe("legs");
  });
});
