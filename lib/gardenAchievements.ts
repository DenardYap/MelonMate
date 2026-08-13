import { GARDEN_SPELL_IDS, MAX_GARDEN_PLOTS, MELON_VARIETIES } from "./garden";
import type { BiText, GardenAchievementId, GardenState } from "./types";
import { FARM_BUILDINGS, FARM_COMPANIONS, SPELL_MASTERY_COSTS } from "./farmProgression";

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
  { id: "masterBuilder", name: { en: "Master of the Homestead", zh: "莊園建築大師" }, description: { en: "Raise every farm building to Tier 3.", zh: "將所有農場建築升到第三階。" }, icon: "soil", tone: "gold", reward: { xp: 1_500, dew: 750 } },
  { id: "fullLodge", name: { en: "A Very Full House", zh: "夥伴滿堂" }, description: { en: "Adopt every farm companion.", zh: "領養所有農場夥伴。" }, icon: "flower", tone: "silver", reward: { xp: 800, dew: 400 } },
  { id: "spellSage", name: { en: "Spellcraft Sage", zh: "咒語工藝賢者" }, description: { en: "Master every upgradeable spell at Tier 3.", zh: "將所有可升級咒語精通到第三階。" }, icon: "magic", tone: "arcane", reward: { xp: 1_000, dew: 500 } },
  { id: "steward90", name: { en: "Ninety Sun Steward", zh: "九十日農場守護者" }, description: { en: "Complete every daily farm order on 90 days.", zh: "在 90 天內完成每天所有農場訂單。" }, icon: "sun", tone: "gold", reward: { xp: 2_500, dew: 1_500 } },
  { id: "fiveHundredEach", name: { en: "Vine Whisperer", zh: "藤蔓低語者" }, description: { en: "Plant 500 of every melon variety.", zh: "每種瓜都種下 500 次。" }, icon: "flower", tone: "silver", reward: { xp: 1_500, dew: 750 } },
  { id: "thousandEach", name: { en: "Thousand-Sun Orchard", zh: "千陽瓜園" }, description: { en: "Plant 1,000 of every melon variety.", zh: "每種瓜都種下 1,000 次。" }, icon: "sun", tone: "gold", reward: { xp: 3_000, dew: 1_500 } },
  { id: "firstBuilding", name: { en: "Raise the Rafters", zh: "梁柱初立" }, description: { en: "Build your first farm landmark.", zh: "建造第一座農場地標。" }, icon: "soil", tone: "bronze", reward: { xp: 30, dew: 10 } },
  { id: "villageRising", name: { en: "A Village Awakens", zh: "村落甦醒" }, description: { en: "Build every farm landmark to at least Tier 1.", zh: "將每座農場地標至少建到第 1 階。" }, icon: "sun", tone: "silver", reward: { xp: 250, dew: 100 } },
  { id: "tierTwoTown", name: { en: "Copper-Roof Township", zh: "銅頂小鎮" }, description: { en: "Raise every farm landmark to Tier 2.", zh: "將每座農場地標升到第 2 階。" }, icon: "medal", tone: "gold", reward: { xp: 600, dew: 250 } },
  { id: "firstCompanion", name: { en: "A Friend by the Furrows", zh: "畦間新朋友" }, description: { en: "Adopt your first farm companion.", zh: "領養第一位農場夥伴。" }, icon: "flower", tone: "sprout", reward: { xp: 40, dew: 15 } },
  { id: "threeCompanions", name: { en: "Picnic Committee", zh: "野餐小隊" }, description: { en: "Adopt three different companions.", zh: "領養三位不同夥伴。" }, icon: "flower", tone: "silver", reward: { xp: 150, dew: 60 } },
  { id: "doubleTrouble", name: { en: "Two Paws on Patrol", zh: "雙伴巡田" }, description: { en: "Equip two active companions at once.", zh: "同時派出兩位活躍夥伴。" }, icon: "star", tone: "moon", reward: { xp: 180, dew: 75 } },
  { id: "firstOrder", name: { en: "Signed, Sealed, Sprouted", zh: "首張交貨單" }, description: { en: "Deliver your first farm order.", zh: "交付第一張農場訂單。" }, icon: "leaf", tone: "bronze", reward: { xp: 35, dew: 15 } },
  { id: "orderRegular", name: { en: "Market Morning Regular", zh: "市集熟客" }, description: { en: "Deliver 25 farm orders.", zh: "交付 25 張農場訂單。" }, icon: "medal", tone: "silver", reward: { xp: 300, dew: 125 } },
  { id: "orderLegend", name: { en: "The Hundredth Crate", zh: "百箱傳說" }, description: { en: "Deliver 100 farm orders.", zh: "交付 100 張農場訂單。" }, icon: "trophy", tone: "gold", reward: { xp: 1_000, dew: 500 } },
  { id: "weeklySupplier", name: { en: "Moonweek Supplier", zh: "月週供應商" }, description: { en: "Deliver 10 weekly premium orders.", zh: "交付 10 張每週高級訂單。" }, icon: "moon", tone: "moon", reward: { xp: 500, dew: 225 } },
  { id: "steward7", name: { en: "Seven Sunrise Steward", zh: "七日曙光守護者" }, description: { en: "Complete every daily order on 7 days.", zh: "在 7 天內完成每天所有訂單。" }, icon: "sun", tone: "bronze", reward: { xp: 100, dew: 50 } },
  { id: "steward30", name: { en: "Keeper of Thirty Dawns", zh: "三十晨曦守護者" }, description: { en: "Complete every daily order on 30 days.", zh: "在 30 天內完成每天所有訂單。" }, icon: "sun", tone: "gold", reward: { xp: 600, dew: 300 } },
  { id: "firstLayout", name: { en: "Furrow Blueprint", zh: "田畦藍圖" }, description: { en: "Save your first planting layout.", zh: "儲存第一組種植配置。" }, icon: "soil", tone: "sprout", reward: { xp: 40, dew: 15 } },
  { id: "layoutReused", name: { en: "Planting by Memory", zh: "依圖再種" }, description: { en: "Replant a saved layout for the first time.", zh: "首次依已儲存配置補種。" }, icon: "leaf", tone: "bronze", reward: { xp: 60, dew: 25 } },
  { id: "layoutArchitect", name: { en: "Architect of the Rows", zh: "田畦建築師" }, description: { en: "Replant saved layouts 25 times.", zh: "依已儲存配置補種 25 次。" }, icon: "soil", tone: "gold", reward: { xp: 400, dew: 175 } },
  { id: "firstHoneyed", name: { en: "The Bees Chose You", zh: "蜂群之選" }, description: { en: "Trigger your first Honeyed Harvest.", zh: "首次觸發蜜糖豐收。" }, icon: "flower", tone: "gold", reward: { xp: 75, dew: 30 } },
  { id: "honeyedTwenty", name: { en: "Apiary’s Golden Favorite", zh: "蜂房金寵" }, description: { en: "Trigger 20 Honeyed Harvests.", zh: "觸發 20 次蜜糖豐收。" }, icon: "spark", tone: "gold", reward: { xp: 500, dew: 250 } },
  { id: "harvestAllTen", name: { en: "One Sweep Wonder", zh: "一掃而收" }, description: { en: "Use Harvest All 10 times.", zh: "使用一鍵收成 10 次。" }, icon: "trophy", tone: "bronze", reward: { xp: 160, dew: 65 } },
  { id: "wellWorn", name: { en: "Wish at the Stone Well", zh: "石井心願" }, description: { en: "Use the Stone Well on 10 occasions.", zh: "使用石井 10 次。" }, icon: "flower", tone: "silver", reward: { xp: 180, dew: 75 } },
  { id: "firstMastery", name: { en: "A Better Incantation", zh: "精進咒文" }, description: { en: "Upgrade any spell’s mastery.", zh: "升級任一咒語精通。" }, icon: "magic", tone: "arcane", reward: { xp: 100, dew: 40 } },
  { id: "spellCollector", name: { en: "Seven Seeds of Magic", zh: "七枚魔法種子" }, description: { en: "Own at least one copy of every spell.", zh: "每種咒語都至少擁有一份。" }, icon: "star", tone: "arcane", reward: { xp: 350, dew: 150 } },
  { id: "twelveFields", name: { en: "Across the Second Meadow", zh: "越過第二片草地" }, description: { en: "Unlock 12 farm fields.", zh: "解鎖 12 塊農田。" }, icon: "soil", tone: "silver", reward: { xp: 200, dew: 80 } },
  { id: "harvestFiveHundred", name: { en: "Five Hundred Moon-Melons", zh: "五月百瓜" }, description: { en: "Harvest 500 melons in total.", zh: "累計收成 500 顆瓜。" }, icon: "fruit", tone: "gold", reward: { xp: 750, dew: 350 } },
  { id: "rerollRanger", name: { en: "Market Mood Reader", zh: "市集讀心人" }, description: { en: "Refresh daily farm orders 10 times.", zh: "刷新每日農場訂單 10 次。" }, icon: "spark", tone: "silver", reward: { xp: 175, dew: 70 } },
];

