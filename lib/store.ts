"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  DayPlan,
  CustomExercise,
  FoodItem,
  GameState,
  GroceryItem,
  HealthActivitySnapshot,
  Lang,
  LogEntry,
  MealPlanTemplate,
  MealSlot,
  MemberSnapshot,
  FriendMealPlanSnapshot,
  Profile,
  Recipe,
  SessionExercise,
  ThemeId,
  WeightEntry,
  WorkoutPlan,
  WorkoutSession,
  WorkspaceShared,
} from "./types";
import { BUILTIN_RECIPES } from "./recipes";
import { buildAllPlans, EXERCISE_LIBRARY } from "./plans";
import { addDays, todayStr } from "./dates";
import { est1RM, exKey, sumMacros } from "./nutrition";
import {
  combinedXp,
  DAILY_XP_REWARD,
  FOOD_LOG_XP_REWARD,
  isDailyXpEligible,
  levelFromXp,
  MAX_DAILY_REWARDED_FOOD_LOGS,
  standTierFromMinutes,
  standXpBetweenTiers,
  stepTierFromCount,
  stepXpBetweenTiers,
} from "./game";
import { useGardenStore } from "./gardenStore";
import { isThemeUnlocked } from "./themes";
import { completedSets, lastCompletedSessionForDay, recommendExercisePreset } from "./workouts";
import { migrateLegacyCalorieData, repairInflatedCalorieData } from "./calories";
import {
  applyMealPlanTemplate as applyMealPlanToWeek,
  captureMealPlan,
  mealPlanMealCount,
  mealPlanRecipeIds,
  repairLegacyRecipeYieldMultipliers,
  upsertPlannedMeal,
  type MealPlanApplyMode,
} from "./mealPlans";

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const freshGame = (): GameState => ({
  streak: 0,
  best: 0,
  melons: 0,
  golden: 0,
  xp: 0,
  lastEval: addDays(todayStr(), -1),
  history: {},
  foodLogXpClaims: {},
  healthXpClaims: {},
});

function defaultProfiles(): Profile[] {
  return [
    {
      id: "p-me",
      name: "Melon friend",
      emoji: "🍈",
      goals: { cal: 2000, protein: 120, carbs: 240, fat: 62 },
      waterGoal: 8,
      planId: "",
      unit: "lb",
      selectedRecipeIds: [],
      shareMealPlan: false,
      shareWorkoutPlan: false,
      sharedRecipeIds: [],
    },
  ];
}

export interface Store {
  // settings
  lang: Lang;
  theme: ThemeId;
  onboarded: boolean;
  activeProfileId: string;
  profiles: Profile[];

  // food
  customFoods: FoodItem[];
  favorites: string[];
  logs: Record<string, LogEntry[]>; // profileId -> entries
  recipes: Recipe[];
  planner: Record<string, DayPlan>; // date -> plan (shared)
  mealPlanTemplates: MealPlanTemplate[];
  groceries: GroceryItem[];

  // fitness
  customExercises: CustomExercise[];
  plans: WorkoutPlan[];
  sessions: Record<string, WorkoutSession[]>; // profileId -> sessions
  weights: Record<string, WeightEntry[]>;
  water: Record<string, Record<string, number>>; // profileId -> date -> cups
  health: Record<string, Record<string, HealthActivitySnapshot>>; // profileId -> date -> Apple Health summary

  // game
  game: Record<string, GameState>;

  // shared workspace (friends sync)
  ws: {
    code: string | null;
    deviceId: string;
    lastSync: number | null;
    error: string | null;
    syncing: boolean;
  };
  sharedRev: number;
  sharedDirty: boolean;
  friends: Record<string, MemberSnapshot>;

  // actions
  setLang: (l: Lang) => void;
  setTheme: (theme: ThemeId) => void;
  completeOnboarding: (args: { profile: Partial<Profile>; lang: Lang; recipeIds?: string[] }) => void;
  skipOnboarding: () => void;
  updateProfile: (id: string, patch: Partial<Profile>) => void;

  addLog: (e: Omit<LogEntry, "id" | "at" | "xpAwarded">) => number;
  removeLog: (entryId: string) => void;
  updateLog: (entryId: string, patch: Partial<Omit<LogEntry, "xpAwarded">>) => void;

  addCustomFood: (f: FoodItem) => void;
  removeCustomFood: (id: string) => void;
  toggleFavorite: (foodId: string) => void;

