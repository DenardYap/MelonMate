import { weekDates } from "./dates";
import { GARDEN_SPELL_EFFECTS, MELON_VARIETIES } from "./garden";
import type {
  BiText,
  FarmBuildingId,
  FarmCompanionId,
  FarmOrder,
  FarmOrderKind,
  GardenSpellId,
  GardenState,
  MelonVarietyId,
} from "./types";

export interface BuildingTier {
  level: number;
  unlockLevel: number;
  dewCost: number;
  effect: BiText;
}

export interface FarmBuildingDefinition {
  id: FarmBuildingId;
  name: BiText;
  role: BiText;
  description: BiText;
  howToUse: BiText;
  tiers: readonly BuildingTier[];
  hotspot: { x: number; y: number; width: number; height: number };
  badge: { x: number; y: number };
}

export const FARM_BUILDINGS: readonly FarmBuildingDefinition[] = [
  {
    id: "farmhouse",
    name: { en: "Farmhouse", zh: "農舍" },
    role: { en: "Companion Lodge", zh: "夥伴小屋" },
    description: { en: "The Farmhouse lets you adopt and equip companions that provide permanent farm bonuses.", zh: "農舍讓你領養並裝備能提供永久農場加成的夥伴。" },
    howToUse: { en: "Build Tier 1, adopt an unlocked companion with Dew, then choose who should be active. Tier 3 lets you equip a second helper.", zh: "建造第一階後，用露珠領養已解鎖的夥伴並選擇使用中的角色。第三階可再裝備一位助手。" },
    hotspot: { x: 105, y: 40, width: 820, height: 430 },
    badge: { x: 475, y: 180 },
    tiers: [
      { level: 1, unlockLevel: 3, dewCost: 60, effect: { en: "Open the Companion Lodge.", zh: "開放夥伴小屋。" } },
      { level: 2, unlockLevel: 10, dewCost: 500, effect: { en: "Flat companion Dew rewards gain +1; timers and spell reach gain one extra step.", zh: "夥伴的固定露珠獎勵額外增加 1；加速與咒語範圍再提升一階。" } },
      { level: 3, unlockLevel: 20, dewCost: 2_000, effect: { en: "Equip a second companion at half strength, with flat rewards rounded up.", zh: "可裝備第二位夥伴，固定獎勵以一半效果向上取整。" } },
    ],
  },
  {
    id: "workshop",
    name: { en: "Workshop", zh: "工坊" },
    role: { en: "Spellcraft", zh: "咒語工藝" },
    description: { en: "The Workshop permanently strengthens your spells and increases how many crops they affect.", zh: "工坊會永久強化咒語並增加其影響的作物數量。" },
    howToUse: { en: "Build the Workshop, then spend Dew on each spell's Mastery. Tier 2 also lets you choose the exact crops a limited spell targets.", zh: "建造工坊後，可使用露珠提升各咒語的精通階級。第二階還能自行選擇有限目標咒語作用的作物。" },
    hotspot: { x: 760, y: 75, width: 330, height: 370 },
    badge: { x: 925, y: 175 },
    tiers: [
      { level: 1, unlockLevel: 5, dewCost: 120, effect: { en: "Unlock Tier II spell mastery.", zh: "開放二階咒語精通。" } },
      { level: 2, unlockLevel: 10, dewCost: 450, effect: { en: "Limited spells prioritize crops with the longest timers.", zh: "有限目標咒語會優先作用於剩餘時間最長的作物。" } },
      { level: 3, unlockLevel: 17, dewCost: 1_400, effect: { en: "Unlock Tier III spell mastery.", zh: "開放三階咒語精通。" } },
    ],
  },
  {
    id: "market",
    name: { en: "Market Board", zh: "市集看板" },
    role: { en: "Farm Orders", zh: "農場訂單" },
    description: { en: "The Market Board offers daily and weekly orders that reward extra Dew and 90-day progress.", zh: "市集看板提供每日與每週訂單，獎勵額外露珠與 90 天進度。" },
    howToUse: { en: "Build Tier 1, open Orders here, complete each request, then return to deliver it. Higher tiers add more orders, rerolls, and weekly rewards.", zh: "建造第一階後，從這裡開啟訂單，完成需求後回來交付。更高階會增加訂單、刷新機會與每週獎勵。" },
    hotspot: { x: 0, y: 420, width: 485, height: 510 },
    badge: { x: 245, y: 610 },
    tiers: [
      { level: 1, unlockLevel: 2, dewCost: 35, effect: { en: "Receive 2 daily farm orders.", zh: "每天獲得 2 張農場訂單。" } },
      { level: 2, unlockLevel: 7, dewCost: 180, effect: { en: "Receive a 3rd order and one free reroll.", zh: "增加第 3 張訂單與每日一次免費刷新。" } },
      { level: 3, unlockLevel: 14, dewCost: 650, effect: { en: "Add a premium weekly order and +10 Dew per order.", zh: "增加高級每週訂單，每張訂單額外獲得 10 露珠。" } },
    ],
  },
  {
    id: "well",
    name: { en: "Stone Well", zh: "石井" },
    role: { en: "Daily Watering", zh: "每日澆水" },
    description: { en: "The Well gives your growing crops one free burst of progress each day, reducing the time before they can be harvested.", zh: "石井每天可免費為生長中的作物加速一次，縮短等待收成的時間。" },
    howToUse: { en: "Plant at least one crop, open the Well, and tap Water Crops. Upgrade it to water more fields for a larger time boost.", zh: "先種下至少一株作物，開啟石井並點選「為作物澆水」。升級後可影響更多田地並提供更長加速。" },
    hotspot: { x: 1450, y: 145, width: 330, height: 350 },
    badge: { x: 1700, y: 350 },
    tiers: [
      { level: 1, unlockLevel: 3, dewCost: 50, effect: { en: "Once daily, water 3 crops for 10 minutes.", zh: "每天一次，讓 3 株作物加速 10 分鐘。" } },
      { level: 2, unlockLevel: 8, dewCost: 220, effect: { en: "Water 5 crops for 20 minutes.", zh: "讓 5 株作物加速 20 分鐘。" } },
      { level: 3, unlockLevel: 15, dewCost: 800, effect: { en: "Water every crop for 30 minutes.", zh: "讓所有作物加速 30 分鐘。" } },
    ],
  },
  {
    id: "apiary",
    name: { en: "Apiary", zh: "蜂房" },
    role: { en: "Harvest Value", zh: "收成增益" },
    description: { en: "The Apiary adds +1/+2/+3 Dew to every crop; at Tier 3, each harvested crop has a 5% chance to trigger Honeyed Harvest and double that crop’s final Dew payout.", zh: "蜂房讓每株作物額外獲得 1/2/3 露珠；達到第 3 階後，每株收成各有 5% 機率觸發蜜糖豐收，使該株最終露珠翻倍。" },
    howToUse: { en: "Once built, its bonus is automatic—just keep harvesting. Upgrade it to improve every future harvest.", zh: "建造後效果會自動生效，只要正常收成即可。升級能提高之後每次收成的收益。" },
    hotspot: { x: 1800, y: 0, width: 600, height: 385 },
    badge: { x: 2070, y: 155 },
    tiers: [
      { level: 1, unlockLevel: 4, dewCost: 80, effect: { en: "+1 Dew from every crop harvest.", zh: "每次作物收成額外獲得 1 露珠。" } },
      { level: 2, unlockLevel: 9, dewCost: 300, effect: { en: "+2 Dew from every crop harvest.", zh: "每次作物收成額外獲得 2 露珠。" } },
      { level: 3, unlockLevel: 16, dewCost: 1_000, effect: { en: "+3 Dew per crop; each crop has a 5% chance to trigger a clearly signaled 2× Dew Honeyed Harvest.", zh: "每株作物額外獲得 3 露珠；每株另有 5% 機率觸發有明顯提示的 2 倍露珠蜜糖豐收。" } },
    ],
  },
  {
    id: "greenhouse",
    name: { en: "Greenhouse", zh: "溫室" },
    role: { en: "Patient Growing", zh: "長時培育" },
    description: { en: "The Greenhouse specializes in valuable long-growing crops, making them mature faster and increasing their Dew rewards.", zh: "溫室專門培育高價值的長時作物，讓它們更快成熟，並提高露珠獎勵。" },
    howToUse: { en: "Its effects are automatic for crops with growth times of 4 hours or more. Plant longer crops to receive the full benefit.", zh: "效果會自動套用在生長時間 4 小時以上的作物。種植長時作物即可獲得完整加成。" },
    hotspot: { x: 2050, y: 245, width: 350, height: 440 },
    badge: { x: 2260, y: 530 },
    tiers: [
      { level: 1, unlockLevel: 8, dewCost: 300, effect: { en: "4h+ crops grow 10% faster.", zh: "生長 4 小時以上的作物加速 10%。" } },
      { level: 2, unlockLevel: 13, dewCost: 900, effect: { en: "4h+ crops also earn +3 Dew.", zh: "4 小時以上作物另獲 3 露珠。" } },
      { level: 3, unlockLevel: 20, dewCost: 2_500, effect: { en: "12h+ crops also earn +5 Dew.", zh: "12 小時以上作物另獲 5 露珠。" } },
    ],
  },
  {
    id: "barn",
    name: { en: "Harvest Barn", zh: "收成穀倉" },
    role: { en: "Farm Management", zh: "農務管理" },
    description: { en: "The Barn collects every ripe crop at once; Tier 2 saves and replants one reusable layout, while Tier 3 expands this to three layouts.", zh: "穀倉能一次收成所有成熟作物；第 2 階可儲存並補種一組配置，第 3 階則擴充為三組。" },
    howToUse: { en: "Use Harvest All at Tier 1. From Tier 2, save a layout and reuse it on empty plots for the displayed seed cost.", zh: "第一階可使用一鍵收成；第 2 階起可儲存配置，並依顯示的種子費用在空田補種。" },
    hotspot: { x: 1990, y: 1000, width: 410, height: 600 },
    badge: { x: 2050, y: 1120 },
    tiers: [
      { level: 1, unlockLevel: 6, dewCost: 160, effect: { en: "Unlock Harvest All.", zh: "開放一鍵收成。" } },
      { level: 2, unlockLevel: 11, dewCost: 550, effect: { en: "Save and replant one reusable layout.", zh: "儲存並補種一組可重複使用的配置。" } },
      { level: 3, unlockLevel: 18, dewCost: 1_700, effect: { en: "Expand from 1 reusable layout to 3.", zh: "將可重複使用的配置由 1 組擴充至 3 組。" } },
    ],
  },
] as const;

