import type { BiText, GardenPlot, GardenSpellId, GardenState, MelonVarietyId } from "./types";

export interface MelonVariety {
  id: MelonVarietyId;
  name: BiText;
  note: BiText;
  seedImage: string;
  plantImage: string;
  image: string;
  seedCost: number;
  growMinutes: number;
  growthNeeded: number;
  harvestReward: number;
  harvestXp: number;
  unlockLevel: number;
  rarity?: "rare" | "legendary";
  accent: string;
}

export const MELON_VARIETIES: MelonVariety[] = [
  {
    id: "honeydew",
    name: { en: "Honeydew", zh: "蜜瓜" },
    note: { en: "Easygoing & quick", zh: "好種又快熟" },
    seedImage: "/garden/honeydew-seed.png",
    plantImage: "/garden/honeydew-plant.png",
    image: "/garden/honeydew.png",
    seedCost: 4,
    growMinutes: 10,
    growthNeeded: 3,
    harvestReward: 8,
    harvestXp: 0,
    unlockLevel: 1,
    accent: "#a8c971",
  },
  {
    id: "cantaloupe",
    name: { en: "Cantaloupe", zh: "香瓜" },
    note: { en: "Sweet little earner", zh: "甜甜的小收益" },
    seedImage: "/garden/cantaloupe-seed.png",
    plantImage: "/garden/cantaloupe-plant.png",
    image: "/garden/cantaloupe.png",
    seedCost: 6,
    growMinutes: 30,
    growthNeeded: 4,
    harvestReward: 13,
    harvestXp: 0,
    unlockLevel: 2,
    accent: "#d79b56",
  },
  {
    id: "watermelon",
    name: { en: "Watermelon", zh: "西瓜" },
    note: { en: "Big fruit, big payoff", zh: "大顆大收穫" },
    seedImage: "/garden/watermelon-seed.png",
    plantImage: "/garden/watermelon-plant.png",
    image: "/garden/watermelon.png",
    seedCost: 8,
    growMinutes: 120,
    growthNeeded: 5,
    harvestReward: 18,
    harvestXp: 0,
    unlockLevel: 3,
    accent: "#4f9856",
  },
  {
    id: "hami",
    name: { en: "Hami", zh: "哈密瓜" },
    note: { en: "Slow-grown favorite", zh: "慢熟的人氣瓜" },
    seedImage: "/garden/hami-seed.png",
    plantImage: "/garden/hami-plant.png",
    image: "/garden/hami.png",
    seedCost: 10,
    growMinutes: 240,
    growthNeeded: 6,
    harvestReward: 24,
    harvestXp: 0,
    unlockLevel: 4,
    accent: "#e5ad46",
  },
  {
    id: "chamoe",
    name: { en: "Chamoe", zh: "韓國香瓜" },
    note: { en: "Sunny collector crop", zh: "陽光收藏品" },
    seedImage: "/garden/chamoe-seed.png",
    plantImage: "/garden/chamoe-plant.png",
    image: "/garden/chamoe.png",
    seedCost: 12,
    growMinutes: 480,
    growthNeeded: 7,
    harvestReward: 31,
    harvestXp: 0,
    unlockLevel: 5,
    accent: "#f0be32",
  },
  {
    id: "moon-gold",
    name: { en: "Moon Gold", zh: "月金瓜" },
    note: { en: "A moonlit level reward", zh: "月光下的等級獎勵" },
    seedImage: "/garden/moon-gold-seed.png",
    plantImage: "/garden/moon-gold-plant.png",
    image: "/garden/moon-gold.png",
    seedCost: 16,
    growMinutes: 720,
    growthNeeded: 8,
    harvestReward: 45,
    harvestXp: 0,
    unlockLevel: 6,
    rarity: "rare",
    accent: "#d8a72c",
  },
  {
    id: "yubari-ruby",
    name: { en: "Yubari Ruby", zh: "夕張紅寶" },
    note: { en: "Perfectly netted prize", zh: "網紋完美的珍品" },
    seedImage: "/garden/yubari-ruby-seed.png",
    plantImage: "/garden/yubari-ruby-plant.png",
    image: "/garden/yubari-ruby.png",
    seedCost: 22,
    growMinutes: 1080,
    growthNeeded: 10,
    harvestReward: 62,
    harvestXp: 0,
    unlockLevel: 7,
    rarity: "rare",
    accent: "#c9783c",
  },
  {
    id: "snow-leopard",
    name: { en: "Snow Leopard", zh: "雪豹瓜" },
    note: { en: "Ivory collector's gem", zh: "象牙色的收藏珍寶" },
    seedImage: "/garden/snow-leopard-seed.png",
    plantImage: "/garden/snow-leopard-plant.png",
    image: "/garden/snow-leopard.png",
    seedCost: 30,
    growMinutes: 1440,
    growthNeeded: 12,
    harvestReward: 86,
    harvestXp: 0,
    unlockLevel: 9,
    rarity: "rare",
    accent: "#8da994",
  },
  {
    id: "densuke",
    name: { en: "Densuke", zh: "田助西瓜" },
    note: { en: "The midnight legend", zh: "午夜色的傳說" },
    seedImage: "/garden/densuke-seed.png",
    plantImage: "/garden/densuke-plant.png",
    image: "/garden/densuke.png",
    seedCost: 42,
    growMinutes: 2160,
    growthNeeded: 14,
    harvestReward: 125,
    harvestXp: 0,
    unlockLevel: 12,
    rarity: "legendary",
    accent: "#293b32",
  },
];