  addRecipe: (r: Recipe) => void;
  updateRecipe: (id: string, patch: Partial<Recipe>) => void;
  deleteRecipe: (id: string) => void;
  selectRecipe: (id: string) => void;
  unselectRecipe: (id: string) => void;
  toggleSharedRecipe: (id: string) => void;
  importFriendRecipe: (friendId: string, recipe: Recipe) => string;
  importFriendMealPlan: (
    friendId: string,
    snapshot: FriendMealPlanSnapshot,
    mode: MealPlanApplyMode
  ) => { meals: number; recipes: number };
  importFriendWorkoutPlan: (friendId: string, plan: WorkoutPlan) => string;

  planMeal: (date: string, slot: MealSlot, recipeId: string, servings: number) => void;
  unplanMeal: (date: string, slot: MealSlot, idx: number) => void;
  updatePlannedMeal: (date: string, slot: MealSlot, idx: number, servings: number) => void;
  saveMealPlanTemplate: (name: string, weekStart: string) => string | null;
  applyMealPlanTemplate: (id: string, weekStart: string, mode: MealPlanApplyMode) => void;
  deleteMealPlanTemplate: (id: string) => void;

  addGrocery: (g: Omit<GroceryItem, "id">) => void;
  updateGrocery: (id: string, patch: Partial<GroceryItem>) => void;
  removeGrocery: (id: string) => void;
  clearCheckedGroceries: () => void;
  addGroceriesBulk: (items: Omit<GroceryItem, "id">[]) => void;

  updatePlan: (planId: string, mut: (p: WorkoutPlan) => WorkoutPlan) => void;
  addCustomExercise: (exercise: CustomExercise) => void;

  startSession: (s: Omit<WorkoutSession, "id" | "startedAt" | "prs">) => string;
  updateSession: (sessionId: string, mut: (s: WorkoutSession) => WorkoutSession) => void;
  finishSession: (sessionId: string) => { volume: number; prs: number; durationMs: number };
  discardSession: (sessionId: string) => void;

  logWeight: (value: number) => void;
  addWater: (date: string, delta: number) => void;
  applyHealthActivity: (snapshot: Pick<HealthActivitySnapshot, "date" | "steps" | "standMinutes">) => number;

  setWs: (patch: Partial<Store["ws"]>) => void;
  applyShared: (shared: WorkspaceShared, rev: number) => void;
  applyMembers: (members: Record<string, MemberSnapshot>) => void;

  reconcileGame: () => void;
  awardGolden: (n: number) => void;

  importAll: (data: Partial<Store>) => void;
  resetAll: () => void;
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      lang: "en",
      theme: "honeydew",
      onboarded: false,
      activeProfileId: "p-me",
      profiles: defaultProfiles(),

      customFoods: [],
      favorites: [],
      logs: {},
      recipes: BUILTIN_RECIPES,
      planner: {},
      mealPlanTemplates: [],
      groceries: [],

      plans: buildAllPlans(),
      customExercises: [],
      sessions: {},
      weights: {},
      water: {},
      health: {},

      game: {},

      ws: { code: null, deviceId: newId(), lastSync: null, error: null, syncing: false },
      sharedRev: 0,
      sharedDirty: false,
      friends: {},

      setLang: (l) => set({ lang: l }),
      setTheme: (theme) =>
        set((s) => {
          const healthyDayXp = s.game[s.activeProfileId]?.xp ?? 0;
          const farmEarnedXp = useGardenStore.getState().gardens[s.activeProfileId]?.gardenXp ?? 0;
          const level = levelFromXp(combinedXp(healthyDayXp, farmEarnedXp));
          return isThemeUnlocked(theme, level) ? { theme } : s;
        }),

      completeOnboarding: ({ profile: patch, lang, recipeIds = [] }) =>
        set((s) => {
          const active = s.profiles.find((p) => p.id === s.activeProfileId) ?? s.profiles[0];
          const planner = { ...s.planner };

          recipeIds.slice(0, 6).forEach((recipeId, index) => {
            const date = addDays(todayStr(), Math.floor(index / 2));
            const slot: MealSlot = index % 2 === 0 ? "lunch" : "dinner";
            const dayPlan: DayPlan = { ...(planner[date] ?? {}) };
            const existing = dayPlan[slot] ?? [];
            if (!existing.some((meal) => meal.recipeId === recipeId)) {
              dayPlan[slot] = [...existing, { recipeId, servings: 1 }];
            }
            planner[date] = dayPlan;
          });

          const unit = patch.unit ?? active.unit;
          const displayWeight =
            patch.weightKg == null
              ? null
              : unit === "kg"
                ? patch.weightKg
                : Math.round(patch.weightKg * 2.20462 * 10) / 10;
          const priorWeights = (s.weights[active.id] ?? []).filter((entry) => entry.date !== todayStr());

          return {
            onboarded: true,
            lang,
            profiles: s.profiles.map((p) => (p.id === active.id ? { ...p, ...patch } : p)),
            planner,
            weights:
              displayWeight == null
                ? s.weights
                : { ...s.weights, [active.id]: [...priorWeights, { date: todayStr(), value: displayWeight }] },
          };
        }),

