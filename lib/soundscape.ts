"use client";

import {
  hasNativeThemeAudio,
  pauseNativeTheme,
  playNativeEffect,
  playNativeTheme,
  setNativeThemeVolume,
  stopNativeTheme,
} from "./nativeThemeAudio";
import {
  DEFAULT_MUSIC_PACK_ID,
  getMusicTrackForHour,
  isMusicPackId,
  type BackgroundThemeTrack,
  type MusicPackId,
} from "./musicPacks";

export type { BackgroundTheme, BackgroundThemeTrack, MusicPackId } from "./musicPacks";

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
  musicPackId: MusicPackId;
}

export const DEFAULT_SOUND_PREFERENCES: SoundPreferences = {
  sfxEnabled: true,
  musicEnabled: true,
  volume: 0.52,
  musicPackId: DEFAULT_MUSIC_PACK_ID,
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
const MUSIC_VOLUME_MULTIPLIER = 0.32;

interface WebAudioSession {
  type: "auto" | "playback" | "transient" | "transient-solo" | "ambient" | "play-and-record";
}

let preferences = DEFAULT_SOUND_PREFERENCES;
let suspended = false;
let voiceCaptureDepth = 0;
let suspendedBeforeVoiceCapture = false;
let backgroundContext: AudioContext | null = null;
let backgroundGain: GainNode | null = null;
let backgroundNode: AudioBufferSourceNode | null = null;
let backgroundSource: string | null = null;
let backgroundLoadingSource: string | null = null;
let backgroundLoadToken = 0;
const backgroundBuffers = new Map<string, AudioBuffer>();
const activeEffects = new Set<HTMLAudioElement>();

export function getBackgroundThemeForHour(
  hour: number,
  packId: MusicPackId = DEFAULT_MUSIC_PACK_ID
): BackgroundThemeTrack {
  return getMusicTrackForHour(hour, packId);
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
  suspendBackgroundMusic();
}

export function resumeSoundscape() {
  if (voiceCaptureDepth > 0) return;
  suspended = false;
  configureAudioSession();
  syncBackgroundMusic();
}

export function beginVoiceCaptureSoundscape() {
  if (voiceCaptureDepth === 0) {
    suspendedBeforeVoiceCapture = suspended;
    suspended = true;
    stopEffects();
    suspendBackgroundMusic();
    setAudioSessionType("play-and-record");
  }
  voiceCaptureDepth += 1;
}

export function endVoiceCaptureSoundscape() {
  if (voiceCaptureDepth === 0) return;
  voiceCaptureDepth -= 1;
  if (voiceCaptureDepth > 0) return;

  const pageIsHidden = typeof document !== "undefined" && document.visibilityState === "hidden";
  suspended = suspendedBeforeVoiceCapture || pageIsHidden;
  suspendedBeforeVoiceCapture = false;
  if (suspended) return;
  configureAudioSession();
  syncBackgroundMusic();
}

export function syncBackgroundMusic(now = new Date()) {
  if (!preferences.musicEnabled || suspended || typeof window === "undefined") return;
  configureAudioSession();
  const theme = getBackgroundThemeForHour(now.getHours(), preferences.musicPackId);

  if (backgroundSource !== theme.source) {
    stopBackgroundMusic(true);
    backgroundSource = theme.source;
  }

  if (hasNativeThemeAudio()) {
    const filename = theme.source.split("/").at(-1);
    if (!filename) return;
    void playNativeTheme(filename, musicVolume()).catch(() => {
      // Native playback errors are logged by the plugin and music stays optional.
    });
    return;
  }

  const context = getBackgroundAudioContext();
  if (!context) return;
  updateBackgroundVolume();
  if (context.state !== "running" && context.state !== "closed") void context.resume().catch(() => {
    // Browsers can block autoplay. The provider retries from the next user gesture.
  });
  if (!backgroundNode && backgroundLoadingSource !== theme.source) {
    const token = ++backgroundLoadToken;
    backgroundLoadingSource = theme.source;
    void loadAndStartBackgroundMusic(context, theme.source, token);
  }
}

export function playSound(effect: SoundEffect) {
  if (!preferences.sfxEnabled || suspended || typeof window === "undefined") return;
  configureAudioSession();
  if (hasNativeThemeAudio()) {
    const filename = EFFECT_TRACKS[effect].split("/").at(-1);
    if (filename) void playNativeEffect(filename, Math.min(1, preferences.volume * 1.45)).catch(() => {});
    return;
  }
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
    musicPackId: isMusicPackId(value.musicPackId) ? value.musicPackId : DEFAULT_MUSIC_PACK_ID,
  };
}