export interface FarmCompanionDefinition {
  id: FarmCompanionId;
  name: BiText;
  src: string;
  unlockLevel: number;
  dewCost: number;
  effect: BiText;
}

export const FARM_COMPANIONS: readonly FarmCompanionDefinition[] = [
  { id: "chamoe-bee", name: { en: "Chamoe Bee", zh: "香瓜蜜蜂" }, src: "/garden/progression/companion-chamoe-bee.png", unlockLevel: 3, dewCost: 60, effect: { en: "+1 Dew from crops taking 2 hours or less.", zh: "2 小時內作物每次收成額外獲得 1 露珠。" } },
  { id: "honeydew-frog", name: { en: "Honeydew Frog", zh: "蜜瓜青蛙" }, src: "/garden/progression/companion-honeydew-frog.png", unlockLevel: 5, dewCost: 140, effect: { en: "Limited-target spells affect 1 additional crop.", zh: "有限目標咒語多影響 1 株作物。" } },
  { id: "melon-roll-snail", name: { en: "Melon Roll Snail", zh: "甜瓜捲蝸牛" }, src: "/garden/progression/companion-melon-roll-snail.png", unlockLevel: 7, dewCost: 260, effect: { en: "Crops taking 4+ hours grow 10% faster.", zh: "4 小時以上作物加速 10%。" } },
  { id: "golden-capybara", name: { en: "Golden Capy", zh: "金瓜水豚" }, src: "/garden/progression/companion-golden-capybara.png", unlockLevel: 10, dewCost: 600, effect: { en: "+20 Dew from every farm order.", zh: "每張農場訂單額外獲得 20 露珠。" } },
  { id: "moon-bunny", name: { en: "Moon Bunny", zh: "月瓜兔" }, src: "/garden/progression/companion-moon-bunny.png", unlockLevel: 13, dewCost: 1_100, effect: { en: "First goal spell claimed each day grants a bonus copy.", zh: "每天第一次領取目標咒語時多得一份。" } },
  { id: "densuke-penguin", name: { en: "Densuke Pingu", zh: "黑皮企鵝" }, src: "/garden/progression/companion-densuke-penguin.png", unlockLevel: 16, dewCost: 1_800, effect: { en: "+3 Dew from every crop harvest.", zh: "每次作物收成額外獲得 3 露珠。" } },
  { id: "cantaloupe-cat", name: { en: "Canta Cat", zh: "哈密貓" }, src: "/garden/progression/companion-cantaloupe-cat.png", unlockLevel: 18, dewCost: 2_400, effect: { en: "Dew Fortune: earn 2× Dew from every crop harvest.", zh: "露珠福運：所有作物收成獲得 2 倍露珠。" } },
] as const;