      skipOnboarding: () => set({ onboarded: true }),

      updateProfile: (id, patch) =>
        set((s) => ({
          profiles: s.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)),
          sharedDirty: true,
        })),

      addLog: (e) => {
        let awardedXp = 0;
        set((s) => {
          const pid = s.activeProfileId;
          const cur = s.logs[pid] ?? [];
          const g = s.game[pid] ?? freshGame();
          const claims = { ...(g.foodLogXpClaims ?? {}) };
          const claimedLogs = claims[e.date] ?? 0;
          awardedXp = claimedLogs < MAX_DAILY_REWARDED_FOOD_LOGS ? FOOD_LOG_XP_REWARD : 0;
          if (awardedXp > 0) claims[e.date] = claimedLogs + 1;
          const entry: LogEntry = { ...e, id: newId(), at: Date.now(), xpAwarded: awardedXp };
          return {
            logs: { ...s.logs, [pid]: [...cur, entry] },
            game: {
              ...s.game,
              [pid]: { ...g, xp: g.xp + awardedXp, foodLogXpClaims: claims },
            },
          };
        });
        return awardedXp;
      },

      removeLog: (entryId) =>
        set((s) => {
          const pid = s.activeProfileId;
          const entries = s.logs[pid] ?? [];
          const removed = entries.find((entry) => entry.id === entryId);
          const awardedXp = removed?.xpAwarded ?? 0;
          const g = s.game[pid] ?? freshGame();
          return {
            logs: { ...s.logs, [pid]: entries.filter((x) => x.id !== entryId) },
            game: awardedXp > 0
              ? { ...s.game, [pid]: { ...g, xp: Math.max(0, g.xp - awardedXp) } }
              : s.game,
          };
        }),

      updateLog: (entryId, patch) =>
        set((s) => {
          const pid = s.activeProfileId;
          return {
            logs: {
              ...s.logs,
              [pid]: (s.logs[pid] ?? []).map((x) => (x.id === entryId ? { ...x, ...patch } : x)),
            },
          };
        }),

      addCustomFood: (f) =>
        set((s) => ({ customFoods: [f, ...s.customFoods], sharedDirty: true })),

      removeCustomFood: (id) =>
        set((s) => ({
          customFoods: s.customFoods.filter((f) => f.id !== id),
          favorites: s.favorites.filter((x) => x !== id),
          sharedDirty: true,
        })),

      toggleFavorite: (foodId) =>
        set((s) => ({
          favorites: s.favorites.includes(foodId)
            ? s.favorites.filter((x) => x !== foodId)
            : [foodId, ...s.favorites],
          sharedDirty: true,
        })),

      addRecipe: (r) =>
        set((s) => ({
          recipes: [r, ...s.recipes],
          profiles: s.profiles.map((profile) =>
            profile.id === s.activeProfileId
              ? { ...profile, selectedRecipeIds: [r.id, ...(profile.selectedRecipeIds ?? []).filter((id) => id !== r.id)] }
              : profile
          ),
          sharedDirty: true,
        })),
      updateRecipe: (id, patch) =>
        set((s) => ({
          recipes: s.recipes.map((r) => (r.id === id ? { ...r, ...patch } : r)),
          sharedDirty: true,
        })),
      deleteRecipe: (id) =>
        set((s) => ({
          recipes: s.recipes.filter((r) => r.id !== id),
          profiles: s.profiles.map((profile) => ({
            ...profile,
            selectedRecipeIds: (profile.selectedRecipeIds ?? []).filter((recipeId) => recipeId !== id),
            sharedRecipeIds: (profile.sharedRecipeIds ?? []).filter((recipeId) => recipeId !== id),
          })),
          sharedDirty: true,
        })),

      selectRecipe: (id) =>
        set((s) => ({
          profiles: s.profiles.map((profile) =>
            profile.id === s.activeProfileId && !(profile.selectedRecipeIds ?? []).includes(id)
              ? { ...profile, selectedRecipeIds: [...(profile.selectedRecipeIds ?? []), id] }
              : profile
          ),
        })),

      unselectRecipe: (id) =>
        set((s) => ({
          profiles: s.profiles.map((profile) =>
            profile.id === s.activeProfileId
              ? {
                  ...profile,
                  selectedRecipeIds: (profile.selectedRecipeIds ?? []).filter((recipeId) => recipeId !== id),
                  sharedRecipeIds: (profile.sharedRecipeIds ?? []).filter((recipeId) => recipeId !== id),
                }
              : profile
          ),
          sharedDirty: true,
        })),

      toggleSharedRecipe: (id) =>
        set((s) => ({
          profiles: s.profiles.map((profile) => {
            if (profile.id !== s.activeProfileId) return profile;
            const shared = profile.sharedRecipeIds ?? [];
            return {
              ...profile,
              sharedRecipeIds: shared.includes(id)
                ? shared.filter((recipeId) => recipeId !== id)
                : [id, ...shared],
            };
          }),
          sharedDirty: true,
        })),

      importFriendRecipe: (friendId, recipe) => {
        const copiedId = friendCopyId(friendId, "recipe", recipe.id);
        set((s) => {
          const exists = s.recipes.some((saved) => saved.id === copiedId);
          return {
            recipes: exists
              ? s.recipes
              : [{ ...structuredClone(recipe), id: copiedId, custom: true }, ...s.recipes],
            profiles: s.profiles.map((profile) =>
              profile.id === s.activeProfileId && !(profile.selectedRecipeIds ?? []).includes(copiedId)
                ? { ...profile, selectedRecipeIds: [copiedId, ...(profile.selectedRecipeIds ?? [])] }
                : profile
            ),
            sharedDirty: true,
          };
        });
        return copiedId;
      },

      importFriendMealPlan: (friendId, snapshot, mode) => {
        const result = { meals: 0, recipes: 0 };
        set((s) => {
          const idMap = new Map<string, string>();
          const additions: Recipe[] = [];
          for (const recipe of snapshot.recipes) {
            const copiedId = friendCopyId(friendId, "recipe", recipe.id);
            idMap.set(recipe.id, copiedId);
            if (!s.recipes.some((saved) => saved.id === copiedId)) {
              additions.push({ ...structuredClone(recipe), id: copiedId, custom: true });
            }
          }

          const planner = { ...s.planner };
          const slots: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];
          for (const { date, plan } of snapshot.days) {
            const incoming: DayPlan = {};
            for (const slot of slots) {
              const meals = (plan[slot] ?? []).flatMap((meal) => {
                const recipeId = idMap.get(meal.recipeId);
                if (!recipeId) return [];
                result.meals += 1;
                return [{ ...meal, recipeId }];
              });
              if (meals.length) incoming[slot] = meals;
            }

            if (mode === "replace") {
              planner[date] = incoming;
            } else {
              const current: DayPlan = { ...(planner[date] ?? {}) };
              for (const slot of slots) {
                const existing = current[slot] ?? [];
                const added = (incoming[slot] ?? []).filter(
                  (meal) => !existing.some((saved) => saved.recipeId === meal.recipeId)
                );
                if (existing.length || added.length) current[slot] = [...existing, ...added];
              }
              planner[date] = current;
            }
          }

          result.recipes = additions.length;
          const copiedRecipeIds = Array.from(idMap.values());
          return {
            recipes: [...additions, ...s.recipes],
            planner,
            profiles: s.profiles.map((profile) =>
              profile.id === s.activeProfileId
                ? {
                    ...profile,
                    selectedRecipeIds: Array.from(new Set([
                      ...copiedRecipeIds,
                      ...(profile.selectedRecipeIds ?? []),
                    ])),
                  }
                : profile
            ),
            sharedDirty: true,
          };
        });
        return result;
      },

      importFriendWorkoutPlan: (friendId, plan) => {
        const copiedId = friendCopyId(friendId, "workout", plan.id);
        set((s) => ({
          plans: s.plans.some((saved) => saved.id === copiedId)
            ? s.plans
            : [{ ...structuredClone(plan), id: copiedId }, ...s.plans],
          profiles: s.profiles.map((profile) =>
            profile.id === s.activeProfileId ? { ...profile, planId: copiedId } : profile
          ),
          sharedDirty: true,
        }));
        return copiedId;
      },

      planMeal: (date, slot, recipeId, servings) =>
        set((s) => {
          const dp = upsertPlannedMeal(s.planner[date] ?? {}, slot, recipeId, servings);
          return { planner: { ...s.planner, [date]: dp }, sharedDirty: true };
        }),

      unplanMeal: (date, slot, idx) =>
        set((s) => {
          const dp: DayPlan = { ...(s.planner[date] ?? {}) };
          dp[slot] = (dp[slot] ?? []).filter((_, i) => i !== idx);
          return { planner: { ...s.planner, [date]: dp }, sharedDirty: true };
        }),

      updatePlannedMeal: (date, slot, idx, servings) =>
        set((s) => {
          const dp: DayPlan = { ...(s.planner[date] ?? {}) };
          dp[slot] = (dp[slot] ?? []).map((pm, i) => (i === idx ? { ...pm, servings } : pm));
          return { planner: { ...s.planner, [date]: dp }, sharedDirty: true };
        }),

      saveMealPlanTemplate: (name, weekStart) => {
        const days = captureMealPlan(get().planner, weekStart);
        if (!name.trim() || mealPlanMealCount(days) === 0) return null;
        const id = newId();
        const template: MealPlanTemplate = { id, name: name.trim(), days, createdAt: Date.now() };
        set((s) => ({ mealPlanTemplates: [template, ...s.mealPlanTemplates] }));
        return id;
      },

      applyMealPlanTemplate: (id, weekStart, mode) =>
        set((s) => {
          const template = s.mealPlanTemplates.find((item) => item.id === id);
          if (!template) return s;
          const recipeIds = mealPlanRecipeIds(template.days);
          return {
            planner: applyMealPlanToWeek(s.planner, template, weekStart, mode),
            profiles: s.profiles.map((profile) =>
              profile.id === s.activeProfileId
                ? { ...profile, selectedRecipeIds: Array.from(new Set([...(profile.selectedRecipeIds ?? []), ...recipeIds])) }
                : profile
            ),
            sharedDirty: true,
          };
        }),

      deleteMealPlanTemplate: (id) =>
        set((s) => ({ mealPlanTemplates: s.mealPlanTemplates.filter((template) => template.id !== id) })),

      addGrocery: (g) =>
        set((s) => ({ groceries: [...s.groceries, { ...g, id: newId() }], sharedDirty: true })),
      updateGrocery: (id, patch) =>
        set((s) => ({
          groceries: s.groceries.map((g) => (g.id === id ? { ...g, ...patch } : g)),
          sharedDirty: true,
        })),
      removeGrocery: (id) =>
        set((s) => ({ groceries: s.groceries.filter((g) => g.id !== id), sharedDirty: true })),
      clearCheckedGroceries: () =>
        set((s) => ({ groceries: s.groceries.filter((g) => !g.checked), sharedDirty: true })),
      addGroceriesBulk: (items) =>
        set((s) => ({
          groceries: [...s.groceries, ...items.map((g) => ({ ...g, id: newId() }))],
          sharedDirty: true,
        })),

      updatePlan: (planId, mut) =>
        set((s) => ({
          plans: s.plans.map((p) => (p.id === planId ? mut(structuredClone(p)) : p)),
          sharedDirty: true,
        })),

      addCustomExercise: (exercise) =>
        set((s) => {
          const exists = s.customExercises.some(
            (item) => item.historyKey === exercise.historyKey || item.name.en.toLowerCase() === exercise.name.en.toLowerCase()
          );
          return exists ? s : { customExercises: [exercise, ...s.customExercises] };
        }),

      startSession: (raw) => {
        const id = newId();
        set((s) => {
          const pid = s.activeProfileId;
          const session: WorkoutSession = { ...raw, id, startedAt: Date.now(), prs: 0 };
          return {
            sessions: { ...s.sessions, [pid]: [...(s.sessions[pid] ?? []), session] },
          };
        });
        return id;
      },

      updateSession: (sessionId, mut) =>
        set((s) => {
          const pid = s.activeProfileId;
          return {
            sessions: {
              ...s.sessions,
              [pid]: (s.sessions[pid] ?? []).map((x) => (x.id === sessionId ? mut(structuredClone(x)) : x)),
            },
          };
        }),

      finishSession: (sessionId) => {
        const s = get();
        const pid = s.activeProfileId;
        const session = (s.sessions[pid] ?? []).find((x) => x.id === sessionId);
        if (!session) return { volume: 0, prs: 0, durationMs: 0 };

        // compute PRs vs all previous sessions
        const prior = (s.sessions[pid] ?? []).filter((x) => x.id !== sessionId && x.endedAt);
        const bestByKey: Record<string, number> = {};
        for (const ps of prior) {
          for (const e of ps.entries) {
            for (const st of e.sets) {
              if (!st.done || st.w <= 0) continue;
              const k = e.key;
              bestByKey[k] = Math.max(bestByKey[k] ?? 0, est1RM(st.w, st.reps));
            }
          }
        }
        let prs = 0;
        let volume = 0;
        for (const e of session.entries) {
          let bestThis = 0;
          for (const st of e.sets) {
            if (!st.done) continue;
            volume += st.w * st.reps;
            bestThis = Math.max(bestThis, est1RM(st.w, st.reps));
          }
          if (bestThis > 0 && bestThis > (bestByKey[e.key] ?? 0) && (bestByKey[e.key] ?? 0) > 0) prs += 1;
        }
        const endedAt = Date.now();
        const durationMs = endedAt - session.startedAt;
        set((st) => {
          const g = st.game[pid] ?? freshGame();
          return {
            sessions: {
              ...st.sessions,
              [pid]: (st.sessions[pid] ?? []).map((x) =>
                x.id === sessionId ? { ...x, endedAt, prs } : x
              ),
            },
            game: {
              ...st.game,
              [pid]: { ...g, golden: g.golden + prs },
            },
          };
        });
        return { volume, prs, durationMs };
      },

      discardSession: (sessionId) =>
        set((s) => {
          const pid = s.activeProfileId;
          return {
            sessions: {
              ...s.sessions,
              [pid]: (s.sessions[pid] ?? []).filter((x) => x.id !== sessionId),
            },
          };
        }),

      logWeight: (value) =>
        set((s) => {
          const pid = s.activeProfileId;
          const cur = (s.weights[pid] ?? []).filter((w) => w.date !== todayStr());
          return {
            weights: { ...s.weights, [pid]: [...cur, { date: todayStr(), value }] },
          };
        }),

      addWater: (date, delta) =>
        set((s) => {
          const pid = s.activeProfileId;
          const mine = { ...(s.water[pid] ?? {}) };
          mine[date] = Math.max(0, Math.min(20, (mine[date] ?? 0) + delta));
          return { water: { ...s.water, [pid]: mine } };
        }),

      applyHealthActivity: (snapshot) => {
        let awardedXp = 0;
        set((s) => {
          const pid = s.activeProfileId;
          const g = s.game[pid] ?? freshGame();
          const claims = { ...(g.healthXpClaims ?? {}) };
          const prior = claims[snapshot.date] ?? { stepTier: 0, standTier: 0 };
          const stepTier = stepTierFromCount(snapshot.steps);
          const standTier = standTierFromMinutes(snapshot.standMinutes);
          awardedXp = stepXpBetweenTiers(prior.stepTier, stepTier)
            + standXpBetweenTiers(prior.standTier, standTier);
          claims[snapshot.date] = {
            stepTier: Math.max(prior.stepTier, stepTier),
            standTier: Math.max(prior.standTier, standTier),
          };

          const activity: HealthActivitySnapshot = {
            date: snapshot.date,
            steps: Math.max(0, Math.round(snapshot.steps)),
            standMinutes: Math.max(0, Math.round(snapshot.standMinutes)),
            syncedAt: Date.now(),
            source: "apple-health",
          };

          return {
            health: {
              ...(s.health ?? {}),
              [pid]: { ...(s.health?.[pid] ?? {}), [snapshot.date]: activity },
            },
            game: {
              ...s.game,
              [pid]: { ...g, xp: g.xp + awardedXp, healthXpClaims: claims },
            },
          };
        });
        return awardedXp;
      },

      setWs: (patch) => set((s) => ({ ws: { ...s.ws, ...patch } })),

      applyShared: (shared, rev) =>
        set(() => ({
          ...migrateLegacyCalorieData(shared),
          sharedRev: rev,
          sharedDirty: false,
        })),

      applyMembers: (members) => set(() => ({ friends: migrateLegacyCalorieData(members) })),

      awardGolden: (n) =>
        set((s) => {
          const pid = s.activeProfileId;
          const g = s.game[pid] ?? freshGame();
          return { game: { ...s.game, [pid]: { ...g, golden: g.golden + n } } };
        }),

      /** Walk unevaluated past days and grow melons for goal-hit days. */
      reconcileGame: () =>
        set((s) => {
          const out: Record<string, GameState> = { ...s.game };
          for (const p of s.profiles) {
            const g = { ...(out[p.id] ?? freshGame()), history: { ...(out[p.id]?.history ?? {}) } };
            const yesterday = addDays(todayStr(), -1);
            let cursor = addDays(g.lastEval, 1);
            let guard = 0;
            while (cursor <= yesterday && guard < 400) {
              const entries = (s.logs[p.id] ?? []).filter((e) => e.date === cursor);
              if (entries.length > 0) {
                const tot = sumMacros(entries.map((e) => e.macros));
                const hit = isDailyXpEligible(entries.length, tot.cal, p.goals.cal);
                g.history[cursor] = hit;
                if (hit) {
                  g.streak += 1;
                  g.melons += 1;
                  g.xp += DAILY_XP_REWARD;
                  g.best = Math.max(g.best, g.streak);
                } else {
                  g.streak = 0;
                }
              } else {
                // nothing logged: streak pauses (kind, not punishing)
                g.history[cursor] = false;
              }
              g.lastEval = cursor;
              cursor = addDays(cursor, 1);
              guard += 1;
            }
            out[p.id] = g;
          }
          return { game: out };
        }),

      importAll: (data) => set(() => ({ ...migrateLegacyCalorieData(data as Store) })),

      resetAll: () =>
        set(() => ({
          lang: "en",
          theme: "honeydew",
          onboarded: false,
          activeProfileId: "p-me",
          profiles: defaultProfiles(),
          customFoods: [],
          favorites: [],
          logs: {},
          recipes: BUILTIN_RECIPES,
          planner: {},
          mealPlanTemplates: [],
          groceries: [],
          plans: buildAllPlans(),
          customExercises: [],
          sessions: {},
          weights: {},
          water: {},
          health: {},
          game: {},
          ws: { code: null, deviceId: newId(), lastSync: null, error: null, syncing: false },
          sharedRev: 0,
          sharedDirty: false,
          friends: {},
        })),
    }),
    {
      name: "melonmate-v1",
      version: 12,
      migrate: (persisted, version) => {
        let state = version < 11
          ? migrateLegacyCalorieData(persisted as Partial<Store>)
          : version === 11
            ? repairInflatedCalorieData(persisted as Partial<Store>)
            : persisted as Partial<Store>;

        if (version < 2 && state.profiles?.length) {
          // v1 allowed two people to keep independent data on one phone. Preserve
          // whichever person was active, then make that the phone's sole identity.
          const active = state.profiles.find((p) => p.id === state.activeProfileId) ?? state.profiles[0];
          state = { ...state, profiles: [active], activeProfileId: active.id };
        }

        if (version < 4) state = { ...state, customExercises: state.customExercises ?? [] };
        if (version < 5) {
          const recipes = state.recipes ?? [];
          const plans = state.plans ?? [];
          state = {
            ...state,
            recipes: [...recipes, ...BUILTIN_RECIPES.filter((recipe) => !recipes.some((saved) => saved.id === recipe.id))],
            plans: [...plans, ...buildAllPlans().filter((plan) => !plans.some((saved) => saved.id === plan.id))],
            // The prior flow only asked for a name and silently supplied every goal.
            onboarded: state.profiles?.some((profile) => profile.fitnessGoal) ? state.onboarded : false,
          };
        }
        if (version < 6) {
          state = {
            ...state,
            profiles: state.profiles?.map((profile) => {
              const usedPlan = (state.sessions?.[profile.id] ?? []).some((session) => session.planId === profile.planId);
              const usedRecipes = (state.logs?.[profile.id] ?? [])
                .filter((entry) => entry.src === "recipe" && entry.refId)
                .map((entry) => entry.refId as string);
              const customRecipes = (state.recipes ?? []).filter((recipe) => recipe.custom).map((recipe) => recipe.id);
              return {
                ...profile,
                // Older versions silently assigned a bundled plan. Keep it only
                // when workout history proves the person actually used it.
                planId: usedPlan ? profile.planId : "",
                selectedRecipeIds: profile.selectedRecipeIds ?? Array.from(new Set([...customRecipes, ...usedRecipes])),
              };
            }),
          };
        }
        if (version < 7) state = { ...state, mealPlanTemplates: state.mealPlanTemplates ?? [] };
        if (version < 8) {
          state = {
            ...state,
            profiles: state.profiles?.map((profile) => ({
              ...profile,
              shareMealPlan: profile.shareMealPlan ?? false,
              shareWorkoutPlan: profile.shareWorkoutPlan ?? false,
              sharedRecipeIds: profile.sharedRecipeIds ?? [],
            })),
          };
        }
        if (version < 9) {
          const recipes = state.recipes ?? [];
          state = {
            ...state,
            recipes: [...recipes, ...BUILTIN_RECIPES.filter((recipe) => !recipes.some((saved) => saved.id === recipe.id))],
            profiles: state.profiles?.map((profile) => ({
              ...profile,
              ingredientRestrictions: profile.ingredientRestrictions ?? (profile.allergies ?? "")
                .split(/[,;\n]/)
                .map((item) => item.trim())
                .filter(Boolean),
            })),
          };
        }
        if (version < 10) {
          state = {
            ...state,
            planner: repairLegacyRecipeYieldMultipliers(state.planner ?? {}, state.recipes ?? []),
          };
        }
        return state;
      },
    }
  )
);

