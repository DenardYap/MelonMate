"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { useGardenStore } from "@/lib/gardenStore";
import { connectionCodes, syncNow } from "@/lib/sync";
import TabBar from "@/components/TabBar";
import { ConfettiHost, ToastHost, toast } from "@/components/ui";
import { BrandMark } from "@/components/icons";
import OnboardingFlow from "@/components/OnboardingFlow";
import { useRouter } from "next/navigation";
import { initializeNativeApp, isNativeApp } from "@/lib/nativeApp";
import LevelUpCelebration from "@/components/LevelUpCelebration";
import AchievementCelebration from "@/components/AchievementCelebration";
import HealthRewardCelebration from "@/components/HealthRewardCelebration";
import SoundProvider from "@/components/SoundProvider";
import { FriendShareNotifier } from "@/components/FriendShareNotifications";
import StreakRewardCelebration from "@/components/StreakRewardCelebration";
import { applyThemeAppearance } from "@/lib/themeAppearance";

export default function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const friendCodesKey = useStore((s) => connectionCodes(s.ws).join("|"));
  const activeProfileId = useStore((s) => s.activeProfileId);
  const gameProgress = useStore((s) => s.game[s.activeProfileId]);
  const profile = useStore((s) => s.profiles.find((item) => item.id === s.activeProfileId));
  const logs = useStore((s) => s.logs[s.activeProfileId]);
  const sessions = useStore((s) => s.sessions[s.activeProfileId]);
  const health = useStore((s) => s.health[s.activeProfileId]);
  const planner = useStore((s) => s.planner);
  const recipes = useStore((s) => s.recipes);
  const plans = useStore((s) => s.plans);
  const farm = useGardenStore((s) => s.gardens[activeProfileId]);
  const theme = useStore((s) => s.theme);
  const lang = useStore((s) => s.lang);

  useEffect(() => {
    document.documentElement.dataset.theme = theme ?? "honeydew";
    applyThemeAppearance(theme ?? "honeydew");
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-Hant" : "en";
  }, [lang]);

  useEffect(() => {
    // zustand/persist rehydrates synchronously from localStorage on first client render
    setHydrated(true);
    const reconcile = () => {
      const legacyFarmXp = Object.fromEntries(
        Object.entries(useGardenStore.getState().gardens).map(([profileId, garden]) => [
          profileId,
          garden.gardenXp,
        ])
      );
      useStore.getState().grandfatherLegacyFarmXp(legacyFarmXp);
      useStore.getState().reconcileGame();
    };
    const reconcileWhenVisible = () => {
      if (document.visibilityState === "visible") reconcile();
    };
    reconcile();
    window.addEventListener("focus", reconcile);
    document.addEventListener("visibilitychange", reconcileWhenVisible);
    if (!isNativeApp() && "serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    return () => {
      window.removeEventListener("focus", reconcile);
      document.removeEventListener("visibilitychange", reconcileWhenVisible);
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !isNativeApp()) return;
    let dispose = () => {};
    void initializeNativeApp({
      deviceId: useStore.getState().ws.deviceId,
      lang: useStore.getState().lang,
      navigate: (path) => router.push(path),
      onHealthSynced: (xp) => {
        if (xp > 0) toast(`Apple Health · +${xp} XP`, "heart");
      },
    }).then((cleanup) => { dispose = cleanup; });
    return () => dispose();
  }, [hydrated, lang, router]);

  useEffect(() => {
    if (!hydrated || !friendCodesKey) return;
    const sync = () => void syncNow();
    const syncWhenVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    const debounce = window.setTimeout(sync, 350);
    const timer = window.setInterval(sync, 15_000);
    window.addEventListener("focus", sync);
    window.addEventListener("online", sync);
    document.addEventListener("visibilitychange", syncWhenVisible);
    return () => {
      window.clearTimeout(debounce);
      window.clearInterval(timer);
      window.removeEventListener("focus", sync);
      window.removeEventListener("online", sync);
      document.removeEventListener("visibilitychange", syncWhenVisible);
    };
  }, [hydrated, friendCodesKey, gameProgress, profile, logs, sessions, health, planner, recipes, plans, farm, theme]);

  if (!hydrated) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="empty-icon a-floaty"><BrandMark size={40} theme={theme} /></div>
      </div>
    );
  }

  return (
    <SoundProvider>
      {children}
      <TabBar />
      <Onboarding />
      <HealthRewardCelebration />
      <StreakRewardCelebration />
      <LevelUpCelebration />
      <AchievementCelebration />
      <FriendShareNotifier />
      <ToastHost />
      <ConfettiHost />
    </SoundProvider>
  );
}

function Onboarding() {
  const onboarded = useStore((s) => s.onboarded);
  if (onboarded) return null;
  return <OnboardingFlow />;
}