export const STEWARDSHIP_MILESTONES = [
  { days: 7, dew: 100, xp: 0 },
  { days: 14, dew: 200, xp: 0 },
  { days: 30, dew: 500, xp: 0 },
  { days: 60, dew: 1_000, xp: 0 },
  { days: 90, dew: 2_500, xp: 0 },
] as const;

export const SPELL_MASTERY_COSTS: Record<Exclude<GardenSpellId, "everripe-eclipse">, readonly [number, number]> = {
  "pantry-spark": [100, 400],
  trailwind: [120, 450],
  "hearth-flame": [160, 550],
  "balance-bloom": [200, 650],
  ironroot: [260, 850],
  "starlight-season": [400, 1_200],
};

const SPELL_MASTERY_EFFECTS: Record<Exclude<GardenSpellId, "everripe-eclipse">, readonly [
  { boostMinutes: number; targetCount: number | "all" },
  { boostMinutes: number; targetCount: number | "all" },
  { boostMinutes: number; targetCount: number | "all" },
]> = {
  "pantry-spark": [GARDEN_SPELL_EFFECTS["pantry-spark"], { boostMinutes: 15, targetCount: 4 }, { boostMinutes: 20, targetCount: 5 }],
  trailwind: [GARDEN_SPELL_EFFECTS.trailwind, { boostMinutes: 35, targetCount: 4 }, { boostMinutes: 50, targetCount: 5 }],
  "hearth-flame": [GARDEN_SPELL_EFFECTS["hearth-flame"], { boostMinutes: 60, targetCount: 5 }, { boostMinutes: 90, targetCount: 6 }],
  "balance-bloom": [GARDEN_SPELL_EFFECTS["balance-bloom"], { boostMinutes: 120, targetCount: 6 }, { boostMinutes: 180, targetCount: 8 }],
  ironroot: [GARDEN_SPELL_EFFECTS.ironroot, { boostMinutes: 180, targetCount: 8 }, { boostMinutes: 240, targetCount: "all" }],
  "starlight-season": [GARDEN_SPELL_EFFECTS["starlight-season"], { boostMinutes: 360, targetCount: "all" }, { boostMinutes: 480, targetCount: "all" }],
};

