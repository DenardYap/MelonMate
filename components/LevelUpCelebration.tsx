"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { AppIcon, type IconName } from "@/components/icons";
import { fireConfetti } from "@/components/ui";
import { useCelebrationQueue } from "@/lib/celebrationQueue";
import { GARDEN_SPELL_IDS } from "@/lib/garden";
import { useGardenStore } from "@/lib/gardenStore";
import { levelFromXp, xpForLevel } from "@/lib/game";
import { levelUnlocksAt, nextUnlockLevelAfter } from "@/lib/levelUnlocks";
import { successHaptic } from "@/lib/nativeApp";
import { useGame, useStore } from "@/lib/store";
import { playSound } from "@/lib/soundscape";
import type { GardenSpellId, Lang } from "@/lib/types";

const LEVEL_STORAGE_KEY = "melonmate-level-celebrations-v1";

interface CelebrationState {
  fromLevel: number;
  level: number;
  awardedSpells: GardenSpellId[];
}

const SPELL_REWARD_META: Record<GardenSpellId, { icon: IconName; name: Record<Lang, string> }> = {
  "pantry-spark": { icon: "spark", name: { en: "Pantry Spark", zh: "餐桌星火" } },
  trailwind: { icon: "stretch", name: { en: "Trailwind", zh: "步道之風" } },
  "hearth-flame": { icon: "kitchen", name: { en: "Hearth Flame", zh: "爐火咒" } },
  "balance-bloom": { icon: "goal", name: { en: "Balance Bloom", zh: "平衡花咒" } },
  ironroot: { icon: "gym", name: { en: "Ironroot", zh: "鐵根術" } },
  "starlight-season": { icon: "star", name: { en: "Starlight Season", zh: "星光時節" } },
  "everripe-eclipse": { icon: "moon", name: { en: "Everripe Eclipse", zh: "永熟月蝕" } },
};

function readCelebratedLevel(profileId: string): number | null {
  try {
    const saved = JSON.parse(localStorage.getItem(LEVEL_STORAGE_KEY) ?? "{}") as Record<string, number>;
    return Number.isFinite(saved[profileId]) ? saved[profileId] : null;
  } catch {
    return null;
  }
}

function writeCelebratedLevel(profileId: string, level: number) {
  try {
    const saved = JSON.parse(localStorage.getItem(LEVEL_STORAGE_KEY) ?? "{}") as Record<string, number>;
    localStorage.setItem(LEVEL_STORAGE_KEY, JSON.stringify({ ...saved, [profileId]: level }));
  } catch {
    // Celebration history is a convenience; level progress itself remains in the stores.
  }
}

function levelsBetween(fromLevel: number, toLevel: number) {
  return Array.from({ length: Math.max(0, toLevel - fromLevel) }, (_, index) => fromLevel + index + 1);
}

