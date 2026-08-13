import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { combinedXp, levelFromXp, xpForLevel } from "./game";
import { freshGarden } from "./garden";
import { useGardenStore } from "./gardenStore";
import { useStore } from "./store";
import { runTestCommand } from "./testCommands";

const PROFILE = "p-me";

describe("local test commands", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
    useStore.getState().resetAll();
    useGardenStore.setState({ gardens: {} });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("sets Dew for the active profile", () => {
    expect(runTestCommand("/set-dew 200")).toMatchObject({ matched: true, ok: true });
    expect(useGardenStore.getState().gardens[PROFILE].dew).toBe(200);
  });

  test("sets the exact XP threshold for a requested level", () => {
    useGardenStore.setState({
      gardens: { [PROFILE]: { ...freshGarden(), gardenXp: 100 } },
    });

    expect(runTestCommand("/set-lvl 5")).toMatchObject({ matched: true, ok: true });

    const regularXp = useStore.getState().game[PROFILE].xp;
    const farmXp = useGardenStore.getState().gardens[PROFILE].gardenXp;
    expect(combinedXp(regularXp, farmXp)).toBe(xpForLevel(5));
    expect(levelFromXp(combinedXp(regularXp, farmXp))).toBe(5);
  });

  test("can lower a level even when farm XP exceeds the new threshold", () => {
    useStore.setState((state) => ({
      game: { ...state.game, [PROFILE]: { ...state.game[PROFILE], xp: 1_000 } },
    }));
    useGardenStore.setState({
      gardens: { [PROFILE]: { ...freshGarden(), gardenXp: 1_000 } },
    });

    runTestCommand("/set-lvl 2");

    expect(useStore.getState().game[PROFILE].xp).toBe(0);
    expect(useGardenStore.getState().gardens[PROFILE].gardenXp).toBe(xpForLevel(2));
  });

  test("rejects missing, fractional, and zero level values", () => {
    expect(runTestCommand("/set-dew")).toMatchObject({ matched: true, ok: false });
    expect(runTestCommand("/set-dew 1.5")).toMatchObject({ matched: true, ok: false });
    expect(runTestCommand("/set-lvl 0")).toMatchObject({ matched: true, ok: false });
    expect(runTestCommand("apple")).toEqual({ matched: false });
  });

  test("does not recognize or run commands outside development", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(runTestCommand("/set-dew 200")).toEqual({ matched: false });
    expect(useGardenStore.getState().gardens[PROFILE]).toBeUndefined();
  });
});
