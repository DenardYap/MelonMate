"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { useActiveProfile, useGame, useStore } from "@/lib/store";
import { translate, type DictKey } from "@/lib/i18n";
import { fmtDate, todayStr } from "@/lib/dates";
import { fmtNum } from "@/lib/nutrition";
import { memberIdFor, syncNow } from "@/lib/sync";
import { GlassCard, Sheet, toast } from "@/components/ui";
import { LineChart } from "@/components/charts";
import DailyTargetsSheet from "@/components/DailyTargetsSheet";
import LockScreenWidget from "@/components/LockScreenWidget";
import type { ThemeId, WeightUnit } from "@/lib/types";
import { levelFromXp, MAX_PLAYER_LEVEL, xpForLevel } from "@/lib/game";
import { THEME_UNLOCK_LEVEL, THEME_VISUALS } from "@/lib/themes";
import { AppIcon } from "@/components/icons";
import OnboardingFlow from "@/components/OnboardingFlow";
import NativeAppSettings from "@/components/NativeAppSettings";
import { shareNativeBackup } from "@/lib/nativeBackup";
import SoundSettings from "@/components/SoundSettings";
import ProfileAvatar from "@/components/ProfileAvatar";
import {
  BUILT_IN_PROFILE_AVATARS,
  isBuiltInProfileAvatarUnlocked,
  prepareProfilePhoto,
} from "@/lib/profilePhoto";
import LevelProgressRing from "@/components/LevelProgressRing";
import { FriendNotificationButton } from "@/components/FriendShareNotifications";
import RewardGuideSettings from "@/components/RewardGuideSettings";
import { STREAK_MILESTONES } from "@/lib/streakRewards";
import { applyNativeAppIcon } from "@/lib/themeAppearance";

const THEME_OPTIONS: {
  id: ThemeId;
  label: DictKey;
  unlockLevel: number;
  rarityLabel?: DictKey;
}[] = [
  { id: "honeydew", label: "themeHoneydew", unlockLevel: THEME_UNLOCK_LEVEL.honeydew },
  { id: "watermelon", label: "themeWatermelon", unlockLevel: THEME_UNLOCK_LEVEL.watermelon },
  { id: "cantaloupe", label: "themeCantaloupe", unlockLevel: THEME_UNLOCK_LEVEL.cantaloupe },
  { id: "canary", label: "themeCanary", unlockLevel: THEME_UNLOCK_LEVEL.canary },
  { id: "hami", label: "themeHami", unlockLevel: THEME_UNLOCK_LEVEL.hami },
  { id: "chamoe", label: "themeChamoe", unlockLevel: THEME_UNLOCK_LEVEL.chamoe },
  { id: "moon-gold", label: "themeMoonGold", unlockLevel: THEME_UNLOCK_LEVEL["moon-gold"] },
  { id: "densuke", label: "themeDensuke", unlockLevel: THEME_UNLOCK_LEVEL.densuke, rarityLabel: "superRare" },
];

