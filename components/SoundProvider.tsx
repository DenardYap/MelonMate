"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_SOUND_PREFERENCES,
  playSound,
  readSoundPreferences,
  resumeSoundscape,
  saveSoundPreferences,
  syncBackgroundMusic,
  suspendSoundscape,
  type SoundEffect,
  type SoundPreferences,
} from "@/lib/soundscape";

interface SoundContextValue {
  preferences: SoundPreferences;
  updatePreferences: (patch: Partial<SoundPreferences>) => void;
}

const SoundContext = createContext<SoundContextValue>({
  preferences: DEFAULT_SOUND_PREFERENCES,
  updatePreferences: () => {},
});

const SOUND_EFFECTS = new Set<SoundEffect>([
  "click",
  "plant",
  "harvest",
  "spell",
  "levelUp",
  "success",
  "error",
  "expand",
  "scan",
  "timer",
]);

export default function SoundProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState(DEFAULT_SOUND_PREFERENCES);

  useEffect(() => {
    const saved = readSoundPreferences();
    setPreferences(saved);
    saveSoundPreferences(saved);
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      syncBackgroundMusic();
      if (!(event.target instanceof Element)) return;
      const control = event.target.closest<HTMLElement>("button, a, [role='button'], [role='switch']");
      if (!control || control.dataset.sound === "none") return;
      if (control.matches(":disabled") || control.getAttribute("aria-disabled") === "true") return;
      const requested = control.dataset.sound as SoundEffect | undefined;
      const effect = requested && SOUND_EFFECTS.has(requested) ? requested : "click";
      playSound(effect);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") suspendSoundscape();
      else resumeSoundscape();
    };

    const onFocus = () => syncBackgroundMusic();
    const timeCheck = window.setInterval(() => syncBackgroundMusic(), 60_000);

    document.addEventListener("click", onClick, true);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);
    syncBackgroundMusic();
    return () => {
      window.clearInterval(timeCheck);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const updatePreferences = useCallback((patch: Partial<SoundPreferences>) => {
    setPreferences((current) => {
      const next = { ...current, ...patch };
      saveSoundPreferences(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ preferences, updatePreferences }),
    [preferences, updatePreferences]
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound() {
  return useContext(SoundContext);
}
