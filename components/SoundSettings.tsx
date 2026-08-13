"use client";

import { GlassCard } from "@/components/ui";
import { AppIcon } from "@/components/icons";
import { useSound } from "@/components/SoundProvider";
import { levelFromXp } from "@/lib/game";
import { isMusicPackUnlocked, MUSIC_PACKS } from "@/lib/musicPacks";
import { useGame, useStore } from "@/lib/store";

export default function SoundSettings() {
  const lang = useStore((state) => state.lang);
  const level = levelFromXp(useGame().xp);
  const { preferences, updatePreferences } = useSound();
  const soundLabel = lang === "zh" ? "音效" : "Sound effects";
  const musicLabel = lang === "zh" ? "背景音樂" : "Background music";
  const musicDescription = lang === "zh" ? "隨早晨、下午和夜晚自動變換" : "Changes with morning, afternoon, and night";
  const musicCredit = lang === "zh" ? "音樂：Kevin MacLeod · 查看授權" : "Music by Kevin MacLeod · Credits & license";
  const packLabel = lang === "zh" ? "音樂包" : "Music pack";
  const trackPeriods = lang === "zh" ? ["早晨", "下午", "夜晚"] : ["Morning", "Afternoon", "Night"];

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
      <div className="music-pack-heading">
        <span><AppIcon name="music" size={15} /> {packLabel}</span>
        <small>{lang === "zh" ? `目前等級 ${level}` : `Level ${level}`}</small>
      </div>
      <div className="music-pack-grid" role="radiogroup" aria-label={packLabel}>
        {MUSIC_PACKS.map((pack) => {
          const unlocked = isMusicPackUnlocked(pack, level);
          const selected = preferences.musicPackId === pack.id;
          return (
            <button
              key={pack.id}
              type="button"
              className={`music-pack-option press ${selected ? "is-selected" : ""} ${unlocked ? "" : "is-locked"}`}
              role="radio"
              aria-checked={selected}
              disabled={!unlocked}
              onClick={() => updatePreferences({ musicPackId: pack.id })}
            >
              <span className="music-pack-art" aria-hidden="true">
                {pack.colors.map((color) => <i key={color} style={{ background: color }} />)}
                <AppIcon name={unlocked ? "music" : "lock"} size={18} />
              </span>
              <span className="music-pack-copy">
                <b>{pack.name[lang]}</b>
                <small>{unlocked ? pack.description[lang] : (lang === "zh" ? `等級 ${pack.unlockLevel} 解鎖` : `Unlocks at Level ${pack.unlockLevel}`)}</small>
                <span className="music-pack-tracks">
                  {Object.values(pack.tracks).map((track, index) => (
                    <em key={track.id}>{trackPeriods[index]} · {track.title}</em>
                  ))}
                </span>
              </span>
              {selected && <span className="music-pack-check" aria-hidden="true"><AppIcon name="check" size={14} /></span>}
            </button>
          );
        })}
      </div>
      <a className="sound-music-credit" href="/audio/music-credits.txt" target="_blank" rel="noreferrer">
        {musicCredit}
      </a>
    </GlassCard>
  );
}