export default function LevelUpCelebration() {
  const profileId = useStore((state) => state.activeProfileId);
  const onboarded = useStore((state) => state.onboarded);
  const lang = useStore((state) => state.lang);
  const awardLevelSpells = useGardenStore((state) => state.awardLevelSpells);
  const game = useGame();
  const level = levelFromXp(game.xp);
  const observedRef = useRef<{ profileId: string; level: number } | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [celebration, setCelebration] = useState<CelebrationState | null>(null);
  const activeCelebration = useCelebrationQueue((state) => state.active);
  const requestCelebration = useCelebrationQueue((state) => state.request);
  const finishCelebration = useCelebrationQueue((state) => state.finish);
  const cancelCelebration = useCelebrationQueue((state) => state.cancel);
  const celebrationKey = celebration ? `level-up:${profileId}:${celebration.fromLevel}` : null;
  const celebrationIsActive = Boolean(celebrationKey && activeCelebration?.key === celebrationKey);

  useEffect(() => {
    if (!onboarded) return;
    const observed = observedRef.current;
    if (!observed || observed.profileId !== profileId) {
      const savedLevel = readCelebratedLevel(profileId);
      const fromLevel = Math.min(level, savedLevel ?? Math.max(1, level - 1));
      observedRef.current = { profileId, level };
      if (level > fromLevel && level > 1) {
        const awardedSpells = awardLevelSpells(profileId, levelsBetween(fromLevel, level));
        setCelebration({ fromLevel, level, awardedSpells });
      } else {
        setCelebration(null);
      }
      return;
    }
    if (level <= observed.level) return;
    const awardedSpells = awardLevelSpells(profileId, levelsBetween(observed.level, level));
    setCelebration((current) => ({
      fromLevel: current?.fromLevel ?? observed.level,
      level,
      awardedSpells: [...(current?.awardedSpells ?? []), ...awardedSpells],
    }));
    observedRef.current = { profileId, level };
  }, [awardLevelSpells, level, onboarded, profileId]);

  useEffect(() => {
    if (!celebrationKey) return;
    requestCelebration({ key: celebrationKey, kind: "level-up", priority: 0 });
    return () => cancelCelebration(celebrationKey);
  }, [cancelCelebration, celebrationKey, requestCelebration]);

  useEffect(() => {
    if (!celebration || !celebrationIsActive) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => closeRef.current?.focus());
    const celebrationTimer = window.setTimeout(() => fireConfetti(), 80);
    playSound("levelUp");
    void successHaptic();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.cancelAnimationFrame(focusFrame);
      window.clearTimeout(celebrationTimer);
      document.removeEventListener("keydown", onKeyDown);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebration?.level, celebrationIsActive]);

  const newlyUnlocked = useMemo(() => {
    if (!celebration) return [];
    return levelsBetween(celebration.fromLevel, celebration.level)
      .flatMap((unlockedAt) => levelUnlocksAt(unlockedAt, game.golden).map((unlock) => ({ ...unlock, unlockedAt })));
  }, [celebration, game.golden]);

  const spellGiftGroups = useMemo(() => {
    if (!celebration) return [];
    const counts = celebration.awardedSpells.reduce<Partial<Record<GardenSpellId, number>>>((out, spell) => {
      out[spell] = (out[spell] ?? 0) + 1;
      return out;
    }, {});
    return GARDEN_SPELL_IDS
      .filter((spell) => (counts[spell] ?? 0) > 0)
      .map((spell) => ({ spell, count: counts[spell] ?? 0 }));
  }, [celebration]);

  if (!celebration || !celebrationIsActive) return null;

  const nextUnlockLevel = nextUnlockLevelAfter(celebration.level);
  const nextUnlocks = nextUnlockLevel == null ? [] : levelUnlocksAt(nextUnlockLevel, game.golden);
  const xpToNextLevel = Math.max(0, xpForLevel(celebration.level + 1) - game.xp);
  const spellGiftCount = celebration.awardedSpells.length;
  const copy = lang === "zh" ? {
    eyebrow: "升級成功",
    reached: `你已升到等級 ${celebration.level}`,
    crossed: `一次提升了 ${celebration.level - celebration.fromLevel} 個等級！`,
    unlocked: "本次獎勵",
    noUnlock: "這個等級沒有新的收集獎勵，但所有經驗都會繼續累積。",
    spellGift: `${spellGiftCount} 個魔法咒語`,
    spellGiftNote: "已存入你的魔法書。",
    levelReward: "升級獎勵",
    next: "下一個解鎖",
    allUnlocked: "目前所有等級獎勵都已解鎖。",
    xp: `還差 ${xpToNextLevel} XP 升到等級 ${celebration.level + 1}`,
    tip: "記錄食物、走路、完成訓練與照顧農場都能繼續獲得 XP。",
    continue: "繼續前進",
    seed: "種子",
    theme: "主題",
    avatar: "大頭貼",
    musicPack: "音樂包",
    farm: "農場",
    level: "等級",
    dismiss: "關閉升級畫面",
  } : {
    eyebrow: "Level up!",
    reached: `You reached Level ${celebration.level}`,
    crossed: `You climbed ${celebration.level - celebration.fromLevel} levels at once!`,
    unlocked: "Your rewards",
    noUnlock: "No new collectible reward at this level, but all of your XP carries forward.",
    spellGift: `${spellGiftCount} Magic Spells`,
    spellGiftNote: "Added to your Spellbook.",
    levelReward: "Level reward",
    next: "Coming next",
    allUnlocked: "You've unlocked every level reward currently available.",
    xp: `${xpToNextLevel} XP to Level ${celebration.level + 1}`,
    tip: "Keep earning XP from food logs, walking, workouts, and tending your farm.",
    continue: "Keep going",
    seed: "Seed",
    theme: "Theme",
    avatar: "Profile photo",
    musicPack: "Music pack",
    farm: "Farm",
    level: "Level",
    dismiss: "Dismiss level-up celebration",
  };

  function dismiss() {
    if (!celebration) return;
    writeCelebratedLevel(profileId, celebration.level);
    if (celebrationKey) finishCelebration(celebrationKey);
    setCelebration(null);
  }

  return (
    <div className="level-up-layer">
      <button className="level-up-scrim" onClick={dismiss} aria-label={copy.dismiss} />
      <section className="level-up-modal" role="dialog" aria-modal="true" aria-labelledby="level-up-title">
        <div className="level-up-glow" aria-hidden="true" />
        <div className="level-up-badge" aria-hidden="true">
          <span>{lang === "zh" ? "等級" : "LEVEL"}</span>
          <strong>{celebration.level}</strong>
        </div>
        <div className="level-up-heading">
          <span><AppIcon name="spark" size={16} /> {copy.eyebrow}</span>
          <h2 id="level-up-title">{copy.reached}</h2>
          {celebration.level - celebration.fromLevel > 1 && <p>{copy.crossed}</p>}
        </div>

        <div className="level-up-xp"><AppIcon name="star" size={16} /><b>{copy.xp}</b><span>{copy.tip}</span></div>

        <div className="level-up-section">
          <h3>{copy.unlocked}</h3>
          <div className="level-up-spell-gift">
            <span><AppIcon name="magic" size={25} /></span>
            <div><b>{copy.spellGift}</b><small>{copy.spellGiftNote}</small></div>
            <em>{copy.levelReward}</em>
            <div className="level-up-spell-drops">
              {spellGiftGroups.map(({ spell, count }) => (
                <span key={spell}>
                  <AppIcon name={SPELL_REWARD_META[spell].icon} size={14} />
                  <b>{SPELL_REWARD_META[spell].name[lang]}</b>
                  <em>{count}×</em>
                </span>
              ))}
            </div>
          </div>
          {newlyUnlocked.length ? (
            <div className="level-up-unlocks">
              {newlyUnlocked.map((unlock) => (
                <div key={unlock.id} className="level-up-unlock">
                  <LevelUnlockVisual unlock={unlock} />
                  <div><b>{unlock.name[lang]}</b><small>{unlock.note[lang]}</small></div>
                  <em>{copy.level} {unlock.unlockedAt} · {unlock.kind === "seed" ? copy.seed : unlock.kind === "theme" ? copy.theme : unlock.kind === "avatar" ? copy.avatar : unlock.kind === "musicPack" ? copy.musicPack : copy.farm}</em>
                </div>
              ))}
            </div>
          ) : <p className="level-up-empty">{copy.noUnlock}</p>}
        </div>

        <div className="level-up-section is-next">
          <h3>{copy.next}</h3>
          {nextUnlockLevel == null ? <p className="level-up-empty">{copy.allUnlocked}</p> : (
            <div className="level-up-next-row">
              <span>{copy.level} {nextUnlockLevel}</span>
              <b>{nextUnlocks.map((unlock) => unlock.name[lang]).join(" · ")}</b>
            </div>
          )}
        </div>

        <button ref={closeRef} className="level-up-continue press" onClick={dismiss}>
          {copy.continue} <AppIcon name="next" size={18} />
        </button>
      </section>
    </div>
  );
}

