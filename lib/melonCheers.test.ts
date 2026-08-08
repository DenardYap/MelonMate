import { describe, expect, it } from "vitest";
import { MELON_CHEERS, melonCheer } from "./melonCheers";

describe("melon cheers", () => {
  it("keeps a large, non-repetitive encouragement pool", () => {
    expect(MELON_CHEERS).toHaveLength(100);
    expect(new Set(MELON_CHEERS).size).toBe(100);
  });

  it("selects deterministically from a seed", () => {
    expect(melonCheer("en", 7)).toBe(melonCheer("en", 7));
  });
});