export const GARDEN_ACHIEVEMENT_IDS = GARDEN_ACHIEVEMENT_DEFINITIONS.map((achievement) => achievement.id);

export function gardenAchievements(garden: GardenState): GardenAchievement[] {
  const plantingCounts = MELON_VARIETIES.map((variety) => garden.plantCounts[variety.id] ?? 0);
  const totalPlantings = plantingCounts.reduce((sum, count) => sum + count, 0);
  const plantedVarieties = plantingCounts.filter((count) => count > 0).length;
  const lowestVarietyPlantings = Math.min(...plantingCounts);
  const rareVarietiesPlanted = (["yubari-ruby", "snow-leopard", "densuke"] as const)
    .filter((varietyId) => (garden.plantCounts[varietyId] ?? 0) > 0).length;
  const builtBuildings = FARM_BUILDINGS.filter((building) => (garden.buildingLevels[building.id] ?? 0) >= 1).length;
  const tierTwoBuildings = FARM_BUILDINGS.filter((building) => (garden.buildingLevels[building.id] ?? 0) >= 2).length;
  const masteredSpells = Object.keys(SPELL_MASTERY_COSTS).filter((spellId) => (garden.spellMastery[spellId as keyof typeof garden.spellMastery] ?? 1) >= 2).length;
  const ownedSpellTypes = GARDEN_SPELL_IDS.filter((spellId) => (garden.spellInventory[spellId] ?? 0) > 0).length;

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
    masterBuilder: { current: FARM_BUILDINGS.filter((building) => (garden.buildingLevels[building.id] ?? 0) >= 3).length, target: FARM_BUILDINGS.length },
    fullLodge: { current: garden.ownedCompanions.length, target: FARM_COMPANIONS.length },
    spellSage: { current: Object.keys(SPELL_MASTERY_COSTS).filter((spellId) => (garden.spellMastery[spellId as keyof typeof garden.spellMastery] ?? 1) >= 3).length, target: Object.keys(SPELL_MASTERY_COSTS).length },
    steward90: { current: garden.stewardshipDays.length, target: 90 },
    fiveHundredEach: { current: lowestVarietyPlantings, target: 500 },
    thousandEach: { current: lowestVarietyPlantings, target: 1_000 },
    firstBuilding: { current: builtBuildings, target: 1 },
    villageRising: { current: builtBuildings, target: FARM_BUILDINGS.length },
    tierTwoTown: { current: tierTwoBuildings, target: FARM_BUILDINGS.length },
    firstCompanion: { current: garden.ownedCompanions.length, target: 1 },
    threeCompanions: { current: garden.ownedCompanions.length, target: 3 },
    doubleTrouble: { current: garden.activeCompanions.length, target: 2 },
    firstOrder: { current: garden.totalOrdersClaimed, target: 1 },
    orderRegular: { current: garden.totalOrdersClaimed, target: 25 },
    orderLegend: { current: garden.totalOrdersClaimed, target: 100 },
    weeklySupplier: { current: garden.totalWeeklyOrdersClaimed, target: 10 },
    steward7: { current: garden.stewardshipDays.length, target: 7 },
    steward30: { current: garden.stewardshipDays.length, target: 30 },
    firstLayout: { current: garden.totalLayoutsSaved, target: 1 },
    layoutReused: { current: garden.totalLayoutsReplanted, target: 1 },
    layoutArchitect: { current: garden.totalLayoutsReplanted, target: 25 },
    firstHoneyed: { current: garden.totalHoneyedHarvests, target: 1 },
    honeyedTwenty: { current: garden.totalHoneyedHarvests, target: 20 },
    harvestAllTen: { current: garden.totalHarvestAllUses, target: 10 },
    wellWorn: { current: garden.totalWellUses, target: 10 },
    firstMastery: { current: masteredSpells, target: 1 },
    spellCollector: { current: ownedSpellTypes, target: GARDEN_SPELL_IDS.length },
    twelveFields: { current: garden.unlockedPlots, target: 12 },
    harvestFiveHundred: { current: garden.totalHarvests, target: 500 },
    rerollRanger: { current: garden.totalOrderRerolls, target: 10 },
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
