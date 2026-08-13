import { describe, expect, it } from "vitest";
import { FARM_COMPANIONS, farmOrderRewards, harvestRewards } from "./farmProgression";
import { freshGarden, varietyById } from "./garden";

describe("farm harvest progression", () => {
  it("uses seven characters that exist in the profile-picture preset collection", async () => {
    const { BUILT_IN_PROFILE_AVATARS } = await import("./profilePhoto");
    const avatarIds = new Set(BUILT_IN_PROFILE_AVATARS.map((avatar) => avatar.id));
    expect(FARM_COMPANIONS).toHaveLength(7);
    expect(FARM_COMPANIONS.every((companion) => avatarIds.has(companion.id))).toBe(true);
  });

  it("uses whole-Dew bonuses for small harvests", () => {
    const garden = freshGarden();
    garden.buildingLevels.apiary = 1;

    const base = varietyById("honeydew");
    expect(harvestRewards(garden, "honeydew").dew).toBe(base.harvestReward + 1);

    garden.buildingLevels.apiary = 0;
    garden.buildingLevels.farmhouse = 1;
    garden.activeCompanions = ["chamoe-bee"];
    expect(harvestRewards(garden, "honeydew").dew).toBe(base.harvestReward + 1);
  });

  it("makes Canta Cat exactly double normal crop Dew at Tier 1", () => {
    const garden = freshGarden();
    garden.buildingLevels.farmhouse = 1;
    garden.activeCompanions = ["cantaloupe-cat"];

    const base = varietyById("honeydew");
    expect(harvestRewards(garden, "honeydew").dew).toBe(base.harvestReward * 2);
  });

  it("makes Honeyed Harvest exactly double the final whole-Dew payout", () => {
    const garden = freshGarden();
    garden.buildingLevels = { farmhouse: 3, apiary: 3, greenhouse: 2 };
    garden.activeCompanions = ["chamoe-bee", "cantaloupe-cat"];

    const normal = harvestRewards(garden, "watermelon");
    const honeyed = harvestRewards(garden, "watermelon", true);
    expect(honeyed.dew).toBe(normal.dew * 2);
    expect(honeyed.xp).toBe(normal.xp);
  });

  it("adds Densuke Pingu's XP without percentage rounding", () => {
    const garden = freshGarden();
    garden.buildingLevels.farmhouse = 1;
    garden.activeCompanions = ["densuke-penguin"];

    const base = varietyById("honeydew");
    expect(harvestRewards(garden, "honeydew").xp).toBe(base.harvestXp + 3);
  });

  it("turns Farmhouse Tier 2 into visible whole-number companion gains", () => {
    const garden = freshGarden();
    garden.buildingLevels.farmhouse = 2;
    garden.activeCompanions = ["chamoe-bee"];

    const base = varietyById("honeydew");
    expect(harvestRewards(garden, "honeydew").dew).toBe(base.harvestReward + 2);

    garden.activeCompanions = ["densuke-penguin"];
    expect(harvestRewards(garden, "honeydew").xp).toBe(base.harvestXp + 4);
  });

  it("shows the exact whole-number order payout before delivery", () => {
    const garden = freshGarden();
    garden.buildingLevels = { farmhouse: 2, market: 3 };
    garden.activeCompanions = ["golden-capybara"];
    expect(farmOrderRewards(garden, { dewReward: 28, xpReward: 24 })).toEqual({ dew: 59, xp: 55 });
  });
});
