import { beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({
  setAppIcon: vi.fn(() => Promise.resolve({ supported: true, changed: true })),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => true,
    isPluginAvailable: () => true,
  },
  registerPlugin: () => native,
}));

import { applyNativeAppIcon, applyThemeAppearance } from "./themeAppearance";

describe("theme appearance", () => {
  beforeEach(() => {
    native.setAppIcon.mockClear();
  });

  it("does not request a native icon change during appearance sync", () => {
    applyThemeAppearance("watermelon");

    expect(native.setAppIcon).not.toHaveBeenCalled();
  });

  it("requests a native icon change for an explicit theme selection", () => {
    applyNativeAppIcon("watermelon");

    expect(native.setAppIcon).toHaveBeenCalledWith({ theme: "watermelon" });
  });
});
