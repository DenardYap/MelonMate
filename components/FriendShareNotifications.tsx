"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/icons";
import { Sheet, toast } from "@/components/ui";
import { friendShareNotificationText } from "@/lib/friendNotifications";
import { useStore } from "@/lib/store";

export function FriendShareNotifier() {
  const notifications = useStore((state) => state.friendNotifications);
  const lang = useStore((state) => state.lang);
  const knownIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!knownIds.current) {
      knownIds.current = new Set(notifications.map((notification) => notification.id));
      return;
    }
    const incoming = notifications.filter((notification) => !knownIds.current?.has(notification.id));
    incoming.slice(0, 3).reverse().forEach((notification) => {
      toast(friendShareNotificationText(notification, lang), notification.kind === "recipe" ? "kitchen" : "gym");
    });
    notifications.forEach((notification) => knownIds.current?.add(notification.id));
  }, [lang, notifications]);

  return null;
}

export function FriendNotificationButton() {
  const router = useRouter();
  const lang = useStore((state) => state.lang);
  const notifications = useStore((state) => state.friendNotifications);
  const markRead = useStore((state) => state.markFriendNotificationRead);
  const markAllRead = useStore((state) => state.markFriendNotificationsRead);
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((notification) => !notification.readAt).length;

  const openNotification = (id: string, path: string) => {
    markRead(id);
    setOpen(false);
    router.push(path);
  };

  return (
    <>
      <button
        type="button"
        className="ibtn press friend-notification-trigger"
        onClick={() => {
          markAllRead();
          setOpen(true);
        }}
        aria-label={lang === "zh" ? `朋友分享通知，${unread} 則未讀` : `Friend share notifications, ${unread} unread`}
      >
        <AppIcon name="bell" size={19} />
        {unread > 0 && <span>{unread > 9 ? "9+" : unread}</span>}
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={<span className="icon-label"><AppIcon name="bell" size={19} />{lang === "zh" ? "朋友分享" : "Friend shares"}</span>}
      >
        <div className="friend-notification-sheet pb-2">
          {notifications.length ? (
            <>
              {unread > 0 && (
                <button className="chip press self-end" onClick={() => markAllRead()}>
                  {lang === "zh" ? "全部標示為已讀" : "Mark all read"}
                </button>
              )}
              <div className="friend-notification-list">
                {notifications.map((notification) => (
                  <button
                    type="button"
                    className={`friend-notification-row press ${notification.readAt ? "" : "is-unread"}`}
                    key={notification.id}
                    onClick={() => openNotification(notification.id, notification.path)}
                  >
                    <span className="icon-tile"><AppIcon name={notification.kind === "recipe" ? "kitchen" : "gym"} size={18} /></span>
                    <span className="min-w-0 flex-1">
                      <b>{friendShareNotificationText(notification, lang)}</b>
                      <small>{new Intl.DateTimeFormat(lang === "zh" ? "zh-Hant" : "en", { dateStyle: "medium", timeStyle: "short" }).format(notification.createdAt)}</small>
                    </span>
                    {!notification.readAt && <i aria-label={lang === "zh" ? "未讀" : "Unread"} />}
                    <AppIcon name="next" size={15} />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="friend-notification-empty">
              <span className="empty-icon"><AppIcon name="bell" size={26} /></span>
              <b>{lang === "zh" ? "還沒有朋友分享通知" : "No friend shares yet"}</b>
              <small>{lang === "zh" ? "朋友分享食譜或訓練時會顯示在這裡。" : "You’ll see recipes and workouts here when friends share them."}</small>
            </div>
          )}
        </div>
      </Sheet>
    </>
  );
}
