"use client";

export type SoundEffect =
  | "click"
  | "plant"
  | "harvest"
  | "spell"
  | "levelUp"
  | "success"
  | "error"
  | "expand"
  | "scan"
  | "timer";

export interface SoundPreferences {
  sfxEnabled: boolean;
  volume: number;
}

export const DEFAULT_SOUND_PREFERENCES: SoundPreferences = {
  sfxEnabled: true,
  volume: 0.52,
};

const STORAGE_KEY = "melonmate-sound-v1";
const EFFECT_TRACKS: Record<SoundEffect, string> = {
  click: "/audio/click.wav",
  plant: "/audio/plant.wav",
  harvest: "/audio/harvest.wav",
  spell: "/audio/spell.wav",
  levelUp: "/audio/level-up.wav",
  success: "/audio/success.wav",
  error: "/audio/error.wav",
  expand: "/audio/expand.wav",
  scan: "/audio/scan.wav",
  timer: "/audio/timer.wav",
};

let preferences = DEFAULT_SOUND_PREFERENCES;
let suspended = false;
const activeEffects = new Set<HTMLAudioElement>();

export function readSoundPreferences(): SoundPreferences {
  if (typeof window === "undefined") return DEFAULT_SOUND_PREFERENCES;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<SoundPreferences>;
    return normalizePreferences({ ...DEFAULT_SOUND_PREFERENCES, ...saved });
  } catch {
    return DEFAULT_SOUND_PREFERENCES;
  }
}

export function saveSoundPreferences(next: SoundPreferences) {
  preferences = normalizePreferences(next);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Sound settings are a convenience and should never block the app.
    }
  }
  if (!preferences.sfxEnabled) stopEffects();
}

export function suspendSoundscape() {
  suspended = true;
  stopEffects();
}

export function resumeSoundscape() {
  suspended = false;
}

export function playSound(effect: SoundEffect) {
  if (!preferences.sfxEnabled || suspended || typeof window === "undefined") return;
  const player = createPlayer(EFFECT_TRACKS[effect]);
  player.volume = Math.min(1, preferences.volume * 1.45);
  activeEffects.add(player);
  const cleanup = () => activeEffects.delete(player);
  player.addEventListener("ended", cleanup, { once: true });
  player.addEventListener("error", cleanup, { once: true });
  void player.play().catch(cleanup);
}

function normalizePreferences(value: SoundPreferences): SoundPreferences {
  return {
    sfxEnabled: Boolean(value.sfxEnabled),
    volume: Math.min(1, Math.max(0, Number.isFinite(value.volume) ? value.volume : DEFAULT_SOUND_PREFERENCES.volume)),
  };
}

function createPlayer(source: string) {
  const player = new Audio(source);
  player.preload = "auto";
  player.setAttribute("playsinline", "");
  return player;
}

function stopEffects() {
  activeEffects.forEach((player) => {
    player.pause();
    player.currentTime = 0;
  });
  activeEffects.clear();
}