function LevelUnlockVisual({ unlock }: { unlock: ReturnType<typeof levelUnlocksAt>[number] }) {
  if (unlock.kind === "seed") {
    return (
      <span
        className="level-up-reward-visual is-seed"
        style={{ "--unlock-accent": unlock.accent } as CSSProperties}
        aria-hidden="true"
      >
        <Image src={unlock.image} alt="" width={58} height={58} />
      </span>
    );
  }

  if (unlock.kind === "farm") {
    return (
      <span className="level-up-reward-visual is-seed" aria-hidden="true">
        {unlock.image
          ? <Image src={unlock.image} alt="" width={58} height={58} unoptimized />
          : <AppIcon name={unlock.farmKind === "building" ? "home" : "heart"} size={31} />}
      </span>
    );
  }

  if (unlock.kind === "avatar") {
    return (
      <span className="level-up-reward-visual is-avatar" aria-hidden="true">
        <Image src={unlock.image} alt="" width={58} height={58} unoptimized />
      </span>
    );
  }

  if (unlock.kind === "musicPack") {
    return (
      <span className="level-up-reward-visual is-music-pack" aria-hidden="true">
        <AppIcon name="music" size={25} />
        <span className="level-up-theme-swatches">
          {unlock.colors.map((color) => <i key={color} style={{ background: color }} />)}
        </span>
      </span>
    );
  }

  return (
    <span className="level-up-reward-visual is-theme" aria-hidden="true">
      <span className={`theme-fruit theme-fruit-${unlock.themeId}`} />
      <span className="level-up-theme-swatches">
        {unlock.colors.map((color) => <i key={color} style={{ background: color }} />)}
      </span>
    </span>
  );
}
