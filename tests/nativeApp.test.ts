import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const nativeMocks = vi.hoisted(() => {
  const appListeners = new Map<string, (event: never) => void>();
  const listenerHandle = () => ({ remove: vi.fn().mockResolvedValue(undefined) });
  return {
    appListeners,
    getLaunchUrl: vi.fn(),
    addAppListener: vi.fn((event: string, callback: (event: never) => void) => {
      appListeners.set(event, callback);
      return Promise.resolve(listenerHandle());
    }),
    addPushListener: vi.fn(() => Promise.resolve(listenerHandle())),
    addLocalListener: vi.fn(() => Promise.resolve(listenerHandle())),
  };
});

vi.mock("@capacitor/app", () => ({
  App: {
    addListener: nativeMocks.addAppListener,
    getLaunchUrl: nativeMocks.getLaunchUrl,
  },
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    getPlatform: () => "ios",
    isNativePlatform: () => true,
  },
}));

vi.mock("@capacitor/haptics", () => ({
  Haptics: { notification: vi.fn().mockResolvedValue(undefined) },
  NotificationType: { Success: "SUCCESS" },
}));

vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: {
    addListener: nativeMocks.addLocalListener,
    cancel: vi.fn().mockResolvedValue(undefined),
    checkPermissions: vi.fn().mockResolvedValue({ display: "denied" }),
    getPending: vi.fn().mockResolvedValue({ notifications: [] }),
    schedule: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@capacitor/push-notifications", () => ({
  PushNotifications: {
    addListener: nativeMocks.addPushListener,
    checkPermissions: vi.fn().mockResolvedValue({ receive: "denied" }),
    register: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@capacitor/status-bar", () => ({
  StatusBar: {
    setOverlaysWebView: vi.fn().mockResolvedValue(undefined),
    setStyle: vi.fn().mockResolvedValue(undefined),
  },
  Style: { Light: "LIGHT" },
}));

vi.mock("../lib/appleHealth", () => ({
  connectAndSyncAppleHealth: vi.fn(),
  shouldAutoSyncAppleHealth: () => false,
}));

import { disposeNativeListeners, initializeNativeApp } from "../lib/nativeApp";

const storage = new Map<string, string>();

describe("native app navigation", () => {
  beforeEach(() => {
    storage.clear();
    nativeMocks.appListeners.clear();
    nativeMocks.getLaunchUrl.mockReset().mockResolvedValue({
      url: "melonmate://add?source=lock-screen",
    });
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });
  });

  afterEach(async () => {
    await disposeNativeListeners();
    vi.unstubAllGlobals();
  });

  it("consumes the launch URL once while keeping later deep links active", async () => {
    const firstNavigate = vi.fn();
    const secondNavigate = vi.fn();

    const cleanup = await initializeNativeApp({
      deviceId: "device-1",
      lang: "en",
      navigate: firstNavigate,
    });
    cleanup();

    await initializeNativeApp({
      deviceId: "device-1",
      lang: "zh",
      navigate: secondNavigate,
    });

    expect(nativeMocks.getLaunchUrl).toHaveBeenCalledTimes(1);
    expect(firstNavigate).toHaveBeenCalledOnce();
    expect(firstNavigate).toHaveBeenCalledWith("/add?source=lock-screen");
    expect(secondNavigate).not.toHaveBeenCalled();

    nativeMocks.appListeners.get("appUrlOpen")?.({
      url: "melonmate://garden",
    } as never);
    expect(secondNavigate).toHaveBeenCalledWith("/garden");
  });
});
