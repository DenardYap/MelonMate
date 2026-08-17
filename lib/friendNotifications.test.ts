import { beforeEach, describe, expect, it } from "vitest";
import { detectFriendShareNotifications, mergeFriendShareNotifications } from "./friendNotifications";
import type { MemberSnapshot, Recipe, WorkoutPlan } from "./types";
import { useStore } from "./store";

const recipe = { id: "melon-toast", name: { en: "Melon toast", zh: "甜瓜吐司" } } as Recipe;
const plan = { id: "garden-strength", name: { en: "Garden strength", zh: "花園力量" } } as WorkoutPlan;

function snapshot(patch: Partial<MemberSnapshot> = {}): MemberSnapshot {
  return {
    version: 8,
    id: "friend.device",
    name: "Sam",
    emoji: "🍈",
    level: 4,
    xp: 600,
    streak: 2,
    best: 3,
    melons: 1,
    golden: 0,
    garden: [],
    today: { date: "2026-08-12", cal: 0, calGoal: 2000, protein: 0, proteinGoal: 120 },
    updatedAt: 100,
    ...patch,
  };
}

describe("friend share notifications", () => {
  beforeEach(() => useStore.getState().resetAll());

  it("detects newly shared recipes and workout plans with useful deep links", () => {
    const notifications = detectFriendShareNotifications(snapshot(), snapshot({
      sharedRecipes: [recipe],
      workoutPlan: { plan, unit: "lb" },
      updatedAt: 200,
    }));
    expect(notifications).toHaveLength(2);
    expect(notifications[0]).toMatchObject({ kind: "recipe", path: "/kitchen?tab=shared&friend=friend.device" });
    expect(notifications[1]).toMatchObject({ kind: "workout", path: "/gym?tab=shared&friend=friend.device" });
  });

  it("does not notify again when the same content remains shared", () => {
    const previous = snapshot({ sharedRecipes: [recipe], workoutPlan: { plan, unit: "lb" } });
    expect(detectFriendShareNotifications(previous, { ...previous, updatedAt: 200 })).toEqual([]);
  });

  it("notifies once for each new daily progress snapshot", () => {
    const dailyProgress = {
      id: "2026-08-17:100",
      date: "2026-08-17",
      sharedAt: 100,
      calories: 1800,
      calorieGoal: 2200,
      protein: 125,
      proteinGoal: 140,
      waterCups: 7,
      waterGoal: 8,
      workouts: 1,
      steps: 9_000,
      standMinutes: 100,
      streak: 6,
    };
    const incoming = snapshot({ dailyProgress, updatedAt: 200 });
    const notifications = detectFriendShareNotifications(snapshot(), incoming);

    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      kind: "progress",
      itemId: dailyProgress.id,
      path: "/friends/friend.device",
    });
    expect(detectFriendShareNotifications(incoming, { ...incoming, updatedAt: 300 })).toEqual([]);
  });

  it("deduplicates persisted inbox entries", () => {
    const notification = detectFriendShareNotifications(undefined, snapshot({ sharedRecipes: [recipe] }))[0];
    expect(mergeFriendShareNotifications([notification], [notification])).toEqual([notification]);
  });

  it("stores unread notifications and marks each content tab read independently", () => {
    const notifications = detectFriendShareNotifications(snapshot(), snapshot({
      sharedRecipes: [recipe],
      workoutPlan: { plan, unit: "lb" },
      updatedAt: 200,
    }));
    useStore.getState().addFriendNotifications(notifications);
    expect(useStore.getState().friendNotifications.filter((item) => !item.readAt)).toHaveLength(2);

    useStore.getState().markFriendNotificationsRead("recipe");
    expect(useStore.getState().friendNotifications.find((item) => item.kind === "recipe")?.readAt).toBeTypeOf("number");
    expect(useStore.getState().friendNotifications.find((item) => item.kind === "workout")?.readAt).toBeUndefined();
  });
});