export function buildingById(id: FarmBuildingId) {
  return FARM_BUILDINGS.find((building) => building.id === id)!;
}

export function buildingLevel(garden: GardenState, id: FarmBuildingId): number {
  return Math.max(0, Math.min(3, garden.buildingLevels[id] ?? 0));
}

export function companionPower(garden: GardenState, id: FarmCompanionId): number {
  const index = garden.activeCompanions.indexOf(id);
  if (index < 0) return 0;
  const slotPower = index === 0 ? 1 : 0.5;
  return slotPower * (buildingLevel(garden, "farmhouse") >= 2 ? 1.25 : 1);
}

function companionFlatBonus(garden: GardenState, id: FarmCompanionId, base: number): number {
  const slot = garden.activeCompanions.indexOf(id);
  if (slot < 0) return 0;
  const slotBonus = slot === 0 ? base : Math.ceil(base / 2);
  const farmhouseBonus = buildingLevel(garden, "farmhouse") >= 2 ? 1 : 0;
  return slotBonus + farmhouseBonus;
}

export function cropGrowMultiplier(garden: GardenState, growMinutes: number): number {
  if (growMinutes < 240) return 1;
  const greenhouse = buildingLevel(garden, "greenhouse") >= 1 ? 0.1 : 0;
  const snail = companionPower(garden, "melon-roll-snail") * 0.1;
  return Math.max(0.7, 1 - greenhouse - snail);
}

