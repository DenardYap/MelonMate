"use client";

import { GlassCard } from "@/components/ui";
import { useSound } from "@/components/SoundProvider";
import { useStore } from "@/lib/store";

export default function SoundSettings() {
  const lang = useStore((state) => state.lang);
  const { preferences, updatePreferences } = useSound();
  const soundLabel = lang === "zh" ? "音效" : "Sound effects";
  const musicLabel = lang === "zh" ? "背景音樂" : "Background music";
  const musicDescription = lang === "zh" ? "隨早晨、下午和夜晚自動變換" : "Changes with morning, afternoon, and night";

  return (
    <GlassCard className="sound-settings p-4 mb-4">
      <button
        type="button"
        className="sound-setting-row sound-setting-row-simple press"
        role="switch"
        aria-checked={preferences.sfxEnabled}
        onClick={() => updatePreferences({ sfxEnabled: !preferences.sfxEnabled })}
      >
        <b>{soundLabel}</b>
        <span className={`sound-switch ${preferences.sfxEnabled ? "is-on" : ""}`} aria-hidden="true"><i /></span>
      </button>
      <button
        type="button"
        className="sound-setting-row sound-setting-row-simple press"
        role="switch"
        aria-checked={preferences.musicEnabled}
        onClick={() => updatePreferences({ musicEnabled: !preferences.musicEnabled })}
      >
        <span>
          <b>{musicLabel}</b>
          <small>{musicDescription}</small>
        </span>
        <span className={`sound-switch ${preferences.musicEnabled ? "is-on" : ""}`} aria-hidden="true"><i /></span>
      </button>
    </GlassCard>
  );
}
