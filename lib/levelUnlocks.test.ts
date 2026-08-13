import { describe, expect, it } from "vitest";
import { levelUnlocksAt, nextUnlockLevelAfter } from "./levelUnlocks";

describe("level unlock summaries", () => {
  it("combines seed, theme, and farm rewards unlocked at the same level", () => {
    const unlocks = levelUnlocksAt(4);
    expect(unlocks.map((unlock) => unlock.id)).toEqual([
      "seed-hami",
      "theme-hami",
      "avatar-cantaloupe-shiba",
      "avatar-canary-duck",
      "avatar-chamoe-bee",
      "avatar-moon-gold-owl",
      "building-apiary-1",
    ]);
    expect(unlocks[0]).toMatchObject({ kind: "seed", image: "/garden/hami-seed.png" });
    expect(unlocks[1]).toMatchObject({ kind: "theme", themeId: "hami", colors: ["#e2ebd0", "#9fb58a", "#d8bf82"] });
  });

  it("keeps Moon Gold purely level-gated", () => {
    expect(levelUnlocksAt(6, 0).find((unlock) => unlock.id === "seed-moon-gold")?.note.en).toContain("Seed Market");
    expect(levelUnlocksAt(6, 1).find((unlock) => unlock.id === "seed-moon-gold")?.note.en).toContain("Seed Market");
  });

  it("finds the next actual reward level across gaps", () => {
    expect(nextUnlockLevelAfter(7)).toBe(8);
    expect(nextUnlockLevelAfter(9)).toBe(10);
    expect(nextUnlockLevelAfter(12)).toBe(13);
    expect(nextUnlockLevelAfter(20)).toBeNull();
  });

  it("unlocks the legendary Densuke theme alongside the level 12 seed", () => {
    expect(levelUnlocksAt(12).map((unlock) => unlock.id)).toEqual([
      "seed-densuke",
      "theme-densuke",
      "avatar-melon-cloud-unicorn",
    ]);
  });

  it("announces collectible profile photos at their configured levels", () => {
    expect(levelUnlocksAt(8).find((unlock) => unlock.id === "avatar-melon-sprout-sloth")).toMatchObject({
      kind: "avatar",
      image: "/avatars/melon-sprout-sloth.svg",
    });
    expect(levelUnlocksAt(7).some((unlock) => unlock.id === "avatar-melon-sprout-sloth")).toBe(false);
  });

  it.each([
    [5, "music-pack-peppy-picnic"],
    [10, "music-pack-town-cafe"],
    [15, "music-pack-moonlit-meadow"],
  ])("announces the music pack unlocked at level %i", (level, id) => {
    expect(levelUnlocksAt(level).find((unlock) => unlock.id === id)).toMatchObject({ kind: "musicPack" });
  });
});
