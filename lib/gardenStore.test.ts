import { beforeEach, describe, expect, it, vi } from "vitest";
import { GARDEN_DAILY_BONUS, LEVEL_UP_FREE_SPELL_CASTS, MAX_GARDEN_PLOTS, MELON_VARIETIES, freshGarden, gardenExpansionCost, varietyById } from "./garden";
import { harvestRewards, orderProgressAfterHarvest, seedCostFor } from "./farmProgression";
import { useGardenStore } from "./gardenStore";

const PROFILE = "garden-test-profile";
const NOW = 2_000_000;

describe("garden economy", () => {
  beforeEach(() => {
    useGardenStore.setState({ gardens: {} });
  });

  it("plants a crop with a persistent real-time deadline", () => {
    const result = useGardenStore.getState().plant(PROFILE, 0, "honeydew", 1, 0, NOW);
    const plot = useGardenStore.getState().gardens[PROFILE].plots[0];

    expect(result).toBe("planted");
    expect(plot.plantedAt).toBe(NOW);
    expect(plot.readyAt).toBe(NOW + varietyById("honeydew").growMinutes * 60_000);
    expect(useGardenStore.getState().gardens[PROFILE].plantCounts.honeydew).toBe(1);
  });

  it("claims each real-life reward once and accelerates planted crops", () => {
    useGardenStore.getState().plant(PROFILE, 0, "watermelon", 3, 0, NOW);
    const before = useGardenStore.getState().gardens[PROFILE].plots[0].readyAt!;
    const reward = {
      id: "hydrate" as const,
      date: "2026-08-07",
      dew: 4,
      xp: 15,
      boostMinutes: 15,
      totalQuests: 5,
    };

    expect(useGardenStore.getState().claimQuest(PROFILE, reward, NOW)).toBe("claimed");
    expect(useGardenStore.getState().claimQuest(PROFILE, reward, NOW)).toBe("already");

    const garden = useGardenStore.getState().gardens[PROFILE];
    expect(garden.dailyClaims[reward.date]).toEqual(["hydrate"]);
    expect(garden.gardenXp).toBe(0);
    expect(garden.plots[0].readyAt).toBe(before - 15 * 60_000);
  });

  it("claims a completed-goal spell into inventory once per claim key", () => {
    useGardenStore.setState({ gardens: { [PROFILE]: { ...freshGarden(), dew: 100 } } });

    expect(useGardenStore.getState().claimGoalSpell(PROFILE, "trailwind", "2026-08-08", true)).toBe("claimed");
    let garden = useGardenStore.getState().gardens[PROFILE];
    expect(garden.dew).toBe(100);
    expect(garden.spellInventory.trailwind).toBe(1);
    expect(garden.spellClaims["2026-08-08"]).toEqual(["trailwind"]);

    expect(useGardenStore.getState().claimGoalSpell(PROFILE, "trailwind", "2026-08-08", true)).toBe("already");
    garden = useGardenStore.getState().gardens[PROFILE];
    expect(garden.spellInventory.trailwind).toBe(1);
  });

  it("buys a spell copy with Dew without casting it", () => {
    useGardenStore.setState({ gardens: { [PROFILE]: { ...freshGarden(), dew: 100 } } });
    useGardenStore.getState().plant(PROFILE, 0, "watermelon", 3, 0, NOW);
    const readyAt = useGardenStore.getState().gardens[PROFILE].plots[0].readyAt;

    expect(useGardenStore.getState().buySpell(PROFILE, "trailwind", 12)).toBe("bought");
    expect(useGardenStore.getState().buySpell(PROFILE, "trailwind", 12)).toBe("bought");
    const garden = useGardenStore.getState().gardens[PROFILE];
    expect(garden.dew).toBe(68);
    expect(garden.spellInventory.trailwind).toBe(2);
    expect(garden.plots[0].readyAt).toBe(readyAt);
    expect(garden.totalSpellCasts).toBe(0);
  });

  it("awards three random spell items per level, including duplicate copies, exactly once", () => {
    const random = vi.spyOn(Math, "random")
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.4);

    try {
      expect(useGardenStore.getState().awardLevelSpells(PROFILE, [2, 2])).toEqual([
        "pantry-spark",
        "pantry-spark",
        "hearth-flame",
      ]);
      expect(useGardenStore.getState().awardLevelSpells(PROFILE, [2])).toEqual([
        "pantry-spark",
        "pantry-spark",
        "hearth-flame",
      ]);
    } finally {
      random.mockRestore();
    }

    const garden = useGardenStore.getState().gardens[PROFILE];
    expect(Object.values(garden.spellInventory).reduce((sum, count) => sum + (count ?? 0), 0)).toBe(LEVEL_UP_FREE_SPELL_CASTS);
    expect(garden.spellInventory).toMatchObject({ "pantry-spark": 2, "hearth-flame": 1 });
    expect(garden.levelSpellRewards["2"]).toEqual(["pantry-spark", "pantry-spark", "hearth-flame"]);
  });

  it("casts from inventory only and refuses when no copies remain", () => {
    useGardenStore.setState({ gardens: { [PROFILE]: { ...freshGarden(), dew: 100, spellInventory: { trailwind: 1 } } } });
    useGardenStore.getState().plant(PROFILE, 0, "watermelon", 3, 0, NOW);
    const before = useGardenStore.getState().gardens[PROFILE].plots[0].readyAt!;
    const spell = {
      id: "trailwind" as const,
      boostMinutes: 25,
      targetCount: 3 as const,
    };

    expect(useGardenStore.getState().castSpell(PROFILE, spell, NOW)).toBe("cast");
    expect(useGardenStore.getState().gardens[PROFILE].spellInventory.trailwind).toBe(0);
    expect(useGardenStore.getState().gardens[PROFILE].dew).toBe(92);
    expect(useGardenStore.getState().gardens[PROFILE].plots[0].readyAt).toBe(before - 25 * 60_000);
    expect(useGardenStore.getState().gardens[PROFILE].totalSpellCasts).toBe(1);
    expect(useGardenStore.getState().gardens[PROFILE].spellIdsUsed).toEqual(["trailwind"]);

    expect(useGardenStore.getState().castSpell(PROFILE, spell, NOW)).toBe("none");
    expect(useGardenStore.getState().gardens[PROFILE].dew).toBe(92);
    expect(useGardenStore.getState().gardens[PROFILE].totalSpellCasts).toBe(1);
  });

  it("boosts only three randomly selected growing crops per spell cast", () => {
    useGardenStore.setState({ gardens: { [PROFILE]: { ...freshGarden(), dew: 100, spellInventory: { "pantry-spark": 1 } } } });
    for (let plotId = 0; plotId < 6; plotId += 1) {
      expect(useGardenStore.getState().plant(PROFILE, plotId, "honeydew", 1, 0, NOW)).toBe("planted");
    }
    const before = useGardenStore.getState().gardens[PROFILE].plots.map((plot) => plot.readyAt);
    const random = vi.spyOn(Math, "random").mockReturnValue(0);

    try {
      expect(useGardenStore.getState().castSpell(PROFILE, {
        id: "pantry-spark",
        boostMinutes: 5,
        targetCount: 3,
      }, NOW)).toBe("cast");
    } finally {
      random.mockRestore();
    }

    const after = useGardenStore.getState().gardens[PROFILE].plots.map((plot) => plot.readyAt);
    const boosted = after.filter((readyAt, index) => readyAt === before[index]! - 5 * 60_000);
    const untouched = after.filter((readyAt, index) => readyAt === before[index]);
    expect(boosted).toHaveLength(3);
    expect(untouched).toHaveLength(3);
  });

  it("lets stronger spells affect their larger configured crop count", () => {
    useGardenStore.setState({ gardens: { [PROFILE]: { ...freshGarden(), dew: 500, spellInventory: { "balance-bloom": 1 } } } });
    for (let plotId = 0; plotId < 6; plotId += 1) {
      expect(useGardenStore.getState().plant(PROFILE, plotId, "honeydew", 1, 0, NOW)).toBe("planted");
    }
    const before = useGardenStore.getState().gardens[PROFILE].plots.map((plot) => plot.readyAt);

    expect(useGardenStore.getState().castSpell(PROFILE, {
      id: "balance-bloom",
      boostMinutes: 5,
      targetCount: 5,
    }, NOW)).toBe("cast");

    const after = useGardenStore.getState().gardens[PROFILE].plots.map((plot) => plot.readyAt);
    expect(after.filter((readyAt, index) => readyAt === before[index]! - 5 * 60_000)).toHaveLength(5);
    expect(after.filter((readyAt, index) => readyAt === before[index])).toHaveLength(1);
  });

  it("buys Everripe Eclipse then casts it to finish every growing crop", () => {
    useGardenStore.setState({ gardens: { [PROFILE]: { ...freshGarden(), dew: 10_100 } } });
    for (let plotId = 0; plotId < 6; plotId += 1) {
      useGardenStore.getState().plant(PROFILE, plotId, "honeydew", 1, 0, NOW);
    }
    const dewBeforeBuy = useGardenStore.getState().gardens[PROFILE].dew;

    expect(useGardenStore.getState().buySpell(PROFILE, "everripe-eclipse", 10_000)).toBe("bought");
    expect(useGardenStore.getState().gardens[PROFILE].dew).toBe(dewBeforeBuy - 10_000);
    expect(useGardenStore.getState().gardens[PROFILE].spellInventory["everripe-eclipse"]).toBe(1);

    expect(useGardenStore.getState().castSpell(PROFILE, {
      id: "everripe-eclipse",
      boostMinutes: 0,
      targetCount: "all",
      instantFinish: true,
    }, NOW)).toBe("cast");

    const garden = useGardenStore.getState().gardens[PROFILE];
    expect(garden.dew).toBe(dewBeforeBuy - 10_000);
    expect(garden.spellInventory["everripe-eclipse"]).toBe(0);
    expect(garden.plots.filter((plot) => plot.variety).every((plot) => plot.readyAt === NOW)).toBe(true);
  });

  it("does not consume an owned spell when nothing is growing", () => {
    useGardenStore.setState({
      gardens: { [PROFILE]: { ...freshGarden(), spellInventory: { "pantry-spark": 1 } } },
    });

    expect(useGardenStore.getState().castSpell(PROFILE, {
      id: "pantry-spark",
      boostMinutes: 10,
      targetCount: 3,
    }, NOW)).toBe("empty");
    expect(useGardenStore.getState().gardens[PROFILE].spellInventory["pantry-spark"]).toBe(1);
  });

  it("awards the daily crate exactly when the final order is claimed", () => {
    const first = { id: "food" as const, date: "2026-08-07", dew: 3, xp: 10, boostMinutes: 10, totalQuests: 2 };
    const second = { id: "cook" as const, date: "2026-08-07", dew: 4, xp: 15, boostMinutes: 20, totalQuests: 2 };

    useGardenStore.getState().claimQuest(PROFILE, first, NOW);
    useGardenStore.getState().claimQuest(PROFILE, second, NOW);
    const garden = useGardenStore.getState().gardens[PROFILE];

    expect(garden.dew).toBe(18 + first.dew + second.dew + GARDEN_DAILY_BONUS.dew);
    expect(garden.gardenXp).toBe(0);
  });

  it("spends Dew to permanently expand the farm one field at a time", () => {
    const garden = { ...freshGarden(), dew: 100 };
    useGardenStore.setState({ gardens: { [PROFILE]: garden } });

    const cost = gardenExpansionCost(garden.unlockedPlots)!;
    expect(useGardenStore.getState().expandFarm(PROFILE)).toBe("expanded");

    const expanded = useGardenStore.getState().gardens[PROFILE];
    expect(expanded.dew).toBe(100 - cost);
    expect(expanded.unlockedPlots).toBe(7);
    expect(expanded.plots).toHaveLength(7);
    expect(expanded.plots[6]).toMatchObject({ id: 6, variety: null });
  });

  it("does not unlock a field when the farm cannot afford it", () => {
    const garden = freshGarden();
    useGardenStore.setState({ gardens: { [PROFILE]: garden } });

    expect(useGardenStore.getState().expandFarm(PROFILE)).toBe("funds");
    expect(useGardenStore.getState().gardens[PROFILE].plots).toHaveLength(6);
  });

  it("collects unlocked achievement Dew exactly once without erasing prior badges", () => {
    const garden = freshGarden();
    for (const variety of MELON_VARIETIES) garden.plantCounts[variety.id] = 1;
    garden.totalSpellCasts = 5;
    useGardenStore.setState({ gardens: { [PROFILE]: garden } });

    useGardenStore.getState().acknowledgeAchievements(PROFILE, ["firstRoots", "fiveSpells"]);
    useGardenStore.getState().acknowledgeAchievements(PROFILE, ["firstRoots", "allMelons"]);

    const rewarded = useGardenStore.getState().gardens[PROFILE];
    expect(rewarded.achievementClaims).toEqual([
      "firstRoots",
      "fiveSpells",
      "allMelons",
    ]);
    expect(rewarded.achievementRewardClaims).toEqual([
      "firstRoots",
      "fiveSpells",
      "allMelons",
    ]);
    expect(rewarded.dew).toBe(garden.dew + 5 + 12 + 50);
    expect(rewarded.gardenXp).toBe(garden.gardenXp);
  });

  it("does not pay an achievement before its requirement is complete", () => {
    const garden = freshGarden();
    useGardenStore.setState({ gardens: { [PROFILE]: garden } });

    useGardenStore.getState().acknowledgeAchievements(PROFILE, ["firstRoots"]);

    expect(useGardenStore.getState().gardens[PROFILE] ?? garden).toMatchObject({
      dew: garden.dew,
      gardenXp: garden.gardenXp,
      achievementClaims: [],
      achievementRewardClaims: [],
    });
  });

  it("pays legacy acknowledged achievements that never received rewards", () => {
    const garden = freshGarden();
    garden.plantCounts.honeydew = 1;
    garden.achievementClaims = ["firstRoots"];
    useGardenStore.setState({ gardens: { [PROFILE]: garden } });

    useGardenStore.getState().acknowledgeAchievements(PROFILE, ["firstRoots"]);

    const rewarded = useGardenStore.getState().gardens[PROFILE];
    expect(rewarded.achievementClaims).toEqual(["firstRoots"]);
    expect(rewarded.achievementRewardClaims).toEqual(["firstRoots"]);
    expect(rewarded.dew).toBe(garden.dew + 5);
    expect(rewarded.gardenXp).toBe(garden.gardenXp);
  });

  it("supports the second parcel through the final field", () => {
    expect(MAX_GARDEN_PLOTS).toBe(22);
    expect(gardenExpansionCost(MAX_GARDEN_PLOTS - 1)).toBe(1180);
    expect(gardenExpansionCost(MAX_GARDEN_PLOTS)).toBeNull();
  });

  it("gates permanent building upgrades by player level and spends Dew", () => {
    useGardenStore.setState({ gardens: { [PROFILE]: { ...freshGarden(), dew: 500 } } });
    expect(useGardenStore.getState().upgradeBuilding(PROFILE, "well", 2)).toBe("locked");
    expect(useGardenStore.getState().upgradeBuilding(PROFILE, "well", 3)).toBe("bought");
    expect(useGardenStore.getState().gardens[PROFILE].buildingLevels.well).toBe(1);
    expect(useGardenStore.getState().gardens[PROFILE].dew).toBe(450);
    expect(useGardenStore.getState().upgradeBuilding(PROFILE, "well", 3)).toBe("locked");
  });

  it("adopts profile-preset companions and applies Canta Cat's 2x crop Dew", () => {
    useGardenStore.setState({ gardens: { [PROFILE]: {
      ...freshGarden(),
      dew: 5_000,
      buildingLevels: { farmhouse: 1 },
    } } });
    expect(useGardenStore.getState().adoptCompanion(PROFILE, "cantaloupe-cat", 18)).toBe("bought");
    expect(useGardenStore.getState().setActiveCompanion(PROFILE, "cantaloupe-cat")).toBe("done");
    const before = useGardenStore.getState().gardens[PROFILE].dew;
    expect(useGardenStore.getState().plant(PROFILE, 0, "densuke", 18, 0, NOW)).toBe("planted");
    expect(useGardenStore.getState().gardens[PROFILE].dew).toBe(before - 42);
    const withCanta = useGardenStore.getState().gardens[PROFILE];
    const withoutCanta = { ...withCanta, activeCompanions: [] };
    expect(harvestRewards(withCanta, "honeydew").dew).toBe(harvestRewards(withoutCanta, "honeydew").dew * 2);
  });

  it("returns the Honeyed Harvest proc and exact bonus Dew to the UI", () => {
    const garden = freshGarden();
    garden.buildingLevels.apiary = 3;
    garden.plots[0] = {
      id: 0,
      variety: "honeydew",
      growth: 1,
      plantedAt: NOW - 60_000,
      readyAt: NOW,
    };
    useGardenStore.setState({ gardens: { [PROFILE]: garden } });
    const random = vi.spyOn(Math, "random").mockReturnValue(0);

    try {
      const normal = harvestRewards(garden, "honeydew");
      expect(useGardenStore.getState().harvest(PROFILE, 0, NOW)).toEqual({
        status: "harvested",
        dew: normal.dew * 2,
        xp: normal.xp,
        honeyed: true,
        honeyedBonusDew: normal.dew,
      });
    } finally {
      random.mockRestore();
    }
  });

  it("reports every Honeyed Harvest in Harvest All", () => {
    const garden = freshGarden();
    garden.buildingLevels = { apiary: 3, barn: 1 };
    garden.plots[0] = { id: 0, variety: "honeydew", growth: 1, plantedAt: NOW - 60_000, readyAt: NOW };
    garden.plots[1] = { id: 1, variety: "honeydew", growth: 1, plantedAt: NOW - 60_000, readyAt: NOW };
    useGardenStore.setState({ gardens: { [PROFILE]: garden } });
    const random = vi.spyOn(Math, "random").mockReturnValueOnce(0).mockReturnValueOnce(1);

    try {
      const normal = harvestRewards(garden, "honeydew");
      expect(useGardenStore.getState().harvestAll(PROFILE, NOW)).toEqual({
        count: 2,
        dew: normal.dew * 3,
        xp: normal.xp * 2,
        honeyedCount: 1,
        honeyedDew: normal.dew * 2,
        honeyedBonusDew: normal.dew,
      });
    } finally {
      random.mockRestore();
    }
  });

  it("reuses the one saved layout unlocked by Barn Tier 2", () => {
    const garden = freshGarden();
    garden.dew = 1_000;
    garden.buildingLevels.barn = 2;
    garden.savedPlantingLayouts = [["honeydew", null, "honeydew"]];
    useGardenStore.setState({ gardens: { [PROFILE]: garden } });
    const expectedCost = seedCostFor(garden, varietyById("honeydew").seedCost) * 2;

    expect(useGardenStore.getState().replantLayout(PROFILE, 0, 20, 0, NOW)).toBe("done");
    const replanted = useGardenStore.getState().gardens[PROFILE];
    expect(replanted.plots[0].variety).toBe("honeydew");
    expect(replanted.plots[2].variety).toBe("honeydew");
    expect(replanted.dew).toBe(1_000 - expectedCost);
  });

  it("does not plant or charge anything when a saved layout costs too much", () => {
    const garden = freshGarden();
    garden.dew = 0;
    garden.buildingLevels.barn = 2;
    garden.savedPlantingLayouts = [["honeydew"]];
    useGardenStore.setState({ gardens: { [PROFILE]: garden } });

    expect(useGardenStore.getState().replantLayout(PROFILE, 0, 20, 0, NOW)).toBe("funds");
    const unchanged = useGardenStore.getState().gardens[PROFILE];
    expect(unchanged.dew).toBe(0);
    expect(unchanged.plots[0].variety).toBeNull();
  });

  it("uses an upgraded well once per day to accelerate crops", () => {
    useGardenStore.setState({ gardens: { [PROFILE]: {
      ...freshGarden(),
      dew: 100,
      buildingLevels: { well: 1 },
    } } });
    useGardenStore.getState().plant(PROFILE, 0, "watermelon", 3, 0, NOW);
    const before = useGardenStore.getState().gardens[PROFILE].plots[0].readyAt!;
    expect(useGardenStore.getState().useWell(PROFILE, "2026-08-12", NOW)).toBe("done");
    expect(useGardenStore.getState().gardens[PROFILE].plots[0].readyAt).toBe(before - 10 * 60_000);
    expect(useGardenStore.getState().useWell(PROFILE, "2026-08-12", NOW)).toBe("used");
  });

  it("generates, progresses, and rewards farm orders", () => {
    useGardenStore.setState({ gardens: { [PROFILE]: {
      ...freshGarden(),
      dew: 100,
      buildingLevels: { market: 1 },
    } } });
    useGardenStore.getState().ensureFarmOrders(PROFILE, "2026-08-12", 6);
    let garden = useGardenStore.getState().gardens[PROFILE];
    expect(garden.farmOrders).toHaveLength(2);
    const first = { ...garden.farmOrders[0], progress: garden.farmOrders[0].target };
    useGardenStore.setState({ gardens: { [PROFILE]: { ...garden, farmOrders: [first, garden.farmOrders[1]] } } });
    const before = useGardenStore.getState().gardens[PROFILE].dew;
    expect(useGardenStore.getState().claimFarmOrder(PROFILE, first.id)).toBe("done");
    garden = useGardenStore.getState().gardens[PROFILE];
    expect(garden.dew).toBeGreaterThan(before);
    expect(garden.farmOrders[0].claimed).toBe(true);
  });

  it("resets daily orders on a new date while preserving the current weekly order", () => {
    const garden = freshGarden();
    garden.buildingLevels.market = 3;
    useGardenStore.setState({ gardens: { [PROFILE]: garden } });
    useGardenStore.getState().ensureFarmOrders(PROFILE, "2026-08-12", 12);
    const firstDay = useGardenStore.getState().gardens[PROFILE].farmOrders;
    const weekly = firstDay.find((order) => order.period === "weekly")!;
    useGardenStore.setState({ gardens: { [PROFILE]: { ...useGardenStore.getState().gardens[PROFILE], farmOrders: firstDay.map((order) => order.id === weekly.id ? { ...order, progress: 2 } : order) } } });

    useGardenStore.getState().ensureFarmOrders(PROFILE, "2026-08-13", 12);
    const nextDay = useGardenStore.getState().gardens[PROFILE].farmOrders;
    expect(nextDay.filter((order) => order.period === "daily").every((order) => order.periodKey === "2026-08-13")).toBe(true);
    expect(nextDay.find((order) => order.period === "weekly")).toMatchObject({ id: weekly.id, progress: 2 });
  });

  it("counts distinct varieties only once for mix orders", () => {
    const order = {
      id: "mix", period: "daily" as const, periodKey: "2026-08-12", kind: "harvest-variety-mix" as const,
      target: 3, progress: 0, dewReward: 10, xpReward: 10, varieties: [], claimed: false,
    };
    const one = orderProgressAfterHarvest(order, "honeydew");
    const duplicate = orderProgressAfterHarvest(one, "honeydew");
    const two = orderProgressAfterHarvest(duplicate, "watermelon");
    expect(duplicate.progress).toBe(1);
    expect(two).toMatchObject({ progress: 2, varieties: ["honeydew", "watermelon"] });
  });

  it("advances spell orders only after successful casts", () => {
    const garden = freshGarden();
    garden.spellInventory.trailwind = 1;
    garden.plots[0] = { id: 0, variety: "watermelon", growth: 0, plantedAt: NOW, readyAt: NOW + 60_000 };
    garden.farmOrders = [{
      id: "spell", period: "daily", periodKey: "2026-08-12", kind: "cast-spell",
      target: 1, progress: 0, dewReward: 10, xpReward: 10, claimed: false,
    }];
    useGardenStore.setState({ gardens: { [PROFILE]: garden } });
    expect(useGardenStore.getState().castSpell(PROFILE, { id: "trailwind", boostMinutes: 5, targetCount: 1 }, NOW)).toBe("cast");
    expect(useGardenStore.getState().gardens[PROFILE].farmOrders[0].progress).toBe(1);
  });

  it("keeps a paid reroll atomic when Dew is insufficient", () => {
    const garden = freshGarden();
    garden.dew = 0;
    garden.buildingLevels.market = 2;
    garden.orderRerolls["2026-08-12"] = 1;
    useGardenStore.setState({ gardens: { [PROFILE]: garden } });
    useGardenStore.getState().ensureFarmOrders(PROFILE, "2026-08-12", 6);
    const before = useGardenStore.getState().gardens[PROFILE].farmOrders.map((order) => order.id);

    expect(useGardenStore.getState().rerollFarmOrders(PROFILE, "2026-08-12", 6)).toBe("funds");
    const unchanged = useGardenStore.getState().gardens[PROFILE];
    expect(unchanged.dew).toBe(0);
    expect(unchanged.orderRerolls["2026-08-12"]).toBe(1);
    expect(unchanged.farmOrders.map((order) => order.id)).toEqual(before);
  });

  it("cannot claim the same completed order twice", () => {
    const garden = freshGarden();
    garden.farmOrders = [{
      id: "daily", period: "daily", periodKey: "2026-08-12", kind: "harvest-any",
      target: 1, progress: 1, dewReward: 10, xpReward: 10, claimed: false,
    }];
    useGardenStore.setState({ gardens: { [PROFILE]: garden } });
    expect(useGardenStore.getState().claimFarmOrder(PROFILE, "daily")).toBe("done");
    const afterFirst = useGardenStore.getState().gardens[PROFILE];
    expect(useGardenStore.getState().claimFarmOrder(PROFILE, "daily")).toBe("used");
    expect(useGardenStore.getState().gardens[PROFILE]).toMatchObject({ dew: afterFirst.dew, gardenXp: afterFirst.gardenXp, totalOrdersClaimed: 1 });
  });

  it("rewards Day 7 stewardship when the final daily order is delivered", () => {
    const garden = freshGarden();
    garden.buildingLevels.market = 1;
    garden.stewardshipDays = Array.from({ length: 6 }, (_, index) => `2026-08-0${index + 1}`);
    garden.farmOrders = [{
      id: "daily-2026-08-12-0-0",
      period: "daily",
      periodKey: "2026-08-12",
      kind: "harvest-any",
      target: 1,
      progress: 1,
      dewReward: 10,
      xpReward: 10,
      claimed: false,
    }];
    useGardenStore.setState({ gardens: { [PROFILE]: garden } });
    expect(useGardenStore.getState().claimFarmOrder(PROFILE, garden.farmOrders[0].id)).toBe("done");
    const rewarded = useGardenStore.getState().gardens[PROFILE];
    expect(rewarded.stewardshipDays).toHaveLength(7);
    expect(rewarded.dew).toBe(18 + 10 + 100);
    expect(rewarded.gardenXp).toBe(0);
  });

  it.each([
    [14, 200],
    [30, 500],
    [60, 1_000],
    [90, 2_500],
  ])("rewards Day %i stewardship with the configured whole-number milestone", (day, milestoneReward) => {
    const garden = freshGarden();
    garden.buildingLevels.market = 1;
    garden.stewardshipDays = Array.from({ length: day - 1 }, (_, index) => `prior-${index + 1}`);
    garden.farmOrders = [{
      id: `daily-day-${day}-0-0`,
      period: "daily",
      periodKey: `day-${day}`,
      kind: "harvest-any",
      target: 1,
      progress: 1,
      dewReward: 10,
      xpReward: 10,
      claimed: false,
    }];
    useGardenStore.setState({ gardens: { [PROFILE]: garden } });

    expect(useGardenStore.getState().claimFarmOrder(PROFILE, garden.farmOrders[0].id)).toBe("done");
    const rewarded = useGardenStore.getState().gardens[PROFILE];
    expect(rewarded.stewardshipDays).toHaveLength(day);
    expect(rewarded.dew).toBe(18 + 10 + milestoneReward);
    expect(rewarded.gardenXp).toBe(0);
  });

  it("makes Farmhouse Tier 2 add visible whole rewards to Golden Capy's order bonus", () => {
    const garden = freshGarden();
    garden.buildingLevels = { farmhouse: 2, market: 1 };
    garden.ownedCompanions = ["golden-capybara"];
    garden.activeCompanions = ["golden-capybara"];
    garden.farmOrders = [{
      id: "daily-2026-08-12-0-0",
      period: "daily",
      periodKey: "2026-08-12",
      kind: "harvest-any",
      target: 1,
      progress: 1,
      dewReward: 10,
      xpReward: 10,
      claimed: false,
    }];
    useGardenStore.setState({ gardens: { [PROFILE]: garden } });

    expect(useGardenStore.getState().claimFarmOrder(PROFILE, garden.farmOrders[0].id)).toBe("done");
    const rewarded = useGardenStore.getState().gardens[PROFILE];
    expect(rewarded.dew).toBe(18 + 10 + 21);
    expect(rewarded.gardenXp).toBe(0);
  });

  it("upgrades spell mastery permanently through the Workshop", () => {
    useGardenStore.setState({ gardens: { [PROFILE]: {
      ...freshGarden(),
      dew: 1_000,
      buildingLevels: { workshop: 1 },
    } } });
    expect(useGardenStore.getState().upgradeSpellMastery(PROFILE, "trailwind")).toBe("bought");
    expect(useGardenStore.getState().gardens[PROFILE].spellMastery.trailwind).toBe(2);
    expect(useGardenStore.getState().upgradeSpellMastery(PROFILE, "trailwind")).toBe("prerequisite");
  });

  it("lets Moon Bunny duplicate only the first claimed goal spell each day", () => {
    useGardenStore.setState({ gardens: { [PROFILE]: {
      ...freshGarden(),
      ownedCompanions: ["moon-bunny"],
      activeCompanions: ["moon-bunny"],
    } } });
    expect(useGardenStore.getState().claimGoalSpell(PROFILE, "trailwind", "2026-08-12", true, "2026-08-12")).toBe("claimed");
    expect(useGardenStore.getState().claimGoalSpell(PROFILE, "ironroot", "2026-08-12", true, "2026-08-12")).toBe("claimed");
    const garden = useGardenStore.getState().gardens[PROFILE];
    expect(garden.spellInventory.trailwind).toBe(2);
    expect(garden.spellInventory.ironroot).toBe(1);
  });
});
