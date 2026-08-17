"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useGame, useStore } from "@/lib/store";
import { translate } from "@/lib/i18n";
import { AppIcon, type IconName } from "@/components/icons";
import LevelProgressRing from "@/components/LevelProgressRing";
import { isNativeApp } from "@/lib/nativeApp";
import { matchesTabRoute, staticTabHref } from "@/lib/tabNavigation";

const NAVIGATION_RECOVERY_MS = 1_200;

export default function TabBar() {
  const pathname = usePathname();
  const lang = useStore((s) => s.lang);
  const game = useGame();
  const unreadFriendShares = useStore((state) => state.friendNotifications.filter((notification) => !notification.readAt).length);
  const native = isNativeApp();
  const latestPathname = useRef(pathname);
  const recoveryTimer = useRef<number | null>(null);

  useEffect(() => {
    latestPathname.current = pathname;
    if (recoveryTimer.current !== null) {
      window.clearTimeout(recoveryTimer.current);
      recoveryTimer.current = null;
    }
  }, [pathname]);

  useEffect(() => () => {
    if (recoveryTimer.current !== null) window.clearTimeout(recoveryTimer.current);
  }, []);

  if (pathname.startsWith("/add") || pathname.startsWith("/gym/session") || pathname.startsWith("/agent") || pathname.startsWith("/garden") || pathname.startsWith("/friends")) return null;

  const tabs = [
    { href: "/", key: "today", label: translate("tabToday", lang), icon: "home" },
    { href: "/kitchen", key: "kitchen", label: translate("tabKitchen", lang), icon: "kitchen" },
    { href: "/gym", key: "gym", label: translate("tabGym", lang), icon: "gym" },
    { href: "/garden", key: "garden", label: translate("tabGarden", lang), icon: "leaf" },
    { href: "/me", key: "me", label: translate("tabMe", lang), icon: "user" },
  ] satisfies { href: string; key: string; label: string; icon: IconName }[];

  const isOn = (href: string) => matchesTabRoute(pathname, href);

  const recoverStalledNavigation = (href: string) => {
    if (!native || matchesTabRoute(pathname, href)) return;
    if (recoveryTimer.current !== null) window.clearTimeout(recoveryTimer.current);
    recoveryTimer.current = window.setTimeout(() => {
      recoveryTimer.current = null;
      if (!matchesTabRoute(latestPathname.current, href)) {
        window.location.assign(staticTabHref(href));
      }
    }, NAVIGATION_RECOVERY_MS);
  };

  return (
    <div className="tabbar-wrap">
      <Link href="/add" prefetch={native ? false : undefined} className="tabbar-log-food press" onClick={() => recoverStalledNavigation("/add")}>
        <AppIcon name="plus" size={20} strokeWidth={2.5} />
        <span>{lang === "zh" ? "記錄飲食" : "Log food"}</span>
      </Link>
      <nav className="tabbar glass-strong" aria-label={lang === "zh" ? "主要導覽" : "Main navigation"}>
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            prefetch={native ? false : undefined}
            className={`tab-item press ${isOn(t.href) ? "on" : ""}`}
            aria-current={isOn(t.href) ? "page" : undefined}
            onClick={() => recoverStalledNavigation(t.href)}
          >
            {t.key === "me" ? (
              <span className="tab-friend-notification-wrap">
                <LevelProgressRing
                  xp={game.xp}
                  size={30}
                  stroke={5}
                  shortLabel=""
                  className="tab-level-ring"
                  label={lang === "zh" ? "等級" : "Level"}
                />
                {unreadFriendShares > 0 && <i>{unreadFriendShares > 9 ? "9+" : unreadFriendShares}</i>}
              </span>
            ) : (
              <AppIcon name={t.icon} size={24} strokeWidth={isOn(t.href) ? 2.25 : 1.75} />
            )}
            <span>{t.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
