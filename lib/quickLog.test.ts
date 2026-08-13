import { describe, expect, it } from "vitest";
import { quickLogUrl } from "./quickLog";

describe("quickLogUrl", () => {
  it("uses the native deep link inside the iOS app", () => {
    expect(quickLogUrl({ mode: "scan", native: true, currentOrigin: "http://localhost:3000" }))
      .toBe("melonmate://add?mode=scan&source=lock-screen");
  });

  it("uses the public HTTPS app instead of an unusable localhost address", () => {
    expect(quickLogUrl({
      mode: "photo",
      native: false,
      currentOrigin: "http://localhost:3000",
      publicOrigin: "https://melon-mate.vercel.app/",
    })).toBe("https://melon-mate.vercel.app/add?mode=photo&source=lock-screen");
  });

  it("falls back to the current origin when no public app address is configured", () => {
    expect(quickLogUrl({ mode: "scan", native: false, currentOrigin: "https://example.test" }))
      .toBe("https://example.test/add?mode=scan&source=lock-screen");
  });
});
