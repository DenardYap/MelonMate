"use client";

import { GlassCard } from "@/components/ui";
import { useSound } from "@/components/SoundProvider";
import { useStore } from "@/lib/store";

export default function SoundSettings() {
  const lang = useStore((state) => state.lang);
  const { preferences, updatePreferences } = useSound();
  const label = lang === "zh" ? "音效" : "Sound effects";

  return (
    <GlassCard className="sound-settings p-4 mb-4">
      <button
        type="button"
        className="sound-setting-row sound-setting-row-simple press"
        role="switch"
        aria-checked={preferences.sfxEnabled}
        onClick={() => updatePreferences({ sfxEnabled: !preferences.sfxEnabled })}
      >
        <b>{label}</b>
        <span className={`sound-switch ${preferences.sfxEnabled ? "is-on" : ""}`} aria-hidden="true"><i /></span>
      </button>
    </GlassCard>
  );
}
