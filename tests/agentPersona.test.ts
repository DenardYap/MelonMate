import { describe, expect, test } from "vitest";
import { AGENT_PERSONAS, getAgentPersona } from "../lib/agentPersona";
import type { ThemeId } from "../lib/types";

const THEMES: ThemeId[] = [
  "honeydew",
  "watermelon",
  "cantaloupe",
  "canary",
  "hami",
  "chamoe",
  "moon-gold",
  "densuke",
];

describe("theme agent personnel", () => {
  test("provides a distinct named SVG persona for every theme", () => {
    expect(Object.keys(AGENT_PERSONAS).sort()).toEqual([...THEMES].sort());
    expect(new Set(THEMES.map((theme) => getAgentPersona(theme).name)).size).toBe(THEMES.length);

    for (const theme of THEMES) {
      const persona = getAgentPersona(theme);
      expect(persona.theme).toBe(theme);
      expect(persona.src).toBe(`/agent/${theme}-agent.svg`);
    }
  });

  test("falls back to Honey for unknown saved themes", () => {
    expect(getAgentPersona("unknown")).toEqual(AGENT_PERSONAS.honeydew);
  });
});