export const GARDEN_PLOT_COUNT = 6;
export const MAX_GARDEN_PLOTS = 22;
export const GARDEN_EXPANSION_COSTS = [
  35, 55, 80, 110,
  160, 200, 250, 310, 380, 460,
  550, 650, 760, 880, 1020, 1180,
] as const;

export function gardenExpansionCost(unlockedPlots: number): number | null {
  if (unlockedPlots >= MAX_GARDEN_PLOTS) return null;
  return GARDEN_EXPANSION_COSTS[Math.max(0, unlockedPlots - GARDEN_PLOT_COUNT)] ?? null;
}

export function freshGarden(): GardenState {
  return {
    dew: 18,
    gardenXp: 0,
    unlockedPlots: GARDEN_PLOT_COUNT,
    plots: Array.from({ length: GARDEN_PLOT_COUNT }, (_, id) => ({
      id,
      variety: null,
      growth: 0,
    })),
    harvests: {},
    totalHarvests: 0,
    plantCounts: {},
    totalSpellCasts: 0,
    spellIdsUsed: [],
    achievementClaims: [],
    achievementRewardClaims: [],
    dailyClaims: {},
    spellClaims: {},
    spellInventory: {},
    levelSpellRewards: {},
    buildingLevels: {},
    ownedCompanions: [],
    activeCompanions: [],
    moonBunnyBonusClaims: [],
    spellMastery: {},
    farmOrders: [],
    orderRerolls: {},
    stewardshipDays: [],
    savedPlantingLayouts: [],
    totalHoneyedHarvests: 0,
    totalOrdersClaimed: 0,
    totalWeeklyOrdersClaimed: 0,
    totalOrderRerolls: 0,
    totalLayoutsSaved: 0,
    totalLayoutsReplanted: 0,
    totalHarvestAllUses: 0,
    totalWellUses: 0,
  };
}

export function varietyById(id: MelonVarietyId) {
  return MELON_VARIETIES.find((variety) => variety.id === id)!;
}

export function isVarietyUnlocked(
  variety: MelonVariety,
  level: number,
  _goldenMelons?: number
): boolean {
  return level >= variety.unlockLevel;
}

export const GARDEN_DAILY_BONUS = { dew: 10, xp: 0 } as const;
export const LEVEL_UP_FREE_SPELL_CASTS = 3;
export const GARDEN_SPELL_IDS: GardenSpellId[] = [
  "pantry-spark",
  "trailwind",
  "hearth-flame",
  "balance-bloom",
  "ironroot",
  "starlight-season",
  "everripe-eclipse",
];
export const GARDEN_LEVEL_REWARD_SPELL_IDS = GARDEN_SPELL_IDS.filter(
  (spell): spell is Exclude<GardenSpellId, "everripe-eclipse"> => spell !== "everripe-eclipse"
);
export interface GardenSpellEffect {
  dewCost: number;
  boostMinutes: number;
  targetCount: number | "all";
  instantFinish?: boolean;
}
export const GARDEN_SPELL_EFFECTS = {
  "pantry-spark": { dewCost: 13, boostMinutes: 10, targetCount: 3, instantFinish: false },
  trailwind: { dewCost: 13, boostMinutes: 25, targetCount: 3, instantFinish: false },
  "hearth-flame": { dewCost: 29, boostMinutes: 45, targetCount: 4, instantFinish: false },
  "balance-bloom": { dewCost: 38, boostMinutes: 90, targetCount: 5, instantFinish: false },
  ironroot: { dewCost: 68, boostMinutes: 120, targetCount: 6, instantFinish: false },
  "starlight-season": { dewCost: 125, boostMinutes: 240, targetCount: 8, instantFinish: false },
  "everripe-eclipse": { dewCost: 10_000, boostMinutes: 0, targetCount: "all", instantFinish: true },
} as const satisfies Record<GardenSpellId, GardenSpellEffect>;

export function cropProgress(plot: GardenPlot, now = Date.now()): number {
  if (!plot.variety) return 0;
  if (plot.plantedAt != null && plot.readyAt != null) {
    if (plot.readyAt <= plot.plantedAt) return now >= plot.readyAt ? 1 : 0;
    return Math.max(0, Math.min(1, (now - plot.plantedAt) / (plot.readyAt - plot.plantedAt)));
  }
  const variety = varietyById(plot.variety);
  return Math.max(0, Math.min(1, plot.growth / variety.growthNeeded));
}

export type CropVisualStage = "seed" | "plant" | "melon";

export function cropVisualStage(plot: GardenPlot, now = Date.now()): CropVisualStage {
  const progress = cropProgress(plot, now);
  if (progress < 0.25) return "seed";
  if (progress < 0.72) return "plant";
  return "melon";
}

export function cropStageImage(variety: MelonVariety, stage: CropVisualStage): string {
  if (stage === "seed") return variety.seedImage;
  if (stage === "plant") return variety.plantImage;
  return variety.image;
}

export function isPlotReady(plot: GardenPlot, now = Date.now()): boolean {
  return Boolean(plot.variety) && cropProgress(plot, now) >= 1;
}

export function cropRemainingMs(plot: GardenPlot, now = Date.now()): number {
  if (!plot.variety) return 0;
  if (plot.readyAt != null) return Math.max(0, plot.readyAt - now);
  const variety = varietyById(plot.variety);
  return Math.max(0, 1 - cropProgress(plot, now)) * variety.growMinutes * 60_000;
}

export function boostCropTimer(plot: GardenPlot, boostMinutes: number, now = Date.now()): GardenPlot {
  if (!plot.variety || isPlotReady(plot, now) || boostMinutes <= 0) return plot;
  const readyAt = plot.readyAt ?? now + cropRemainingMs(plot, now);
  return { ...plot, readyAt: Math.max(now, readyAt - boostMinutes * 60_000) };
}
