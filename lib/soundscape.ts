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
  musicEnabled: boolean;
  volume: number;
}

export const DEFAULT_SOUND_PREFERENCES: SoundPreferences = {
  sfxEnabled: true,
  musicEnabled: true,
  volume: 0.52,
};

export type BackgroundTheme = "morning" | "afternoon" | "night";

export interface BackgroundThemeTrack {
  id: BackgroundTheme;
  title: string;
  source: string;
}

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
const BACKGROUND_TRACKS: Record<BackgroundTheme, BackgroundThemeTrack> = {
  morning: {
    id: "morning",
    title: "Melon Morning",
    source: "/audio/theme-samples/01-melon-morning.mp3",
  },
  afternoon: {
    id: "afternoon",
    title: "Garden Bounce",
    source: "/audio/theme-samples/02-garden-bounce.mp3",
  },
  night: {
    id: "night",
    title: "Firefly Supper",
    source: "/audio/theme-samples/03-firefly-supper.mp3",
  },
};
const MUSIC_VOLUME_MULTIPLIER = 0.32;

interface WebAudioSession {
  type: "auto" | "playback" | "transient" | "transient-solo" | "ambient" | "play-and-record";
}

let preferences = DEFAULT_SOUND_PREFERENCES;
let suspended = false;
let backgroundPlayer: HTMLAudioElement | null = null;
let backgroundSource: string | null = null;
const activeEffects = new Set<HTMLAudioElement>();

export function getBackgroundThemeForHour(hour: number): BackgroundThemeTrack {
  const localHour = ((Math.trunc(hour) % 24) + 24) % 24;
  if (localHour >= 5 && localHour < 12) return BACKGROUND_TRACKS.morning;
  if (localHour >= 12 && localHour < 18) return BACKGROUND_TRACKS.afternoon;
  return BACKGROUND_TRACKS.night;
}

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
  configureAudioSession();
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Sound settings are a convenience and should never block the app.
    }
  }
  if (!preferences.sfxEnabled) stopEffects();
  if (!preferences.musicEnabled) {
    stopBackgroundMusic(true);
  } else {
    updateBackgroundVolume();
    syncBackgroundMusic();
  }
}

export function suspendSoundscape() {
  suspended = true;
  stopEffects();
  backgroundPlayer?.pause();
}

export function resumeSoundscape() {
  suspended = false;
  configureAudioSession();
  syncBackgroundMusic();
}

export function syncBackgroundMusic(now = new Date()) {
  if (!preferences.musicEnabled || suspended || typeof window === "undefined") return;
  configureAudioSession();
  const theme = getBackgroundThemeForHour(now.getHours());

  if (!backgroundPlayer || backgroundSource !== theme.source) {
    stopBackgroundMusic(true);
    backgroundPlayer = createPlayer(theme.source);
    backgroundPlayer.loop = true;
    backgroundSource = theme.source;
  }

  updateBackgroundVolume();
  if (backgroundPlayer.paused) void backgroundPlayer.play().catch(() => {
    // Browsers can block autoplay. The provider retries from the next user gesture.
  });
}

export function playSound(effect: SoundEffect) {
  if (!preferences.sfxEnabled || suspended || typeof window === "undefined") return;
  configureAudioSession();
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
    musicEnabled: Boolean(value.musicEnabled),
    volume: Math.min(1, Math.max(0, Number.isFinite(value.volume) ? value.volume : DEFAULT_SOUND_PREFERENCES.volume)),
  };
}

function createPlayer(source: string) {
  const player = new Audio(source);
  player.preload = "auto";
  player.setAttribute("playsinline", "");
  return player;
}

function configureAudioSession() {
  if (typeof navigator === "undefined") return;
  const audioSession = (navigator as Navigator & { audioSession?: WebAudioSession }).audioSession;
  if (!audioSession) return;
  try {
    // Treat effects as non-primary audio when the theme is muted so music from
    // another app keeps playing. Theme playback remains a primary media session.
    audioSession.type = preferences.musicEnabled ? "playback" : "transient";
  } catch {
    // Audio Session API support varies by browser and OS version.
  }
}

function stopEffects() {
  activeEffects.forEach((player) => {
    player.pause();
    player.currentTime = 0;
  });
  activeEffects.clear();
}

function updateBackgroundVolume() {
  if (backgroundPlayer) {
    backgroundPlayer.volume = Math.min(1, preferences.volume * MUSIC_VOLUME_MULTIPLIER);
  }
}

function stopBackgroundMusic(reset: boolean) {
  if (!backgroundPlayer) return;
  backgroundPlayer.pause();
  if (reset) backgroundPlayer.currentTime = 0;
  if (reset) {
    backgroundPlayer = null;
    backgroundSource = null;
  }
}
