import { MELON_VARIETIES } from "./garden";
import { THEME_UNLOCK_LEVEL, THEME_VISUALS } from "./themes";
import type { BiText, ThemeId } from "./types";

interface LevelUnlockBase {
  id: string;
  name: BiText;
  note: BiText;
}

export type LevelUnlock = LevelUnlockBase & (
  | { kind: "seed"; image: string; accent: string }
  | { kind: "theme"; themeId: ThemeId; colors: readonly [string, string, string] }
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

export function levelUnlocksAt(level: number, goldenMelons = 0): LevelUnlock[] {
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
      note: variety.requiresPr && goldenMelons <= 0
        ? {
            en: "Level requirement cleared; earn a gym PR to finish unlocking it.",
            zh: "等級條件已達成；再創下一次健身個人紀錄即可完全解鎖。",
          }
        : {
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

  return [...seedUnlocks, ...themeUnlocks];
}

export function nextUnlockLevelAfter(level: number): number | null {
  const futureLevels = [
    ...MELON_VARIETIES.map((variety) => variety.unlockLevel),
    ...Object.values(THEME_UNLOCK_LEVEL),
  ].filter((unlockLevel) => unlockLevel > level);
  return futureLevels.length ? Math.min(...futureLevels) : null;
}
