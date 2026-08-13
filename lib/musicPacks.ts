import type { BiText } from "./types";

export type BackgroundTheme = "morning" | "afternoon" | "night";
export type MusicPackId = "cozy-grove" | "peppy-picnic" | "town-cafe" | "moonlit-meadow";

export interface BackgroundThemeTrack {
  id: BackgroundTheme;
  title: string;
  source: string;
}

export interface MusicPack {
  id: MusicPackId;
  name: BiText;
  description: BiText;
  unlockLevel: number;
  colors: readonly [string, string, string];
  tracks: Record<BackgroundTheme, BackgroundThemeTrack>;
}

export const DEFAULT_MUSIC_PACK_ID: MusicPackId = "cozy-grove";

export const MUSIC_PACKS: readonly MusicPack[] = [
  {
    id: "cozy-grove",
    name: { en: "Cozy Grove", zh: "舒心果園" },
    description: { en: "Easygoing and sunny", zh: "悠閒又陽光" },
    unlockLevel: 1,
    colors: ["#dcecae", "#f4ca62", "#98c8ae"],
    tracks: {
      morning: { id: "morning", title: "Townie Loop", source: "/audio/theme-samples/01-townie-loop.mp3" },
      afternoon: { id: "afternoon", title: "Sidewalk Shade - slower", source: "/audio/theme-samples/02-sidewalk-shade-slower.mp3" },
      night: { id: "night", title: "Bossa Antigua", source: "/audio/theme-samples/03-bossa-antigua.mp3" },
    },
  },
  {
    id: "peppy-picnic",
    name: { en: "Peppy Picnic", zh: "活力野餐" },
    description: { en: "Playful strings and garden-game charm", zh: "俏皮弦樂與田園遊戲感" },
    unlockLevel: 5,
    colors: ["#ffcd68", "#f58f82", "#8fd1aa"],
    tracks: {
      morning: { id: "morning", title: "Fuzzball Parade", source: "/audio/theme-samples/04-fuzzball-parade.mp3" },
      afternoon: { id: "afternoon", title: "Wholesome", source: "/audio/theme-samples/05-wholesome.mp3" },
      night: { id: "night", title: "Farm", source: "/audio/theme-samples/06-farm.mp3" },
    },
  },
  {
    id: "town-cafe",
    name: { en: "Town Café", zh: "小鎮咖啡館" },
    description: { en: "Warm, jazzy, and gently groovy", zh: "溫暖、爵士、輕鬆律動" },
    unlockLevel: 10,
    colors: ["#e8c392", "#9eb8a2", "#d48d70"],
    tracks: {
      morning: { id: "morning", title: "Local Forecast - Slower", source: "/audio/theme-samples/07-local-forecast-slower.mp3" },
      afternoon: { id: "afternoon", title: "Lobby Time", source: "/audio/theme-samples/08-lobby-time.mp3" },
      night: { id: "night", title: "Casa Bossa Nova", source: "/audio/theme-samples/09-casa-bossa-nova.mp3" },
    },
  },
  {
    id: "moonlit-meadow",
    name: { en: "Moonlit Meadow", zh: "月光草地" },
    description: { en: "Soft, calm, and dreamy", zh: "柔和、平靜又夢幻" },
    unlockLevel: 15,
    colors: ["#b8cfee", "#cbbbe8", "#8db6a3"],
    tracks: {
      morning: { id: "morning", title: "Morning", source: "/audio/theme-samples/10-morning.mp3" },
      afternoon: { id: "afternoon", title: "Northern Glade", source: "/audio/theme-samples/11-northern-glade.mp3" },
      night: { id: "night", title: "Evening", source: "/audio/theme-samples/12-evening.mp3" },
    },
  },
] as const;

export function isMusicPackId(value: unknown): value is MusicPackId {
  return typeof value === "string" && MUSIC_PACKS.some((pack) => pack.id === value);
}

export function getMusicPack(id: MusicPackId): MusicPack {
  return MUSIC_PACKS.find((pack) => pack.id === id) ?? MUSIC_PACKS[0];
}

export function isMusicPackUnlocked(pack: MusicPack, level: number) {
  return level >= pack.unlockLevel;
}

export function getMusicTrackForHour(hour: number, packId: MusicPackId = DEFAULT_MUSIC_PACK_ID) {
  const localHour = ((Math.trunc(hour) % 24) + 24) % 24;
  const period: BackgroundTheme = localHour >= 5 && localHour < 12
    ? "morning"
    : localHour >= 12 && localHour < 18
      ? "afternoon"
      : "night";
  return getMusicPack(packId).tracks[period];
}