function friendCopyId(friendId: string, kind: "recipe" | "workout", sourceId: string): string {
  const safe = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80);
  return `friend-${safe(friendId)}-${kind}-${safe(sourceId)}`;
}

/* ---------------- selectors / hooks ---------------- */

export function buildShared(s: Store): WorkspaceShared {
  return {
    recipes: s.recipes,
    planner: s.planner,
    groceries: s.groceries,
    customFoods: s.customFoods,
    favorites: s.favorites,
    plans: s.plans,
  };
}

export function useActiveProfile(): Profile {
  const profiles = useStore((s) => s.profiles);
  const id = useStore((s) => s.activeProfileId);
  return profiles.find((p) => p.id === id) ?? profiles[0];
}

export function useGame(): GameState {
  const id = useStore((s) => s.activeProfileId);
  const game = useStore((s) => s.game);
  const farmEarnedXp = useGardenStore((s) => s.gardens[id]?.gardenXp ?? 0);
  const saved = game[id] ?? freshGame();
  return { ...saved, xp: combinedXp(saved.xp, farmEarnedXp) };
}

export function todayLogs(s: Store, date: string): LogEntry[] {
  return (s.logs[s.activeProfileId] ?? []).filter((e) => e.date === date);
}

/** open (unfinished) session for active profile */
export function openSession(s: Store): WorkoutSession | undefined {
  return (s.sessions[s.activeProfileId] ?? []).find((x) => !x.endedAt);
}

