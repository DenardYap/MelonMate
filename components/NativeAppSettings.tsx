"use client";

import { useEffect, useState } from "react";
import { connectAndSyncAppleHealth, isAppleHealthConnected } from "@/lib/appleHealth";
import {
  enablePushNotifications,
  isNativeApp,
  notificationState,
  setAutomatedCampaign,
  successHaptic,
} from "@/lib/nativeApp";
import type { CampaignPreferenceKey, NativeCampaignPreferences } from "@/lib/nativeNotificationCampaigns";
import { useStore } from "@/lib/store";
import { GlassCard, toast } from "@/components/ui";
import { AppIcon } from "@/components/icons";

export default function NativeAppSettings() {
  const lang = useStore((state) => state.lang);
  const [native, setNative] = useState(false);
  const [healthConnected, setHealthConnected] = useState(false);
  const [permission, setPermission] = useState<string>("prompt");
  const [campaigns, setCampaigns] = useState<NativeCampaignPreferences>({
    mealReminders: false,
    streakReminders: false,
    harvestReminders: false,
  });
  const [busy, setBusy] = useState<"health" | "push" | CampaignPreferenceKey | null>(null);

  useEffect(() => {
    const available = isNativeApp();
    setNative(available);
    setHealthConnected(isAppleHealthConnected());
    if (available) {
      void notificationState().then((state) => {
        setPermission(state.permission);
        setCampaigns(state.campaigns);
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
      } else if (result.status === "error") {
        toast(lang === "zh" ? "無法讀取 Apple 健康，請再試一次" : "Couldn’t read Apple Health. Please try again.", "warning");
      } else {
        toast(lang === "zh" ? "無法取得健康資料權限" : "Health permission was not available", "warning");
      }
    } catch {
      toast(lang === "zh" ? "Apple 健康同步失敗" : "Apple Health sync failed", "warning");
    } finally {
      setHealthConnected(isAppleHealthConnected());
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

  const toggleCampaign = async (campaign: CampaignPreferenceKey) => {
    setBusy(campaign);
    try {
      const enabled = await setAutomatedCampaign(campaign, !campaigns[campaign]);
      setCampaigns((current) => ({ ...current, [campaign]: enabled }));
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
          <div className="t-cap mt-1">{healthConnected
            ? (lang === "zh" ? "已連接 · 同步步數、站立與 Apple Watch 訓練" : "Connected · syncs steps, standing, and Apple Watch workouts")
            : (lang === "zh" ? "連接後自動同步步數、站立與訓練" : "Connect to sync steps, standing, and workouts automatically")}</div>
        </div>
        <span className={`chip ${healthConnected ? "chip-on" : ""}`}>{busy === "health" ? "…" : healthConnected ? (lang === "zh" ? "立即同步" : "Sync now") : (lang === "zh" ? "連接" : "Connect")}</span>
      </button>
      <button type="button" className="row row-button press" onClick={() => void enablePush()} disabled={busy !== null || permission === "granted"}>
        <div className="flex-1">
          <div className="font-semibold icon-label"><AppIcon name="bell" size={18} /> {lang === "zh" ? "推播通知" : "Push notifications"}</div>
          <div className="t-cap mt-1">{permission === "granted" ? (lang === "zh" ? "已允許" : "Allowed") : (lang === "zh" ? "接收農場與進度提醒" : "Receive farm and progress updates")}</div>
        </div>
        <span className="chip">{permission === "granted" ? <AppIcon name="check" size={15} /> : (busy === "push" ? "…" : (lang === "zh" ? "開啟" : "Enable"))}</span>
      </button>
      <button
        type="button"
        className="row row-button press"
        onClick={() => void toggleCampaign("mealReminders")}
        disabled={busy !== null}
        aria-pressed={campaigns.mealReminders}
      >
        <div className="flex-1">
          <div className="font-semibold icon-label"><AppIcon name="cutlery" size={18} /> {lang === "zh" ? "用餐提醒" : "Meal reminders"}</div>
          <div className="t-cap mt-1">{lang === "zh" ? "早餐 9:00、午餐 1:00、晚餐 7:00；已記錄則略過" : "9 AM breakfast, 1 PM lunch, 7 PM dinner; skips meals already logged"}</div>
        </div>
        <span className={`chip ${campaigns.mealReminders ? "chip-on" : ""}`}>{campaigns.mealReminders ? (lang === "zh" ? "開" : "On") : (lang === "zh" ? "關" : "Off")}</span>
      </button>
      <button
        type="button"
        className="row row-button press"
        onClick={() => void toggleCampaign("streakReminders")}
        disabled={busy !== null}
        aria-pressed={campaigns.streakReminders}
      >
        <div className="flex-1">
          <div className="font-semibold icon-label"><AppIcon name="fire" size={18} /> {lang === "zh" ? "連續紀錄提醒" : "Streak reminders"}</div>
          <div className="t-cap mt-1">{lang === "zh" ? "晚上 8:30 提醒尚未完成的每日目標" : "8:30 PM nudge when the daily goal is incomplete"}</div>
        </div>
        <span className={`chip ${campaigns.streakReminders ? "chip-on" : ""}`}>{campaigns.streakReminders ? (lang === "zh" ? "開" : "On") : (lang === "zh" ? "關" : "Off")}</span>
      </button>
      <button
        type="button"
        className="row row-button press"
        onClick={() => void toggleCampaign("harvestReminders")}
        disabled={busy !== null}
        aria-pressed={campaigns.harvestReminders}
      >
        <div className="flex-1">
          <div className="font-semibold icon-label"><AppIcon name="fruit" size={18} /> {lang === "zh" ? "採收提醒" : "Harvest reminders"}</div>
          <div className="t-cap mt-1">{lang === "zh" ? "3 分鐘內成熟的瓜會合併通知" : "Melons ready within 3 minutes share one alert"}</div>
        </div>
        <span className={`chip ${campaigns.harvestReminders ? "chip-on" : ""}`}>{campaigns.harvestReminders ? (lang === "zh" ? "開" : "On") : (lang === "zh" ? "關" : "Off")}</span>
      </button>
    </GlassCard>
  );
}
