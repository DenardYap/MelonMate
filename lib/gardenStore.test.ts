import { beforeEach, describe, expect, it, vi } from "vitest";
import { GARDEN_DAILY_BONUS, LEVEL_UP_FREE_SPELL_CASTS, MAX_GARDEN_PLOTS, MELON_VARIETIES, freshGarden, gardenExpansionCost, varietyById } from "./garden";
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
    expect(garden.gardenXp).toBe(15);
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
    expect(garden.gardenXp).toBe(first.xp + second.xp + GARDEN_DAILY_BONUS.xp);
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

  it("collects unlocked achievement XP and Dew exactly once without erasing prior badges", () => {
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
    expect(rewarded.gardenXp).toBe(garden.gardenXp + 15 + 40 + 150);
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
    expect(rewarded.gardenXp).toBe(garden.gardenXp + 15);
  });

  it("supports the second parcel through the final field", () => {
    expect(MAX_GARDEN_PLOTS).toBe(22);
    expect(gardenExpansionCost(MAX_GARDEN_PLOTS - 1)).toBe(1180);
    expect(gardenExpansionCost(MAX_GARDEN_PLOTS)).toBeNull();
  });
});
