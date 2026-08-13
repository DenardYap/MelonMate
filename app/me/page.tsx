"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { useActiveProfile, useGame, useStore } from "@/lib/store";
import { translate, type DictKey } from "@/lib/i18n";
import { fmtDate, todayStr } from "@/lib/dates";
import { fmtNum } from "@/lib/nutrition";
import {
  createWorkspace,
  connectionCodes,
  isSetupError,
  joinWorkspace,
  memberIdFor,
  syncNow,
} from "@/lib/sync";
import { GlassCard, Sheet, toast } from "@/components/ui";
import { LineChart } from "@/components/charts";
import DailyTargetsSheet from "@/components/DailyTargetsSheet";
import LockScreenWidget from "@/components/LockScreenWidget";
import type { MemberSnapshot, ThemeId, WeightUnit } from "@/lib/types";
import { levelFromXp, xpForLevel } from "@/lib/game";
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
              {lang === "zh"
                ? `還差 ${xpToNextLevel.toLocaleString()} XP 升到等級 ${level + 1}`
                : `${xpToNextLevel.toLocaleString()} XP to Level ${level + 1}`}
            </div>
          </div>
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

      <FriendsSection />

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
                onClick={() => store.setTheme(option.id)}
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

/* ------------------------------ friends ------------------------------ */

