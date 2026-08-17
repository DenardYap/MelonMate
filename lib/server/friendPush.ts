import type { FriendShareNotification, MemberSnapshot } from "@/lib/types";
import { apnsConfigured, sendApnsAlert } from "./apns";
import { loadPushDevice } from "./pushdb";

export function friendSharePushCopy(
  source: MemberSnapshot,
  notifications: FriendShareNotification[],
  lang: "en" | "zh"
) {
  const recipeCount = notifications.filter((notification) => notification.kind === "recipe").length;
  const workoutCount = notifications.filter((notification) => notification.kind === "workout").length;
  const progressCount = notifications.filter((notification) => notification.kind === "progress").length;
  const first = notifications[0];

  if (notifications.length === 1 && first) {
    const itemName = first.itemName[lang] || first.itemName.en;
    const title = first.kind === "recipe"
      ? (lang === "zh" ? `${source.name} 分享了食譜` : `${source.name} shared a recipe`)
      : first.kind === "progress"
        ? (lang === "zh" ? `${source.name} 分享了今日進度` : `${source.name} shared today’s progress`)
        : (lang === "zh" ? `${source.name} 分享了訓練` : `${source.name} shared a workout`);
    return { title, body: itemName, path: first.path };
  }

  const parts = lang === "zh"
    ? [recipeCount ? `${recipeCount} 份食譜` : "", workoutCount ? `${workoutCount} 個訓練計畫` : "", progressCount ? `${progressCount} 則每日進度` : ""].filter(Boolean)
    : [recipeCount ? `${recipeCount} ${recipeCount === 1 ? "recipe" : "recipes"}` : "", workoutCount ? `${workoutCount} ${workoutCount === 1 ? "workout" : "workouts"}` : "", progressCount ? `${progressCount} progress update${progressCount === 1 ? "" : "s"}` : ""].filter(Boolean);
  return {
    title: lang === "zh" ? `${source.name} 分享了新內容` : `${source.name} shared new items`,
    body: parts.join(lang === "zh" ? "、" : " and "),
    path: first?.path ?? "/me",
  };
}

/** Best-effort native delivery; sharing itself must still succeed if push is unavailable. */
export async function sendFriendSharePushes(
  source: MemberSnapshot,
  recipients: MemberSnapshot[],
  notifications: FriendShareNotification[]
): Promise<void> {
  if (!notifications.length || !apnsConfigured()) return;
  await Promise.allSettled(recipients.map(async (recipient) => {
    if (!recipient.notificationDeviceId) return;
    const device = await loadPushDevice(recipient.notificationDeviceId);
    if (!device || device.platform !== "ios") return;
    await sendApnsAlert(device.token, friendSharePushCopy(source, notifications, device.lang));
  }));
}