export default function MePage() {
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);
  const store = useStore();
  const profile = useActiveProfile();
  const game = useGame();
  const t = (k: DictKey) => translate(k, lang);

  const [goalsSheet, setGoalsSheet] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const backupFileRef = useRef<HTMLInputElement>(null);
  const photoFileRef = useRef<HTMLInputElement>(null);
  const level = levelFromXp(game.xp);
  const xpToNextLevel = Math.max(0, xpForLevel(level + 1) - game.xp);
  const selfId = memberIdFor(profile.id, store.ws.deviceId);
  const friendCount = Object.values(store.friends).filter((friend) => friend.id !== selfId).length;

  const chooseProfilePhoto = async (file: File) => {
    try {
      const photoDataUrl = await prepareProfilePhoto(file);
      store.updateProfile(profile.id, { photoDataUrl });
      toast(lang === "zh" ? "個人照片已更新" : "Profile photo updated", "checkCircle");
      void syncNow();
    } catch (error) {
      const tooLarge = error instanceof Error && error.message === "image-too-large";
      toast(
        tooLarge
          ? (lang === "zh" ? "照片太大，請選擇小於 15 MB 的照片。" : "That photo is too large. Choose one under 15 MB.")
          : (lang === "zh" ? "無法使用這張照片，請選擇其他圖片。" : "That photo could not be used. Choose another image."),
        "warning"
      );
    }
  };

  const chooseBuiltInAvatar = (photoDataUrl: string, unlockLevel: number) => {
    if (level < unlockLevel) {
      toast(
        lang === "zh" ? `此角色會在等級 ${unlockLevel} 解鎖` : `This friend unlocks at Level ${unlockLevel}`,
        "lock"
      );
      return;
    }
    store.updateProfile(profile.id, { photoDataUrl });
    setAvatarPickerOpen(false);
    toast(lang === "zh" ? "個人照片已更新" : "Profile photo updated", "checkCircle");
    void syncNow();
  };

  /* weight trend */
  const weights = (store.weights[profile.id] ?? []).slice(-30);

  const exportData = async () => {
    const raw = localStorage.getItem("melonmate-v1") ?? "{}";
    const filename = `melonmate-backup-${todayStr()}.json`;
    try {
      if (await shareNativeBackup(filename, raw, t("exportData"))) {
        toast(t("saved"), "save");
        return;
      }
    } catch {
      toast(lang === "zh" ? "無法分享備份" : "Could not share the backup", "warning");
      return;
    }
    const blob = new Blob([raw], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast(t("saved"), "save");
  };

  const importData = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result);
        const parsed = JSON.parse(text) as { state?: { profiles?: unknown } };
        if (!parsed.state || !parsed.state.profiles) throw new Error("bad");
        localStorage.setItem("melonmate-v1", text);
        toast(t("importOk"), "checkCircle");
        setTimeout(() => window.location.reload(), 600);
      } catch {
        toast(t("importBad"), "warning");
      }
    };
    reader.readAsText(file);
  };

  return (
    <main className="page stagger">
      <header className="flex items-center justify-between mb-4">
        <h1 className="t-hero icon-label"><AppIcon name="user" size={27} /> {t("me")}</h1>
        <div className="flex items-center gap-2">
          <FriendNotificationButton />
          <button className="chip press icon-label" onClick={() => setSetupOpen(true)}><AppIcon name="edit" size={15} /> {lang === "zh" ? "個人設定" : "My setup"}</button>
        </div>
      </header>

      <GlassCard strong className="me-profile-card mb-4">
        <ProfileAvatar
          className="me-profile-avatar"
          name={profile.name}
          photoDataUrl={profile.photoDataUrl}
          iconSize={34}
          eager
        />
        <div className="min-w-0 flex-1">
          <div className="t-title truncate">{profile.name}</div>
          <div className="t-cap mt-1">{game.xp.toLocaleString()} {t("xp")} {lang === "zh" ? "總計" : "total"}</div>
        </div>
        <button
          type="button"
          className="chip chip-on press icon-label me-photo-button"
          onClick={() => setAvatarPickerOpen(true)}
        >
          <AppIcon name="camera" size={16} /> {lang === "zh" ? "更換照片" : "Change photo"}
        </button>
        <div className="me-xp-level">
          <LevelProgressRing
            xp={game.xp}
            size={58}
            stroke={7}
            label={lang === "zh" ? "等級" : "Level"}
            shortLabel={lang === "zh" ? "等級" : "LV"}
          />
          <div className="min-w-0 flex-1">
            <div className="me-xp-level-heading">
              <strong>{t("level")} {level}</strong>
              <span>{game.xp.toLocaleString()} {t("xp")}</span>
            </div>
            <div className="t-cap mt-1">
              {level >= MAX_PLAYER_LEVEL
                ? (lang === "zh" ? "已完成目前的等級進度" : "Current level track complete")
                : lang === "zh"
                  ? `還差 ${xpToNextLevel.toLocaleString()} XP 升到等級 ${level + 1}`
                  : `${xpToNextLevel.toLocaleString()} XP to Level ${level + 1}`}
            </div>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-4 mb-4 streak-badge-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="t-section icon-label"><AppIcon name="fire" size={17} /> {lang === "zh" ? "連續紀錄徽章" : "Streak badges"}</div>
            <div className="t-cap mt-1">
              {lang === "zh" ? `目前 ${game.streak} 天 · 最佳 ${game.best} 天` : `${game.streak} days current · ${game.best} days best`}
            </div>
          </div>
          <span className="chip chip-on tabular">{game.streakMilestoneClaims?.length ?? 0}/{STREAK_MILESTONES.length}</span>
        </div>
        <div className="streak-badge-grid mt-3">
          {STREAK_MILESTONES.map((milestone) => {
            const unlocked = game.streakMilestoneClaims?.includes(milestone.days) ?? false;
            return (
              <div className={unlocked ? "is-unlocked" : "is-locked"} key={milestone.days}>
                <span><AppIcon name={unlocked ? "fire" : "lock"} size={19} /></span>
                <b>{milestone.days}</b>
                <small>{lang === "zh" ? "天" : "days"}</small>
                <em>+{milestone.xp} XP</em>
              </div>
            );
          })}
        </div>
      </GlassCard>

      <input
        ref={photoFileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void chooseProfilePhoto(file);
          event.target.value = "";
        }}
      />

      <Sheet
        open={avatarPickerOpen}
        onClose={() => setAvatarPickerOpen(false)}
        title={<span className="icon-label"><AppIcon name="user" size={20} /> {lang === "zh" ? "選擇個人照片" : "Choose profile photo"}</span>}
      >
        <div className="t-sub mb-3">
          {lang === "zh" ? "選擇一位甜瓜朋友；升級後可收集更多角色。" : "Pick a melon friend. Level up to collect more characters."}
        </div>
        <div className="profile-avatar-grid">
          {BUILT_IN_PROFILE_AVATARS.map((avatar) => {
            const selected = profile.photoDataUrl === avatar.src;
            const unlocked = isBuiltInProfileAvatarUnlocked(avatar, level);
            const unlockCopy = lang === "zh" ? `等級 ${avatar.unlockLevel} 解鎖` : `Unlocks at Level ${avatar.unlockLevel}`;
            return (
              <button
                type="button"
                key={avatar.id}
                className={`profile-avatar-choice press ${selected ? "is-selected" : ""} ${unlocked ? "" : "is-locked"}`}
                aria-pressed={selected}
                aria-label={`${avatar.name[lang]}${unlocked ? "" : `, ${unlockCopy}`}`}
                disabled={!unlocked}
                onClick={() => chooseBuiltInAvatar(avatar.src, avatar.unlockLevel)}
              >
                <ProfileAvatar
                  className="profile-avatar-choice-art"
                  name={avatar.name[lang]}
                  photoDataUrl={avatar.src}
                  iconSize={28}
                />
                <span>{avatar.name[lang]}</span>
                {!unlocked && (
                  <i className="profile-avatar-lock" aria-hidden="true">
                    <AppIcon name="lock" size={10} strokeWidth={2.6} /> L{avatar.unlockLevel}
                  </i>
                )}
                {selected && unlocked && <i aria-hidden="true"><AppIcon name="check" size={13} strokeWidth={2.6} /></i>}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="btn btn-primary press w-full mt-4 icon-label"
          onClick={() => {
            photoFileRef.current?.click();
            setAvatarPickerOpen(false);
          }}
        >
          <AppIcon name="upload" size={18} /> {lang === "zh" ? "從相簿上傳" : "Upload from photo library"}
        </button>
        {profile.photoDataUrl && (
          <button
            type="button"
            className="btn btn-ghost press w-full mt-2"
            onClick={() => {
              store.updateProfile(profile.id, { photoDataUrl: undefined });
              setAvatarPickerOpen(false);
              void syncNow();
            }}
          >
            {lang === "zh" ? "使用預設圖示" : "Use default icon"}
          </button>
        )}
      </Sheet>

      <Link className="glass p-4 mb-4 press me-friends-link" href="/friends">
        <span className="icon-tile"><AppIcon name="friends" size={20} /></span>
        <div className="min-w-0 flex-1">
          <div className="t-section">{t("friends")}</div>
          <div className="t-cap mt-1">{friendCount} {lang === "zh" ? "位朋友 · 在專屬頁面管理與分享" : `${friendCount === 1 ? "friend" : "friends"} · manage and share on the dedicated page`}</div>
        </div>
        <AppIcon name="next" size={18} />
      </Link>

      <GlassCard className="p-4 mb-4 press" onClick={() => setSetupOpen(true)}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="t-section icon-label"><AppIcon name="goal" size={17} /> {lang === "zh" ? "我的方向" : "My direction"}</div>
            <div className="font-bold mt-1" style={{ fontSize: 17 }}>
              {profile.fitnessGoal === "lose" ? (lang === "zh" ? "減重" : "Lose weight") : profile.fitnessGoal === "gain" ? (lang === "zh" ? "增重／增肌" : "Gain weight / mass") : (lang === "zh" ? "維持" : "Maintain")}
            </div>
            <div className="t-cap mt-1">
              {profile.trainingDays ?? 3} {lang === "zh" ? "天／週" : "days/week"} · {profile.trainingFocus === "strength" ? (lang === "zh" ? "力量" : "strength") : profile.trainingFocus === "hypertrophy" ? (lang === "zh" ? "肌肥大" : "hypertrophy") : (lang === "zh" ? "綜合體能" : "general fitness")}
            </div>
          </div>
          <AppIcon name="next" size={18} />
        </div>
      </GlassCard>

      {/* weight trend */}
      {weights.length >= 1 && (
        <GlassCard className="p-4 mb-4">
          <div className="t-section mb-2 icon-label"><AppIcon name="chart" size={17} /> {t("weightTrend")} ({profile.unit})</div>
          <LineChart
            points={weights.map((w) => w.value)}
            labels={weights.map((w, i) => (i === 0 || i === weights.length - 1 ? fmtDate(w.date, lang) : ""))}
            color="var(--canta-500)"
          />
        </GlassCard>
      )}

      {/* personal daily targets */}
      <GlassCard className="p-4 mb-4 press" onClick={() => setGoalsSheet(true)}>
        <div className="flex items-center justify-between">
          <div className="t-section icon-label"><AppIcon name="goal" size={17} /> {t("goals")}</div>
          <span className="chip icon-label" style={{ fontSize: 12, padding: "4px 10px" }}><AppIcon name="edit" size={14} /> {t("edit")}</span>
        </div>
        <div className="t-sub tabular mt-1">
          {fmtNum(profile.goals.cal)} {t("cal")} · P {profile.goals.protein} · C {profile.goals.carbs} · F {profile.goals.fat}
        </div>
        <div className="t-cap tabular mt-1 icon-label"><AppIcon name="water" size={14} /> {profile.waterGoal ?? 8} {t("cupsPerDay")}</div>
      </GlassCard>

      {/* appearance */}
      <GlassCard className="p-4 mb-4">
        <div className="t-section icon-label"><AppIcon name="palette" size={17} /> {t("appearance")}</div>
        <div className="theme-grid mt-3" aria-label={t("melonTheme")}>
          {THEME_OPTIONS.map((option) => {
            const active = store.theme === option.id;
            const unlocked = level >= option.unlockLevel;
            const unlockCopy = t("themeUnlockLevel").replace("{level}", String(option.unlockLevel));
            return (
              <button
                type="button"
                key={option.id}
                className={`theme-option press ${active ? "on" : ""} ${unlocked ? "" : "locked"}`}
                onClick={() => {
                  if (active) return;
                  store.setTheme(option.id);
                  applyNativeAppIcon(option.id);
                }}
                aria-pressed={active}
                aria-label={`${t(option.label)}${unlocked ? "" : `, ${unlockCopy}`}`}
                disabled={!unlocked}
              >
                <span className="theme-preview" aria-hidden="true">
                  <span className={`theme-fruit theme-fruit-${option.id}`} />
                  <span className="theme-swatches">
                    {THEME_VISUALS[option.id].colors.map((color) => (
                      <span key={color} className="theme-swatch" style={{ background: color }} />
                    ))}
                  </span>
                  {active && <span className="theme-check"><AppIcon name="check" size={15} /></span>}
                  {option.unlockLevel > 1 && (
                    <span className={`theme-rarity ${unlocked ? "unlocked" : ""}`}>
                      {unlocked ? t(option.rarityLabel ?? "rare") : <span className="icon-label"><AppIcon name="lock" size={12} /> {t("level")} {option.unlockLevel}</span>}
                    </span>
                  )}
                </span>
                <span className="theme-name">{t(option.label)}</span>
              </button>
            );
          })}
        </div>
      </GlassCard>

      <SoundSettings />

      <LockScreenWidget />

      <NativeAppSettings />

      <RewardGuideSettings />

      {/* settings */}
      <GlassCard className="px-4 py-2 mb-4">
        <div className="row">
          <div className="flex-1 font-semibold">{t("language")}</div>
          <div className="seg" style={{ width: 150 }}>
            <button className={`seg-item ${lang === "en" ? "on" : ""}`} onClick={() => setLang("en")}>EN</button>
            <button
              className={`seg-item ${lang === "zh" ? "on" : ""}`}
              lang="zh-Hant"
              onClick={() => setLang("zh")}
            >
              中文
            </button>
          </div>
        </div>
        <div className="row">
          <div className="flex-1 font-semibold">{t("units")}</div>
          <div className="seg" style={{ width: 150 }}>
            {(["lb", "kg"] as WeightUnit[]).map((u) => (
              <button key={u} className={`seg-item ${profile.unit === u ? "on" : ""}`} onClick={() => store.updateProfile(profile.id, { unit: u })}>
                {u}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* data */}
      <GlassCard className="px-4 py-2 mb-4">
        <button type="button" className="row row-button press cursor-pointer" onClick={() => void exportData()}>
          <div className="flex-1 font-semibold icon-label"><AppIcon name="save" size={18} /> {t("exportData")}</div>
          <AppIcon name="next" size={17} />
        </button>
        <button type="button" className="row row-button press cursor-pointer" onClick={() => backupFileRef.current?.click()}>
          <div className="flex-1 font-semibold icon-label"><AppIcon name="download" size={18} /> {t("importData")}</div>
          <AppIcon name="next" size={17} />
        </button>
        <button
          type="button"
          className="row row-button press cursor-pointer"
          onClick={() => {
            if (window.confirm(t("resetConfirm"))) {
              localStorage.removeItem("melonmate-v1");
              localStorage.removeItem("melonmate-garden-v1");
              window.location.reload();
            }
          }}
        >
          <div className="flex-1 font-semibold icon-label" style={{ color: "var(--danger)" }}><AppIcon name="trash" size={18} /> {t("resetAll")}</div>
        </button>
      </GlassCard>
      <div className="t-cap text-center mb-4 px-6">{t("aboutData")}</div>

      <input
        ref={backupFileRef}
        type="file"
        accept="application/json"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) importData(f);
          e.target.value = "";
        }}
      />

      {/* daily targets sheet */}
      <DailyTargetsSheet open={goalsSheet} onClose={() => setGoalsSheet(false)} />

      {setupOpen && <OnboardingFlow edit onClose={() => setSetupOpen(false)} />}
    </main>
  );
}
