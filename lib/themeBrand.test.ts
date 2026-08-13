import { describe, expect, it } from "vitest";
import { themeBrand } from "./themeBrand";

describe("theme branding", () => {
  it("keeps Honey as the honeydew fallback", () => {
    expect(themeBrand("honeydew")).toMatchObject({
      name: "Honey",
      markSrc: "/brand/honey-generic-2d.png",
      setupSrc: "/brand/honey-setup-2d.png",
    });
  });

  it("uses the selected theme persona and icon set everywhere else", () => {
    expect(themeBrand("densuke")).toEqual({
      theme: "densuke",
      name: "Kuro",
      markSrc: "/agent/densuke-agent.svg",
      setupSrc: "/agent/densuke-agent.svg",
      icon192: "/theme-icons/densuke-192.png",
      appleTouchIcon: "/theme-icons/densuke-180.png",
      manifest: "/manifests/densuke.webmanifest",
    });
  });
});
