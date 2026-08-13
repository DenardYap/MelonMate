"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FarmBuildingId, FarmCompanionId, GardenAchievementId, GardenQuestId, GardenSpellId, GardenState, MelonVarietyId } from "./types";
import {
  GARDEN_DAILY_BONUS,
  GARDEN_LEVEL_REWARD_SPELL_IDS,
  GARDEN_PLOT_COUNT,
  GARDEN_SPELL_IDS,
  LEVEL_UP_FREE_SPELL_CASTS,
  MAX_GARDEN_PLOTS,
  boostCropTimer,
  freshGarden,
  gardenExpansionCost,
  isPlotReady,
  isVarietyUnlocked,
  varietyById,
} from "./garden";
import { GARDEN_ACHIEVEMENT_IDS, gardenAchievements } from "./gardenAchievements";
import { todayStr } from "./dates";
import {
  FARM_COMPANIONS,
  SPELL_MASTERY_COSTS,
  STEWARDSHIP_MILESTONES,
  buildingById,
  buildingLevel,
  companionPower,
  cropGrowMultiplier,
  currentFarmOrders,
  effectiveSpell,
  farmOrderRewards,
  harvestRewards,
  orderProgressAfterHarvest,
  orderProgressAfterSpell,
  seedCostFor,
} from "./farmProgression";

type PlantResult = "planted" | "occupied" | "locked" | "funds";
export interface HarvestSuccess {
  status: "harvested";
  dew: number;
  xp: number;
  honeyed: boolean;
  honeyedBonusDew: number;
}

type HarvestResult = HarvestSuccess | "empty" | "growing";
export interface HarvestAllResult {
  count: number;
  dew: number;
  xp: number;
  honeyedCount: number;
  honeyedDew: number;
  honeyedBonusDew: number;
}
type ClaimResult = "claimed" | "already";
type ExpandResult = "expanded" | "maxed" | "funds";
export type BuySpellResult = "bought" | "funds";
export type ClaimGoalSpellResult = "claimed" | "already" | "incomplete";
export type CastSpellResult = "cast" | "empty" | "none";
export type FarmPurchaseResult = "bought" | "funds" | "locked" | "maxed" | "prerequisite" | "owned";
export type FarmActionResult = "done" | "locked" | "empty" | "used" | "funds" | "missing";

export interface GardenQuestReward {
  id: GardenQuestId;
  date: string;
  dew: number;
  xp: number;
  boostMinutes: number;
  totalQuests: number;
}

export interface GardenSpellCast {
  id: GardenSpellId;
  boostMinutes: number;
  targetCount: number | "all";
  instantFinish?: boolean;
  targetPlotIds?: number[];
}

interface GardenStore {
  gardens: Record<string, GardenState>;
  plant: (
    profileId: string,
    plotId: number,
    varietyId: MelonVarietyId,
    level: number,
    goldenMelons: number,
    now?: number
  ) => PlantResult;
  claimQuest: (profileId: string, reward: GardenQuestReward, now?: number) => ClaimResult;
  awardLevelSpells: (profileId: string, levels: number[]) => GardenSpellId[];
  acknowledgeAchievements: (profileId: string, achievementIds: GardenAchievementId[]) => void;
  buySpell: (profileId: string, spellId: GardenSpellId, dewCost: number) => BuySpellResult;
  claimGoalSpell: (profileId: string, spellId: GardenSpellId, claimKey: string, goalComplete: boolean, claimDate?: string) => ClaimGoalSpellResult;
  castSpell: (profileId: string, spell: GardenSpellCast, now?: number) => CastSpellResult;
  harvest: (profileId: string, plotId: number, now?: number) => HarvestResult;
  expandFarm: (profileId: string) => ExpandResult;
  upgradeBuilding: (profileId: string, buildingId: FarmBuildingId, playerLevel: number) => FarmPurchaseResult;
  adoptCompanion: (profileId: string, companionId: FarmCompanionId, playerLevel: number) => FarmPurchaseResult;
  setActiveCompanion: (profileId: string, companionId: FarmCompanionId, slot?: 0 | 1) => FarmActionResult;
  upgradeSpellMastery: (profileId: string, spellId: GardenSpellId) => FarmPurchaseResult;
  ensureFarmOrders: (profileId: string, date: string, playerLevel: number) => void;
  rerollFarmOrders: (profileId: string, date: string, playerLevel: number) => FarmActionResult;
  claimFarmOrder: (profileId: string, orderId: string) => FarmActionResult;
  useWell: (profileId: string, date: string, now?: number) => FarmActionResult;
  harvestAll: (profileId: string, now?: number) => HarvestAllResult;
  savePlantingLayout: (profileId: string, slot?: number) => FarmActionResult;
  replantLayout: (profileId: string, slot: number, playerLevel: number, goldenMelons: number, now?: number) => FarmActionResult;
}