function FriendsSection() {
  const lang = useStore((s) => s.lang);
  const store = useStore();
  const profile = useActiveProfile();
  const t = (k: DictKey) => translate(k, lang);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selfId = memberIdFor(profile.id, store.ws.deviceId);
  const friends = Object.values(store.friends)
    .filter((member) => member.id !== selfId)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const codes = connectionCodes(store.ws);

  const copyCode = async () => {
    if (!inviteCode) return;
    await navigator.clipboard.writeText(inviteCode);
    toast(t("copied"), "copy");
  };

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const nextCode = await createWorkspace();
      setInviteCode(nextCode);
      toast(lang === "zh" ? "朋友邀請已建立" : "Friend invite created", "fruit");
    } catch (e) {
      setError(e instanceof Error ? e.message : "sync-failed");
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    setBusy(true);
    setError(null);
    try {
      await joinWorkspace(code);
      setCode("");
      setOpen(false);
      toast(t("joined"), "friends");
    } catch (e) {
      setError(e instanceof Error ? e.message : "sync-failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="t-section icon-label"><AppIcon name="friends" size={17} /> {t("friends")}</div>
          <div className="t-cap">{t("friendsReadOnly")}</div>
        </div>
        <div className="flex gap-2">
          <button className="chip chip-on press icon-label" onClick={() => setOpen(true)}><AppIcon name="addUser" size={16} /> {t("addFriend")}</button>
        </div>
      </div>

      {friends.length === 0 ? (
        <GlassCard className="p-5 text-center">
          <div className="empty-icon mx-auto"><AppIcon name="friends" size={34} /></div>
          <div className="font-bold mt-2">{t("noFriendsTitle")}</div>
          <div className="t-sub mt-1">{codes.length ? t("noFriendsYet") : (lang === "zh" ? "建立一組一對一邀請碼，或輸入朋友傳給你的邀請碼。" : "Create a one-to-one invite, or enter a code a friend sent you.")}</div>
          <button className="btn btn-primary press mt-3 icon-label" onClick={() => setOpen(true)}><AppIcon name="addUser" size={17} /> {t("addFriend")}</button>
        </GlassCard>
      ) : (
        <div className="flex flex-col gap-3">
          {friends.map((friend) => <FriendProgressCard key={friend.id} friend={friend} />)}
        </div>
      )}

      {store.ws.error && (
        <div className="t-cap mt-2" style={{ color: "var(--danger)" }}>
          {isSetupError(store.ws.error) ? t("syncSetupHint") : t("syncError")}
        </div>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title={<span className="icon-label"><AppIcon name="addUser" size={21} /> {t("addFriend")}</span>}>
        <div className="flex flex-col gap-3 pb-2">
          <div className="t-sub">{lang === "zh" ? "每組邀請碼只連結一位朋友。你可以建立邀請，也可以加入任何朋友傳來的邀請。" : "Each invite connects one friend. Create a code for them, or join any code a friend sends you."}</div>
          {inviteCode ? (
            <div className="flex flex-col gap-2">
              <button
                className="btn press w-full"
                style={{ fontSize: 18, letterSpacing: 1.5 }}
                onClick={() => void copyCode()}
              >
                {inviteCode} · {t("copy")}
              </button>
              <button className="btn btn-ghost press w-full" onClick={() => void create()} disabled={busy}>
                {busy ? t("syncNow") : (lang === "zh" ? "為另一位朋友建立新邀請" : "Create an invite for another friend")}
              </button>
            </div>
          ) : (
            <button className="btn btn-primary press w-full" onClick={() => void create()} disabled={busy}>
              {busy ? t("syncNow") : (lang === "zh" ? "建立朋友邀請碼" : "Create a friend invite")}
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="divider flex-1" />
            <span className="t-cap">{t("or")}</span>
            <div className="divider flex-1" />
          </div>
          <input
            className="field tabular"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={t("friendCodePlaceholder")}
            autoCapitalize="characters"
          />
          <button className="btn press w-full" onClick={() => void join()} disabled={busy || !code.trim()}>
            {lang === "zh" ? "加入朋友" : "Add friend with code"}
          </button>
        </div>
        {error && (
          <div className="t-cap mt-2" style={{ color: "var(--danger)" }}>
            {isSetupError(error)
              ? t("syncSetupHint")
              : error === "bad-code"
                ? t("badCode")
                : error === "space-not-found"
                  ? t("spaceNotFound")
                  : error === "space-full"
                    ? (lang === "zh" ? "此邀請已由另一位朋友使用。請對方建立新的邀請碼。" : "This invite was already used by another friend. Ask for a new code.")
                    : t("syncError")}
          </div>
        )}
      </Sheet>
    </section>
  );
}

function FriendProgressCard({ friend }: { friend: MemberSnapshot }) {
  const lang = useStore((s) => s.lang);
  const t = (k: DictKey) => translate(k, lang);
  const calProgress = friend.today.calGoal > 0 ? Math.min(1, friend.today.cal / friend.today.calGoal) : 0;
  const proteinProgress = friend.today.proteinGoal > 0 ? Math.min(1, friend.today.protein / friend.today.proteinGoal) : 0;

  return (
    <Link className="glass p-4 press friend-progress-card" href={`/friends?id=${encodeURIComponent(friend.id)}`}>
      <div className="flex items-center gap-3 mb-3">
        <ProfileAvatar
          className="profile-icon"
          name={friend.name}
          photoDataUrl={friend.photoDataUrl}
          iconSize={24}
        />
        <div className="flex-1 min-w-0">
          <div className="font-bold" style={{ fontSize: 16 }}>{friend.name}</div>
          <div className="t-cap">{t("level")} {friend.level} · {friend.xp} {t("xp")}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="chip icon-label" style={{ cursor: "default" }}><AppIcon name="fire" size={15} /> {friend.streak}</span>
          <AppIcon name="next" size={17} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <FriendProgressBar
          label={t("calToday")}
          value={friend.today.cal}
          goal={friend.today.calGoal}
          progress={calProgress}
          color="linear-gradient(90deg,var(--cal-from),var(--cal-to))"
        />
        <FriendProgressBar
          label={t("protein")}
          value={friend.today.protein}
          goal={friend.today.proteinGoal}
          progress={proteinProgress}
          color="var(--protein)"
        />
      </div>

      <div className="flex items-center gap-1 mb-3" aria-label={t("friendGarden")}>
        {friend.garden.map((day) => (
          <div
            key={day.date}
            title={day.date}
            style={{
              width: 28,
              height: 28,
              borderRadius: 9,
              display: "grid",
              placeItems: "center",
              fontSize: 13,
              background: day.hit ? "var(--garden-hit)" : "var(--track)",
            }}
          >
            {day.hit ? <AppIcon name="leaf" size={14} /> : ""}
          </div>
        ))}
      </div>

      {friend.lastWorkout && (
        <div className="t-cap icon-label">
          <AppIcon name="gym" size={15} /> {t("lastWorkoutLabel")}: {friend.lastWorkout.name[lang]} · {fmtDate(friend.lastWorkout.date, lang)}
          {friend.lastWorkout.prs > 0 ? <span className="icon-label">· <AppIcon name="medal" size={14} /> {friend.lastWorkout.prs}</span> : ""}
        </div>
      )}
    </Link>
  );
}

function FriendProgressBar({
  label,
  value,
  goal,
  progress,
  color,
}: {
  label: string;
  value: number;
  goal: number;
  progress: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between t-cap mb-1">
        <span>{label}</span>
        <span className="tabular">{fmtNum(value)} / {fmtNum(goal)}</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, overflow: "hidden", background: "var(--track)" }}>
        <div style={{ width: `${progress * 100}%`, height: "100%", borderRadius: 99, background: color }} />
      </div>
    </div>
  );
}
