"use client";

import Image from "next/image";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useRouter } from "next/navigation";
import { fireConfetti, Sheet, toast } from "@/components/ui";
import { AppIcon, type IconName } from "@/components/icons";
import { todayStr, weekDates } from "@/lib/dates";
import {
  MAX_GARDEN_PLOTS,
  MELON_VARIETIES,
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
import type { FarmBuildingId, FarmCompanionId, FarmOrder, GardenSpellId, MelonVarietyId } from "@/lib/types";
import LevelProgressRing from "@/components/LevelProgressRing";
import { playSound } from "@/lib/soundscape";
import {
  FARM_BUILDINGS,
  FARM_COMPANIONS,
  SPELL_MASTERY_COSTS,
  STEWARDSHIP_MILESTONES,
  buildingLevel,
  effectiveSpell,
  farmOrderRewards,
  seedCostFor,
} from "@/lib/farmProgression";

const RAIN_DROPS = Array.from({ length: 22 }, (_, index) => index);
const HONEYED_SPARKS = Array.from({ length: 16 }, (_, index) => index);
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

type FarmPanel = "seeds" | "farm" | "orders" | "spells" | "progress" | null;
type FarmResource = "dew" | "xp";
type CompanionMotion = "sitting" | "walking" | "standing" | "napping";
const COMPANION_MOTIONS: CompanionMotion[] = ["sitting", "walking", "standing", "napping"];

function CompanionAccent({ id }: { id: FarmCompanionId }) {
  if (id === "chamoe-bee") return <g className="companion-svg-accent is-pollen"><circle cx="46" cy="86" r="4" /><circle cx="210" cy="74" r="3" /><circle cx="220" cy="110" r="5" /></g>;
  if (id === "honeydew-frog") return <g className="companion-svg-accent is-bubbles"><circle cx="48" cy="78" r="8" /><circle cx="210" cy="58" r="5" /><circle cx="222" cy="92" r="3" /></g>;
  if (id === "melon-roll-snail") return <path className="companion-svg-accent is-trail" d="M39 222c46 9 102 9 172 0" />;
  if (id === "golden-capybara") return <g className="companion-svg-accent is-steam"><path d="M91 59c-12-13 10-18 0-34" /><path d="M129 50c-12-13 10-18 0-34" /><path d="M167 59c-12-13 10-18 0-34" /></g>;
  if (id === "moon-bunny") return <g className="companion-svg-accent is-stars"><path d="m48 63 4 9 9 4-9 4-4 9-4-9-9-4 9-4z" /><path d="m207 104 3 7 7 3-7 3-3 7-3-7-7-3 7-3z" /></g>;
  if (id === "densuke-penguin") return <g className="companion-svg-accent is-snow"><circle cx="48" cy="89" r="4" /><circle cx="208" cy="79" r="5" /><circle cx="220" cy="128" r="3" /></g>;
  return <g className="companion-svg-accent is-dew"><path d="M46 81c10 14 10 23 0 28-10-5-10-14 0-28z" /><path d="M211 68c8 11 8 18 0 22-8-4-8-11 0-22z" /></g>;
}

function CompanionSprite({ id, src, motion }: { id: FarmCompanionId; src: string; motion: CompanionMotion }) {
  const rawId = useId().replaceAll(":", "");
  const spriteClip = `${rawId}-sprite`;
  return (
    <svg className={`companion-svg character-${id} motion-${motion}`} viewBox="0 0 256 256" aria-hidden="true">
      <defs>
        <clipPath id={spriteClip}><rect x="0" y="0" width="256" height="256" rx="56" /></clipPath>
      </defs>
      <ellipse className="companion-svg-shadow" cx="128" cy="225" rx="62" ry="13" />
      <CompanionAccent id={id} />
      <g className="companion-svg-character"><image href={src} width="256" height="256" clipPath={`url(#${spriteClip})`} /></g>
      {motion === "napping" && <g className="companion-svg-zzz"><text x="184" y="72">Z</text><text x="211" y="45">z</text></g>}
    </svg>
  );
}

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

interface HoneyedCelebration {
  key: number;
  dew: number;
  bonusDew: number;
  cropCount: number;
}

type PlantingLayout = (MelonVarietyId | null)[];
type PendingLayoutAction =
  | { kind: "overwrite"; slot: number; saved: PlantingLayout; current: PlantingLayout }
  | { kind: "funds"; slot: number; saved: PlantingLayout; cost: number; shortfall: number; cropCount: number };

function CropLayoutMini({ layout, label, lang, compact = false }: { layout: PlantingLayout; label: string; lang: "en" | "zh"; compact?: boolean }) {
  const cropCount = layout.filter(Boolean).length;
  const cropTypes = MELON_VARIETIES.flatMap((variety) => {
    const count = layout.filter((id) => id === variety.id).length;
    return count ? [{ variety, count }] : [];
  });
  const visibleTypes = compact ? cropTypes.slice(0, 2) : cropTypes;
  return (
    <div className={`crop-layout-preview${compact ? " is-compact" : ""}`} role="img" aria-label={`${label}: ${cropTypes.map(({ variety, count }) => `${count} ${variety.name[lang]}`).join(", ") || "empty"}`}>
      <span className="crop-layout-mini">
        {PLOT_POSITIONS.map((position, index) => {
          const varietyId = layout[index];
          if (!varietyId) return null;
          const variety = varietyById(varietyId);
          return (
            <i
              key={index}
              style={{
                backgroundColor: variety.accent,
                left: `${Math.max(3, Math.min(95, ((position.x - 600) / 1380) * 100))}%`,
                top: `${Math.max(7, Math.min(91, ((position.y - 430) / 690) * 100))}%`,
              }}
            />
          );
        })}
        {cropCount === 0 && <em>—</em>}
      </span>
      <span className="crop-layout-key" aria-hidden="true">
        {visibleTypes.map(({ variety, count }) => (
          <span key={variety.id}><i style={{ backgroundColor: variety.accent }} /><b>{count}×</b> {variety.name[lang]}</span>
        ))}
        {compact && cropTypes.length > visibleTypes.length && <span className="is-more">+{cropTypes.length - visibleTypes.length}</span>}
      </span>
    </div>
  );
}

function HoneyedHarvestCelebration({ event, lang }: { event: HoneyedCelebration; lang: "en" | "zh" }) {
  return (
    <div key={event.key} className="honeyed-harvest-celebration" role="status" aria-live="assertive">
      <div className="honeyed-harvest-flash" />
      <div className="honeyed-harvest-card">
        <span className="honeyed-harvest-emblem"><AppIcon name="water" size={30} /></span>
        <small>{lang === "zh" ? "蜜糖豐收！" : "HONEYED HARVEST!"}</small>
        <strong>2× {lang === "zh" ? "露珠" : "DEW"}</strong>
        <b>+{event.dew.toLocaleString()} {lang === "zh" ? "露珠" : "Dew"}</b>
        <p>
          {lang === "zh"
            ? `包含 +${event.bonusDew.toLocaleString()} 額外露珠${event.cropCount > 1 ? ` · ${event.cropCount} 株觸發` : ""}`
            : `Includes +${event.bonusDew.toLocaleString()} bonus Dew${event.cropCount > 1 ? ` · ${event.cropCount} crops triggered` : ""}`}
        </p>
      </div>
      <div className="honeyed-harvest-sparks" aria-hidden="true">
        {HONEYED_SPARKS.map((spark) => <i key={spark} />)}
      </div>
    </div>
  );
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
  const upgradeBuilding = useGardenStore((state) => state.upgradeBuilding);
  const adoptCompanion = useGardenStore((state) => state.adoptCompanion);
  const setActiveCompanion = useGardenStore((state) => state.setActiveCompanion);
  const upgradeSpellMastery = useGardenStore((state) => state.upgradeSpellMastery);
  const ensureFarmOrders = useGardenStore((state) => state.ensureFarmOrders);
  const rerollFarmOrders = useGardenStore((state) => state.rerollFarmOrders);
  const claimFarmOrder = useGardenStore((state) => state.claimFarmOrder);
  const activateWell = useGardenStore((state) => state.useWell);
  const harvestAll = useGardenStore((state) => state.harvestAll);
  const savePlantingLayout = useGardenStore((state) => state.savePlantingLayout);
  const replantLayout = useGardenStore((state) => state.replantLayout);
  const [selected, setSelected] = useState<MelonVarietyId>("honeydew");
  const [justTended, setJustTended] = useState(false);
  const [activePanel, setActivePanel] = useState<FarmPanel>(null);
  const [resourceGuide, setResourceGuide] = useState<FarmResource | null>(null);
  const [pendingSpellAction, setPendingSpellAction] = useState<PendingSpellAction | null>(null);
  const [targetingSpell, setTargetingSpell] = useState<{ spell: MagicSpell; plotIds: number[] } | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<FarmBuildingId>("market");
  const [companionMotions, setCompanionMotions] = useState<CompanionMotion[]>(["standing", "sitting"]);
  const [honeyedCelebration, setHoneyedCelebration] = useState<HoneyedCelebration | null>(null);
  const [pendingLayoutAction, setPendingLayoutAction] = useState<PendingLayoutAction | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const viewportRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(1);
  const initialPlotCenterRef = useRef(plotGroupCenter(garden.unlockedPlots));
  const suppressClickUntilRef = useRef(0);
  const honeyedTimerRef = useRef<number | null>(null);
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
      ...effectiveSpell(garden, "pantry-spark"),
    },
    {
      id: "trailwind",
      icon: "stretch",
      name: lang === "zh" ? "步道之風" : "Trailwind",
      cadence: copy.dailyGoal,
      goal: lang === "zh" ? `步數 ${Math.min(stepsToday, 6_000).toLocaleString()}/6,000` : `Steps ${Math.min(stepsToday, 6_000).toLocaleString()}/6,000`,
      goalComplete: stepsToday >= 6_000,
      claimKey: today,
      ...effectiveSpell(garden, "trailwind"),
    },
    {
      id: "hearth-flame",
      icon: "kitchen",
      name: lang === "zh" ? "爐火咒" : "Hearth Flame",
      cadence: copy.dailyGoal,
      goal: cookedToday ? copy.recipeCooked : copy.cookRecipeGoal,
      goalComplete: cookedToday,
      claimKey: today,
      ...effectiveSpell(garden, "hearth-flame"),
    },
    {
      id: "balance-bloom",
      icon: "goal",
      name: lang === "zh" ? "平衡花咒" : "Balance Bloom",
      cadence: copy.dailyGoal,
      goal: lang === "zh" ? `熱量內 · ${Math.min(entries.length, 3)}/3 筆` : `Under calories · ${Math.min(entries.length, 3)}/3 logs`,
      goalComplete: entries.length >= 3 && totals.cal <= profile.goals.cal,
      claimKey: today,
      ...effectiveSpell(garden, "balance-bloom"),
    },
    {
      id: "ironroot",
      icon: "gym",
      name: lang === "zh" ? "鐵根術" : "Ironroot",
      cadence: copy.dailyGoal,
      goal: workoutDone ? copy.workoutFinished : copy.finishWorkoutGoal,
      goalComplete: workoutDone,
      claimKey: today,
      ...effectiveSpell(garden, "ironroot"),
    },
    {
      id: "starlight-season",
      icon: "star",
      name: lang === "zh" ? "星光時節" : "Starlight Season",
      cadence: copy.weeklyGoal,
      goal: lang === "zh" ? `本週達標 ${balancedDaysThisWeek}/4 天` : `On-target days ${balancedDaysThisWeek}/4`,
      goalComplete: balancedDaysThisWeek >= 4,
      claimKey: weekStart,
      ...effectiveSpell(garden, "starlight-season"),
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
      ...effectiveSpell(garden, "everripe-eclipse"),
    },
  ];

  const achievementItems = gardenAchievements(garden);
  const earnedAchievementCount = achievementItems.filter((item) => item.earned).length;

  const claimableSpellCount = magicSpells.filter((spell) => spell.goalComplete && !(garden.spellClaims[spell.claimKey] ?? []).includes(spell.id)).length;
  const ownedSpellCount = Object.values(garden.spellInventory).reduce((sum, count) => sum + (count ?? 0), 0);
  const availableSpellCount = claimableSpellCount + ownedSpellCount;
  const nextLevelUnlock = MELON_VARIETIES.find((variety) => level < variety.unlockLevel);
  const hour = new Date(now).getHours();
  const worldPhase = hour < 6 || hour >= 19 ? "is-night" : hour < 9 || hour >= 17 ? "is-golden-hour" : "is-day";

  useEffect(() => {
    ensureFarmOrders(profile.id, today, level);
  }, [ensureFarmOrders, garden.buildingLevels.market, level, profile.id, today]);

  useEffect(() => {
    setCompanionMotions([
      COMPANION_MOTIONS[Math.floor(Math.random() * COMPANION_MOTIONS.length)],
      COMPANION_MOTIONS[Math.floor(Math.random() * COMPANION_MOTIONS.length)],
    ]);
  }, [profile.id]);

  useEffect(() => () => {
    if (honeyedTimerRef.current !== null) window.clearTimeout(honeyedTimerRef.current);
  }, []);

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

  const celebrateHoneyedHarvest = (dew: number, bonusDew: number, cropCount = 1) => {
    if (honeyedTimerRef.current !== null) window.clearTimeout(honeyedTimerRef.current);
    setHoneyedCelebration({ key: Date.now(), dew, bonusDew, cropCount });
    honeyedTimerRef.current = window.setTimeout(() => {
      setHoneyedCelebration(null);
      honeyedTimerRef.current = null;
    }, 2800);
  };

  const onPlotClick = (plotId: number) => {
    const plot = garden.plots.find((item) => item.id === plotId);
    if (!plot) return;

    if (plot.variety) {
      const variety = varietyById(plot.variety);
      if (isPlotReady(plot, now)) {
        const result = harvest(profile.id, plotId, now);
        if (typeof result === "object" && result.status === "harvested") {
          if (result.honeyed) {
            playSound("success");
            celebrateHoneyedHarvest(result.dew, result.honeyedBonusDew);
            toast(
              lang === "zh"
                ? `蜜糖豐收！2× 露珠 · +${result.dew} 露珠（+${result.honeyedBonusDew} 額外）`
                : `Honeyed Harvest! 2× Dew · +${result.dew} Dew (+${result.honeyedBonusDew} bonus)`,
              "water"
            );
          } else {
            playSound("harvest");
            toast(
              lang === "zh"
                ? `收成 ${variety.name.zh}！+${result.dew} 露珠 · +${result.xp} 經驗`
                : `${variety.name.en} harvested! +${result.dew} dew · +${result.xp} XP`,
              "shopping"
            );
          }
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

  const castSpellNow = (spell: MagicSpell, targetPlotIds?: number[]) => {
    const result = castSpell(profile.id, {
      id: spell.id,
      boostMinutes: spell.boostMinutes,
      targetCount: spell.targetCount,
      instantFinish: spell.instantFinish,
      targetPlotIds,
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
    const result = claimGoalSpell(profile.id, spell.id, spell.claimKey, spell.goalComplete, today);
    if (result !== "claimed") return;
    playSound("success");
    toast(`${spell.name} · ${copy.addedToSpellbook}`, "spark");
  };

  const onCastSpell = (spell: MagicSpell) => {
    if (spell.requiresConfirmation) {
      setPendingSpellAction({ spell, kind: "cast" });
      return;
    }
    if (buildingLevel(garden, "workshop") >= 2 && spell.targetCount !== "all") {
      setTargetingSpell({ spell, plotIds: [] });
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

  const openBuilding = (buildingId: FarmBuildingId) => {
    setSelectedBuilding(buildingId);
    setActivePanel("farm");
  };

  const onBuildingClick = (buildingId: FarmBuildingId) => {
    openBuilding(buildingId);
  };

  const onUpgradeBuilding = (buildingId: FarmBuildingId) => {
    const result = upgradeBuilding(profile.id, buildingId, level);
    if (result === "bought") {
      playSound("expand");
      fireConfetti();
      toast(copy.buildingUpgraded, "spark");
    } else if (result === "funds") toast(copy.needDew, "water");
    else if (result === "locked") toast(copy.higherLevelNeeded, "lock");
  };

  const onAdoptCompanion = (companionId: (typeof FARM_COMPANIONS)[number]["id"]) => {
    const result = adoptCompanion(profile.id, companionId, level);
    if (result === "bought") {
      playSound("success");
      fireConfetti();
      toast(copy.companionAdopted, "heart");
    } else if (result === "prerequisite") toast(copy.buildFarmhouseFirst, "lock");
    else if (result === "locked") toast(copy.higherLevelNeeded, "lock");
    else if (result === "funds") toast(copy.needDew, "water");
  };

  const onSelectCompanion = (companionId: (typeof FARM_COMPANIONS)[number]["id"], slot: 0 | 1 = 0) => {
    const result = setActiveCompanion(profile.id, companionId, slot);
    if (result === "done") {
      playSound("success");
      toast(copy.companionActive, "heart");
    } else if (result === "locked") toast(copy.secondSlotLocked, "lock");
  };

  const onUseWell = () => {
    const result = activateWell(profile.id, today, now);
    if (result === "done") {
      playSound("spell");
      setJustTended(true);
      window.setTimeout(() => setJustTended(false), 1800);
      toast(copy.cropsWatered, "water");
    } else if (result === "empty") toast(copy.plantBeforeWatering, "leaf");
    else if (result === "used") toast(copy.wellUsedToday, "timer");
  };

  const onHarvestAll = () => {
    const result = harvestAll(profile.id, now);
    if (!result.count) {
      toast(copy.noReadyCrops, "timer");
      return;
    }
    playSound("harvest");
    fireConfetti();
    if (result.honeyedCount > 0) {
      playSound("success");
      celebrateHoneyedHarvest(result.honeyedDew, result.honeyedBonusDew, result.honeyedCount);
      toast(
        lang === "zh"
          ? `蜜糖豐收 ×${result.honeyedCount}！共 +${result.dew} 露珠（+${result.honeyedBonusDew} 額外）`
          : `Honeyed Harvest ×${result.honeyedCount}! +${result.dew} Dew total (+${result.honeyedBonusDew} bonus)`,
        "water"
      );
    } else {
      toast(`${result.count} ${copy.harvested} · +${result.dew} ${copy.dew} · +${result.xp} XP`, "shopping");
    }
  };

  const currentPlantingLayout = garden.plots.map((plot) => plot.variety);

  const replantDetails = (layout?: PlantingLayout) => {
    if (!layout) return { cropCount: 0, cost: 0 };
    return garden.plots.reduce((details, plot) => {
      const varietyId = layout[plot.id];
      if (plot.variety || !varietyId) return details;
      const variety = varietyById(varietyId);
      if (!isVarietyUnlocked(variety, level, game.golden)) return details;
      return { cropCount: details.cropCount + 1, cost: details.cost + seedCostFor(garden, variety.seedCost) };
    }, { cropCount: 0, cost: 0 });
  };

  const saveLayoutNow = (slot: number) => {
    const result = savePlantingLayout(profile.id, slot);
    if (result === "done") {
      playSound("success");
      toast(copy.layoutSaved, "save");
    }
  };

  const onSaveLayout = (slot: number) => {
    const saved = garden.savedPlantingLayouts[slot];
    if (saved?.some(Boolean)) {
      setPendingLayoutAction({ kind: "overwrite", slot, saved, current: currentPlantingLayout });
      return;
    }
    saveLayoutNow(slot);
  };

  const onReplantLayout = (slot: number) => {
    const saved = garden.savedPlantingLayouts[slot];
    if (!saved?.some(Boolean)) {
      toast(copy.saveLayoutFirst, "warning");
      return;
    }
    const details = replantDetails(saved);
    if (details.cropCount > 0 && details.cost > garden.dew) {
      playSound("error");
      setPendingLayoutAction({
        kind: "funds",
        slot,
        saved,
        cost: details.cost,
        shortfall: details.cost - garden.dew,
        cropCount: details.cropCount,
      });
      return;
    }
    const result = replantLayout(profile.id, slot, level, game.golden, now);
    if (result === "done") {
      playSound("plant");
      toast(`${copy.layoutPlanted} · −${details.cost.toLocaleString()} ${copy.dew}`, "leaf");
    } else if (result === "funds") {
      setPendingLayoutAction({ kind: "funds", slot, saved, cost: details.cost, shortfall: Math.max(0, details.cost - garden.dew), cropCount: details.cropCount });
    } else if (result === "missing") toast(copy.saveLayoutFirst, "warning");
    else if (result === "empty") toast(copy.noEmptyPlotsForLayout, "warning");
  };

  const onClaimOrder = (order: FarmOrder) => {
    const result = claimFarmOrder(profile.id, order.id);
    if (result === "done") {
      playSound("success");
      fireConfetti();
      toast(copy.orderDelivered, "package");
    }
  };

  return (
    <main className={"farm-game-shell " + worldPhase + (justTended ? " is-raining" : "")}>
      {honeyedCelebration && <HoneyedHarvestCelebration event={honeyedCelebration} lang={lang} />}
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
            <div className="farm-progression-layer" aria-label={copy.farmBuildings}>
              {FARM_BUILDINGS.map((building) => {
                const currentLevel = buildingLevel(garden, building.id);
                const visualLevel = currentLevel;
                const nextTier = building.tiers[currentLevel];
                const levelReady = Boolean(nextTier && level >= nextTier.unlockLevel);
                const dewReady = Boolean(nextTier && garden.dew >= nextTier.dewCost);
                const canUpgrade = levelReady && dewReady;
                const buildingState = currentLevel > 0
                  ? canUpgrade ? "is-built is-upgrade-ready" : "is-built"
                  : canUpgrade ? "is-upgrade-ready" : levelReady ? "is-dew-needed" : "is-level-locked";
                const badgeLabel = currentLevel > 0
                  ? `${copy.tier} ${currentLevel}`
                  : !nextTier
                  ? `${copy.tier} ${currentLevel}`
                  : !levelReady
                    ? `${copy.unlockAt} ${copy.levelShort} ${nextTier.unlockLevel}`
                    : `${copy.unlock} · ${nextTier.dewCost.toLocaleString()}`;
                return (
                  <div key={building.id} className={`farm-building-map is-${building.id} tier-${visualLevel} ${buildingState}`}>
                    <Image
                      className="farm-building-art"
                      src={`/garden/progression/building-${building.id}.png`}
                      alt=""
                      width={1254}
                      height={1254}
                      unoptimized
                    />
                    <button
                      type="button"
                      className="farm-building-hotspot press"
                      style={{ left: building.hotspot.x, top: building.hotspot.y, width: building.hotspot.width, height: building.hotspot.height }}
                      onClick={() => onBuildingClick(building.id)}
                      aria-label={`${building.name[lang]}, ${badgeLabel}`}
                    />
                    <span
                      className="farm-building-badge"
                      style={{ left: building.badge.x, top: building.badge.y }}
                      aria-hidden="true"
                    >
                      <AppIcon name={!nextTier ? "trophy" : currentLevel > 0 || canUpgrade ? "spark" : levelReady ? "water" : "lock"} size={13} />
                      {badgeLabel}
                    </span>
                  </div>
                );
              })}

              {garden.activeCompanions.map((companionId, index) => {
                const companion = FARM_COMPANIONS.find((item) => item.id === companionId);
                if (!companion) return null;
                return (
                  <button
                    key={companion.id}
                    type="button"
                    className={`farm-active-companion slot-${index + 1} motion-${companionMotions[index] ?? "standing"}`}
                    onClick={() => openBuilding("farmhouse")}
                    aria-label={`${companion.name[lang]} · ${copy[companionMotions[index] ?? "standing"]} · ${copy.tapToOpenFarmhouse}`}
                  >
                    <CompanionSprite id={companion.id} src={companion.src} motion={companionMotions[index] ?? "standing"} />
                  </button>
                );
              })}
            </div>
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
      </nav>

      {activePanel && (
        <div className="farm-drawer-layer">
          <button className="farm-drawer-scrim" onClick={() => setActivePanel(null)} aria-label={copy.close} />
          <section className={"farm-drawer is-" + activePanel} aria-label={activePanel === "seeds" ? copy.seedShop : activePanel === "farm" ? copy.farmBuildings : activePanel === "orders" ? copy.farmOrders : activePanel === "spells" ? copy.magicSpells : copy.harvestJournal}>
            <header className="farm-drawer-header">
              <div>
                <small>{activePanel === "seeds" ? copy.seedSatchel : activePanel === "farm" ? copy.livingFarm : activePanel === "orders" ? copy.marketBoard : activePanel === "spells" ? copy.spellbook : copy.harvestJournal}</small>
                <h2>{activePanel === "seeds" ? copy.chooseVariety : activePanel === "farm" ? copy.buildAndGrow : activePanel === "orders" ? copy.farmOrders : activePanel === "spells" ? copy.castGardenMagic : garden.totalHarvests + " " + copy.totalHarvested}</h2>
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
                            toast(copy.reachLevel + " " + variety.unlockLevel, "lock");
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
                          <b><AppIcon name="water" size={15} /> {seedCostFor(garden, variety.seedCost)}</b><span>→</span>
                          <b><AppIcon name="water" size={15} /> {variety.harvestReward}</b><b><AppIcon name="star" size={14} /> {variety.harvestXp}</b>
                        </span>
                        {!unlocked && <span className="seed-lock"><AppIcon name="lock" size={17} /></span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {activePanel === "farm" && (() => {
              const building = FARM_BUILDINGS.find((item) => item.id === selectedBuilding)!;
              const currentLevel = buildingLevel(garden, building.id);
              const nextTier = building.tiers[currentLevel];
              return (
                <>
                  <p className="farm-drawer-intro">{copy.buildingIntro}</p>
                  <div className="farm-building-tabs hide-scroll">
                    {FARM_BUILDINGS.map((item) => (
                      <button key={item.id} className={`press ${item.id === selectedBuilding ? "is-active" : ""}`} onClick={() => setSelectedBuilding(item.id)}>
                        <AppIcon name={item.id === "workshop" ? "magic" : item.id === "well" ? "water" : item.id === "apiary" ? "flower" : item.id === "greenhouse" ? "leaf" : item.id === "market" ? "package" : "home"} size={18} />
                        <span>{item.name[lang]}</span><em>{copy.tier} {buildingLevel(garden, item.id)}</em>
                      </button>
                    ))}
                  </div>

                  <article className={`farm-building-card is-${building.id}`}>
                    <span className="farm-building-preview"><Image src={`/garden/progression/building-${building.id}.png`} alt="" fill sizes="190px" unoptimized /></span>
                    <div className="farm-building-summary">
                      <small>{building.role[lang]}</small><h3>{building.name[lang]}</h3>
                      <span>{copy.tier} {currentLevel}/3</span>
                      <p>{building.description[lang]}</p>
                    </div>
                    <p className="farm-building-description">{building.description[lang]}</p>
                    {nextTier ? (
                      <div className="farm-next-tier">
                        <b>{copy.nextUpgrade}: {nextTier.effect[lang]}</b>
                        <span><AppIcon name="star" size={13} /> {copy.level} {nextTier.unlockLevel}</span>
                        <button className="btn btn-primary press" onClick={() => onUpgradeBuilding(building.id)} disabled={level < nextTier.unlockLevel}>
                          <AppIcon name={level < nextTier.unlockLevel ? "lock" : "water"} size={15} />
                          {level < nextTier.unlockLevel ? `${copy.level} ${nextTier.unlockLevel}` : `${copy.upgrade} · ${nextTier.dewCost.toLocaleString()}`}
                        </button>
                      </div>
                    ) : <div className="farm-mastered"><AppIcon name="trophy" size={18} /> {copy.fullyUpgraded}</div>}
                  </article>

                  {building.id === "well" && currentLevel > 0 && (
                    <button className="farm-utility-action press" onClick={onUseWell} disabled={garden.wellLastUsed === today}>
                      <AppIcon name="water" size={21} /><span><b>{copy.waterCrops}</b><small>{garden.wellLastUsed === today ? copy.wellUsedToday : copy.onceDaily}</small></span>
                    </button>
                  )}

                  {building.id === "barn" && currentLevel > 0 && (
                    <div className="farm-utility-grid">
                      <button className="farm-utility-action press" onClick={onHarvestAll}><AppIcon name="shopping" size={20} /><span><b>{copy.harvestAll}</b><small>{copy.allReadyCrops}</small></span></button>
                      {currentLevel >= 2 && Array.from({ length: currentLevel >= 3 ? 3 : 1 }, (_, slot) => {
                        const savedLayout = garden.savedPlantingLayouts[slot];
                        const hasSavedLayout = Boolean(savedLayout?.some(Boolean));
                        const details = replantDetails(savedLayout);
                        const canAfford = garden.dew >= details.cost;
                        return (
                          <div className="farm-layout-slot" key={slot}>
                            <div className="farm-layout-slot-head">
                              <span><b>{copy.layout} {slot + 1}</b><small>{hasSavedLayout ? `${savedLayout!.filter(Boolean).length} ${copy.cropsSaved}` : copy.emptyLayoutSlot}</small></span>
                              <CropLayoutMini layout={hasSavedLayout ? savedLayout! : currentPlantingLayout} label={hasSavedLayout ? `${copy.savedLayout} ${slot + 1}` : copy.currentLayout} lang={lang} compact />
                            </div>
                            <button className="farm-utility-action press" onClick={() => onSaveLayout(slot)}>
                              <AppIcon name="save" size={18} /><span><b>{hasSavedLayout ? copy.replaceLayout : copy.saveLayout}</b><small>{copy.currentPlanting}</small></span>
                            </button>
                            <button className={`farm-utility-action press${hasSavedLayout && !canAfford ? " is-short" : ""}`} onClick={() => onReplantLayout(slot)} disabled={!hasSavedLayout}>
                              <AppIcon name={hasSavedLayout && !canAfford ? "warning" : "refresh"} size={18} />
                              <span>
                                <b>{copy.replantLayout}</b>
                                <small>{hasSavedLayout ? `${details.cropCount} ${copy.crops} · ${details.cost.toLocaleString()} ${copy.dew}` : copy.saveLayoutFirst}</small>
                              </span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {building.id === "market" && currentLevel > 0 && (
                    <button className="farm-utility-action press" onClick={() => setActivePanel("orders")}><AppIcon name="package" size={21} /><span><b>{copy.openOrders}</b><small>{garden.farmOrders.filter((order) => !order.claimed).length} {copy.available}</small></span></button>
                  )}

                  {building.id === "farmhouse" && (
                    <div className="companion-lodge">
                      <div className="farm-section-label"><AppIcon name="heart" size={16} /> {copy.companionLodge}</div>
                      <p>{copy.companionIntro}</p>
                      <div className="companion-grid">
                        {FARM_COMPANIONS.map((companion) => {
                          const owned = garden.ownedCompanions.includes(companion.id);
                          const activeSlot = garden.activeCompanions.indexOf(companion.id);
                          const unlocked = level >= companion.unlockLevel && currentLevel > 0;
                          return (
                            <article key={companion.id} className={`${owned ? "is-owned" : ""} ${activeSlot >= 0 ? "is-active" : ""}`}>
                              <span><CompanionSprite id={companion.id} src={companion.src} motion="standing" /></span>
                              <div><b>{companion.name[lang]}</b><small>{companion.effect[lang]}</small></div>
                              {owned ? (
                                <div className="companion-actions">
                                  <button className="press" onClick={() => onSelectCompanion(companion.id, 0)}>{activeSlot === 0 ? copy.active : copy.choose}</button>
                                  {currentLevel >= 3 && <button className="press" onClick={() => onSelectCompanion(companion.id, 1)}>{activeSlot === 1 ? copy.helper : copy.slotTwo}</button>}
                                </div>
                              ) : (
                                <button className="press companion-adopt" onClick={() => onAdoptCompanion(companion.id)} disabled={!unlocked}>
                                  <AppIcon name={unlocked ? "water" : "lock"} size={13} /> {unlocked ? `${copy.adopt} ${companion.dewCost.toLocaleString()}` : `${copy.level} ${companion.unlockLevel}`}
                                </button>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {building.id === "workshop" && currentLevel > 0 && (
                    <div className="spell-mastery-list">
                      <div className="farm-section-label"><AppIcon name="magic" size={16} /> {copy.spellMastery}</div>
                      {magicSpells.filter((spell) => spell.id !== "everripe-eclipse").map((spell) => {
                        const mastery = Math.max(1, Math.min(3, garden.spellMastery[spell.id] ?? 1));
                        const cost = mastery < 3 ? SPELL_MASTERY_COSTS[spell.id as Exclude<GardenSpellId, "everripe-eclipse">][mastery - 1] : 0;
                        const workshopNeeded = mastery === 1 ? 1 : 3;
                        return (
                          <article key={spell.id}>
                            <AppIcon name={spell.icon} size={19} /><div><b>{spell.name}</b><small>{copy.mastery} {mastery}/3 · {spell.targetCount === "all" ? copy.everyGrowingCrop : `${spell.targetCount} ${copy.crops}`} · {formatDuration(spell.boostMinutes * 60_000, lang)}</small></div>
                            <button className="press" disabled={mastery >= 3 || currentLevel < workshopNeeded} onClick={() => {
                              const result = upgradeSpellMastery(profile.id, spell.id);
                              if (result === "bought") { playSound("spell"); toast(copy.spellUpgraded, "magic"); }
                              else if (result === "funds") toast(copy.needDew, "water");
                            }}>{mastery >= 3 ? copy.max : currentLevel < workshopNeeded ? `${copy.workshop} ${workshopNeeded}` : <><AppIcon name="water" size={12} /> {cost}</>}</button>
                          </article>
                        );
                      })}
                    </div>
                  )}

                </>
              );
            })()}

            {activePanel === "orders" && (
              <>
                {buildingLevel(garden, "market") === 0 ? (
                  <div className="farm-locked-feature"><AppIcon name="lock" size={27} /><b>{copy.marketRequired}</b><p>{copy.marketRequiredBody}</p><button className="btn btn-primary press" onClick={() => openBuilding("market")}>{copy.openFarm}</button></div>
                ) : (
                  <>
                    <div className="stewardship-card">
                      <div><small>{copy.ninetyDayJourney}</small><b>{garden.stewardshipDays.length}/90 {copy.days}</b></div>
                      <span><i style={{ width: `${Math.min(100, garden.stewardshipDays.length / 90 * 100)}%` }} /></span>
                      <p>{copy.stewardshipBody}</p>
                      <div>{STEWARDSHIP_MILESTONES.map((milestone) => <em key={milestone.days} className={garden.stewardshipDays.length >= milestone.days ? "is-earned" : ""}>{milestone.days}</em>)}</div>
                    </div>
                    <p className="farm-order-cadence"><AppIcon name="timer" size={14} /> {copy.orderResetCadence}</p>
                    <div className="farm-order-list">
                      {garden.farmOrders.map((order) => {
                        const ready = order.progress >= order.target;
                        const rewards = farmOrderRewards(garden, order);
                        return (
                          <article key={order.id} className={`${ready ? "is-ready" : ""} ${order.claimed ? "is-claimed" : ""}`}>
                            <span className="farm-order-icon"><AppIcon name={order.period === "weekly" ? "star" : "package"} size={22} /></span>
                            <div><small>{order.period === "weekly" ? copy.weeklyPremium : copy.dailyOrder}</small><b>{farmOrderLabel(order, lang)}</b><p>{Math.min(order.progress, order.target)}/{order.target}</p><span><i style={{ width: `${Math.min(100, order.progress / order.target * 100)}%` }} /></span></div>
                            <aside><em><AppIcon name="water" size={11} /> {rewards.dew}</em><em><AppIcon name="star" size={11} /> {rewards.xp}</em></aside>
                            <button className="press" disabled={!ready || order.claimed} onClick={() => onClaimOrder(order)}>{order.claimed ? copy.delivered : ready ? copy.deliver : copy.inProgress}</button>
                          </article>
                        );
                      })}
                    </div>
                    {buildingLevel(garden, "market") >= 2 && <button className="farm-reroll press" onClick={() => {
                      const result = rerollFarmOrders(profile.id, today, level);
                      if (result === "done") toast(copy.ordersRefreshed, "refresh");
                      else if (result === "used") toast(copy.rerollBeforeProgress, "warning");
                      else if (result === "funds") toast(copy.needDewForReroll, "warning");
                    }}><AppIcon name="refresh" size={15} /> {copy.rerollOrders} · {(garden.orderRerolls[today] ?? 0) === 0 ? copy.free : "25 Dew"}</button>}
                  </>
                )}
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
        open={Boolean(pendingLayoutAction)}
        onClose={() => setPendingLayoutAction(null)}
        title={
          <span className="icon-label">
            <AppIcon name={pendingLayoutAction?.kind === "funds" ? "warning" : "save"} size={20} />
            {pendingLayoutAction?.kind === "funds" ? copy.notEnoughDewTitle : copy.replaceLayoutTitle}
          </span>
        }
      >
        {pendingLayoutAction?.kind === "overwrite" && (
          <div className="layout-confirm">
            <p>{copy.replaceLayoutBody}</p>
            <div className="layout-compare">
              <article>
                <span><b>{copy.savedLayout}</b><small>{pendingLayoutAction.saved.filter(Boolean).length} {copy.crops}</small></span>
                <CropLayoutMini layout={pendingLayoutAction.saved} label={copy.savedLayout} lang={lang} />
              </article>
              <AppIcon name="next" size={22} />
              <article>
                <span><b>{copy.currentLayout}</b><small>{pendingLayoutAction.current.filter(Boolean).length} {copy.crops}</small></span>
                <CropLayoutMini layout={pendingLayoutAction.current} label={copy.currentLayout} lang={lang} />
              </article>
            </div>
            <div className="layout-confirm-actions">
              <button className="btn press" onClick={() => setPendingLayoutAction(null)}>{copy.keepSavedLayout}</button>
              <button className="btn btn-primary press" onClick={() => {
                const slot = pendingLayoutAction.slot;
                setPendingLayoutAction(null);
                saveLayoutNow(slot);
              }}><AppIcon name="save" size={16} /> {copy.replaceLayout}</button>
            </div>
          </div>
        )}
        {pendingLayoutAction?.kind === "funds" && (
          <div className="layout-confirm is-funds">
            <CropLayoutMini layout={pendingLayoutAction.saved} label={copy.savedLayout} lang={lang} />
            <strong>{copy.needMoreDew.replace("{amount}", pendingLayoutAction.shortfall.toLocaleString())}</strong>
            <p>{copy.replantCostBody
              .replace("{count}", pendingLayoutAction.cropCount.toLocaleString())
              .replace("{cost}", pendingLayoutAction.cost.toLocaleString())
              .replace("{balance}", garden.dew.toLocaleString())}</p>
            <button className="btn press w-full" onClick={() => setPendingLayoutAction(null)}>{copy.gotIt}</button>
          </div>
        )}
      </Sheet>

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

      <Sheet
        open={Boolean(targetingSpell)}
        onClose={() => setTargetingSpell(null)}
        title={<span className="icon-label"><AppIcon name="magic" size={20} /> {copy.chooseSpellTargets}</span>}
      >
        {targetingSpell && (() => {
          const limit = typeof targetingSpell.spell.targetCount === "number" ? targetingSpell.spell.targetCount : garden.plots.length;
          const growing = garden.plots.filter((plot) => plot.variety && !isPlotReady(plot, now));
          return (
            <div className="spell-target-picker">
              <p>{copy.chooseUpTo} {limit} {copy.crops}. {targetingSpell.plotIds.length}/{limit}</p>
              <div>
                {growing.map((plot) => {
                  const variety = varietyById(plot.variety!);
                  const selectedNow = targetingSpell.plotIds.includes(plot.id);
                  return (
                    <button key={plot.id} className={`press ${selectedNow ? "is-selected" : ""}`} onClick={() => setTargetingSpell((current) => {
                      if (!current) return null;
                      const included = current.plotIds.includes(plot.id);
                      if (!included && current.plotIds.length >= limit) return current;
                      return { ...current, plotIds: included ? current.plotIds.filter((id) => id !== plot.id) : [...current.plotIds, plot.id] };
                    })}>
                      <Image src={variety.image} alt="" width={45} height={45} /><span><b>{variety.name[lang]}</b><small>{copy.field} {plot.id + 1} · {formatDuration(cropRemainingMs(plot, now), lang)}</small></span><AppIcon name={selectedNow ? "checkCircle" : "goal"} size={19} />
                    </button>
                  );
                })}
              </div>
              <button className="btn btn-primary press w-full" disabled={!targetingSpell.plotIds.length} onClick={() => {
                const action = targetingSpell;
                setTargetingSpell(null);
                castSpellNow(action.spell, action.plotIds);
              }}>{copy.castOnSelected}</button>
            </div>
          );
        })()}
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
          useBody: "升級農場建築、領養夥伴、精通咒語、購買種子與解鎖田地。",
          note: "完整農場有超過 32,000 露珠的永久升級；訂單與收成能持續補充露珠。",
          done: "懂了",
        }
      : {
          eyebrow: "FARM CURRENCY",
          balance: "Your Dew",
          summary: "Dew is the currency that keeps your farm growing. Plant, harvest, and reinvest it.",
          earnTitle: "Collect Dew",
          earnBody: "Harvest ripe melons and claim garden quests and achievement rewards.",
          useTitle: "Use it on the farm",
          useBody: "Upgrade buildings, adopt companions, master spells, buy seeds, and unlock fields.",
          note: "The full farm has over 32,000 Dew of permanent progression. Orders and harvests keep it flowing.",
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
          useBody: "提升等級可以解鎖建築階級、夥伴、咒語精通、新種子與主題。",
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
          useBody: "Higher levels unlock building tiers, companions, spell mastery, seeds, and themes.",
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

function farmOrderLabel(order: FarmOrder, lang: "en" | "zh") {
  const variety = order.variety ? varietyById(order.variety).name[lang] : "";
  if (lang === "zh") {
    if (order.kind === "harvest-variety") return `收成 ${order.target} 顆${variety}`;
    if (order.kind === "harvest-long") return `收成 ${order.target} 顆長時作物`;
    if (order.kind === "harvest-variety-mix") return `收成 ${order.target} 種不同的瓜`;
    if (order.kind === "cast-spell") return `施放 ${order.target} 次咒語`;
    return `收成 ${order.target} 顆瓜`;
  }
  if (order.kind === "harvest-variety") return `Harvest ${order.target} ${variety}`;
  if (order.kind === "harvest-long") return `Harvest ${order.target} long-growing crops`;
  if (order.kind === "harvest-variety-mix") return `Harvest ${order.target} different varieties`;
  if (order.kind === "cast-spell") return `Cast ${order.target} garden spells`;
  return `Harvest ${order.target} melons`;
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
    farm: "Farm",
    orders: "Orders",
    farmBuildings: "Farm buildings",
    farmOrders: "Farm orders",
    livingFarm: "Living farm",
    marketBoard: "Market board",
    buildAndGrow: "Build & grow",
    buildingIntro: "Upgrade real landmarks with Dew. Every tier permanently changes how your farm plays.",
    whatItDoes: "What it does",
    howToUse: "How to use it",
    currentEffect: "Current effect",
    tier: "Tier",
    unlockAt: "Unlock at",
    levelShort: "Lv",
    upgrade: "Upgrade",
    unlock: "Unlock",
    buildingUpgraded: "Building upgraded!",
    higherLevelNeeded: "Reach the required player level first",
    nextUpgrade: "Next upgrade",
    fullyUpgraded: "Fully upgraded",
    notBuiltYet: "Build the first tier to activate this landmark.",
    waterCrops: "Water crops",
    cropsWatered: "The well watered your growing crops!",
    plantBeforeWatering: "Plant crops before using the well",
    wellUsedToday: "The well has been used today",
    onceDaily: "Ready once per day",
    harvestAll: "Harvest all",
    allReadyCrops: "Collect every ripe crop",
    noReadyCrops: "No crops are ready yet",
    harvested: "harvested",
    saveLayout: "Save layout",
    layout: "Layout",
    layoutSaved: "Planting layout saved",
    layoutPlanted: "Layout replanted",
    saveLayoutFirst: "Save this layout before replanting",
    currentPlanting: "Remember current crops",
    savedLayout: "Saved layout",
    currentLayout: "Current layout",
    emptyLayoutSlot: "No layout saved",
    cropsSaved: "crops saved",
    replaceLayout: "Replace layout",
    replaceLayoutTitle: "Replace saved layout?",
    replaceLayoutBody: "This will permanently replace the saved crop pattern with your current farm layout.",
    keepSavedLayout: "Keep saved layout",
    notEnoughDewTitle: "Not enough Dew",
    needMoreDew: "You need {amount} more Dew",
    replantCostBody: "Replanting {count} empty plots costs {cost} Dew. Your current balance is {balance} Dew; nothing has been planted or charged.",
    noEmptyPlotsForLayout: "No empty matching plots to replant",
    gotIt: "Got it",
    replantLayout: "Replant layout",
    openOrders: "Open farm orders",
    companionLodge: "Companion Lodge",
    companionIntro: "Adopt profile-preset friends with Dew, then tap an owned companion to switch your active farm ability.",
    companionAdopted: "New companion adopted!",
    companionActive: "Active companion switched",
    tapToOpenFarmhouse: "Tap to open the Farmhouse",
    buildFarmhouseFirst: "Build the Farmhouse first",
    secondSlotLocked: "Farmhouse Tier 3 unlocks a helper slot",
    active: "Active",
    helper: "Helper",
    choose: "Choose",
    slotTwo: "Slot 2",
    adopt: "Adopt",
    spellMastery: "Spell mastery",
    mastery: "Mastery",
    crops: "crops",
    spellUpgraded: "Spell mastery upgraded!",
    chooseSpellTargets: "Choose spell targets",
    chooseUpTo: "Choose up to",
    field: "Field",
    castOnSelected: "Cast on selected crops",
    max: "MAX",
    workshop: "Workshop",
    expandFarm: "Expand fields",
    marketRequired: "Build the Market Board",
    marketRequiredBody: "Farm orders unlock at Level 2 after purchasing Market Tier 1.",
    openFarm: "Open farm buildings",
    ninetyDayJourney: "FARM STEWARDSHIP",
    days: "days",
    stewardshipBody: "Complete every daily order to mark a stewardship day. Milestone rewards continue through Day 90.",
    weeklyPremium: "Weekly premium",
    dailyOrder: "Daily order",
    delivered: "Delivered",
    deliver: "Deliver",
    inProgress: "In progress",
    orderDelivered: "Order delivered!",
    rerollOrders: "Reroll daily orders",
    ordersRefreshed: "Daily orders refreshed",
    rerollBeforeProgress: "Reroll before making progress on today's orders",
    needDewForReroll: "You need 25 Dew to refresh these orders",
    orderResetCadence: "Daily orders reset each day. Weekly Premium progress stays until the week changes.",
    free: "FREE",
    sitting: "sitting",
    walking: "walking around",
    standing: "standing",
    napping: "napping",
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
    farm: "農場",
    orders: "任務",
    farmBuildings: "農場建築",
    farmOrders: "農場訂單",
    livingFarm: "活力農場",
    marketBoard: "市集看板",
    buildAndGrow: "建造與成長",
    buildingIntro: "使用露珠升級地圖上的建築；每一階都會永久改變農場玩法。",
    whatItDoes: "建築功能",
    howToUse: "使用方式",
    currentEffect: "目前效果",
    tier: "階",
    unlockAt: "解鎖於",
    levelShort: "等級",
    upgrade: "升級",
    unlock: "解鎖",
    buildingUpgraded: "建築升級成功！",
    higherLevelNeeded: "請先達到所需玩家等級",
    nextUpgrade: "下一階",
    fullyUpgraded: "已完全升級",
    notBuiltYet: "建造第一階即可啟用這個地標。",
    waterCrops: "為作物澆水",
    cropsWatered: "石井已為生長中的作物澆水！",
    plantBeforeWatering: "請先種下作物再使用石井",
    wellUsedToday: "今天已使用過石井",
    onceDaily: "每天可使用一次",
    harvestAll: "一鍵收成",
    allReadyCrops: "收成所有成熟作物",
    noReadyCrops: "目前沒有成熟的作物",
    harvested: "顆已收成",
    saveLayout: "儲存配置",
    layout: "配置",
    layoutSaved: "種植配置已儲存",
    layoutPlanted: "已依配置補種",
    saveLayoutFirst: "請先儲存這個配置",
    currentPlanting: "記住目前作物",
    savedLayout: "已儲存配置",
    currentLayout: "目前配置",
    emptyLayoutSlot: "尚未儲存配置",
    cropsSaved: "株作物已儲存",
    replaceLayout: "取代配置",
    replaceLayoutTitle: "要取代已儲存配置嗎？",
    replaceLayoutBody: "這會以目前農場配置永久取代已儲存的作物排列。",
    keepSavedLayout: "保留已儲存配置",
    notEnoughDewTitle: "露珠不足",
    needMoreDew: "還需要 {amount} 露珠",
    replantCostBody: "在 {count} 塊空田補種需要 {cost} 露珠。你目前有 {balance} 露珠；尚未種植，也不會扣款。",
    noEmptyPlotsForLayout: "沒有符合配置的空田可補種",
    gotIt: "知道了",
    replantLayout: "一鍵補種",
    openOrders: "開啟農場訂單",
    companionLodge: "夥伴小屋",
    companionIntro: "用露珠領養個人頭像角色，再點選已擁有的夥伴來切換農場能力。",
    companionAdopted: "新夥伴已領養！",
    companionActive: "已切換目前夥伴",
    tapToOpenFarmhouse: "點擊開啟農舍",
    buildFarmhouseFirst: "請先建造農舍",
    secondSlotLocked: "農舍第三階會解鎖助手位置",
    active: "使用中",
    helper: "助手",
    choose: "選擇",
    slotTwo: "位置 2",
    adopt: "領養",
    spellMastery: "咒語精通",
    mastery: "精通",
    crops: "株作物",
    spellUpgraded: "咒語精通升級！",
    chooseSpellTargets: "選擇咒語目標",
    chooseUpTo: "最多選擇",
    field: "田地",
    castOnSelected: "對所選作物施法",
    max: "最高",
    workshop: "工坊",
    expandFarm: "擴建田地",
    marketRequired: "建造市集看板",
    marketRequiredBody: "達到等級 2 並購買市集第一階後即可開放農場訂單。",
    openFarm: "開啟農場建築",
    ninetyDayJourney: "90 天農場旅程",
    days: "天",
    stewardshipBody: "完成當天所有訂單即可記錄一天；里程碑獎勵會一路延續到第 90 天。",
    weeklyPremium: "高級每週訂單",
    dailyOrder: "每日訂單",
    delivered: "已交付",
    deliver: "交付",
    inProgress: "進行中",
    orderDelivered: "訂單已交付！",
    rerollOrders: "刷新每日訂單",
    ordersRefreshed: "每日訂單已刷新",
    rerollBeforeProgress: "請在今天的訂單開始累積進度前刷新",
    needDewForReroll: "需要 25 露珠才能刷新這些訂單",
    orderResetCadence: "每日訂單每天重設；每週高級訂單的進度會保留到下週。",
    free: "免費",
    sitting: "坐著休息",
    walking: "巡邏中",
    standing: "站著發呆",
    napping: "睡午覺",
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