export function seedCostFor(_garden: GardenState, baseCost: number): number {
  return Math.max(1, baseCost);
}

export function harvestRewards(garden: GardenState, varietyId: MelonVarietyId, honeyed = false) {
  const variety = MELON_VARIETIES.find((crop) => crop.id === varietyId)!;
  const apiary = [0, 1, 2, 3][buildingLevel(garden, "apiary")];
  const greenhouse = buildingLevel(garden, "greenhouse") >= 2 && variety.growMinutes >= 240 ? 3 : 0;
  const bee = variety.growMinutes <= 120 ? companionFlatBonus(garden, "chamoe-bee", 1) : 0;
  const greenhouseDew = buildingLevel(garden, "greenhouse") >= 3 && variety.growMinutes >= 720 ? 5 : 0;
  const penguinDew = companionFlatBonus(garden, "densuke-penguin", 3);
  const cantaSlot = garden.activeCompanions.indexOf("cantaloupe-cat");
  const canta = cantaSlot === 0 ? 1 : cantaSlot === 1 ? 0.5 : 0;
  const normalDew = Math.max(1, Math.round(
    (variety.harvestReward + apiary + greenhouse + greenhouseDew + bee + penguinDew) * (1 + canta)
  ));
  const dew = honeyed ? normalDew * 2 : normalDew;
  return { dew, xp: 0 };
}

export function effectiveSpell(garden: GardenState, spellId: GardenSpellId) {
  const base = GARDEN_SPELL_EFFECTS[spellId];
  if (spellId === "everripe-eclipse") return base;
  const mastery = Math.max(1, Math.min(3, garden.spellMastery[spellId] ?? 1));
  const effect = SPELL_MASTERY_EFFECTS[spellId][mastery - 1];
  const frogBonus = companionPower(garden, "honeydew-frog") > 0 && effect.targetCount !== "all"
    ? companionFlatBonus(garden, "honeydew-frog", 1)
    : 0;
  return { ...base, ...effect, targetCount: effect.targetCount === "all" ? "all" as const : effect.targetCount + frogBonus };
}

export function weekKey(date: string): string {
  return weekDates(date)[0];
}

function hash(value: string): number {
  let out = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    out ^= value.charCodeAt(index);
    out = Math.imul(out, 16777619);
  }
  return out >>> 0;
}

function pick<T>(items: readonly T[], seed: number): T {
  return items[seed % items.length];
}

