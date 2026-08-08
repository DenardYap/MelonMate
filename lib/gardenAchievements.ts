import { GARDEN_SPELL_IDS, MAX_GARDEN_PLOTS, MELON_VARIETIES } from "./garden";
import type { BiText, GardenAchievementId, GardenState } from "./types";

export type GardenAchievementTone = "sprout" | "bronze" | "silver" | "gold" | "arcane" | "moon";
export type GardenAchievementIcon = "leaf" | "fruit" | "medal" | "flower" | "sun" | "magic" | "spark" | "star" | "moon" | "trophy" | "soil";

interface GardenAchievementDefinition {
  id: GardenAchievementId;
  name: BiText;
  description: BiText;
  icon: GardenAchievementIcon;
  tone: GardenAchievementTone;
  reward: { xp: number; dew: number };
}

export interface GardenAchievement extends GardenAchievementDefinition {
  current: number;
  target: number;
  earned: boolean;
  eachMilestone: boolean;
}

export const GARDEN_ACHIEVEMENT_DEFINITIONS: GardenAchievementDefinition[] = [
  { id: "firstRoots", name: { en: "Seedling’s First Secret", zh: "幼苗的第一個祕密" }, description: { en: "Plant your first melon.", zh: "種下第一顆瓜。" }, icon: "leaf", tone: "sprout", reward: { xp: 15, dew: 5 } },
  { id: "allMelons", name: { en: "Melon Menagerie", zh: "百瓜奇園" }, description: { en: "Plant every melon variety at least once.", zh: "每種瓜都至少種下一次。" }, icon: "fruit", tone: "sprout", reward: { xp: 150, dew: 50 } },
  { id: "fiveSpells", name: { en: "Pocket Prestidigitator", zh: "口袋小魔術師" }, description: { en: "Successfully cast 5 magic spells.", zh: "成功施放 5 次魔法咒語。" }, icon: "magic", tone: "arcane", reward: { xp: 40, dew: 12 } },
  { id: "rareMelons", name: { en: "Moonlit Collector", zh: "月光收藏家" }, description: { en: "Plant Yubari Ruby, Snow Leopard, and Densuke.", zh: "種下夕張紅寶、雪豹瓜與田助西瓜。" }, icon: "moon", tone: "moon", reward: { xp: 200, dew: 75 } },
  { id: "harvests", name: { en: "Harvest Hero", zh: "收成英雄" }, description: { en: "Harvest 100 melons.", zh: "收成 100 顆瓜。" }, icon: "trophy", tone: "bronze", reward: { xp: 250, dew: 100 } },
  { id: "fields", name: { en: "Realm of Rows", zh: "萬畝成行" }, description: { en: "Unlock every field in the farm.", zh: "解鎖農場中的所有田地。" }, icon: "soil", tone: "gold", reward: { xp: 750, dew: 500 } },
  { id: "hundredEach", name: { en: "Grovekeeper’s Century", zh: "百株守園人" }, description: { en: "Plant 100 of every melon variety.", zh: "每種瓜都種下 100 次。" }, icon: "medal", tone: "bronze", reward: { xp: 500, dew: 250 } },
  { id: "fiftySpells", name: { en: "Grand Garden Arcanist", zh: "瓜園大祕法師" }, description: { en: "Successfully cast 50 magic spells.", zh: "成功施放 50 次魔法咒語。" }, icon: "spark", tone: "arcane", reward: { xp: 400, dew: 175 } },
  { id: "everySpell", name: { en: "Sevenfold Grimoire", zh: "七重魔法書" }, description: { en: "Cast every kind of magic spell.", zh: "每種魔法咒語都施放過。" }, icon: "star", tone: "moon", reward: { xp: 300, dew: 125 } },
  { id: "fiveHundredEach", name: { en: "Vine Whisperer", zh: "藤蔓低語者" }, description: { en: "Plant 500 of every melon variety.", zh: "每種瓜都種下 500 次。" }, icon: "flower", tone: "silver", reward: { xp: 1_500, dew: 750 } },
  { id: "thousandEach", name: { en: "Thousand-Sun Orchard", zh: "千陽瓜園" }, description: { en: "Plant 1,000 of every melon variety.", zh: "每種瓜都種下 1,000 次。" }, icon: "sun", tone: "gold", reward: { xp: 3_000, dew: 1_500 } },
];

export const GARDEN_ACHIEVEMENT_IDS = GARDEN_ACHIEVEMENT_DEFINITIONS.map((achievement) => achievement.id);

export function gardenAchievements(garden: GardenState): GardenAchievement[] {
  const plantingCounts = MELON_VARIETIES.map((variety) => garden.plantCounts[variety.id] ?? 0);
  const totalPlantings = plantingCounts.reduce((sum, count) => sum + count, 0);
  const plantedVarieties = plantingCounts.filter((count) => count > 0).length;
  const lowestVarietyPlantings = Math.min(...plantingCounts);
  const rareVarietiesPlanted = (["yubari-ruby", "snow-leopard", "densuke"] as const)
    .filter((varietyId) => (garden.plantCounts[varietyId] ?? 0) > 0).length;

  const progress: Record<GardenAchievementId, { current: number; target: number }> = {
    firstRoots: { current: totalPlantings, target: 1 },
    allMelons: { current: plantedVarieties, target: MELON_VARIETIES.length },
    fiveSpells: { current: garden.totalSpellCasts, target: 5 },
    rareMelons: { current: rareVarietiesPlanted, target: 3 },
    harvests: { current: garden.totalHarvests, target: 100 },
    fields: { current: garden.unlockedPlots, target: MAX_GARDEN_PLOTS },
    hundredEach: { current: lowestVarietyPlantings, target: 100 },
    fiftySpells: { current: garden.totalSpellCasts, target: 50 },
    everySpell: { current: garden.spellIdsUsed.length, target: GARDEN_SPELL_IDS.length },
    fiveHundredEach: { current: lowestVarietyPlantings, target: 500 },
    thousandEach: { current: lowestVarietyPlantings, target: 1_000 },
  };

  return GARDEN_ACHIEVEMENT_DEFINITIONS.map((definition) => {
    const itemProgress = progress[definition.id];
    return {
      ...definition,
      ...itemProgress,
      earned: itemProgress.current >= itemProgress.target,
      eachMilestone: definition.id === "hundredEach" || definition.id === "fiveHundredEach" || definition.id === "thousandEach",
    };
  });
}
