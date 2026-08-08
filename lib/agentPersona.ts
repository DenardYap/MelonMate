import type { ThemeId } from "./types";

export interface AgentPersona {
  theme: ThemeId;
  name: string;
  melon: { en: string; zh: string };
  src: string;
}

export const AGENT_PERSONAS: Record<ThemeId, AgentPersona> = {
  honeydew: {
    theme: "honeydew",
    name: "Honey",
    melon: { en: "honeydew", zh: "蜜瓜" },
    src: "/agent/honeydew-agent.svg",
  },
  watermelon: {
    theme: "watermelon",
    name: "Wally",
    melon: { en: "watermelon", zh: "西瓜" },
    src: "/agent/watermelon-agent.svg",
  },
  cantaloupe: {
    theme: "cantaloupe",
    name: "Canta",
    melon: { en: "cantaloupe", zh: "哈密瓜" },
    src: "/agent/cantaloupe-agent.svg",
  },
  canary: {
    theme: "canary",
    name: "Sunny",
    melon: { en: "canary melon", zh: "黃金瓜" },
    src: "/agent/canary-agent.svg",
  },
  hami: {
    theme: "hami",
    name: "Hami",
    melon: { en: "Hami melon", zh: "哈密瓜" },
    src: "/agent/hami-agent.svg",
  },
  chamoe: {
    theme: "chamoe",
    name: "Chammy",
    melon: { en: "Korean melon", zh: "韓國甜瓜" },
    src: "/agent/chamoe-agent.svg",
  },
  "moon-gold": {
    theme: "moon-gold",
    name: "Luna",
    melon: { en: "Moon Gold melon", zh: "月金瓜" },
    src: "/agent/moon-gold-agent.svg",
  },
  densuke: {
    theme: "densuke",
    name: "Kuro",
    melon: { en: "Densuke watermelon", zh: "田助西瓜" },
    src: "/agent/densuke-agent.svg",
  },
};

export function getAgentPersona(theme: ThemeId | string | null | undefined): AgentPersona {
  return theme && theme in AGENT_PERSONAS
    ? AGENT_PERSONAS[theme as ThemeId]
    : AGENT_PERSONAS.honeydew;
}
