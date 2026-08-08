import type { ThemeId } from "./types";

export const THEME_VISUALS: Record<ThemeId, { colors: readonly [string, string, string] }> = {
  honeydew: { colors: ["#eaf2d3", "#a9ca79", "#f6d7aa"] },
  watermelon: { colors: ["#ffaaa5", "#ef5b62", "#3f8c63"] },
  cantaloupe: { colors: ["#ffd29d", "#ef9b55", "#9bbd72"] },
  canary: { colors: ["#fff2a6", "#e3b936", "#89a94a"] },
  hami: { colors: ["#e2ebd0", "#9fb58a", "#d8bf82"] },
  chamoe: { colors: ["#ffe377", "#e8aa2f", "#fff9dc"] },
  "moon-gold": { colors: ["#e9dfb5", "#c69b34", "#596080"] },
  densuke: { colors: ["#e9e7df", "#263a31", "#a84747"] },
};

export const THEME_UNLOCK_LEVEL: Record<ThemeId, number> = {
  honeydew: 1,
  watermelon: 1,
  cantaloupe: 1,
  canary: 1,
  hami: 4,
  chamoe: 5,
  "moon-gold": 6,
  densuke: 12,
};

export function isThemeUnlocked(theme: ThemeId, level: number): boolean {
  return level >= THEME_UNLOCK_LEVEL[theme];
}