function makeOrder(period: "daily" | "weekly", periodKey: string, slot: number, playerLevel: number, reroll = 0): FarmOrder {
  const seed = hash(`${period}:${periodKey}:${slot}:${reroll}`);
  const available = MELON_VARIETIES.filter((crop) => crop.unlockLevel <= playerLevel);
  const kinds: FarmOrderKind[] = period === "weekly"
    ? ["harvest-any", "harvest-long", "harvest-variety-mix"]
    : ["harvest-any", "harvest-variety", "harvest-long", "cast-spell", "harvest-variety-mix"];
  let kind = pick(kinds, seed);
  if (available.length < 2 && kind === "harvest-variety-mix") kind = "harvest-any";
  if (!available.some((crop) => crop.growMinutes >= 240) && kind === "harvest-long") kind = "harvest-any";
  const scale = period === "weekly" ? 4 : 1;
  const targetByKind: Record<FarmOrderKind, number> = {
    "harvest-any": 4 * scale + seed % (3 * scale),
    "harvest-variety": 2 * scale + seed % (2 * scale),
    "harvest-long": 2 * scale,
    "harvest-variety-mix": Math.min(available.length, period === "weekly" ? 5 : 3),
    "cast-spell": 1 + seed % 2,
  };
  const target = Math.max(1, targetByKind[kind]);
  const variety = kind === "harvest-variety" ? pick(available, seed >>> 4).id : undefined;
  const baseDew = period === "weekly" ? 180 : 28;
  return {
    id: `${period}-${periodKey}-${slot}-${reroll}`,
    period,
    periodKey,
    kind,
    target,
    progress: 0,
    dewReward: baseDew + target * (period === "weekly" ? 8 : 3),
    xpReward: 0,
    variety,
    varieties: [],
    claimed: false,
  };
}

export function currentFarmOrders(garden: GardenState, date: string, playerLevel: number): FarmOrder[] {
  const market = buildingLevel(garden, "market");
  if (!market) return [];
  const dailyCount = market >= 2 ? 3 : 2;
  const dailyReroll = garden.orderRerolls[date] ?? 0;
  const existing = garden.farmOrders.filter((order) =>
    (order.period === "daily" && order.periodKey === date)
    || (market >= 3 && order.period === "weekly" && order.periodKey === weekKey(date))
  );
  const daily = Array.from({ length: dailyCount }, (_, slot) =>
    existing.find((order) => order.period === "daily" && order.id.startsWith(`daily-${date}-${slot}-`))
      ?? makeOrder("daily", date, slot, playerLevel, dailyReroll)
  );
  const weekly = market >= 3
    ? [existing.find((order) => order.period === "weekly") ?? makeOrder("weekly", weekKey(date), 0, playerLevel)]
    : [];
  return [...daily, ...weekly];
}

export function orderProgressAfterHarvest(order: FarmOrder, varietyId: MelonVarietyId): FarmOrder {
  if (order.claimed || order.progress >= order.target) return order;
  const variety = MELON_VARIETIES.find((crop) => crop.id === varietyId)!;
  if (order.kind === "cast-spell") return order;
  if (order.kind === "harvest-variety" && order.variety !== varietyId) return order;
  if (order.kind === "harvest-long" && variety.growMinutes < 240) return order;
  if (order.kind === "harvest-variety-mix") {
    const varieties = order.varieties?.includes(varietyId) ? order.varieties : [...(order.varieties ?? []), varietyId];
    return { ...order, varieties, progress: Math.min(order.target, varieties.length) };
  }
  return { ...order, progress: Math.min(order.target, order.progress + 1) };
}

export function orderProgressAfterSpell(order: FarmOrder): FarmOrder {
  if (order.kind !== "cast-spell" || order.claimed || order.progress >= order.target) return order;
  return { ...order, progress: Math.min(order.target, order.progress + 1) };
}

export function farmOrderRewards(garden: GardenState, order: Pick<FarmOrder, "dewReward" | "xpReward">) {
  const marketBonus = buildingLevel(garden, "market") >= 3 ? 10 : 0;
  const capyBonus = companionFlatBonus(garden, "golden-capybara", 20);
  return {
    dew: order.dewReward + marketBonus + capyBonus,
    xp: 0,
  };
}
