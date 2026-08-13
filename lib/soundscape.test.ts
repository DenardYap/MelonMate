import { afterEach, describe, expect, it, vi } from "vitest";
import {
  beginVoiceCaptureSoundscape,
  DEFAULT_SOUND_PREFERENCES,
  endVoiceCaptureSoundscape,
  getBackgroundThemeForHour,
  saveSoundPreferences,
} from "./soundscape";

afterEach(() => vi.unstubAllGlobals());

describe("time-of-day background themes", () => {
  it.each([
    [5, "morning", "Townie Loop"],
    [11, "morning", "Townie Loop"],
    [12, "afternoon", "Sidewalk Shade - slower"],
    [17, "afternoon", "Sidewalk Shade - slower"],
    [18, "night", "Bossa Antigua"],
    [23, "night", "Bossa Antigua"],
    [0, "night", "Bossa Antigua"],
    [4, "night", "Bossa Antigua"],
  ])("uses the expected theme at %i:00", (hour, id, title) => {
    expect(getBackgroundThemeForHour(hour)).toMatchObject({ id, title });
  });

  it("uses a transient audio session for effects when theme music is muted", () => {
    const audioSession = { type: "auto" };
    const mediaSession = { metadata: { title: "Old media" }, playbackState: "playing" };
    vi.stubGlobal("navigator", { audioSession, mediaSession });
    vi.stubGlobal("window", {
      localStorage: { setItem: vi.fn() },
    });

    saveSoundPreferences({ ...DEFAULT_SOUND_PREFERENCES, musicEnabled: false });

    expect(audioSession.type).toBe("transient");
    expect(mediaSession).toMatchObject({ metadata: null, playbackState: "none" });
  });

  it.each([
    ["peppy-picnic", 8, "Fuzzball Parade"],
    ["peppy-picnic", 14, "Wholesome"],
    ["peppy-picnic", 21, "Farm"],
    ["town-cafe", 8, "Local Forecast - Slower"],
    ["town-cafe", 14, "Lobby Time"],
    ["town-cafe", 21, "Casa Bossa Nova"],
    ["moonlit-meadow", 8, "Morning"],
    ["moonlit-meadow", 14, "Northern Glade"],
    ["moonlit-meadow", 21, "Evening"],
  ] as const)("selects %s's time-of-day track", (packId, hour, title) => {
    expect(getBackgroundThemeForHour(hour, packId)).toMatchObject({ title });
  });

  it("uses a recording audio session while voice capture is active", () => {
    const audioSession = { type: "auto" };
    vi.stubGlobal("navigator", { audioSession });

    saveSoundPreferences(DEFAULT_SOUND_PREFERENCES);
    beginVoiceCaptureSoundscape();
    expect(audioSession.type).toBe("play-and-record");

    endVoiceCaptureSoundscape();
    expect(audioSession.type).toBe("playback");
  });
});
