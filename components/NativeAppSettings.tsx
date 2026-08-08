"use client";

import { useEffect, useState } from "react";
import { connectAndSyncAppleHealth } from "@/lib/appleHealth";
import {
  enablePushNotifications,
  isNativeApp,
  notificationState,
  setDailyReminder,
  successHaptic,
} from "@/lib/nativeApp";
import { useStore } from "@/lib/store";
import { GlassCard, toast } from "@/components/ui";
import { AppIcon } from "@/components/icons";

export default function NativeAppSettings() {
  const lang = useStore((state) => state.lang);
  const [native, setNative] = useState(false);
  const [permission, setPermission] = useState<string>("prompt");
  const [dailyReminder, setReminder] = useState(false);
  const [busy, setBusy] = useState<"health" | "push" | "reminder" | null>(null);

  useEffect(() => {
    const available = isNativeApp();
    setNative(available);
    if (available) {
      void notificationState().then((state) => {
        setPermission(state.permission);
        setReminder(state.dailyReminder);
      });
    }
  }, []);

  if (!native) return null;

  const syncHealth = async () => {
    setBusy("health");
    try {
      const result = await connectAndSyncAppleHealth();
      if (result.status === "synced") {
        await successHaptic();
        toast(result.xp > 0 ? `Apple Health · +${result.xp} XP` : (lang === "zh" ? "Apple 健康已同步" : "Apple Health is up to date"), "heart");
      } else {
        toast(lang === "zh" ? "無法取得健康資料權限" : "Health permission was not available", "warning");
      }
    } catch {
      toast(lang === "zh" ? "Apple 健康同步失敗" : "Apple Health sync failed", "warning");
    } finally {
      setBusy(null);
    }
  };

  const enablePush = async () => {
    setBusy("push");
    try {
      const next = await enablePushNotifications();
      setPermission(next);
      toast(next === "granted" ? (lang === "zh" ? "通知已開啟" : "Notifications enabled") : (lang === "zh" ? "通知權限未開啟" : "Notification permission was not granted"), next === "granted" ? "checkCircle" : "warning");
    } finally {
      setBusy(null);
    }
  };

  const toggleReminder = async () => {
    setBusy("reminder");
    try {
      const enabled = await setDailyReminder(!dailyReminder, lang);
      setReminder(enabled);
      if (enabled) setPermission("granted");
    } finally {
      setBusy(null);
    }
  };

  return (
    <GlassCard className="px-4 py-2 mb-4">
      <button type="button" className="row row-button press" onClick={() => void syncHealth()} disabled={busy !== null}>
        <div className="flex-1">
          <div className="font-semibold icon-label"><AppIcon name="heart" size={18} /> Apple Health</div>
          <div className="t-cap mt-1">{lang === "zh" ? "同步步數與站立時間" : "Sync steps and standing time"}</div>
        </div>
        <span className="chip">{busy === "health" ? "…" : (lang === "zh" ? "同步" : "Sync")}</span>
      </button>
      <button type="button" className="row row-button press" onClick={() => void enablePush()} disabled={busy !== null || permission === "granted"}>
        <div className="flex-1">
          <div className="font-semibold icon-label"><AppIcon name="bell" size={18} /> {lang === "zh" ? "推播通知" : "Push notifications"}</div>
          <div className="t-cap mt-1">{permission === "granted" ? (lang === "zh" ? "已允許" : "Allowed") : (lang === "zh" ? "接收農場與進度提醒" : "Receive farm and progress updates")}</div>
        </div>
        <span className="chip">{permission === "granted" ? <AppIcon name="check" size={15} /> : (busy === "push" ? "…" : (lang === "zh" ? "開啟" : "Enable"))}</span>
      </button>
      <button type="button" className="row row-button press" onClick={() => void toggleReminder()} disabled={busy !== null} aria-pressed={dailyReminder}>
        <div className="flex-1">
          <div className="font-semibold icon-label"><AppIcon name="timer" size={18} /> {lang === "zh" ? "每日記錄提醒" : "Daily logging reminder"}</div>
          <div className="t-cap mt-1">{lang === "zh" ? "每天晚上 7:00" : "Every day at 7:00 PM"}</div>
        </div>
        <span className={`chip ${dailyReminder ? "chip-on" : ""}`}>{dailyReminder ? (lang === "zh" ? "開" : "On") : (lang === "zh" ? "關" : "Off")}</span>
      </button>
    </GlassCard>
  );
}
