import { describe, expect, it } from "vitest";
import { levelUnlocksAt, nextUnlockLevelAfter } from "./levelUnlocks";

describe("level unlock summaries", () => {
  it("combines seed and theme rewards unlocked at the same level", () => {
    const unlocks = levelUnlocksAt(4);
    expect(unlocks.map((unlock) => unlock.id)).toEqual([
      "seed-hami",
      "theme-hami",
    ]);
    expect(unlocks[0]).toMatchObject({ kind: "seed", image: "/garden/hami-seed.png" });
    expect(unlocks[1]).toMatchObject({ kind: "theme", themeId: "hami", colors: ["#e2ebd0", "#9fb58a", "#d8bf82"] });
  });

  it("explains the additional PR condition for Moon Gold", () => {
    expect(levelUnlocksAt(6, 0).find((unlock) => unlock.id === "seed-moon-gold")?.note.en).toContain("gym PR");
    expect(levelUnlocksAt(6, 1).find((unlock) => unlock.id === "seed-moon-gold")?.note.en).not.toContain("gym PR");
  });

  it("finds the next actual reward level across gaps", () => {
    expect(nextUnlockLevelAfter(7)).toBe(9);
    expect(nextUnlockLevelAfter(9)).toBe(12);
    expect(nextUnlockLevelAfter(12)).toBeNull();
  });

  it("unlocks the legendary Densuke theme alongside the level 12 seed", () => {
    expect(levelUnlocksAt(12).map((unlock) => unlock.id)).toEqual([
      "seed-densuke",
      "theme-densuke",
    ]);
  });
});
