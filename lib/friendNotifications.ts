import type { FriendShareNotification, MemberSnapshot } from "./types";

function notificationId(friendId: string, kind: FriendShareNotification["kind"], itemId: string, createdAt: number) {
  return `${friendId}:${kind}:${itemId}:${createdAt}`;
}

/** Converts newly exposed friend content into durable recipient-facing events. */
export function detectFriendShareNotifications(
  previous: MemberSnapshot | undefined,
  incoming: MemberSnapshot
): FriendShareNotification[] {
  const createdAt = incoming.updatedAt;
  const friendQuery = `friend=${encodeURIComponent(incoming.id)}`;
  const previousRecipeIds = new Set((previous?.sharedRecipes ?? []).map((recipe) => recipe.id));
  const recipeNotifications = (incoming.sharedRecipes ?? [])
    .filter((recipe) => !previousRecipeIds.has(recipe.id))
    .map((recipe): FriendShareNotification => ({
      id: notificationId(incoming.id, "recipe", recipe.id, createdAt),
      friendId: incoming.id,
      friendName: incoming.name,
      kind: "recipe",
      itemId: recipe.id,
      itemName: recipe.name,
      createdAt,
      path: `/kitchen?tab=shared&${friendQuery}`,
    }));

  const previousPlanId = previous?.workoutPlan?.plan.id;
  const incomingPlan = incoming.workoutPlan?.plan;
  const workoutNotifications = incomingPlan && incomingPlan.id !== previousPlanId
    ? [{
        id: notificationId(incoming.id, "workout", incomingPlan.id, createdAt),
        friendId: incoming.id,
        friendName: incoming.name,
        kind: "workout" as const,
        itemId: incomingPlan.id,
        itemName: incomingPlan.name,
        createdAt,
        path: `/gym?tab=shared&${friendQuery}`,
      }]
    : [];

  const progress = incoming.dailyProgress;
  const progressNotifications = progress && progress.id !== previous?.dailyProgress?.id
    ? [{
        id: notificationId(incoming.id, "progress", progress.id, createdAt),
        friendId: incoming.id,
        friendName: incoming.name,
        kind: "progress" as const,
        itemId: progress.id,
        itemName: { en: "Today’s progress", zh: "今日進度" },
        createdAt,
        path: `/friends/${encodeURIComponent(incoming.id)}`,
      }]
    : [];

  return [...recipeNotifications, ...workoutNotifications, ...progressNotifications];
}

export function mergeFriendShareNotifications(
  current: FriendShareNotification[],
  incoming: FriendShareNotification[]
) {
  const known = new Set(current.map((notification) => notification.id));
  return [...incoming.filter((notification) => !known.has(notification.id)), ...current]
    .sort((left, right) => right.createdAt - left.createdAt)
    .slice(0, 100);
}

export function friendShareNotificationText(notification: FriendShareNotification, lang: "en" | "zh") {
  const item = notification.itemName[lang] || notification.itemName.en;
  if (lang === "zh") {
    if (notification.kind === "recipe") return `${notification.friendName} 儲存了食譜「${item}」`;
    if (notification.kind === "progress") return `${notification.friendName} 分享了今日進度`;
    return `${notification.friendName} 正在使用訓練計畫「${item}」`;
  }
  if (notification.kind === "recipe") return `${notification.friendName} saved the recipe “${item}”`;
  if (notification.kind === "progress") return `${notification.friendName} shared today’s progress`;
  return `${notification.friendName} is using the workout “${item}”`;
}
