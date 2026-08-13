import { describe, expect, it } from "vitest";
import { GARDEN_SPELL_IDS, MAX_GARDEN_PLOTS, MELON_VARIETIES, freshGarden } from "./garden";
import { GARDEN_ACHIEVEMENT_IDS, gardenAchievements } from "./gardenAchievements";
import { FARM_BUILDINGS, FARM_COMPANIONS, SPELL_MASTERY_COSTS } from "./farmProgression";

describe("garden achievements", () => {
  it("starts with every achievement locked", () => {
    expect(gardenAchievements(freshGarden()).filter((achievement) => achievement.earned)).toEqual([]);
    expect(gardenAchievements(freshGarden()).every(
      (achievement) => achievement.reward.xp === 0 && achievement.reward.dew > 0
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
    garden.totalHarvests = 500;
    garden.unlockedPlots = MAX_GARDEN_PLOTS;
    for (const building of FARM_BUILDINGS) garden.buildingLevels[building.id] = 3;
    garden.ownedCompanions = FARM_COMPANIONS.map((companion) => companion.id);
    garden.activeCompanions = garden.ownedCompanions.slice(0, 2);
    for (const spellId of Object.keys(SPELL_MASTERY_COSTS)) garden.spellMastery[spellId as keyof typeof garden.spellMastery] = 3;
    for (const spellId of GARDEN_SPELL_IDS) garden.spellInventory[spellId] = 1;
    garden.stewardshipDays = Array.from({ length: 90 }, (_, index) => `day-${index}`);
    garden.totalHoneyedHarvests = 20;
    garden.totalOrdersClaimed = 100;
    garden.totalWeeklyOrdersClaimed = 10;
    garden.totalOrderRerolls = 10;
    garden.totalLayoutsSaved = 1;
    garden.totalLayoutsReplanted = 25;
    garden.totalHarvestAllUses = 10;
    garden.totalWellUses = 10;

    expect(gardenAchievements(garden).filter((achievement) => achievement.earned).map((achievement) => achievement.id))
      .toEqual(GARDEN_ACHIEVEMENT_IDS);
  });
});
