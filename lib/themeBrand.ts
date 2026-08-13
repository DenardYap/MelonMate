import { getAgentPersona } from "./agentPersona";
import type { ThemeId } from "./types";

export interface ThemeBrand {
  theme: ThemeId;
  name: string;
  markSrc: string;
  setupSrc: string;
  icon192: string;
  appleTouchIcon: string;
  manifest: string;
}

export function themeBrand(theme: ThemeId): ThemeBrand {
  const persona = getAgentPersona(theme);
  const markSrc = theme === "honeydew" ? "/brand/honey-generic-2d.png" : persona.src;
  return {
    theme,
    name: persona.name,
    markSrc,
    setupSrc: theme === "honeydew" ? "/brand/honey-setup-2d.png" : persona.src,
    icon192: `/theme-icons/${theme}-192.png`,
    appleTouchIcon: `/theme-icons/${theme}-180.png`,
    manifest: `/manifests/${theme}.webmanifest`,
  };
}
