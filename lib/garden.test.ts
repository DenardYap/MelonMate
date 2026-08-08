import { describe, expect, it } from "vitest";
import {
  MELON_VARIETIES,
  GARDEN_SPELL_EFFECTS,
  MAX_GARDEN_PLOTS,
  boostCropTimer,
  cropProgress,
  cropRemainingMs,
  cropStageImage,
  cropVisualStage,
  isPlotReady,
  isVarietyUnlocked,
  varietyById,
} from "./garden";
import type { GardenPlot } from "./types";
import { DAILY_XP_REWARD } from "./game";

describe("rare melon level gates", () => {
  it.each([
    ["yubari-ruby", 7],
    ["snow-leopard", 9],
    ["densuke", 12],
  ] as const)("keeps %s locked until level %i", (id, level) => {
    const variety = varietyById(id);
    expect(isVarietyUnlocked(variety, level - 1, 99)).toBe(false);
    expect(isVarietyUnlocked(variety, level, 0)).toBe(true);
  });

  it("keeps late-game varieties in ascending unlock order", () => {
    const levels = MELON_VARIETIES.map((variety) => variety.unlockLevel);
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
  });

  it("still requires a PR for Moon Gold in addition to its level", () => {
    const moonGold = varietyById("moon-gold");
    expect(isVarietyUnlocked(moonGold, 12, 0)).toBe(false);
    expect(isVarietyUnlocked(moonGold, 6, 1)).toBe(true);
  });
});

describe("real-time crop loop", () => {
  const plantedAt = 1_000_000;
  const readyAt = plantedAt + 10 * 60_000;
  const plot: GardenPlot = {
    id: 0,
    variety: "honeydew",
    growth: 0,
    plantedAt,
    readyAt,
  };

  it("keeps growing while time passes and becomes ready at the deadline", () => {
    expect(cropProgress(plot, plantedAt)).toBe(0);
    expect(cropProgress(plot, plantedAt + 5 * 60_000)).toBe(0.5);
    expect(isPlotReady(plot, readyAt - 1)).toBe(false);
    expect(isPlotReady(plot, readyAt)).toBe(true);
  });

  it("reports remaining real time", () => {
    expect(cropRemainingMs(plot, plantedAt + 4 * 60_000)).toBe(6 * 60_000);
    expect(cropRemainingMs(plot, readyAt + 1)).toBe(0);
  });

  it("moves through a real seed, plant, and melon visual as the timer advances", () => {
    const variety = varietyById("honeydew");
    expect(cropVisualStage(plot, plantedAt)).toBe("seed");
    expect(cropStageImage(variety, cropVisualStage(plot, plantedAt))).toBe(variety.seedImage);
    expect(cropVisualStage(plot, plantedAt + 4 * 60_000)).toBe("plant");
    expect(cropStageImage(variety, cropVisualStage(plot, plantedAt + 4 * 60_000))).toBe(variety.plantImage);
    expect(cropVisualStage(plot, plantedAt + 8 * 60_000)).toBe("melon");
    expect(cropStageImage(variety, cropVisualStage(plot, plantedAt + 8 * 60_000))).toBe(variety.image);
  });

  it("uses healthy-action boosts without moving a deadline into the past", () => {
    const now = plantedAt + 2 * 60_000;
    expect(boostCropTimer(plot, 3, now).readyAt).toBe(readyAt - 3 * 60_000);
    expect(boostCropTimer(plot, 30, now).readyAt).toBe(now);
  });

  it("prices paid spells above the instant harvest profit they can create", () => {
    for (const spell of Object.values(GARDEN_SPELL_EFFECTS)) {
      const targetCount = spell.targetCount === "all" ? MAX_GARDEN_PLOTS : spell.targetCount;
      const instantProfits = MELON_VARIETIES
        .filter((variety) => spell.instantFinish || variety.growMinutes <= spell.boostMinutes)
        .map((variety) => (variety.harvestReward - variety.seedCost) * targetCount);
      expect(spell.dewCost).toBeGreaterThan(Math.max(0, ...instantProfits));
    }
  });

  it("gives every variety an increasingly valuable timed crop", () => {
    expect(MELON_VARIETIES.every((variety) => variety.growMinutes > 0 && variety.harvestXp > 0)).toBe(true);
    expect(MELON_VARIETIES.map((variety) => variety.growMinutes)).toEqual(
      [...MELON_VARIETIES].map((variety) => variety.growMinutes).sort((a, b) => a - b)
    );
  });

  it("keeps the largest crop reward far below the nutrition goal reward", () => {
    expect(Math.max(...MELON_VARIETIES.map((variety) => variety.harvestXp))).toBeLessThanOrEqual(
      DAILY_XP_REWARD / 10
    );
  });

  it("gives every variety three distinct growth-stage assets", () => {
    for (const variety of MELON_VARIETIES) {
      expect(new Set([variety.seedImage, variety.plantImage, variety.image]).size).toBe(3);
      expect(variety.seedImage).toMatch(/-seed\.png$/);
      expect(variety.plantImage).toMatch(/-plant\.png$/);
    }
  });
});
