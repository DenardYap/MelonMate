"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { syncNow } from "@/lib/sync";
import TabBar from "@/components/TabBar";
import { ConfettiHost, ToastHost, toast } from "@/components/ui";
import { BrandMark } from "@/components/icons";
import OnboardingFlow from "@/components/OnboardingFlow";
import { useRouter } from "next/navigation";
import { initializeNativeApp, isNativeApp } from "@/lib/nativeApp";
import LevelUpCelebration from "@/components/LevelUpCelebration";
import AchievementCelebration from "@/components/AchievementCelebration";
import SoundProvider from "@/components/SoundProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const friendCode = useStore((s) => s.ws.code);
  const theme = useStore((s) => s.theme);
  const lang = useStore((s) => s.lang);

  useEffect(() => {
    document.documentElement.dataset.theme = theme ?? "honeydew";
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-Hant" : "en";
  }, [lang]);

  useEffect(() => {
    // zustand/persist rehydrates synchronously from localStorage on first client render
    setHydrated(true);
    const reconcile = () => useStore.getState().reconcileGame();
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
    if (!hydrated || !friendCode) return;
    void syncNow();
    const timer = window.setInterval(() => void syncNow(), 60_000);
    return () => window.clearInterval(timer);
  }, [hydrated, friendCode]);

  if (!hydrated) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="empty-icon a-floaty"><BrandMark size={40} /></div>
      </div>
    );
  }

  return (
    <SoundProvider>
      {children}
      <TabBar />
      <Onboarding />
      <LevelUpCelebration />
      <AchievementCelebration />
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
