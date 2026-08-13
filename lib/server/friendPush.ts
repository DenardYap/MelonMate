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
  const first = notifications[0];

  if (notifications.length === 1 && first) {
    const itemName = first.itemName[lang] || first.itemName.en;
    return lang === "zh"
      ? {
          title: first.kind === "recipe" ? `${source.name} 分享了食譜` : `${source.name} 分享了訓練`,
          body: itemName,
          path: first.path,
        }
      : {
          title: first.kind === "recipe" ? `${source.name} shared a recipe` : `${source.name} shared a workout`,
          body: itemName,
          path: first.path,
        };
  }

  const parts = lang === "zh"
    ? [recipeCount ? `${recipeCount} 份食譜` : "", workoutCount ? `${workoutCount} 個訓練計畫` : ""].filter(Boolean)
    : [recipeCount ? `${recipeCount} ${recipeCount === 1 ? "recipe" : "recipes"}` : "", workoutCount ? `${workoutCount} ${workoutCount === 1 ? "workout" : "workouts"}` : ""].filter(Boolean);
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
