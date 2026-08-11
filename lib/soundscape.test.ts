import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SOUND_PREFERENCES, getBackgroundThemeForHour, saveSoundPreferences } from "./soundscape";

afterEach(() => vi.unstubAllGlobals());

describe("time-of-day background themes", () => {
  it.each([
    [5, "morning", "Melon Morning"],
    [11, "morning", "Melon Morning"],
    [12, "afternoon", "Garden Bounce"],
    [17, "afternoon", "Garden Bounce"],
    [18, "night", "Firefly Supper"],
    [23, "night", "Firefly Supper"],
    [0, "night", "Firefly Supper"],
    [4, "night", "Firefly Supper"],
  ])("uses the expected theme at %i:00", (hour, id, title) => {
    expect(getBackgroundThemeForHour(hour)).toMatchObject({ id, title });
  });

  it("uses a transient audio session for effects when theme music is muted", () => {
    const audioSession = { type: "auto" };
    vi.stubGlobal("navigator", { audioSession });
    vi.stubGlobal("window", {
      localStorage: { setItem: vi.fn() },
    });

    saveSoundPreferences({ ...DEFAULT_SOUND_PREFERENCES, musicEnabled: false });

    expect(audioSession.type).toBe("transient");
  });
});
