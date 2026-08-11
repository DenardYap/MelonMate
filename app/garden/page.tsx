"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useRouter } from "next/navigation";
import { fireConfetti, Sheet, toast } from "@/components/ui";
import { AppIcon, type IconName } from "@/components/icons";
import { todayStr, weekDates } from "@/lib/dates";
import {
  MAX_GARDEN_PLOTS,
  MELON_VARIETIES,
  GARDEN_SPELL_EFFECTS,
  cropProgress,
  cropRemainingMs,
  cropStageImage,
  cropVisualStage,
  gardenExpansionCost,
  isPlotReady,
  isVarietyUnlocked,
  varietyById,
} from "@/lib/garden";
import { gardenAchievements } from "@/lib/gardenAchievements";
import { levelProgressFromXp } from "@/lib/game";
import { useGarden, useGardenStore } from "@/lib/gardenStore";
import { sumMacros } from "@/lib/nutrition";
import { useActiveProfile, useGame, useStore } from "@/lib/store";
import type { GardenSpellId, MelonVarietyId } from "@/lib/types";
import LevelProgressRing from "@/components/LevelProgressRing";
import { playSound } from "@/lib/soundscape";

const RAIN_DROPS = Array.from({ length: 22 }, (_, index) => index);
const FARM_MAP_WIDTH = 2400;
const FARM_MAP_HEIGHT = 1600;
const FARM_MIN_ZOOM = 0.6;
const FARM_MAX_ZOOM = 2;
const FARM_PLOT_WIDTH = 190;
const FARM_PLOT_HEIGHT = 125;
const PLOT_POSITIONS = [
  { x: 948, y: 462 },
  { x: 1082, y: 521 },
  { x: 1076, y: 655 },
  { x: 801, y: 529 },
  { x: 935, y: 591 },
  { x: 654, y: 601 },
  { x: 789, y: 668 },
  { x: 935, y: 730 },
  { x: 626, y: 746 },
  { x: 760, y: 816 },
  { x: 1464, y: 663 },
  { x: 1635, y: 734 },
  { x: 1785, y: 795 },
  { x: 1364, y: 749 },
  { x: 1523, y: 815 },
  { x: 1660, y: 884 },
  { x: 1214, y: 823 },
  { x: 1395, y: 902 },
  { x: 1526, y: 974 },
  { x: 1089, y: 935 },
  { x: 1239, y: 1005 },
  { x: 1410, y: 1062 },
] as const;

function plotGroupCenter(unlockedPlots: number) {
  const visibleCount = Math.min(PLOT_POSITIONS.length, Math.max(1, unlockedPlots + 1));
  const visiblePositions = PLOT_POSITIONS.slice(0, visibleCount);
  const left = Math.min(...visiblePositions.map((position) => position.x));
  const right = Math.max(...visiblePositions.map((position) => position.x + FARM_PLOT_WIDTH));
  const top = Math.min(...visiblePositions.map((position) => position.y));
  const bottom = Math.max(...visiblePositions.map((position) => position.y + FARM_PLOT_HEIGHT));

  return { x: (left + right) / 2, y: (top + bottom) / 2 };
}

type FarmPanel = "seeds" | "spells" | "progress" | null;
type FarmResource = "dew" | "xp";

interface MagicSpell {
  id: GardenSpellId;
  icon: IconName;
  name: string;
  cadence: string;
  goal: string;
  goalComplete: boolean;
  claimKey: string;
  dewCost: number;
  boostMinutes: number;
  targetCount: number | "all";
  instantFinish?: boolean;
  requiresConfirmation?: boolean;
}

interface PendingSpellAction {
  spell: MagicSpell;
  kind: "buy" | "cast";
}

