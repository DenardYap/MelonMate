"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useGame, useStore } from "@/lib/store";
import { translate } from "@/lib/i18n";
import { AppIcon, type IconName } from "@/components/icons";
import LevelProgressRing from "@/components/LevelProgressRing";

export default function TabBar() {
  const pathname = usePathname();
  const lang = useStore((s) => s.lang);
  const game = useGame();

  if (pathname.startsWith("/add") || pathname.startsWith("/gym/session") || pathname.startsWith("/agent") || pathname.startsWith("/garden") || pathname.startsWith("/friends")) return null;

  const tabs = [
    { href: "/", key: "today", label: translate("tabToday", lang), icon: "home" },
    { href: "/kitchen", key: "kitchen", label: translate("tabKitchen", lang), icon: "kitchen" },
    { href: "/gym", key: "gym", label: translate("tabGym", lang), icon: "gym" },
    { href: "/garden", key: "garden", label: translate("tabGarden", lang), icon: "leaf" },
    { href: "/me", key: "me", label: translate("tabMe", lang), icon: "user" },
  ] satisfies { href: string; key: string; label: string; icon: IconName }[];

  const isOn = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/me") return pathname.startsWith("/me");
    return pathname.startsWith(href);
  };

  return (
    <div className="tabbar-wrap">
      <Link href="/add" className="tabbar-log-food press">
        <AppIcon name="plus" size={20} strokeWidth={2.5} />
        <span>{lang === "zh" ? "記錄飲食" : "Log food"}</span>
      </Link>
      <nav className="tabbar glass-strong">
        {tabs.map((t) => (
          <Link key={t.key} href={t.href} className={`tab-item press ${isOn(t.href) ? "on" : ""}`}>
            {t.key === "me" ? (
              <LevelProgressRing
                xp={game.xp}
                size={30}
                stroke={5}
                shortLabel=""
                className="tab-level-ring"
                label={lang === "zh" ? "等級" : "Level"}
              />
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
