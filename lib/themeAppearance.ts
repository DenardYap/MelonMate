"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";
import { themeBrand } from "./themeBrand";
import type { ThemeId } from "./types";

interface MelonMateAppearancePlugin {
  setAppIcon(options: { theme: ThemeId }): Promise<{ supported: boolean; changed: boolean }>;
}

const MelonMateAppearance = registerPlugin<MelonMateAppearancePlugin>("MelonMateAppearance");

function upsertLink(rel: string, href: string) {
  let link = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement("link");
    link.rel = rel;
    document.head.appendChild(link);
  }
  link.href = href;
}

/** Keep browser/PWA branding in theme sync without prompting native users on launch. */
export function applyThemeAppearance(theme: ThemeId) {
  const brand = themeBrand(theme);
  if (typeof document !== "undefined") {
    upsertLink("icon", brand.icon192);
    upsertLink("apple-touch-icon", brand.appleTouchIcon);
    upsertLink("manifest", brand.manifest);
  }
}

/** Change the native app icon only in response to an explicit theme selection. */
export function applyNativeAppIcon(theme: ThemeId) {
  if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("MelonMateAppearance")) {
    void MelonMateAppearance.setAppIcon({ theme }).catch(() => {});
  }
}
