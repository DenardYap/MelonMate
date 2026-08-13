import { describe, expect, it } from "vitest";
import { getMusicTrackForHour, isMusicPackUnlocked, MUSIC_PACKS } from "./musicPacks";

describe("music packs", () => {
  it("contains one starter pack and the requested level gates", () => {
    expect(MUSIC_PACKS.map((pack) => [pack.id, pack.unlockLevel])).toEqual([
      ["cozy-grove", 1],
      ["peppy-picnic", 5],
      ["town-cafe", 10],
      ["moonlit-meadow", 15],
    ]);
  });

  it("gates packs until their configured level", () => {
    for (const pack of MUSIC_PACKS) {
      expect(isMusicPackUnlocked(pack, pack.unlockLevel)).toBe(true);
      if (pack.unlockLevel > 1) expect(isMusicPackUnlocked(pack, pack.unlockLevel - 1)).toBe(false);
    }
  });

  it("provides three unique playable tracks in every pack", () => {
    const sources = MUSIC_PACKS.flatMap((pack) => [
      getMusicTrackForHour(8, pack.id).source,
      getMusicTrackForHour(14, pack.id).source,
      getMusicTrackForHour(21, pack.id).source,
    ]);
    expect(sources).toHaveLength(12);
    expect(new Set(sources).size).toBe(12);
  });

  it("keeps rejected stock-acoustic selections out of every pack", () => {
    const rejectedTitles = new Set(["Carefree", "Life of Riley", "Cheery Monday", "Daily Beetle"]);
    const titles = MUSIC_PACKS.flatMap((pack) => Object.values(pack.tracks).map((track) => track.title));
    expect(titles.filter((title) => rejectedTitles.has(title))).toEqual([]);
  });
});