export default function GardenPage() {
  const router = useRouter();
  const now = useGardenClock();
  const lang = useStore((state) => state.lang);
  const app = useStore();
  const profile = useActiveProfile();
  const game = useGame();
  const garden = useGarden(profile.id);
  const plant = useGardenStore((state) => state.plant);
  const buySpell = useGardenStore((state) => state.buySpell);
  const claimGoalSpell = useGardenStore((state) => state.claimGoalSpell);
  const castSpell = useGardenStore((state) => state.castSpell);
  const harvest = useGardenStore((state) => state.harvest);
  const expandFarm = useGardenStore((state) => state.expandFarm);
  const [selected, setSelected] = useState<MelonVarietyId>("honeydew");
  const [justTended, setJustTended] = useState(false);
  const [activePanel, setActivePanel] = useState<FarmPanel>(null);
  const [resourceGuide, setResourceGuide] = useState<FarmResource | null>(null);
  const [pendingSpellAction, setPendingSpellAction] = useState<PendingSpellAction | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const viewportRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(1);
  const initialPlotCenterRef = useRef(plotGroupCenter(garden.unlockedPlots));
  const suppressClickUntilRef = useRef(0);
  const panRef = useRef({ active: false, pointerId: -1, x: 0, y: 0, left: 0, top: 0 });

  const copy = lang === "zh" ? COPY.zh : COPY.en;
  const today = todayStr();
  const {
    level,
    earned: playerLevelXp,
    needed: playerLevelXpNeeded,
  } = levelProgressFromXp(game.xp);
  const profileLogs = app.logs[profile.id] ?? [];
  const entries = profileLogs.filter((entry) => entry.date === today);
  const totals = useMemo(() => sumMacros(entries.map((entry) => entry.macros)), [entries]);
  const stepsToday = app.health?.[profile.id]?.[today]?.steps ?? 0;
  const workoutDone = (app.sessions[profile.id] ?? []).some(
    (session) => session.date === today && Boolean(session.endedAt)
  );
  const cookedToday = entries.some((entry) => entry.src === "recipe");
  const currentWeek = weekDates(today);
  const weekStart = currentWeek[0];
  const balancedDaysThisWeek = currentWeek.filter((date) => {
    if (date > today) return false;
    const dayEntries = profileLogs.filter((entry) => entry.date === date);
    return dayEntries.length >= 3 && sumMacros(dayEntries.map((entry) => entry.macros)).cal <= profile.goals.cal;
  }).length;
  const magicSpells: MagicSpell[] = [
    {
      id: "pantry-spark",
      icon: "spark",
      name: lang === "zh" ? "餐桌星火" : "Pantry Spark",
      cadence: copy.dailyGoal,
      goal: lang === "zh" ? `食物記錄 ${Math.min(entries.length, 3)}/3` : `Food logs ${Math.min(entries.length, 3)}/3`,
      goalComplete: entries.length >= 3,
      claimKey: today,
      ...GARDEN_SPELL_EFFECTS["pantry-spark"],
    },
    {
      id: "trailwind",
      icon: "stretch",
      name: lang === "zh" ? "步道之風" : "Trailwind",
      cadence: copy.dailyGoal,
      goal: lang === "zh" ? `步數 ${Math.min(stepsToday, 6_000).toLocaleString()}/6,000` : `Steps ${Math.min(stepsToday, 6_000).toLocaleString()}/6,000`,
      goalComplete: stepsToday >= 6_000,
      claimKey: today,
      ...GARDEN_SPELL_EFFECTS.trailwind,
    },
    {
      id: "hearth-flame",
      icon: "kitchen",
      name: lang === "zh" ? "爐火咒" : "Hearth Flame",
      cadence: copy.dailyGoal,
      goal: cookedToday ? copy.recipeCooked : copy.cookRecipeGoal,
      goalComplete: cookedToday,
      claimKey: today,
      ...GARDEN_SPELL_EFFECTS["hearth-flame"],
    },
    {
      id: "balance-bloom",
      icon: "goal",
      name: lang === "zh" ? "平衡花咒" : "Balance Bloom",
      cadence: copy.dailyGoal,
      goal: lang === "zh" ? `熱量內 · ${Math.min(entries.length, 3)}/3 筆` : `Under calories · ${Math.min(entries.length, 3)}/3 logs`,
      goalComplete: entries.length >= 3 && totals.cal <= profile.goals.cal,
      claimKey: today,
      ...GARDEN_SPELL_EFFECTS["balance-bloom"],
    },
    {
      id: "ironroot",
      icon: "gym",
      name: lang === "zh" ? "鐵根術" : "Ironroot",
      cadence: copy.dailyGoal,
      goal: workoutDone ? copy.workoutFinished : copy.finishWorkoutGoal,
      goalComplete: workoutDone,
      claimKey: today,
      ...GARDEN_SPELL_EFFECTS.ironroot,
    },
    {
      id: "starlight-season",
      icon: "star",
      name: lang === "zh" ? "星光時節" : "Starlight Season",
      cadence: copy.weeklyGoal,
      goal: lang === "zh" ? `本週達標 ${balancedDaysThisWeek}/4 天` : `On-target days ${balancedDaysThisWeek}/4`,
      goalComplete: balancedDaysThisWeek >= 4,
      claimKey: weekStart,
      ...GARDEN_SPELL_EFFECTS["starlight-season"],
    },
    {
      id: "everripe-eclipse",
      icon: "moon",
      name: lang === "zh" ? "永熟月蝕" : "Everripe Eclipse",
      cadence: copy.legendary,
      goal: copy.dewOnlySpell,
      goalComplete: false,
      claimKey: "everripe-eclipse",
      requiresConfirmation: true,
      ...GARDEN_SPELL_EFFECTS["everripe-eclipse"],
    },
  ];

  const achievementItems = gardenAchievements(garden);
  const earnedAchievementCount = achievementItems.filter((item) => item.earned).length;

  const claimableSpellCount = magicSpells.filter((spell) => spell.goalComplete && !(garden.spellClaims[spell.claimKey] ?? []).includes(spell.id)).length;
  const ownedSpellCount = Object.values(garden.spellInventory).reduce((sum, count) => sum + (count ?? 0), 0);
  const availableSpellCount = claimableSpellCount + ownedSpellCount;
  const nextLevelUnlock = MELON_VARIETIES.find((variety) => level < variety.unlockLevel);
  const nextExpansionCost = gardenExpansionCost(garden.unlockedPlots);
  const hour = new Date(now).getHours();
  const worldPhase = hour < 6 || hour >= 19 ? "is-night" : hour < 9 || hour >= 17 ? "is-golden-hour" : "is-day";

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const centerFarm = () => {
      const center = initialPlotCenterRef.current;
      viewport.scrollTo({
        left: Math.max(0, center.x * zoomRef.current - viewport.clientWidth / 2),
        top: Math.max(0, center.y * zoomRef.current - viewport.clientHeight / 2),
        behavior: "instant",
      });
    };
    centerFarm();
    const frame = window.requestAnimationFrame(centerFarm);
    const timer = window.setTimeout(centerFarm, 180);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    let frame = 0;
    const gesture = {
      lastX: 0,
      lastY: 0,
      startDistance: 0,
      startZoom: 1,
      worldX: 0,
      worldY: 0,
      moved: false,
    };

    const distanceBetween = (touches: TouchList) => Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );

    const startPinch = (touches: TouchList) => {
      const rect = viewport.getBoundingClientRect();
      const centerX = (touches[0].clientX + touches[1].clientX) / 2 - rect.left;
      const centerY = (touches[0].clientY + touches[1].clientY) / 2 - rect.top;
      gesture.startDistance = distanceBetween(touches);
      gesture.startZoom = zoomRef.current;
      gesture.worldX = (viewport.scrollLeft + centerX) / zoomRef.current;
      gesture.worldY = (viewport.scrollTop + centerY) / zoomRef.current;
      gesture.moved = true;
    };

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length >= 2) {
        event.preventDefault();
        startPinch(event.touches);
        return;
      }
      const touch = event.touches[0];
      if (!touch) return;
      gesture.lastX = touch.clientX;
      gesture.lastY = touch.clientY;
      gesture.moved = false;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length >= 2) {
        event.preventDefault();
        const rect = viewport.getBoundingClientRect();
        const centerX = (event.touches[0].clientX + event.touches[1].clientX) / 2 - rect.left;
        const centerY = (event.touches[0].clientY + event.touches[1].clientY) / 2 - rect.top;
        const ratio = gesture.startDistance > 0 ? distanceBetween(event.touches) / gesture.startDistance : 1;
        const nextZoom = Math.min(FARM_MAX_ZOOM, Math.max(FARM_MIN_ZOOM, gesture.startZoom * ratio));
        zoomRef.current = nextZoom;
        setZoom(nextZoom);
        window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(() => {
          viewport.scrollLeft = Math.max(0, gesture.worldX * nextZoom - centerX);
          viewport.scrollTop = Math.max(0, gesture.worldY * nextZoom - centerY);
        });
        gesture.moved = true;
        return;
      }

      const touch = event.touches[0];
      if (!touch) return;
      event.preventDefault();
      const deltaX = touch.clientX - gesture.lastX;
      const deltaY = touch.clientY - gesture.lastY;
      if (Math.abs(deltaX) + Math.abs(deltaY) > 2) gesture.moved = true;
      viewport.scrollLeft -= deltaX;
      viewport.scrollTop -= deltaY;
      gesture.lastX = touch.clientX;
      gesture.lastY = touch.clientY;
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length >= 2) {
        startPinch(event.touches);
        return;
      }
      const touch = event.touches[0];
      if (touch) {
        gesture.lastX = touch.clientX;
        gesture.lastY = touch.clientY;
      } else if (gesture.moved) {
        suppressClickUntilRef.current = Date.now() + 350;
      }
    };

    const preventDraggedClick = (event: MouseEvent) => {
      if (Date.now() >= suppressClickUntilRef.current) return;
      event.preventDefault();
      event.stopPropagation();
    };

    viewport.addEventListener("touchstart", onTouchStart, { passive: false });
    viewport.addEventListener("touchmove", onTouchMove, { passive: false });
    viewport.addEventListener("touchend", onTouchEnd);
    viewport.addEventListener("touchcancel", onTouchEnd);
    viewport.addEventListener("click", preventDraggedClick, true);
    return () => {
      window.cancelAnimationFrame(frame);
      viewport.removeEventListener("touchstart", onTouchStart);
      viewport.removeEventListener("touchmove", onTouchMove);
      viewport.removeEventListener("touchend", onTouchEnd);
      viewport.removeEventListener("touchcancel", onTouchEnd);
      viewport.removeEventListener("click", preventDraggedClick, true);
    };
  }, []);

  const startPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button")) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    panRef.current = {
      active: true,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: viewport.scrollLeft,
      top: viewport.scrollTop,
    };
    viewport.setPointerCapture(event.pointerId);
    viewport.classList.add("is-dragging");
  };

  const movePan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    const viewport = viewportRef.current;
    if (!pan.active || !viewport || event.pointerId !== pan.pointerId) return;
    viewport.scrollLeft = pan.left - (event.clientX - pan.x);
    viewport.scrollTop = pan.top - (event.clientY - pan.y);
  };

  const stopPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    if (!panRef.current.active || event.pointerId !== panRef.current.pointerId) return;
    panRef.current.active = false;
    viewport?.classList.remove("is-dragging");
    if (viewport?.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
  };

  const onPlotClick = (plotId: number) => {
    const plot = garden.plots.find((item) => item.id === plotId);
    if (!plot) return;

    if (plot.variety) {
      const variety = varietyById(plot.variety);
      if (isPlotReady(plot, now)) {
        const result = harvest(profile.id, plotId, now);
        if (result === "harvested") {
          playSound("harvest");
          toast(
            lang === "zh"
              ? `收成 ${variety.name.zh}！+${variety.harvestReward} 露珠 · +${variety.harvestXp} 經驗`
              : `${variety.name.en} harvested! +${variety.harvestReward} dew · +${variety.harvestXp} XP`,
            "shopping"
          );
          fireConfetti();
        }
      } else {
        playSound("click");
        toast(`${copy.readyIn} ${formatDuration(cropRemainingMs(plot, now), lang)}`, "timer");
      }
      return;
    }

    const variety = varietyById(selected);
    const result = plant(profile.id, plotId, selected, level, game.golden, now);
    if (result === "planted") {
      playSound("plant");
      toast(
        lang === "zh"
          ? `${variety.name.zh} 已種下，${formatGrowTime(variety.growMinutes, lang)}後成熟！`
          : `${variety.name.en} planted — ready in ${formatGrowTime(variety.growMinutes, lang)}!`,
        "soil"
      );
    } else if (result === "funds") {
      playSound("error");
      toast(copy.needDew, "water");
    } else if (result === "locked") {
      playSound("error");
      toast(copy.stillLocked, "lock");
    }
  };

  const castSpellNow = (spell: MagicSpell) => {
    const result = castSpell(profile.id, {
      id: spell.id,
      boostMinutes: spell.boostMinutes,
      targetCount: spell.targetCount,
      instantFinish: spell.instantFinish,
    }, now);
    if (result === "empty") {
      playSound("error");
      toast(copy.plantBeforeSpell, "leaf");
      return;
    }
    if (result === "none") {
      playSound("error");
      toast(copy.buyBeforeCast, "magic");
      return;
    }

    playSound("spell");
    setJustTended(true);
    window.setTimeout(() => setJustTended(false), 1800);
    toast(`${spell.name} · ${spell.instantFinish ? copy.everyCropReady : copy.ownedSpellCast}`, "spark");
    if (spell.id === "starlight-season" || spell.instantFinish) fireConfetti();
  };

  const buySpellNow = (spell: MagicSpell) => {
    const result = buySpell(profile.id, spell.id, spell.dewCost);
    if (result === "funds") {
      playSound("error");
      toast(spell.requiresConfirmation ? copy.needLegendaryDew : copy.needSpellDew, "water");
      return;
    }
    playSound("success");
    toast(`${spell.name} · ${copy.addedToSpellbook}`, "magic");
  };

  const onBuySpell = (spell: MagicSpell) => {
    if (spell.requiresConfirmation) {
      setPendingSpellAction({ spell, kind: "buy" });
      return;
    }
    buySpellNow(spell);
  };

  const onClaimGoalSpell = (spell: MagicSpell) => {
    const result = claimGoalSpell(profile.id, spell.id, spell.claimKey, spell.goalComplete);
    if (result !== "claimed") return;
    playSound("success");
    toast(`${spell.name} · ${copy.addedToSpellbook}`, "spark");
  };

  const onCastSpell = (spell: MagicSpell) => {
    if (spell.requiresConfirmation) {
      setPendingSpellAction({ spell, kind: "cast" });
      return;
    }
    castSpellNow(spell);
  };

  const onExpandFarm = () => {
    const cost = gardenExpansionCost(garden.unlockedPlots);
    const unlockingParcel = garden.unlockedPlots === 10;
    const result = expandFarm(profile.id);
    if (result === "expanded") {
      playSound("expand");
      toast(
        unlockingParcel
          ? copy.newParcelUnlocked + ` -${cost} ${copy.dew}`
          : lang === "zh" ? `新田地解鎖！-${cost} 露珠` : `New field unlocked! -${cost} dew`,
        "soil"
      );
      fireConfetti();
    } else if (result === "funds") {
      playSound("error");
      toast(copy.needDew, "water");
    } else {
      playSound("error");
      toast(lang === "zh" ? "整座農場都解鎖了！" : "The whole farm is unlocked!", "trophy");
    }
  };

  const focusNextExpansion = () => {
    const viewport = viewportRef.current;
    const position = PLOT_POSITIONS[garden.unlockedPlots];
    if (!viewport || !position) return;
    setActivePanel(null);
    viewport.scrollTo({
      left: Math.max(0, (position.x + 90) * zoom - viewport.clientWidth / 2),
      top: Math.max(0, (position.y + 90) * zoom - viewport.clientHeight / 2),
      behavior: "smooth",
    });
  };

  return (
    <main className={"farm-game-shell " + worldPhase + (justTended ? " is-raining" : "")}>
      <header className="farm-game-hud">
        <button className="farm-back press" onClick={() => router.back()} aria-label={copy.back}>
          <AppIcon name="back" size={21} />
          <span>{copy.back}</span>
        </button>
        <div className="farm-game-title">
          <small>{copy.yourLivingGarden}</small>
          <h1>{copy.melonGarden}</h1>
        </div>
        <div className="farm-hud-status">
          <div className="farm-hud-wallets">
            <button
              type="button"
              className="farm-dew-wallet farm-resource-trigger press"
              onClick={() => setResourceGuide("dew")}
              aria-haspopup="dialog"
              aria-label={`${garden.dew.toLocaleString()} ${copy.dew}. ${copy.learnAboutDew}`}
            >
              <AppIcon name="water" size={19} />
              <span className="farm-wallet-copy"><small>{copy.dew}</small><b>{garden.dew.toLocaleString()}</b></span>
              <AppIcon className="farm-resource-hint" name="idea" size={13} />
            </button>
          </div>
          <button
            type="button"
            className="farm-player-level farm-resource-trigger press"
            onClick={() => setResourceGuide("xp")}
            aria-haspopup="dialog"
            aria-label={`${copy.playerLevel} ${level}. ${game.xp.toLocaleString()} XP. ${copy.learnAboutXp}`}
          >
            <LevelProgressRing
              xp={game.xp}
              size={64}
              stroke={9}
              className="farm-level-ring"
              label={copy.playerLevel}
              shortLabel={copy.level}
            />
            <span className="farm-player-level-copy">
              <small>{copy.playerLevel}</small>
              <b>{playerLevelXp} / {playerLevelXpNeeded} XP</b>
            </span>
            <AppIcon className="farm-resource-hint" name="idea" size={13} />
          </button>
        </div>
      </header>

      <div className="farm-pan-hint"><AppIcon name="refresh" size={16} /> {copy.dragExplore}</div>

      <div
        ref={viewportRef}
        className="farm-game-viewport hide-scroll"
        onPointerDown={startPan}
        onPointerMove={movePan}
        onPointerUp={stopPan}
        onPointerCancel={stopPan}
      >
        <div
          className="farm-map-stage"
          style={{ width: FARM_MAP_WIDTH * zoom, height: FARM_MAP_HEIGHT * zoom }}
        >
          <div className="farm-map" aria-label={copy.farmMap} style={{ transform: `scale(${zoom})` }}>
            <div className="farm-plots-layer">
            {PLOT_POSITIONS.map((position, index) => {
              const plot = garden.plots[index];
              if (!plot) {
                const isNext = index === garden.unlockedPlots;
                const isParcelStart = index === 10;
                const unlockLabel = isParcelStart ? copy.unlockParcel : copy.unlockField;
                const cost = isNext ? gardenExpansionCost(garden.unlockedPlots) : null;
                return (
                  <button
                    key={"locked-" + index}
                    data-sound="none"
                    className={"farm-expansion-plot " + (isNext ? "is-next" : "is-future")}
                    style={{ left: position.x, top: position.y }}
                    disabled={!isNext}
                    onClick={onExpandFarm}
                    aria-label={isNext ? unlockLabel + " " + (index + 1) + ", " + cost + " " + copy.dew : copy.futureField}
                  >
                    <AppIcon name="lock" size={24} />
                    <b>{isNext ? unlockLabel : copy.futureField}</b>
                    {isNext && <span><AppIcon name="water" size={14} /> {cost}</span>}
                  </button>
                );
              }

              const variety = plot.variety ? varietyById(plot.variety) : null;
              const progress = variety ? cropProgress(plot, now) : 0;
              const visualStage = variety ? cropVisualStage(plot, now) : null;
              const stageImage = variety && visualStage ? cropStageImage(variety, visualStage) : null;
              const growthInStage = visualStage === "seed"
                ? progress / 0.25
                : visualStage === "plant"
                  ? (progress - 0.25) / 0.47
                  : (progress - 0.72) / 0.28;
              const stageScale = visualStage === "seed"
                ? 0.72 + growthInStage * 0.1
                : visualStage === "plant"
                  ? 0.86 + growthInStage * 0.12
                  : 0.9 + growthInStage * 0.1;
              const ready = variety ? isPlotReady(plot, now) : false;
              const timeLabel = ready ? copy.tapHarvest : formatDuration(cropRemainingMs(plot, now), lang);

              return (
                <button
                  key={plot.id}
                  data-sound="none"
                  className={"garden-plot farm-map-plot press " + (variety ? "is-planted" : "is-empty") + (ready ? " is-ready" : "")}
                  onClick={() => onPlotClick(plot.id)}
                  aria-label={variety ? variety.name[lang] + ", " + timeLabel : copy.emptyPlot}
                  style={{ left: position.x, top: position.y, "--crop-accent": variety?.accent ?? "#9f7e4b" } as CSSProperties}
                >
                  <span className="soil-rings" />
                  {variety ? (
                    <>
                      <span className={"crop-art is-" + visualStage} style={{ transform: "translate(-50%, 8%) scale(" + stageScale + ")" }}>
                        <Image src={stageImage!} alt="" fill sizes="210px" priority={index < 3} />
                      </span>
                      <span className="plot-label">
                        <b>{variety.name[lang]}</b>
                        <span><AppIcon name={ready ? "shopping" : "timer"} size={10} /> {timeLabel}</span>
                      </span>
                      <span className="plot-progress" style={{ width: Math.max(5, progress * 82) + "%" }} />
                      {ready && <span className="harvest-bubble">{copy.harvest}</span>}
                    </>
                  ) : (
                    <span className="empty-plot-copy"><AppIcon name="plus" size={27} strokeWidth={2.8} /><small>{copy.plant}</small></span>
                  )}
                </button>
              );
            })}
            </div>
          </div>
        </div>

        <div className="garden-rain farm-map-rain" aria-hidden="true">
          {RAIN_DROPS.map((drop) => <i key={drop} style={{ left: ((drop * 37) % 100) + "%", animationDelay: ((drop % 7) * 0.08) + "s" }} />)}
        </div>
      </div>

      <nav className="farm-game-dock" aria-label={copy.farmTools}>
        <button className={"press" + (activePanel === "seeds" ? " is-active" : "")} onClick={() => setActivePanel("seeds")}>
          <AppIcon name="leaf" size={23} /><span>{copy.seeds}</span>
        </button>
        <button className={"press" + (activePanel === "spells" ? " is-active" : "")} onClick={() => setActivePanel("spells")}>
          <AppIcon name="magic" size={23} /><span>{copy.spells}</span>{availableSpellCount > 0 && <em>{availableSpellCount} {copy.available}</em>}
        </button>
        <button className={"press" + (activePanel === "progress" ? " is-active" : "")} onClick={() => setActivePanel("progress")}>
          <AppIcon name="trophy" size={23} /><span>{copy.progress}</span>
        </button>
        <button className="press" onClick={focusNextExpansion} disabled={garden.unlockedPlots >= MAX_GARDEN_PLOTS}>
          <AppIcon name="plus" size={23} /><span>{copy.expand}</span>
          {nextExpansionCost != null && <em><AppIcon name="water" size={10} />{nextExpansionCost}</em>}
        </button>
      </nav>

      {activePanel && (
        <div className="farm-drawer-layer">
          <button className="farm-drawer-scrim" onClick={() => setActivePanel(null)} aria-label={copy.close} />
          <section className={"farm-drawer is-" + activePanel} aria-label={activePanel === "seeds" ? copy.seedShop : activePanel === "spells" ? copy.magicSpells : copy.harvestJournal}>
            <header className="farm-drawer-header">
              <div>
                <small>{activePanel === "seeds" ? copy.seedSatchel : activePanel === "spells" ? copy.spellbook : copy.harvestJournal}</small>
                <h2>{activePanel === "seeds" ? copy.chooseVariety : activePanel === "spells" ? copy.castGardenMagic : garden.totalHarvests + " " + copy.totalHarvested}</h2>
              </div>
              <button className="farm-drawer-close press" onClick={() => setActivePanel(null)} aria-label={copy.close}><AppIcon name="close" size={20} /></button>
            </header>

            {activePanel === "seeds" && (
              <>
                <p className="farm-drawer-intro">{copy.buySeedHint}</p>
                <div className="seed-carousel hide-scroll">
                  {MELON_VARIETIES.map((variety) => {
                    const unlocked = isVarietyUnlocked(variety, level, game.golden);
                    const selectedNow = selected === variety.id;
                    return (
                      <button
                        key={variety.id}
                        className={"seed-card press " + (selectedNow ? "is-selected " : "") + (unlocked ? "" : "is-locked ") + (variety.rarity ? "is-" + variety.rarity : "")}
                        onClick={() => {
                          if (!unlocked) {
                            toast(variety.requiresPr && !game.golden ? copy.prNeeded : copy.reachLevel + " " + variety.unlockLevel, "lock");
                            return;
                          }
                          setSelected(variety.id);
                          setActivePanel(null);
                        }}
                        style={{ "--seed-accent": variety.accent } as CSSProperties}
                      >
                        <span className="seed-art"><Image src={variety.seedImage} alt="" fill sizes="112px" priority={variety.id === selected} /></span>
                        {variety.rarity && <span className={"seed-rarity " + variety.rarity}>{variety.rarity === "legendary" ? copy.legendary : copy.rare}</span>}
                        <span className="seed-name">{variety.name[lang]}</span>
                        <span className="seed-note">{unlocked ? variety.note[lang] : copy.level + " " + variety.unlockLevel}</span>
                        <span className="seed-time"><AppIcon name="timer" size={12} /> {formatGrowTime(variety.growMinutes, lang)}</span>
                        <span className="seed-meta">
                          <b><AppIcon name="water" size={15} /> {variety.seedCost}</b><span>→</span>
                          <b><AppIcon name="water" size={15} /> {variety.harvestReward}</b><b><AppIcon name="star" size={14} /> {variety.harvestXp}</b>
                        </span>
                        {!unlocked && <span className="seed-lock"><AppIcon name="lock" size={17} /></span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {activePanel === "spells" && (
              <>
                {ownedSpellCount > 0 && (
                  <div className="magic-spell-bank">
                    <span><AppIcon name="magic" size={19} /></span>
                    <b>{ownedSpellCount}×</b>
                    <small>{copy.spellsOwned}</small>
                  </div>
                )}
                <p className="farm-drawer-intro">{copy.spellExplainer}</p>
                <div className="magic-spell-grid">
                  {magicSpells.map((spell) => {
                    const freeClaimed = (garden.spellClaims[spell.claimKey] ?? []).includes(spell.id);
                    const goalFreeAvailable = spell.goalComplete && !freeClaimed;
                    const ownedCount = garden.spellInventory[spell.id] ?? 0;
                    const freeAvailable = goalFreeAvailable || ownedCount > 0;
                    return (
                      <article key={spell.id} className={"magic-spell " + (freeAvailable ? "is-free " : "") + (freeClaimed ? "is-claimed " : "") + (ownedCount > 0 ? "has-owned " : "") + (spell.requiresConfirmation ? "is-legendary " : "")}>
                        <span className="magic-spell-icon"><AppIcon name={spell.icon} size={25} /></span>
                        <div className="magic-spell-copy">
                          <div className="magic-spell-title">
                            <b>{spell.name}</b>
                            {ownedCount > 0 && <span className="magic-spell-owned">{ownedCount}×</span>}
                            <span className="magic-spell-cadence">{spell.cadence}</span>
                          </div>
                          <p>
                            <AppIcon name={spell.instantFinish ? "spark" : "timer"} size={12} />
                            {spell.instantFinish ? copy.instantlyReady : formatDuration(spell.boostMinutes * 60_000, lang)} · {spell.targetCount === "all" ? copy.everyGrowingCrop : `${spell.targetCount} ${copy.randomCrops}`}
                          </p>
                          <span className={"magic-spell-goal " + (spell.goalComplete ? "is-complete" : "")}>
                            <AppIcon name={spell.requiresConfirmation ? "warning" : spell.goalComplete ? "checkCircle" : "goal"} size={13} /> {freeClaimed ? copy.goalSpellClaimed : spell.goal}
                          </span>
                        </div>
                        <div className="magic-spell-actions">
                          {goalFreeAvailable ? (
                            <button className="magic-spell-buy is-claim press" data-sound="none" onClick={() => onClaimGoalSpell(spell)}>
                              <AppIcon name="package" size={14} /> {copy.claimSpell}
                            </button>
                          ) : (
                            <button className="magic-spell-buy press" data-sound="none" onClick={() => onBuySpell(spell)}>
                              <AppIcon name="water" size={14} /> {copy.buy} {spell.dewCost.toLocaleString()}
                            </button>
                          )}
                          {ownedCount > 0 && (
                            <button className="magic-spell-cast press" data-sound="none" onClick={() => onCastSpell(spell)}>
                              <AppIcon name="magic" size={14} /> {copy.cast} {ownedCount}×
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}

            {activePanel === "progress" && (
              <>
                <div className="farm-progress-overview">
                  <div><small>{copy.playerLevel}</small><b>{level}</b></div>
                  <div><small>{copy.totalXp}</small><b>{game.xp}</b></div>
                  <div><small>{copy.fields}</small><b>{garden.unlockedPlots}/{MAX_GARDEN_PLOTS}</b></div>
                </div>
                <p className="farm-drawer-intro">{nextLevelUnlock ? nextLevelUnlock.name[lang] + " " + copy.unlocksAt + " " + copy.level + " " + nextLevelUnlock.unlockLevel : copy.everythingUnlocked}</p>
                <div className="achievement-heading">
                  <div><small>{copy.achievements}</small><b>{copy.gardenBadges}</b></div>
                  <span><AppIcon name="trophy" size={15} /> {earnedAchievementCount}/{achievementItems.length}</span>
                </div>
                <div className="achievement-list">
                  {achievementItems.map((item) => {
                    const earned = item.earned;
                    const progress = Math.min(100, Math.round((item.current / item.target) * 100));
                    return (
                      <article key={item.id} className={`garden-achievement tone-${item.tone} ${earned ? "is-earned" : ""}`}>
                        <span className="achievement-badge"><AppIcon name={item.icon} size={23} /></span>
                        <div className="achievement-copy">
                          <div><b>{item.name[lang]}</b><em>{earned ? copy.earned : `${Math.min(item.current, item.target).toLocaleString()}/${item.target.toLocaleString()}${item.eachMilestone ? ` ${copy.each}` : ""}`}</em></div>
                          <p>{item.description[lang]}</p>
                          <aside className="achievement-rewards" aria-label={lang === "zh" ? "成就獎勵" : "Achievement rewards"}>
                            <span><AppIcon name="star" size={11} /> +{item.reward.xp.toLocaleString()} XP</span>
                            <span><AppIcon name="water" size={11} /> +{item.reward.dew.toLocaleString()} {copy.dew}</span>
                          </aside>
                          <span><i style={{ width: `${progress}%` }} /></span>
                        </div>
                      </article>
                    );
                  })}
                </div>
                <div className="farm-section-label"><AppIcon name="fruit" size={15} /> {copy.harvestJournal}</div>
                <div className="collection-grid">
                  {MELON_VARIETIES.map((variety) => {
                    const count = garden.harvests[variety.id] ?? 0;
                    return (
                      <div key={variety.id} className={"collection-item " + (count ? "is-found " : "") + (variety.rarity ? "is-" + variety.rarity : "")}>
                        <span><Image src={variety.image} alt="" fill sizes="70px" /></span><b>{count || "—"}</b><small>{variety.name[lang]}</small>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </div>
      )}

      <Sheet
        open={resourceGuide !== null}
        onClose={() => setResourceGuide(null)}
        title={
          <span className="icon-label">
            <AppIcon name={resourceGuide === "dew" ? "water" : "star"} size={20} />
            {resourceGuide === "dew" ? copy.whatIsDew : copy.whatIsXp}
          </span>
        }
      >
        {resourceGuide && (
          <FarmResourceGuide
            resource={resourceGuide}
            lang={lang}
            dew={garden.dew}
            xp={game.xp}
            level={level}
            earned={playerLevelXp}
            needed={playerLevelXpNeeded}
            onClose={() => setResourceGuide(null)}
          />
        )}
      </Sheet>

      <Sheet
        open={Boolean(pendingSpellAction)}
        onClose={() => setPendingSpellAction(null)}
        title={
          <span className="icon-label">
            <AppIcon name="moon" size={20} /> {pendingSpellAction?.kind === "buy" ? copy.confirmEclipseBuyTitle : copy.confirmEclipseCastTitle}
          </span>
        }
      >
        {pendingSpellAction && (
          <div className="legendary-spell-confirm">
            <span className="legendary-spell-orb"><AppIcon name="spark" size={30} /></span>
            <strong>
              <AppIcon name={pendingSpellAction.kind === "buy" ? "water" : "magic"} size={18} />
              {pendingSpellAction.kind === "buy"
                ? `${pendingSpellAction.spell.dewCost.toLocaleString()} ${copy.dew}`
                : `1× ${pendingSpellAction.spell.name}`}
            </strong>
            <p>{pendingSpellAction.kind === "buy" ? copy.confirmEclipseBuyBody : copy.confirmEclipseCastBody}</p>
            <div>
              <button className="btn press flex-1" onClick={() => setPendingSpellAction(null)}>{copy.cancel}</button>
              <button
                className="btn btn-primary press flex-1"
                data-sound="none"
                onClick={() => {
                  const action = pendingSpellAction;
                  setPendingSpellAction(null);
                  if (action.kind === "buy") buySpellNow(action.spell);
                  else castSpellNow(action.spell);
                }}
              >
                <AppIcon name={pendingSpellAction.kind === "buy" ? "shopping" : "magic"} size={17} />
                {pendingSpellAction.kind === "buy" ? copy.confirmBuy : copy.confirmCast}
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </main>
  );
}

function FarmResourceGuide({
  resource,
  lang,
  dew,
  xp,
  level,
  earned,
  needed,
  onClose,
}: {
  resource: FarmResource;
  lang: "en" | "zh";
  dew: number;
  xp: number;
  level: number;
  earned: number;
  needed: number;
  onClose: () => void;
}) {
  const isDew = resource === "dew";
  const guide = isDew
    ? lang === "zh"
      ? {
          eyebrow: "農場貨幣",
          balance: "你的露珠",
          summary: "露珠是農場專用的貨幣。種植與收成，讓你的農場循環成長。",
          earnTitle: "收集露珠",
          earnBody: "收成成熟的瓜，並領取農場任務與成就獎勵。",
          useTitle: "用在農場",
          useBody: "購買種子、解鎖更多田地，以及購買魔法咒語副本。",
          note: "露珠會被花掉；收成作物可以賺回更多露珠，並同時獲得經驗。",
          done: "懂了",
        }
      : {
          eyebrow: "FARM CURRENCY",
          balance: "Your Dew",
          summary: "Dew is the currency that keeps your farm growing. Plant, harvest, and reinvest it.",
          earnTitle: "Collect Dew",
          earnBody: "Harvest ripe melons and claim garden quests and achievement rewards.",
          useTitle: "Use it on the farm",
          useBody: "Buy seeds, unlock more fields, and purchase magic spell copies.",
          note: "Dew is spendable. Harvests earn more Dew back and also award XP.",
          done: "Got it",
        }
    : lang === "zh"
      ? {
          eyebrow: "玩家進度",
          balance: "總經驗",
          summary: "經驗會提升你的玩家等級，代表你在飲食、活動與農場中的累積進度。",
          earnTitle: "到處都能賺經驗",
          earnBody: "記錄食物、走路與站立、收成作物，以及領取農場獎勵。",
          useTitle: "升級解鎖",
          useBody: "提升等級可以解鎖新種子、主題與升級獎勵。",
          note: "經驗不會被花掉；它會永久累積並推進下一個等級。",
          done: "懂了",
        }
      : {
          eyebrow: "PLAYER PROGRESS",
          balance: "Total XP",
          summary: "XP raises your player level and reflects progress across food, activity, and your farm.",
          earnTitle: "Earn XP everywhere",
          earnBody: "Log food, walk and stand, harvest crops, and claim garden rewards.",
          useTitle: "Level up to unlock",
          useBody: "Higher levels unlock new seeds, themes, and level rewards.",
          note: "XP is never spent. It permanently accumulates toward your next level.",
          done: "Got it",
        };

  return (
    <div className={`farm-resource-guide is-${resource}`}>
      <div className="farm-resource-hero" aria-hidden="true">
        {isDew ? (
          <>
            <Image className="farm-resource-seed" src="/garden/honeydew-seed.png" alt="" width={76} height={76} loading="eager" />
            <span className="farm-resource-orb"><AppIcon name="water" size={43} /></span>
            <Image className="farm-resource-plant" src="/garden/honeydew-plant.png" alt="" width={100} height={100} loading="eager" />
            <i className="farm-resource-spark spark-one"><AppIcon name="spark" size={15} /></i>
            <i className="farm-resource-spark spark-two"><AppIcon name="water" size={12} /></i>
          </>
        ) : (
          <>
            <LevelProgressRing
              xp={xp}
              size={108}
              stroke={12}
              className="farm-resource-xp-ring"
              label={lang === "zh" ? "玩家等級" : "Player level"}
              shortLabel={lang === "zh" ? "等級" : "LV"}
            />
            <i className="farm-resource-spark spark-one"><AppIcon name="star" size={18} /></i>
            <i className="farm-resource-spark spark-two"><AppIcon name="spark" size={16} /></i>
            <i className="farm-resource-spark spark-three"><AppIcon name="leaf" size={15} /></i>
          </>
        )}
      </div>

      <div className="farm-resource-balance">
        <span><small>{guide.eyebrow}</small><b>{guide.balance}</b></span>
        <strong>
          <AppIcon name={isDew ? "water" : "star"} size={19} />
          {isDew ? dew.toLocaleString() : xp.toLocaleString()}
        </strong>
      </div>

      <p className="farm-resource-summary">{guide.summary}</p>

      <div className="farm-resource-flow">
        <article>
          <span><AppIcon name={isDew ? "leaf" : "stretch"} size={21} /></span>
          <div><b>{guide.earnTitle}</b><small>{guide.earnBody}</small></div>
        </article>
        <AppIcon className="farm-resource-flow-arrow" name="next" size={18} />
        <article>
          <span><AppIcon name={isDew ? "magic" : "lock"} size={21} /></span>
          <div><b>{guide.useTitle}</b><small>{guide.useBody}</small></div>
        </article>
      </div>

      {!isDew && (
        <div className="farm-resource-level-progress">
          <span>{lang === "zh" ? `等級 ${level}` : `Level ${level}`}</span>
          <div role="progressbar" aria-valuemin={0} aria-valuemax={needed} aria-valuenow={earned}>
            <i style={{ width: `${needed > 0 ? Math.min(100, earned / needed * 100) : 0}%` }} />
          </div>
          <b>{earned.toLocaleString()} / {needed.toLocaleString()} XP</b>
        </div>
      )}

      <div className="farm-resource-note"><AppIcon name="idea" size={18} /><span>{guide.note}</span></div>
      <button type="button" className="btn btn-primary press w-full" onClick={onClose}>{guide.done}</button>
    </div>
  );
}

function useGardenClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = window.setInterval(tick, 1_000);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", tick);
    };
  }, []);
  return now;
}

function formatDuration(ms: number, lang: "en" | "zh") {
  if (ms <= 0) return lang === "zh" ? "可以收成" : "Ready";
  const totalMinutes = Math.ceil(ms / 60_000);
  if (totalMinutes < 60) return lang === "zh" ? `${totalMinutes} 分` : `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!minutes) return lang === "zh" ? `${hours} 小時` : `${hours}h`;
  return lang === "zh" ? `${hours} 小時 ${minutes} 分` : `${hours}h ${minutes}m`;
}

function formatGrowTime(minutes: number, lang: "en" | "zh") {
  return formatDuration(minutes * 60_000, lang);
}

const COPY = {
  en: {
    yourLivingGarden: "Your garden",
    melonGarden: "Melon Garden",
    back: "Back",
    dragExplore: "Drag to explore",
    farmMap: "Large pannable and pinch-zoomable melon farm",
    farmTools: "Farm tools",
    seedShop: "Seed shop",
    seeds: "Seeds",
    orders: "Orders",
    spells: "Spells",
    available: "available",
    magicSpells: "Magic spells",
    spellbook: "Spellbook",
    castGardenMagic: "Magic spells",
    spellExplainer: "Buy or claim spell copies first. Casting is a separate action that uses one owned copy.",
    randomCrops: "random crops",
    everyGrowingCrop: "every growing crop",
    instantlyReady: "Instantly ready",
    dewOnlySpell: "Dew-only · buy first, confirm to cast",
    confirmEclipseBuyTitle: "Buy Everripe Eclipse?",
    confirmEclipseBuyBody: "Spend 10,000 Dew to add one copy to your Spellbook. Buying it will not cast it.",
    confirmEclipseCastTitle: "Cast Everripe Eclipse?",
    confirmEclipseCastBody: "Use one owned copy to instantly finish every growing crop. This cannot be undone.",
    confirmBuy: "Buy spell",
    confirmCast: "Cast spell",
    cancel: "Not yet",
    everyCropReady: "every crop is ready",
    buy: "Buy",
    cast: "Cast",
    claimSpell: "Claim",
    addedToSpellbook: "added to Spellbook",
    buyBeforeCast: "Buy or claim this spell before casting it",
    dailyGoal: "Daily",
    weeklyGoal: "Weekly",
    recipeCooked: "Recipe cooked today",
    cookRecipeGoal: "Cook one recipe today",
    workoutFinished: "Workout finished today",
    finishWorkoutGoal: "Finish one workout today",
    plantBeforeSpell: "Plant a crop before casting a spell",
    needSpellDew: "Not enough Dew to buy that spell",
    needLegendaryDew: "Everripe Eclipse needs 10,000 Dew",
    ownedSpellCast: "owned spell used",
    spellsOwned: "owned spells",
    goalSpellClaimed: "Goal spell claimed",
    progress: "Progress",
    expand: "Expand",
    unlockField: "Unlock field",
    unlockParcel: "Unlock new parcel",
    newParcelUnlocked: "New farm parcel unlocked!",
    futureField: "Future field",
    close: "Close",
    buySeedHint: "Choose a seed, then tap any open field. The seed cost is charged when you plant it.",
    fields: "Fields",
    achievements: "Achievements",
    gardenBadges: "Garden badges",
    earned: "Earned",
    each: "each",
    dew: "Dew",
    totalXp: "Total XP",
    playerLevel: "Player level",
    learnAboutDew: "Tap to learn what Dew does",
    learnAboutXp: "Tap to learn how XP and levels work",
    whatIsDew: "What is Dew?",
    whatIsXp: "How XP works",
    dayStreak: "day streak",
    emptyPlot: "Empty garden plot",
    tapHarvest: "Tap to harvest",
    harvest: "HARVEST!",
    plant: "Plant",
    readyIn: "Ready in",
    seedSatchel: "Seed market",
    chooseVariety: "Choose your next crop",
    tapEmptyPlot: "Then tap an empty plot",
    needDew: "Not enough Dew — harvest crops to earn more",
    stillLocked: "That seed is still locked",
    prNeeded: "Earn a gym PR to unlock this rare seed",
    reachLevel: "Reach level",
    level: "Lv",
    rank: "Rank",
    harvestJournal: "Farm collection",
    totalHarvested: "melons harvested",
    unlocksAt: "unlocks at",
    everythingUnlocked: "Every seed variety is unlocked",
    rare: "RARE",
    legendary: "LEGENDARY",
  },
  zh: {
    yourLivingGarden: "你的農場",
    melonGarden: "瓜瓜園",
    back: "返回",
    dragExplore: "拖曳探索農場",
    farmMap: "可拖曳並以雙指縮放的大型瓜瓜農場",
    farmTools: "農場工具",
    seedShop: "種子商店",
    seeds: "種子",
    orders: "任務",
    spells: "魔法",
    available: "可用",
    magicSpells: "魔法咒語",
    spellbook: "魔法書",
    castGardenMagic: "魔法咒語",
    spellExplainer: "先購買或領取咒語副本；施法是另一個動作，並會使用一個已有副本。",
    randomCrops: "株隨機作物",
    everyGrowingCrop: "所有生長中的作物",
    instantlyReady: "立即成熟",
    dewOnlySpell: "僅限露珠 · 先購買，施放前確認",
    confirmEclipseBuyTitle: "購買永熟月蝕？",
    confirmEclipseBuyBody: "花費 10,000 露珠，將一個副本加入魔法書。購買後不會立即施放。",
    confirmEclipseCastTitle: "施放永熟月蝕？",
    confirmEclipseCastBody: "使用一個已有副本，讓所有生長中的作物立即成熟。此動作無法復原。",
    confirmBuy: "購買咒語",
    confirmCast: "施放咒語",
    cancel: "先不要",
    everyCropReady: "所有作物都成熟了",
    buy: "購買",
    cast: "施放",
    claimSpell: "領取",
    addedToSpellbook: "已加入魔法書",
    buyBeforeCast: "請先購買或領取這個咒語",
    dailyGoal: "每日",
    weeklyGoal: "每週",
    recipeCooked: "今天已照食譜煮一餐",
    cookRecipeGoal: "今天照食譜煮一餐",
    workoutFinished: "今天已完成訓練",
    finishWorkoutGoal: "今天完成一次訓練",
    plantBeforeSpell: "請先種下作物再施法",
    needSpellDew: "露珠不足，無法購買這個咒語",
    needLegendaryDew: "永熟月蝕需要 10,000 露珠",
    ownedSpellCast: "使用已擁有咒語",
    spellsOwned: "個已擁有咒語",
    goalSpellClaimed: "目標咒語已領取",
    progress: "進度",
    expand: "擴建",
    unlockField: "解鎖田地",
    unlockParcel: "解鎖新農地",
    newParcelUnlocked: "新農地已解鎖！",
    futureField: "未來田地",
    close: "關閉",
    buySeedHint: "選好種子後，點一下空田地。種下時才會扣除種子費用。",
    fields: "田地",
    achievements: "成就",
    gardenBadges: "瓜園徽章",
    earned: "已獲得",
    each: "每種",
    dew: "露珠",
    totalXp: "總經驗",
    playerLevel: "玩家等級",
    learnAboutDew: "點一下了解露珠的用途",
    learnAboutXp: "點一下了解經驗與等級",
    whatIsDew: "什麼是露珠？",
    whatIsXp: "經驗如何運作",
    dayStreak: "天連勝",
    emptyPlot: "空的田地",
    tapHarvest: "點一下收成",
    harvest: "收成！",
    plant: "種下",
    readyIn: "成熟還需",
    seedSatchel: "種子市集",
    chooseVariety: "選擇下一種作物",
    tapEmptyPlot: "再點一下空田地",
    needDew: "露珠不夠，收成作物可以賺更多",
    stillLocked: "這個種子還沒解鎖",
    prNeeded: "健身破一次紀錄即可解鎖珍稀種子",
    reachLevel: "升到等級",
    level: "等級",
    rank: "階級",
    harvestJournal: "農場圖鑑",
    totalHarvested: "顆瓜已收成",
    unlocksAt: "解鎖於",
    everythingUnlocked: "所有種子品種都解鎖了",
    rare: "稀有",
    legendary: "傳說",
  },
} as const;