function gardenFor(garden?: GardenState): GardenState {
  if (!garden) return freshGarden();
  const fallback = freshGarden();
  const rawLevelRewards = garden.levelSpellRewards as unknown;
  const levelSpellRewards = rawLevelRewards && !Array.isArray(rawLevelRewards)
    ? Object.fromEntries(
        Object.entries(rawLevelRewards as Record<string, GardenSpellId[]>).map(([level, spells]) => [
          level,
          Array.isArray(spells) ? spells.filter((spell): spell is GardenSpellId => GARDEN_SPELL_IDS.includes(spell)) : [],
        ])
      )
    : {};
  const spellInventory = { ...(garden.spellInventory ?? {}) };
  const legacyBonusCasts = Math.max(0, garden.bonusSpellCasts ?? 0);
  if (legacyBonusCasts > 0) {
    spellInventory["pantry-spark"] = (spellInventory["pantry-spark"] ?? 0) + legacyBonusCasts;
  }
  const unlockedPlots = Math.max(
    GARDEN_PLOT_COUNT,
    Math.min(MAX_GARDEN_PLOTS, garden.unlockedPlots ?? garden.plots?.length ?? GARDEN_PLOT_COUNT)
  );
  const emptyPlots = Array.from({ length: unlockedPlots }, (_, id) => ({ id, variety: null, growth: 0 } as const));
  return {
    ...fallback,
    ...garden,
    unlockedPlots,
    plots: emptyPlots.map((plot) => {
      const saved = garden.plots?.[plot.id];
      if (!saved?.variety) return saved ?? plot;
      if (saved.plantedAt != null && saved.readyAt != null) return saved;

      const variety = varietyById(saved.variety);
      const plantedAt = saved.plantedAt
        ?? (saved.plantedOn ? new Date(`${saved.plantedOn}T00:00:00`).getTime() : Date.now());
      return {
        ...saved,
        plantedAt,
        readyAt: plantedAt + variety.growMinutes * 60_000,
      };
    }),
    harvests: { ...garden.harvests },
    plantCounts: { ...(garden.plantCounts ?? garden.harvests ?? {}) },
    totalSpellCasts: Math.max(0, garden.totalSpellCasts ?? 0),
    spellIdsUsed: (garden.spellIdsUsed ?? []).filter(
      (spell, index, spells): spell is GardenSpellId => GARDEN_SPELL_IDS.includes(spell) && spells.indexOf(spell) === index
    ),
    achievementClaims: (garden.achievementClaims ?? []).filter(
      (achievement, index, achievements): achievement is GardenAchievementId =>
        GARDEN_ACHIEVEMENT_IDS.includes(achievement) && achievements.indexOf(achievement) === index
    ),
    achievementRewardClaims: (garden.achievementRewardClaims ?? []).filter(
      (achievement, index, achievements): achievement is GardenAchievementId =>
        GARDEN_ACHIEVEMENT_IDS.includes(achievement) && achievements.indexOf(achievement) === index
    ),
    dailyClaims: { ...(garden.dailyClaims ?? {}) },
    spellClaims: { ...(garden.spellClaims ?? {}) },
    spellInventory,
    levelSpellRewards,
    buildingLevels: { ...(garden.buildingLevels ?? {}) },
    ownedCompanions: [...new Set((garden.ownedCompanions ?? []).filter((id) => FARM_COMPANIONS.some((item) => item.id === id)))],
    activeCompanions: (garden.activeCompanions ?? []).filter(
      (id, index, companions) => (garden.ownedCompanions ?? []).includes(id) && companions.indexOf(id) === index
    ).slice(0, (garden.buildingLevels?.farmhouse ?? 0) >= 3 ? 2 : 1),
    moonBunnyBonusClaims: [...new Set(garden.moonBunnyBonusClaims ?? [])],
    spellMastery: { ...(garden.spellMastery ?? {}) },
    farmOrders: [...(garden.farmOrders ?? [])],
    orderRerolls: { ...(garden.orderRerolls ?? {}) },
    stewardshipDays: [...new Set(garden.stewardshipDays ?? [])].sort(),
    savedPlantingLayouts: [...(garden.savedPlantingLayouts ?? [])].slice(0, 3),
    totalHoneyedHarvests: Math.max(0, garden.totalHoneyedHarvests ?? 0),
    totalOrdersClaimed: Math.max(
      0,
      garden.totalOrdersClaimed
        ?? Math.max(
          (garden.stewardshipDays?.length ?? 0) * 2,
          garden.farmOrders?.filter((order) => order.claimed).length ?? 0
        )
    ),
    totalWeeklyOrdersClaimed: Math.max(0, garden.totalWeeklyOrdersClaimed ?? garden.farmOrders?.filter((order) => order.period === "weekly" && order.claimed).length ?? 0),
    totalOrderRerolls: Math.max(0, garden.totalOrderRerolls ?? Object.values(garden.orderRerolls ?? {}).reduce((sum, count) => sum + count, 0)),
    totalLayoutsSaved: Math.max(0, garden.totalLayoutsSaved ?? garden.savedPlantingLayouts?.filter((layout) => layout?.some(Boolean)).length ?? 0),
    totalLayoutsReplanted: Math.max(0, garden.totalLayoutsReplanted ?? 0),
    totalHarvestAllUses: Math.max(0, garden.totalHarvestAllUses ?? 0),
    totalWellUses: Math.max(0, garden.totalWellUses ?? (garden.wellLastUsed ? 1 : 0)),
    bonusSpellCasts: 0,
  };
}

