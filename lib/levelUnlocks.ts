import { MELON_VARIETIES } from "./garden";
import { THEME_UNLOCK_LEVEL, THEME_VISUALS } from "./themes";
import type { BiText, ThemeId } from "./types";
import { FARM_BUILDINGS, FARM_COMPANIONS } from "./farmProgression";
import { BUILT_IN_PROFILE_AVATARS } from "./profilePhoto";
import { MUSIC_PACKS } from "./musicPacks";

interface LevelUnlockBase {
  id: string;
  name: BiText;
  note: BiText;
}

export type LevelUnlock = LevelUnlockBase & (
  | { kind: "seed"; image: string; accent: string }
  | { kind: "theme"; themeId: ThemeId; colors: readonly [string, string, string] }
  | { kind: "avatar"; image: string }
  | { kind: "musicPack"; colors: readonly [string, string, string] }
  | { kind: "farm"; farmKind: "building" | "companion"; image?: string }
);

const THEME_NAMES: Record<ThemeId, BiText> = {
  honeydew: { en: "Honeydew theme", zh: "蜜瓜主題" },
  watermelon: { en: "Watermelon theme", zh: "西瓜主題" },
  cantaloupe: { en: "Cantaloupe theme", zh: "香瓜主題" },
  canary: { en: "Canary theme", zh: "黃金瓜主題" },
  hami: { en: "Hami theme", zh: "哈密瓜主題" },
  chamoe: { en: "Chamoe theme", zh: "韓國香瓜主題" },
  "moon-gold": { en: "Moon Gold theme", zh: "月金瓜主題" },
  densuke: { en: "Densuke Obsidian theme", zh: "田助黑曜主題" },
};

export function levelUnlocksAt(level: number, _goldenMelons = 0): LevelUnlock[] {
  const seedUnlocks: LevelUnlock[] = MELON_VARIETIES
    .filter((variety) => variety.unlockLevel === level)
    .map((variety) => ({
      id: `seed-${variety.id}`,
      kind: "seed",
      image: variety.seedImage,
      accent: variety.accent,
      name: {
        en: `${variety.name.en} seed`,
        zh: `${variety.name.zh}種子`,
      },
      note: {
        en: "Now available in the farm's Seed Market.",
        zh: "現在可在農場的種子市集使用。",
      },
    }));

  const themeUnlocks: LevelUnlock[] = (Object.entries(THEME_UNLOCK_LEVEL) as [ThemeId, number][])
    .filter(([, unlockLevel]) => unlockLevel === level)
    .map(([theme]) => ({
      id: `theme-${theme}`,
      kind: "theme",
      themeId: theme,
      colors: THEME_VISUALS[theme].colors,
      name: THEME_NAMES[theme],
      note: {
        en: "Now available in Me → App theme.",
        zh: "現在可在「我的」→「App 主題」中使用。",
      },
    }));

  const avatarUnlocks: LevelUnlock[] = BUILT_IN_PROFILE_AVATARS
    .filter((avatar) => avatar.unlockLevel > 1 && avatar.unlockLevel === level)
    .map((avatar) => ({
      id: `avatar-${avatar.id}`,
      kind: "avatar" as const,
      image: avatar.src,
      name: avatar.name,
      note: {
        en: "Now available in Me → Change photo.",
        zh: "現在可在「我的」→「更換照片」中使用。",
      },
    }));

  const musicPackUnlocks: LevelUnlock[] = MUSIC_PACKS
    .filter((pack) => pack.unlockLevel > 1 && pack.unlockLevel === level)
    .map((pack) => ({
      id: `music-pack-${pack.id}`,
      kind: "musicPack" as const,
      colors: pack.colors,
      name: pack.name,
      note: {
        en: "Now available in Me → Background music.",
        zh: "現在可在「我的」→「背景音樂」中使用。",
      },
    }));

  const buildingUnlocks: LevelUnlock[] = FARM_BUILDINGS.flatMap((building) =>
    building.tiers.filter((tier) => tier.unlockLevel === level).map((tier) => ({
      id: `building-${building.id}-${tier.level}`,
      kind: "farm" as const,
      farmKind: "building" as const,
      name: { en: `${building.name.en} Tier ${tier.level}`, zh: `${building.name.zh}第 ${tier.level} 階` },
      note: { en: "Now available to purchase with Dew on the farm.", zh: "現在可在農場使用露珠購買。" },
    }))
  );

  const companionUnlocks: LevelUnlock[] = FARM_COMPANIONS
    .filter((companion) => companion.unlockLevel === level)
    .map((companion) => ({
      id: `companion-${companion.id}`,
      kind: "farm" as const,
      farmKind: "companion" as const,
      image: companion.src,
      name: companion.name,
      note: { en: "Now available to adopt with Dew at the Farmhouse.", zh: "現在可在農舍使用露珠領養。" },
    }));

  return [...seedUnlocks, ...themeUnlocks, ...avatarUnlocks, ...musicPackUnlocks, ...buildingUnlocks, ...companionUnlocks];
}

export function nextUnlockLevelAfter(level: number): number | null {
  const futureLevels = [
    ...MELON_VARIETIES.map((variety) => variety.unlockLevel),
    ...Object.values(THEME_UNLOCK_LEVEL),
    ...BUILT_IN_PROFILE_AVATARS.map((avatar) => avatar.unlockLevel),
    ...MUSIC_PACKS.map((pack) => pack.unlockLevel),
    ...FARM_BUILDINGS.flatMap((building) => building.tiers.map((tier) => tier.unlockLevel)),
    ...FARM_COMPANIONS.map((companion) => companion.unlockLevel),
  ].filter((unlockLevel) => unlockLevel > level);
  return futureLevels.length ? Math.min(...futureLevels) : null;
}
