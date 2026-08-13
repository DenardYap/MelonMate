import { addDays, todayStr } from "./dates";
import { freshGarden } from "./garden";
import { xpForLevel } from "./game";
import { useGardenStore } from "./gardenStore";
import { useStore } from "./store";
import type { GameState } from "./types";

export type TestCommandResult =
  | { matched: false }
  | { matched: true; ok: boolean; message: string };

const COMMAND_PATTERN = /^\/(set-dew|set-lvl)(?:\s+(.*))?$/i;

function emptyGame(): GameState {
  return {
    streak: 0,
    best: 0,
    melons: 0,
    golden: 0,
    xp: 0,
    lastEval: addDays(todayStr(), -1),
    history: {},
    foodLogXpClaims: {},
    weightXpClaims: {},
    healthXpClaims: {},
  };
}

function commandInteger(raw: string | undefined, minimum: number): number | null {
  if (!raw || !/^\d+$/.test(raw.trim())) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= minimum ? value : null;
}

/**
 * Runs development-only slash commands from the food search box.
 */
export function runTestCommand(raw: string): TestCommandResult {
  if (process.env.NODE_ENV !== "development") return { matched: false };

  const match = COMMAND_PATTERN.exec(raw.trim());
  if (!match) return { matched: false };

  const command = match[1].toLowerCase();
  const minimum = command === "set-lvl" ? 1 : 0;
  const value = commandInteger(match[2], minimum);
  if (value == null) {
    const usage = command === "set-lvl" ? "/set-lvl 5" : "/set-dew 200";
    return { matched: true, ok: false, message: `Use a whole number, for example: ${usage}` };
  }

  const app = useStore.getState();
  const profileId = app.activeProfileId;
  const gardenStore = useGardenStore.getState();
  const garden = gardenStore.gardens[profileId] ?? freshGarden();

  if (command === "set-dew") {
    useGardenStore.setState({
      gardens: {
        ...gardenStore.gardens,
        [profileId]: { ...garden, dew: value },
      },
    });
    return { matched: true, ok: true, message: `Dew set to ${value.toLocaleString("en-US")}.` };
  }

  const targetXp = xpForLevel(value);
  const farmXp = Math.min(Math.max(0, garden.gardenXp), targetXp);
  const game = app.game[profileId] ?? emptyGame();
  useGardenStore.setState({
    gardens: {
      ...gardenStore.gardens,
      [profileId]: { ...garden, gardenXp: farmXp },
    },
  });
  useStore.setState({
    game: {
      ...app.game,
      [profileId]: { ...game, xp: targetXp - farmXp },
    },
  });

  return {
    matched: true,
    ok: true,
    message: `Level set to ${value} (${targetXp.toLocaleString("en-US")} total XP).`,
  };
}
