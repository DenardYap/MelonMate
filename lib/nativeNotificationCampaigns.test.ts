import { describe, expect, it } from "vitest";
import {
  buildNativeCampaignNotifications,
  isAutomatedCampaignNotificationId,
  type NativeCampaignPreferences,
} from "./nativeNotificationCampaigns";
import type { LogEntry, MealSlot } from "./types";

const allCampaigns: NativeCampaignPreferences = {
  mealReminders: true,
  streakReminders: true,
  harvestReminders: true,
};

function log(meal: MealSlot, cal = 300, date = "2026-08-09"): LogEntry {
  return {
    id: `${date}-${meal}-${cal}`,
    date,
    meal,
    name: { en: meal, zh: meal },
    macros: { cal, protein: 20, carbs: 30, fat: 10 },
    at: new Date(2026, 7, 9, 8).getTime(),
  };
}

describe("buildNativeCampaignNotifications", () => {
  it("rolls meal reminders forward and skips a meal that is already logged", () => {
    const notifications = buildNativeCampaignNotifications(
      { ...allCampaigns, streakReminders: false, harvestReminders: false },
      {
        lang: "en",
        logs: [log("breakfast")],
        calorieTarget: 2_000,
        streak: 0,
        plots: [],
        now: new Date(2026, 7, 9, 8, 0),
      }
    );

    expect(notifications).toHaveLength(20);
    expect(notifications.some((item) => item.extra.path.includes("meal=breakfast")
      && item.at.getDate() === 9)).toBe(false);
    expect(notifications[0]).toMatchObject({
      title: "Log lunch",
      extra: { campaign: "meal", path: "/add?meal=lunch&source=meal-reminder" },
    });
  });

  it("schedules streak nudges only while a streak exists and the daily goal is incomplete", () => {
    const todayComplete = [log("breakfast"), log("lunch"), log("dinner")];
    const notifications = buildNativeCampaignNotifications(
      { ...allCampaigns, mealReminders: false, harvestReminders: false },
      {
        lang: "en",
        logs: todayComplete,
        calorieTarget: 2_000,
        streak: 4,
        plots: [],
        now: new Date(2026, 7, 9, 18, 0),
      }
    );

    expect(notifications).toHaveLength(6);
    expect(notifications[0].at.getDate()).toBe(10);
    expect(notifications.every((item) => item.extra.campaign === "streak")).toBe(true);

    expect(buildNativeCampaignNotifications(
      { ...allCampaigns, mealReminders: false, harvestReminders: false },
      {
        lang: "en",
        logs: [],
        calorieTarget: 2_000,
        streak: 0,
        plots: [],
        now: new Date(2026, 7, 9, 18, 0),
      }
    )).toHaveLength(0);
  });

  it("schedules a localized harvest alert for a lone growing plot", () => {
    const now = new Date(2026, 7, 9, 8, 0);
    const readyAt = now.getTime() + 10 * 60_000;
    const notifications = buildNativeCampaignNotifications(
      { ...allCampaigns, mealReminders: false, streakReminders: false },
      {
        lang: "zh",
        logs: [],
        calorieTarget: 2_000,
        streak: 0,
        plots: [
          { id: 2, variety: "honeydew", growth: 0, plantedAt: now.getTime(), readyAt },
          { id: 3, variety: "cantaloupe", growth: 0, plantedAt: now.getTime() - 60_000, readyAt: now.getTime() - 1 },
        ],
        now,
      }
    );

    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      title: "蜜瓜可以採收了",
      extra: { campaign: "harvest", path: "/garden?plot=2&source=harvest-reminder" },
    });
    expect(notifications[0].at.getTime()).toBe(readyAt);
    expect(isAutomatedCampaignNotificationId(notifications[0].id)).toBe(true);
  });

  it("groups harvests within three minutes into one alert after every melon is ready", () => {
    const now = new Date(2026, 7, 9, 8, 0);
    const firstReadyAt = now.getTime() + 10 * 60_000;
    const lastReadyAt = firstReadyAt + 3 * 60_000;
    const plots = Array.from({ length: 10 }, (_, id) => ({
      id,
      variety: id % 2 === 0 ? "honeydew" as const : "cantaloupe" as const,
      growth: 0,
      plantedAt: now.getTime(),
      readyAt: id === 9 ? lastReadyAt : firstReadyAt,
    }));

    const notifications = buildNativeCampaignNotifications(
      { ...allCampaigns, mealReminders: false, streakReminders: false },
      {
        lang: "en",
        logs: [],
        calorieTarget: 2_000,
        streak: 0,
        plots,
        now,
      }
    );

    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      title: "10 melons are ready to harvest",
      extra: { campaign: "harvest", path: "/garden?source=harvest-reminder" },
    });
    expect(notifications[0].at.getTime()).toBe(lastReadyAt);
  });

  it("keeps harvest groups more than three minutes apart as separate alerts", () => {
    const now = new Date(2026, 7, 9, 8, 0);
    const firstReadyAt = now.getTime() + 10 * 60_000;
    const secondReadyAt = firstReadyAt + 3 * 60_000 + 1;
    const notifications = buildNativeCampaignNotifications(
      { ...allCampaigns, mealReminders: false, streakReminders: false },
      {
        lang: "en",
        logs: [],
        calorieTarget: 2_000,
        streak: 0,
        plots: [
          { id: 2, variety: "honeydew", growth: 0, readyAt: firstReadyAt },
          { id: 3, variety: "cantaloupe", growth: 0, readyAt: secondReadyAt },
        ],
        now,
      }
    );

    expect(notifications).toHaveLength(2);
    expect(notifications.map((item) => item.at.getTime())).toEqual([firstReadyAt, secondReadyAt]);
  });
});