function targetGrowingPlotIds(garden: GardenState, now: number, targetCount: number | "all", requested?: number[]): Set<number> {
  let candidates = garden.plots
    .filter((plot) => plot.variety && !isPlotReady(plot, now))
    .map((plot) => plot.id);

  if (targetCount === "all") return new Set(candidates);

  if (requested?.length) {
    const valid = requested.filter((id, index) => candidates.includes(id) && requested.indexOf(id) === index);
    if (valid.length) return new Set(valid.slice(0, Math.max(1, Math.floor(targetCount))));
  }

  if (buildingLevel(garden, "workshop") >= 2) {
    candidates = [...candidates].sort((a, b) => {
      const aReady = garden.plots[a]?.readyAt ?? now;
      const bReady = garden.plots[b]?.readyAt ?? now;
      return bReady - aReady;
    });
    return new Set(candidates.slice(0, Math.max(1, Math.floor(targetCount))));
  }

  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [candidates[index], candidates[swapIndex]] = [candidates[swapIndex], candidates[index]];
  }

  return new Set(candidates.slice(0, Math.max(1, Math.floor(targetCount))));
}

export const useGardenStore = create<GardenStore>()(
  persist(
    (set) => ({
      gardens: {},

      plant: (profileId, plotId, varietyId, level, goldenMelons, now = Date.now()) => {
        let result: PlantResult = "planted";
        set((state) => {
          const garden = gardenFor(state.gardens[profileId]);
          const plot = garden.plots.find((item) => item.id === plotId);
          const variety = varietyById(varietyId);

          if (!plot || plot.variety) {
            result = "occupied";
            return state;
          }
          if (!isVarietyUnlocked(variety, level, goldenMelons)) {
            result = "locked";
            return state;
          }
          const seedCost = seedCostFor(garden, variety.seedCost);
          if (garden.dew < seedCost) {
            result = "funds";
            return state;
          }

          return {
            gardens: {
              ...state.gardens,
              [profileId]: {
                ...garden,
                dew: garden.dew - seedCost,
                plantCounts: {
                  ...garden.plantCounts,
                  [varietyId]: (garden.plantCounts[varietyId] ?? 0) + 1,
                },
                plots: garden.plots.map((item) =>
                  item.id === plotId
                    ? {
                        ...item,
                        variety: varietyId,
                        growth: 0,
                        plantedOn: todayStr(),
                        plantedAt: now,
                        readyAt: now + variety.growMinutes * cropGrowMultiplier(garden, variety.growMinutes) * 60_000,
                      }
                    : item
                ),
              },
            },
          };
        });
        return result;
      },

      claimQuest: (profileId, reward, now = Date.now()) => {
        let result: ClaimResult = "claimed";
        set((state) => {
          const garden = gardenFor(state.gardens[profileId]);
          const claimed = garden.dailyClaims[reward.date] ?? [];
          if (claimed.includes(reward.id)) {
            result = "already";
            return state;
          }

          const nextClaims = [...claimed, reward.id];
          const completedDailyCrate = claimed.length < reward.totalQuests
            && nextClaims.length >= reward.totalQuests;
          const bonusDew = completedDailyCrate ? GARDEN_DAILY_BONUS.dew : 0;
          const bonusXp = completedDailyCrate ? GARDEN_DAILY_BONUS.xp : 0;

          return {
            gardens: {
              ...state.gardens,
              [profileId]: {
                ...garden,
                dew: garden.dew + reward.dew + bonusDew,
                gardenXp: garden.gardenXp + reward.xp + bonusXp,
                lastTended: reward.date,
                dailyClaims: {
                  ...garden.dailyClaims,
                  [reward.date]: nextClaims,
                },
                plots: garden.plots.map((plot) => boostCropTimer(plot, reward.boostMinutes, now)),
              },
            },
          };
        });
        return result;
      },

      awardLevelSpells: (profileId, levels) => {
        const rewardedSpells: GardenSpellId[] = [];
        set((state) => {
          const garden = gardenFor(state.gardens[profileId]);
          const levelSpellRewards = { ...garden.levelSpellRewards };
          const spellInventory = { ...garden.spellInventory };
          let changed = false;

          for (const level of [...new Set(levels)].filter((item) => Number.isInteger(item) && item > 1).sort((a, b) => a - b)) {
            let spells = levelSpellRewards[String(level)];
            if (!spells) {
              spells = Array.from({ length: LEVEL_UP_FREE_SPELL_CASTS }, () =>
                GARDEN_LEVEL_REWARD_SPELL_IDS[Math.floor(Math.random() * GARDEN_LEVEL_REWARD_SPELL_IDS.length)]
              );
              levelSpellRewards[String(level)] = spells;
              for (const spell of spells) spellInventory[spell] = (spellInventory[spell] ?? 0) + 1;
              changed = true;
            }
            rewardedSpells.push(...spells);
          }

          if (!changed) return state;
          return {
            gardens: {
              ...state.gardens,
              [profileId]: {
                ...garden,
                spellInventory,
                levelSpellRewards,
              },
            },
          };
        });
        return rewardedSpells;
      },

      acknowledgeAchievements: (profileId, achievementIds) => {
        set((state) => {
          const garden = gardenFor(state.gardens[profileId]);
          const requestedIds = new Set(achievementIds.filter(
            (achievement): achievement is GardenAchievementId => GARDEN_ACHIEVEMENT_IDS.includes(achievement)
          ));
          const claimable = gardenAchievements(garden).filter(
            (achievement) => achievement.earned
              && requestedIds.has(achievement.id)
              && !garden.achievementRewardClaims.includes(achievement.id)
          );
          if (claimable.length === 0) return state;
          const reward = claimable.reduce(
            (total, achievement) => ({
              xp: total.xp + achievement.reward.xp,
              dew: total.dew + achievement.reward.dew,
            }),
            { xp: 0, dew: 0 }
          );
          return {
            gardens: {
              ...state.gardens,
              [profileId]: {
                ...garden,
                dew: garden.dew + reward.dew,
                gardenXp: garden.gardenXp + reward.xp,
                achievementClaims: [...new Set([
                  ...garden.achievementClaims,
                  ...claimable.map((achievement) => achievement.id),
                ])],
                achievementRewardClaims: [
                  ...garden.achievementRewardClaims,
                  ...claimable.map((achievement) => achievement.id),
                ],
              },
            },
          };
        });
      },

      buySpell: (profileId, spellId, dewCost) => {
        let result: BuySpellResult = "bought";
        set((state) => {
          const garden = gardenFor(state.gardens[profileId]);
          if (garden.dew < dewCost) {
            result = "funds";
            return state;
          }
          return {
            gardens: {
              ...state.gardens,
              [profileId]: {
                ...garden,
                dew: garden.dew - dewCost,
                spellInventory: {
                  ...garden.spellInventory,
                  [spellId]: (garden.spellInventory[spellId] ?? 0) + 1,
                },
              },
            },
          };
        });
        return result;
      },

      claimGoalSpell: (profileId, spellId, claimKey, goalComplete, claimDate) => {
        let result: ClaimGoalSpellResult = "claimed";
        set((state) => {
          const garden = gardenFor(state.gardens[profileId]);
          if (!goalComplete) {
            result = "incomplete";
            return state;
          }
          const periodClaims = garden.spellClaims[claimKey] ?? [];
          if (periodClaims.includes(spellId)) {
            result = "already";
            return state;
          }
          const bunnyBonus = claimDate && !garden.moonBunnyBonusClaims.includes(claimDate) && companionPower(garden, "moon-bunny") > 0
            ? 1
            : 0;
          return {
            gardens: {
              ...state.gardens,
              [profileId]: {
                ...garden,
                spellInventory: {
                  ...garden.spellInventory,
                  [spellId]: (garden.spellInventory[spellId] ?? 0) + 1 + bunnyBonus,
                },
                spellClaims: {
                  ...garden.spellClaims,
                  [claimKey]: [...periodClaims, spellId],
                },
                moonBunnyBonusClaims: bunnyBonus ? [...garden.moonBunnyBonusClaims, claimDate!] : garden.moonBunnyBonusClaims,
              },
            },
          };
        });
        return result;
      },

      castSpell: (profileId, spell, now = Date.now()) => {
        let result: CastSpellResult = "cast";
        set((state) => {
          const garden = gardenFor(state.gardens[profileId]);
          const ownedCount = garden.spellInventory[spell.id] ?? 0;
          if (ownedCount <= 0) {
            result = "none";
            return state;
          }
          const upgraded = garden.spellMastery[spell.id] != null || companionPower(garden, "honeydew-frog") > 0
            ? effectiveSpell(garden, spell.id)
            : { ...effectiveSpell(garden, spell.id), boostMinutes: spell.boostMinutes, targetCount: spell.targetCount, instantFinish: spell.instantFinish };
          const boostedPlotIds = targetGrowingPlotIds(garden, now, upgraded.targetCount, spell.targetPlotIds);
          if (boostedPlotIds.size === 0) {
            result = "empty";
            return state;
          }

          return {
            gardens: {
              ...state.gardens,
              [profileId]: {
                ...garden,
                spellInventory: {
                  ...garden.spellInventory,
                  [spell.id]: ownedCount - 1,
                },
                totalSpellCasts: garden.totalSpellCasts + 1,
                spellIdsUsed: garden.spellIdsUsed.includes(spell.id)
                  ? garden.spellIdsUsed
                  : [...garden.spellIdsUsed, spell.id],
                farmOrders: garden.farmOrders.map(orderProgressAfterSpell),
                plots: garden.plots.map((plot) =>
                  boostedPlotIds.has(plot.id)
                    ? upgraded.instantFinish
                      ? { ...plot, readyAt: now }
                      : boostCropTimer(plot, upgraded.boostMinutes, now)
                    : plot
                ),
              },
            },
          };
        });
        return result;
      },

      harvest: (profileId, plotId, now = Date.now()) => {
        let result: HarvestResult = "empty";
        set((state) => {
          const garden = gardenFor(state.gardens[profileId]);
          const plot = garden.plots.find((item) => item.id === plotId);
          if (!plot?.variety) return state;

          const variety = varietyById(plot.variety);
          if (!isPlotReady(plot, now)) {
            result = "growing";
            return state;
          }
          const honeyed = buildingLevel(garden, "apiary") >= 3 && Math.random() < 0.05;
          const reward = harvestRewards(garden, variety.id, honeyed);
          const normalReward = honeyed ? harvestRewards(garden, variety.id) : reward;
          result = {
            status: "harvested",
            dew: reward.dew,
            xp: reward.xp,
            honeyed,
            honeyedBonusDew: reward.dew - normalReward.dew,
          };

          return {
            gardens: {
              ...state.gardens,
              [profileId]: {
                ...garden,
                dew: garden.dew + reward.dew,
                gardenXp: garden.gardenXp + reward.xp,
                totalHarvests: garden.totalHarvests + 1,
                totalHoneyedHarvests: garden.totalHoneyedHarvests + (honeyed ? 1 : 0),
                harvests: {
                  ...garden.harvests,
                  [variety.id]: (garden.harvests[variety.id] ?? 0) + 1,
                },
                farmOrders: garden.farmOrders.map((order) => orderProgressAfterHarvest(order, variety.id)),
                plots: garden.plots.map((item) =>
                  item.id === plotId
                    ? { id: item.id, variety: null, growth: 0 }
                    : item
                ),
              },
            },
          };
        });
        return result;
      },

      expandFarm: (profileId) => {
        let result: ExpandResult = "expanded";
        set((state) => {
          const garden = gardenFor(state.gardens[profileId]);
          const cost = gardenExpansionCost(garden.unlockedPlots);
          if (cost == null) {
            result = "maxed";
            return state;
          }
          if (garden.dew < cost) {
            result = "funds";
            return state;
          }

          const nextPlotId = garden.unlockedPlots;
          return {
            gardens: {
              ...state.gardens,
              [profileId]: {
                ...garden,
                dew: garden.dew - cost,
                unlockedPlots: garden.unlockedPlots + 1,
                plots: [...garden.plots, { id: nextPlotId, variety: null, growth: 0 }],
              },
            },
          };
        });
        return result;
      },

      upgradeBuilding: (profileId, buildingId, playerLevel) => {
        let result: FarmPurchaseResult = "bought";
        set((state) => {
          const garden = gardenFor(state.gardens[profileId]);
          const building = buildingById(buildingId);
          const current = buildingLevel(garden, buildingId);
          const next = building.tiers[current];
          if (!next) {
            result = "maxed";
            return state;
          }
          if (playerLevel < next.unlockLevel) {
            result = "locked";
            return state;
          }
          if (garden.dew < next.dewCost) {
            result = "funds";
            return state;
          }
          return {
            gardens: {
              ...state.gardens,
              [profileId]: {
                ...garden,
                dew: garden.dew - next.dewCost,
                buildingLevels: { ...garden.buildingLevels, [buildingId]: next.level },
                activeCompanions: buildingId === "farmhouse" && next.level < 3
                  ? garden.activeCompanions.slice(0, 1)
                  : garden.activeCompanions,
              },
            },
          };
        });
        return result;
      },

      adoptCompanion: (profileId, companionId, playerLevel) => {
        let result: FarmPurchaseResult = "bought";
        set((state) => {
          const garden = gardenFor(state.gardens[profileId]);
          const companion = FARM_COMPANIONS.find((item) => item.id === companionId)!;
          if (garden.ownedCompanions.includes(companionId)) {
            result = "owned";
            return state;
          }
          if (buildingLevel(garden, "farmhouse") < 1) {
            result = "prerequisite";
            return state;
          }
          if (playerLevel < companion.unlockLevel) {
            result = "locked";
            return state;
          }
          if (garden.dew < companion.dewCost) {
            result = "funds";
            return state;
          }
          return {
            gardens: {
              ...state.gardens,
              [profileId]: {
                ...garden,
                dew: garden.dew - companion.dewCost,
                ownedCompanions: [...garden.ownedCompanions, companionId],
                activeCompanions: garden.activeCompanions.length ? garden.activeCompanions : [companionId],
              },
            },
          };
        });
        return result;
      },

      setActiveCompanion: (profileId, companionId, slot = 0) => {
        let result: FarmActionResult = "done";
        set((state) => {
          const garden = gardenFor(state.gardens[profileId]);
          if (!garden.ownedCompanions.includes(companionId)) {
            result = "missing";
            return state;
          }
          if (slot === 1 && buildingLevel(garden, "farmhouse") < 3) {
            result = "locked";
            return state;
          }
          const active = garden.activeCompanions.filter((id) => id !== companionId);
          if (slot === 0) active.unshift(companionId);
          else active.splice(1, 0, companionId);
          return {
            gardens: {
              ...state.gardens,
              [profileId]: { ...garden, activeCompanions: active.slice(0, buildingLevel(garden, "farmhouse") >= 3 ? 2 : 1) },
            },
          };
        });
        return result;
      },

      upgradeSpellMastery: (profileId, spellId) => {
        let result: FarmPurchaseResult = "bought";
        set((state) => {
          const garden = gardenFor(state.gardens[profileId]);
          if (spellId === "everripe-eclipse") {
            result = "maxed";
            return state;
          }
          const mastery = Math.max(1, Math.min(3, garden.spellMastery[spellId] ?? 1));
          if (mastery >= 3) {
            result = "maxed";
            return state;
          }
          const workshopNeeded = mastery === 1 ? 1 : 3;
          if (buildingLevel(garden, "workshop") < workshopNeeded) {
            result = "prerequisite";
            return state;
          }
          const cost = SPELL_MASTERY_COSTS[spellId][mastery - 1];
          if (garden.dew < cost) {
            result = "funds";
            return state;
          }
          return {
            gardens: {
              ...state.gardens,
              [profileId]: {
                ...garden,
                dew: garden.dew - cost,
                spellMastery: { ...garden.spellMastery, [spellId]: mastery + 1 },
              },
            },
          };
        });
        return result;
      },

      ensureFarmOrders: (profileId, date, playerLevel) => {
        set((state) => {
          const garden = gardenFor(state.gardens[profileId]);
          const orders = currentFarmOrders(garden, date, playerLevel);
          if (!orders.length) return state;
          const same = orders.length === garden.farmOrders.length && orders.every((order, index) => garden.farmOrders[index]?.id === order.id);
          if (same) return state;
          return { gardens: { ...state.gardens, [profileId]: { ...garden, farmOrders: orders } } };
        });
      },

      rerollFarmOrders: (profileId, date, playerLevel) => {
        let result: FarmActionResult = "done";
        set((state) => {
          const garden = gardenFor(state.gardens[profileId]);
          if (buildingLevel(garden, "market") < 2) {
            result = "locked";
            return state;
          }
          if (garden.farmOrders.some((order) => order.period === "daily" && (order.progress > 0 || order.claimed))) {
            result = "used";
            return state;
          }
          const used = garden.orderRerolls[date] ?? 0;
          const cost = used === 0 ? 0 : 25;
          if (garden.dew < cost) {
            result = "funds";
            return state;
          }
          const rerolled = {
            ...garden,
            dew: garden.dew - cost,
            orderRerolls: { ...garden.orderRerolls, [date]: used + 1 },
            totalOrderRerolls: garden.totalOrderRerolls + 1,
            farmOrders: garden.farmOrders.filter((order) => order.period !== "daily"),
          };
          return {
            gardens: {
              ...state.gardens,
              [profileId]: { ...rerolled, farmOrders: currentFarmOrders(rerolled, date, playerLevel) },
            },
          };
        });
        return result;
      },

      claimFarmOrder: (profileId, orderId) => {
        let result: FarmActionResult = "done";
        set((state) => {
          const garden = gardenFor(state.gardens[profileId]);
          const order = garden.farmOrders.find((item) => item.id === orderId);
          if (!order) {
            result = "missing";
            return state;
          }
          if (order.claimed) {
            result = "used";
            return state;
          }
          if (order.progress < order.target) {
            result = "locked";
            return state;
          }
          const reward = farmOrderRewards(garden, order);
          let dew = reward.dew;
          let xp = reward.xp;
          const orders = garden.farmOrders.map((item) => item.id === orderId ? { ...item, claimed: true } : item);
          let stewardshipDays = garden.stewardshipDays;
          const dailyDone = order.period === "daily"
            && orders.filter((item) => item.period === "daily" && item.periodKey === order.periodKey).every((item) => item.claimed);
          if (dailyDone && !stewardshipDays.includes(order.periodKey)) {
            stewardshipDays = [...stewardshipDays, order.periodKey].sort();
            const milestone = STEWARDSHIP_MILESTONES.find((item) => item.days === stewardshipDays.length);
            if (milestone) {
              dew += milestone.dew;
              xp += milestone.xp;
            }
          }
          return {
            gardens: {
              ...state.gardens,
              [profileId]: {
                ...garden,
                dew: garden.dew + dew,
                gardenXp: garden.gardenXp + xp,
                farmOrders: orders,
                stewardshipDays,
                totalOrdersClaimed: garden.totalOrdersClaimed + 1,
                totalWeeklyOrdersClaimed: garden.totalWeeklyOrdersClaimed + (order.period === "weekly" ? 1 : 0),
              },
            },
          };
        });
        return result;
      },

      useWell: (profileId, date, now = Date.now()) => {
        let result: FarmActionResult = "done";
        set((state) => {
          const garden = gardenFor(state.gardens[profileId]);
          const level = buildingLevel(garden, "well");
          if (!level) {
            result = "locked";
            return state;
          }
          if (garden.wellLastUsed === date) {
            result = "used";
            return state;
          }
          const growing = garden.plots.filter((plot) => plot.variety && !isPlotReady(plot, now));
          if (!growing.length) {
            result = "empty";
            return state;
          }
          const count = level === 1 ? 3 : level === 2 ? 5 : "all";
          const minutes = level === 1 ? 10 : level === 2 ? 20 : 30;
          const ids = targetGrowingPlotIds(garden, now, count);
          return {
            gardens: {
              ...state.gardens,
              [profileId]: {
                ...garden,
                wellLastUsed: date,
                totalWellUses: garden.totalWellUses + 1,
                plots: garden.plots.map((plot) => ids.has(plot.id) ? boostCropTimer(plot, minutes, now) : plot),
              },
            },
          };
        });
        return result;
      },

      harvestAll: (profileId, now = Date.now()) => {
        const summary: HarvestAllResult = { count: 0, dew: 0, xp: 0, honeyedCount: 0, honeyedDew: 0, honeyedBonusDew: 0 };
        set((state) => {
          const garden = gardenFor(state.gardens[profileId]);
          if (buildingLevel(garden, "barn") < 1) return state;
          let orders = garden.farmOrders;
          const harvests = { ...garden.harvests };
          const plots = garden.plots.map((plot) => {
            if (!plot.variety || !isPlotReady(plot, now)) return plot;
            const variety = varietyById(plot.variety);
            const honeyed = buildingLevel(garden, "apiary") >= 3 && Math.random() < 0.05;
            const reward = harvestRewards(garden, variety.id, honeyed);
            const normalReward = honeyed ? harvestRewards(garden, variety.id) : reward;
            summary.count += 1;
            summary.dew += reward.dew;
            summary.xp += reward.xp;
            if (honeyed) {
              summary.honeyedCount += 1;
              summary.honeyedDew += reward.dew;
              summary.honeyedBonusDew += reward.dew - normalReward.dew;
            }
            harvests[variety.id] = (harvests[variety.id] ?? 0) + 1;
            orders = orders.map((order) => orderProgressAfterHarvest(order, variety.id));
            return { id: plot.id, variety: null, growth: 0 };
          });
          if (!summary.count) return state;
          return {
            gardens: {
              ...state.gardens,
              [profileId]: {
                ...garden,
                dew: garden.dew + summary.dew,
                gardenXp: garden.gardenXp + summary.xp,
                totalHarvests: garden.totalHarvests + summary.count,
                totalHoneyedHarvests: garden.totalHoneyedHarvests + summary.honeyedCount,
                totalHarvestAllUses: garden.totalHarvestAllUses + 1,
                harvests,
                farmOrders: orders,
                plots,
              },
            },
          };
        });
        return summary;
      },

      savePlantingLayout: (profileId, slot = 0) => {
        let result: FarmActionResult = "done";
        set((state) => {
          const garden = gardenFor(state.gardens[profileId]);
          const barn = buildingLevel(garden, "barn");
          const capacity = barn >= 3 ? 3 : barn >= 2 ? 1 : 0;
          if (slot < 0 || slot >= capacity) {
            result = "locked";
            return state;
          }
          const layouts = [...garden.savedPlantingLayouts];
          layouts[slot] = garden.plots.map((plot) => plot.variety);
          return { gardens: { ...state.gardens, [profileId]: { ...garden, savedPlantingLayouts: layouts, totalLayoutsSaved: garden.totalLayoutsSaved + 1 } } };
        });
        return result;
      },

      replantLayout: (profileId, slot, playerLevel, goldenMelons, now = Date.now()) => {
        let result: FarmActionResult = "done";
        set((state) => {
          const garden = gardenFor(state.gardens[profileId]);
          const barn = buildingLevel(garden, "barn");
          const capacity = barn >= 3 ? 3 : barn >= 2 ? 1 : 0;
          if (slot < 0 || slot >= capacity) {
            result = "locked";
            return state;
          }
          const layout = garden.savedPlantingLayouts[slot];
          if (!layout) {
            result = "missing";
            return state;
          }
          const plantable = garden.plots.flatMap((plot) => {
            const varietyId = layout[plot.id];
            if (plot.variety || !varietyId) return [];
            const variety = varietyById(varietyId);
            return isVarietyUnlocked(variety, playerLevel, goldenMelons) ? [{ plot, variety }] : [];
          });
          if (!plantable.length) {
            result = "empty";
            return state;
          }
          const cost = plantable.reduce((sum, item) => sum + seedCostFor(garden, item.variety.seedCost), 0);
          if (garden.dew < cost) {
            result = "funds";
            return state;
          }
          const byPlot = new Map(plantable.map((item) => [item.plot.id, item.variety]));
          const plantCounts = { ...garden.plantCounts };
          for (const { variety } of plantable) plantCounts[variety.id] = (plantCounts[variety.id] ?? 0) + 1;
          return {
            gardens: {
              ...state.gardens,
              [profileId]: {
                ...garden,
                dew: garden.dew - cost,
                totalLayoutsReplanted: garden.totalLayoutsReplanted + 1,
                plantCounts,
                plots: garden.plots.map((plot) => {
                  const variety = byPlot.get(plot.id);
                  return variety ? {
                    ...plot,
                    variety: variety.id,
                    growth: 0,
                    plantedOn: todayStr(),
                    plantedAt: now,
                    readyAt: now + variety.growMinutes * cropGrowMultiplier(garden, variety.growMinutes) * 60_000,
                  } : plot;
                }),
              },
            },
          };
        });
        return result;
      },
    }),
    {
      name: "melonmate-garden-v1",
      version: 5,
      // Keep older gardens intact; gardenFor lazily adds progression and economy state.
      migrate: (persisted) => persisted as GardenStore,
    }
  )
);

export function useGarden(profileId: string): GardenState {
  const saved = useGardenStore((state) => state.gardens[profileId]);
  return gardenFor(saved);
}
