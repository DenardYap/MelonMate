"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GardenAchievementId, GardenQuestId, GardenSpellId, GardenState, MelonVarietyId } from "./types";
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

type PlantResult = "planted" | "occupied" | "locked" | "funds";
type HarvestResult = "harvested" | "empty" | "growing";
type ClaimResult = "claimed" | "already";
type ExpandResult = "expanded" | "maxed" | "funds";
export type BuySpellResult = "bought" | "funds";
export type ClaimGoalSpellResult = "claimed" | "already" | "incomplete";
export type CastSpellResult = "cast" | "empty" | "none";

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
  claimGoalSpell: (profileId: string, spellId: GardenSpellId, claimKey: string, goalComplete: boolean) => ClaimGoalSpellResult;
  castSpell: (profileId: string, spell: GardenSpellCast, now?: number) => CastSpellResult;
  harvest: (profileId: string, plotId: number, now?: number) => HarvestResult;
  expandFarm: (profileId: string) => ExpandResult;
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
    bonusSpellCasts: 0,
  };
}

function targetGrowingPlotIds(garden: GardenState, now: number, targetCount: number | "all"): Set<number> {
  const candidates = garden.plots
    .filter((plot) => plot.variety && !isPlotReady(plot, now))
    .map((plot) => plot.id);

  if (targetCount === "all") return new Set(candidates);

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
          if (garden.dew < variety.seedCost) {
            result = "funds";
            return state;
          }

          return {
            gardens: {
              ...state.gardens,
              [profileId]: {
                ...garden,
                dew: garden.dew - variety.seedCost,
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
                        readyAt: now + variety.growMinutes * 60_000,
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

      claimGoalSpell: (profileId, spellId, claimKey, goalComplete) => {
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
          return {
            gardens: {
              ...state.gardens,
              [profileId]: {
                ...garden,
                spellInventory: {
                  ...garden.spellInventory,
                  [spellId]: (garden.spellInventory[spellId] ?? 0) + 1,
                },
                spellClaims: {
                  ...garden.spellClaims,
                  [claimKey]: [...periodClaims, spellId],
                },
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
          const boostedPlotIds = targetGrowingPlotIds(garden, now, spell.targetCount);
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
                plots: garden.plots.map((plot) =>
                  boostedPlotIds.has(plot.id)
                    ? spell.instantFinish
                      ? { ...plot, readyAt: now }
                      : boostCropTimer(plot, spell.boostMinutes, now)
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
          result = "harvested";

          return {
            gardens: {
              ...state.gardens,
              [profileId]: {
                ...garden,
                dew: garden.dew + variety.harvestReward,
                gardenXp: garden.gardenXp + variety.harvestXp,
                totalHarvests: garden.totalHarvests + 1,
                harvests: {
                  ...garden.harvests,
                  [variety.id]: (garden.harvests[variety.id] ?? 0) + 1,
                },
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
    }),
    {
      name: "melonmate-garden-v1",
      version: 4,
      // Keep older gardens intact; gardenFor lazily adds timestamps, XP, claims, and expansion state.
      migrate: (persisted) => persisted as GardenStore,
    }
  )
);

export function useGarden(profileId: string): GardenState {
  const saved = useGardenStore((state) => state.gardens[profileId]);
  return gardenFor(saved);
}
