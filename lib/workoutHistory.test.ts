import { describe, expect, it } from "vitest";
import { historyIndexAfterSwipe } from "./workoutHistory";

describe("exercise history swipe navigation", () => {
  it("moves left to an older workout and right to a newer workout", () => {
    expect(historyIndexAfterSwipe(0, 4, -80, 8)).toBe(1);
    expect(historyIndexAfterSwipe(2, 4, 75, 5)).toBe(1);
  });

  it("ignores short or primarily vertical gestures and clamps the ends", () => {
    expect(historyIndexAfterSwipe(1, 4, -30, 2)).toBe(1);
    expect(historyIndexAfterSwipe(1, 4, -60, 90)).toBe(1);
    expect(historyIndexAfterSwipe(3, 4, -90, 0)).toBe(3);
    expect(historyIndexAfterSwipe(0, 4, 90, 0)).toBe(0);
  });
});
