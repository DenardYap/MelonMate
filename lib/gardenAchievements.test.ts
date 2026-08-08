import { describe, expect, it } from "vitest";
import { GARDEN_SPELL_IDS, MAX_GARDEN_PLOTS, MELON_VARIETIES, freshGarden } from "./garden";
import { GARDEN_ACHIEVEMENT_IDS, gardenAchievements } from "./gardenAchievements";

describe("garden achievements", () => {
  it("starts with every achievement locked", () => {
    expect(gardenAchievements(freshGarden()).filter((achievement) => achievement.earned)).toEqual([]);
    expect(gardenAchievements(freshGarden()).every(
      (achievement) => achievement.reward.xp > 0 && achievement.reward.dew > 0
    )).toBe(true);
  });

  it("unlocks first roots after the first planting", () => {
    const garden = freshGarden();
    garden.plantCounts.honeydew = 1;

    const achievements = gardenAchievements(garden);
    expect(achievements.find((achievement) => achievement.id === "firstRoots")).toMatchObject({
      current: 1,
      target: 1,
      earned: true,
    });
    expect(achievements.find((achievement) => achievement.id === "allMelons")?.earned).toBe(false);
  });

  it("unlocks every achievement from permanent lifetime progress", () => {
    const garden = freshGarden();
    for (const variety of MELON_VARIETIES) garden.plantCounts[variety.id] = 1_000;
    garden.totalSpellCasts = 50;
    garden.spellIdsUsed = [...GARDEN_SPELL_IDS];
    garden.totalHarvests = 100;
    garden.unlockedPlots = MAX_GARDEN_PLOTS;

    expect(gardenAchievements(garden).filter((achievement) => achievement.earned).map((achievement) => achievement.id))
      .toEqual(GARDEN_ACHIEVEMENT_IDS);
  });
});
