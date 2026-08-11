"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";

interface NativeThemeAudioPlugin {
  playTheme(options: { filename: string; volume: number }): Promise<{ playing: boolean }>;
  pauseTheme(): Promise<void>;
  stopTheme(): Promise<void>;
  setVolume(options: { volume: number }): Promise<void>;
}

const NativeThemeAudio = registerPlugin<NativeThemeAudioPlugin>("MelonMateAudio");

export function hasNativeThemeAudio() {
  return Capacitor.isNativePlatform();
}

export function playNativeTheme(filename: string, volume: number) {
  return NativeThemeAudio.playTheme({ filename, volume });
}

export function pauseNativeTheme() {
  return NativeThemeAudio.pauseTheme();
}

export function stopNativeTheme() {
  return NativeThemeAudio.stopTheme();
}

export function setNativeThemeVolume(volume: number) {
  return NativeThemeAudio.setVolume({ volume });
}