function createPlayer(source: string) {
  const player = new Audio(source);
  player.preload = "auto";
  player.setAttribute("playsinline", "");
  return player;
}

function configureAudioSession() {
  // The theme uses Web Audio rather than a media element, so playback mode can
  // remain audible on iOS without registering transport controls in Now Playing.
  // With the theme muted, effects stay transient and mix with other apps.
  setAudioSessionType(preferences.musicEnabled ? "playback" : "transient");
  clearMediaSession();
}

function setAudioSessionType(type: WebAudioSession["type"]) {
  if (typeof navigator === "undefined") return;
  const audioSession = (navigator as Navigator & { audioSession?: WebAudioSession }).audioSession;
  if (!audioSession) return;
  try {
    audioSession.type = type;
  } catch {
    // Audio Session API support varies by browser and OS version.
  }
}

function clearMediaSession() {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
  try {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = "none";
  } catch {
    // A browser may expose only part of the Media Session API.
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
  if (hasNativeThemeAudio()) {
    void setNativeThemeVolume(musicVolume()).catch(() => {});
    return;
  }
  if (backgroundContext && backgroundGain) {
    backgroundGain.gain.setValueAtTime(
      musicVolume(),
      backgroundContext.currentTime,
    );
  }
}

function stopBackgroundMusic(reset: boolean) {
  if (hasNativeThemeAudio()) {
    void stopNativeTheme().catch(() => {});
    if (reset) backgroundSource = null;
    return;
  }
  if (backgroundNode) {
    backgroundNode.stop();
    backgroundNode.disconnect();
    backgroundNode = null;
  }
  if (reset) {
    backgroundLoadToken += 1;
    backgroundLoadingSource = null;
    backgroundSource = null;
    suspendBackgroundMusic();
  }
}

function suspendBackgroundMusic() {
  if (hasNativeThemeAudio()) {
    void pauseNativeTheme().catch(() => {});
    return;
  }
  if (backgroundContext?.state === "running") {
    void backgroundContext.suspend().catch(() => {});
  }
}

function musicVolume() {
  return Math.min(1, preferences.volume * MUSIC_VOLUME_MULTIPLIER);
}

type AudioContextConstructor = new () => AudioContext;

function getBackgroundAudioContext() {
  if (backgroundContext) return backgroundContext;
  const AudioContextClass = window.AudioContext
    ?? (window as Window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
  if (!AudioContextClass) return null;
  backgroundContext = new AudioContextClass();
  backgroundGain = backgroundContext.createGain();
  backgroundGain.connect(backgroundContext.destination);
  return backgroundContext;
}

async function loadAndStartBackgroundMusic(context: AudioContext, source: string, token: number) {
  try {
    let buffer = backgroundBuffers.get(source);
    if (!buffer) {
      const response = await fetch(source);
      if (!response.ok) throw new Error(`Unable to load background music: ${response.status}`);
      buffer = await context.decodeAudioData(await response.arrayBuffer());
      backgroundBuffers.set(source, buffer);
    }
    if (
      token !== backgroundLoadToken
      || source !== backgroundSource
      || !preferences.musicEnabled
      || suspended
      || !backgroundGain
    ) return;

    const node = context.createBufferSource();
    node.buffer = buffer;
    node.loop = true;
    node.connect(backgroundGain);
    node.start();
    backgroundNode = node;
    clearMediaSession();
  } catch {
    // Music is optional; a failed asset should never affect app usage.
  } finally {
    if (backgroundLoadingSource === source) backgroundLoadingSource = null;
  }
}