/** last completed set history for an exercise key */
export function lastSetsFor(s: Store, key: string): { date: string; sets: { w: number; reps: number; rpe?: number }[] } | undefined {
  const list = (s.sessions[s.activeProfileId] ?? [])
    .filter((x) => x.endedAt)
    .sort((a, b) => b.startedAt - a.startedAt);
  for (const sess of list) {
    const e = sess.entries.find((en) => en.key === key);
    if (e) {
      const done = completedSets(e.sets);
      if (done.length) return { date: sess.date, sets: done };
    }
  }
  return undefined;
}

export function makeSessionEntries(
  dayExercises: {
    historyKey?: string;
    name: { en: string; zh: string };
    sets: number;
    reps: string;
    rpe?: number;
    targetWeight?: number;
    restMin?: number;
    description?: { en: string; zh: string };
    cue?: { en: string; zh: string };
    seedWeight?: number;
  }[],
  s: Store,
  context?: { planId: string; dayIdx: number }
): SessionExercise[] {
  const profile = s.profiles.find((item) => item.id === s.activeProfileId) ?? s.profiles[0];
  const plan = context ? s.plans.find((item) => item.id === context.planId) : undefined;
  const priorDay = context
    ? lastCompletedSessionForDay(
        s.sessions[s.activeProfileId] ?? [],
        context.planId,
        context.dayIdx
      )
    : undefined;

  return dayExercises.map((spec) => {
    const key = spec.historyKey ?? exKey(spec.name.en);
    const builtIn = EXERCISE_LIBRARY.find((exercise) => exKey(exercise.en) === key);
    const custom = s.customExercises.find((exercise) => exercise.historyKey === key);
    const choice = builtIn
      ? {
          historyKey: key,
          name: { en: builtIn.en, zh: builtIn.zh },
          group: builtIn.group,
          equipment: builtIn.equipment,
          timed: builtIn.timed,
        }
      : custom
        ? {
            historyKey: key,
            name: custom.name,
            group: custom.group,
            equipment: custom.equipment,
          }
        : undefined;
    const suggestedWeight = choice
      ? recommendExercisePreset({
          profile,
          exercise: choice,
          sessions: s.sessions[s.activeProfileId] ?? [],
          plan,
        }).weight
      : undefined;
    const previousEntry = priorDay?.entries.find((entry) => entry.key === key);
    const previousSets = previousEntry ? completedSets(previousEntry.sets) : [];
    const last = context ? undefined : lastSetsFor(s, key);
    const workingWeight =
      spec.targetWeight ??
      suggestedWeight ??
      previousSets[previousSets.length - 1]?.w ??
      last?.sets[last.sets.length - 1]?.w ??
      spec.seedWeight ??
      0;
    return {
      key,
      name: spec.name,
      targetSets: spec.sets,
      targetReps: spec.reps,
      targetRpe: spec.rpe,
      targetWeight: workingWeight > 0 ? workingWeight : undefined,
      restMin: spec.restMin,
      description: spec.description,
      cue: spec.cue,
      sets: Array.from({ length: spec.sets }, (_, index) => ({
        w: spec.targetWeight ?? suggestedWeight ?? previousSets[index]?.w ?? workingWeight,
        reps: parseInt(spec.reps) || 0,
        rpe: undefined,
        done: false,
      })),
    };
  });
}
