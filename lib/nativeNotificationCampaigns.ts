import { addDays, dateStr, parseDate } from "./dates";
import { varietyById } from "./garden";
import type { GardenPlot, Lang, LogEntry, MealSlot } from "./types";

export type CampaignPreferenceKey = "mealReminders" | "streakReminders" | "harvestReminders";

export interface NativeCampaignPreferences {
  mealReminders: boolean;
  streakReminders: boolean;
  harvestReminders: boolean;
}

export interface NativeCampaignSnapshot {
  lang: Lang;
  logs: LogEntry[];
  calorieTarget: number;
  streak: number;
  plots: GardenPlot[];
  now?: Date;
}

export interface NativeCampaignNotification {
  id: number;
  title: string;
  body: string;
  at: Date;
  extra: {
    path: string;
    campaign: "meal" | "streak" | "harvest";
  };
}

const CAMPAIGN_HORIZON_DAYS = 7;
const MEAL_ID_BASE = 100_000_000;
const STREAK_ID_BASE = 200_000_000;
const HARVEST_ID_BASE = 300_000_000;
const CAMPAIGN_ID_LIMIT = 400_000_000;
const HARVEST_GROUP_WINDOW_MS = 3 * 60_000;

const MEAL_REMINDERS: { meal: Exclude<MealSlot, "snack">; hour: number; minute: number }[] = [
  { meal: "breakfast", hour: 9, minute: 0 },
  { meal: "lunch", hour: 13, minute: 0 },
  { meal: "dinner", hour: 19, minute: 0 },
];

function localDateCode(value: string): number {
  const [year, month, day] = value.split("-").map(Number);
  return (year - 2000) * 10_000 + month * 100 + day;
}

function atLocalTime(value: string, hour: number, minute: number): Date {
  const result = parseDate(value);
  result.setHours(hour, minute, 0, 0);
  return result;
}

function mealNotificationId(value: string, mealIndex: number): number {
  return MEAL_ID_BASE + localDateCode(value) * 10 + mealIndex;
}

function streakNotificationId(value: string): number {
  return STREAK_ID_BASE + localDateCode(value);
}

function cropReadyAt(plot: GardenPlot): number | null {
  if (!plot.variety) return null;
  if (plot.readyAt != null) return plot.readyAt;
  const variety = varietyById(plot.variety);
  const plantedAt = plot.plantedAt
    ?? (plot.plantedOn ? parseDate(plot.plantedOn).getTime() : null);
  return plantedAt == null ? null : plantedAt + variety.growMinutes * 60_000;
}

function mealCopy(meal: Exclude<MealSlot, "snack">, lang: Lang): { title: string; body: string } {
  if (lang === "zh") {
    const label = meal === "breakfast" ? "早餐" : meal === "lunch" ? "午餐" : "晚餐";
    return {
      title: `記錄${label}`,
      body: "快速記下一餐，讓營養目標和瓜園一起成長。",
    };
  }
  const label = meal[0].toUpperCase() + meal.slice(1);
  return {
    title: `Log ${label.toLowerCase()}`,
    body: "A quick check-in keeps your nutrition goals and melon garden growing.",
  };
}

function trackingComplete(logs: LogEntry[], date: string): boolean {
  return logs.some((entry) => entry.date === date);
}

export function isAutomatedCampaignNotificationId(id: number): boolean {
  return id >= MEAL_ID_BASE && id < CAMPAIGN_ID_LIMIT;
}

export function buildNativeCampaignNotifications(
  preferences: NativeCampaignPreferences,
  snapshot: NativeCampaignSnapshot
): NativeCampaignNotification[] {
  const now = snapshot.now ?? new Date();
  const today = dateStr(now);
  const notifications: NativeCampaignNotification[] = [];

  if (preferences.mealReminders) {
    for (let offset = 0; offset < CAMPAIGN_HORIZON_DAYS; offset += 1) {
      const date = addDays(today, offset);
      for (const [mealIndex, reminder] of MEAL_REMINDERS.entries()) {
        const at = atLocalTime(date, reminder.hour, reminder.minute);
        if (at.getTime() <= now.getTime()) continue;
        if (snapshot.logs.some((entry) => entry.date === date && entry.meal === reminder.meal)) continue;
        const copy = mealCopy(reminder.meal, snapshot.lang);
        notifications.push({
          id: mealNotificationId(date, mealIndex),
          ...copy,
          at,
          extra: {
            campaign: "meal",
            path: `/add?meal=${reminder.meal}&source=meal-reminder`,
          },
        });
      }
    }
  }

  if (preferences.streakReminders && snapshot.streak > 0) {
    for (let offset = 0; offset < CAMPAIGN_HORIZON_DAYS; offset += 1) {
      const date = addDays(today, offset);
      const at = atLocalTime(date, 20, 30);
      if (at.getTime() <= now.getTime()) continue;
      if (trackingComplete(snapshot.logs, date)) continue;
      notifications.push({
        id: streakNotificationId(date),
        title: snapshot.lang === "zh" ? "讓連續紀錄繼續成長" : "Keep your streak growing",
        body: snapshot.lang === "zh"
          ? "今天記錄一項食物，讓連續追蹤繼續成長。"
          : "Log a food today to keep your tracking streak growing.",
        at,
        extra: {
          campaign: "streak",
          path: "/add?source=streak-reminder",
        },
      });
    }
  }

  if (preferences.harvestReminders) {
    const upcomingHarvests = snapshot.plots
      .flatMap((plot) => {
        if (!plot.variety) return [];
        const readyAt = cropReadyAt(plot);
        if (readyAt == null || readyAt <= now.getTime()) return [];
        return [{ plot, readyAt }];
      })
      .sort((left, right) => left.readyAt - right.readyAt || left.plot.id - right.plot.id);

    for (let index = 0; index < upcomingHarvests.length;) {
      const groupStart = upcomingHarvests[index];
      const group = [groupStart];
      index += 1;
      while (
        index < upcomingHarvests.length
        && upcomingHarvests[index].readyAt - groupStart.readyAt <= HARVEST_GROUP_WINDOW_MS
      ) {
        group.push(upcomingHarvests[index]);
        index += 1;
      }

      const lastHarvest = group[group.length - 1];
      const count = group.length;
      const name = varietyById(groupStart.plot.variety!).name[snapshot.lang];
      notifications.push({
        id: HARVEST_ID_BASE + groupStart.plot.id,
        title: count === 1
          ? (snapshot.lang === "zh" ? `${name}可以採收了` : `${name} is ready to harvest`)
          : (snapshot.lang === "zh" ? `${count} 顆瓜可以採收了` : `${count} melons are ready to harvest`),
        body: snapshot.lang === "zh"
          ? "回到瓜園採收露珠。"
          : "Return to your garden to collect Dew.",
        at: new Date(lastHarvest.readyAt),
        extra: {
          campaign: "harvest",
          path: count === 1
            ? `/garden?plot=${groupStart.plot.id}&source=harvest-reminder`
            : "/garden?source=harvest-reminder",
        },
      });
    }
  }

  return notifications.sort((left, right) => left.at.getTime() - right.at.getTime());
}
