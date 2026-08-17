"use client";

import { useStore } from "./store";
import { addDays, diffDays, todayStr } from "./dates";
import { sumMacros } from "./nutrition";
import { combinedXp, levelFromXp } from "./game";
import { useGardenStore } from "./gardenStore";
import { freshGarden } from "./garden";
import { gardenAchievements } from "./gardenAchievements";
import type { MemberSnapshot, WorkspaceDoc } from "./types";
import { apiFetch } from "./api";
import { detectFriendShareNotifications } from "./friendNotifications";

/**
 * Client sync engine for friend progress.
 *
 * Each person owns one permanent code and may also join other people's codes.
 * The owner can discover everyone who used their code, while directed member
 * snapshots keep sharing choices isolated to each friendship.
 */

export function normalizeCode(raw: string): string | null {
  const c = raw.trim().toUpperCase().replace(/\s+/g, "");
  return /^[A-Z0-9-]{6,32}$/.test(c) ? c : null;
}

export function memberIdFor(profileId: string, deviceId: string): string {
  return `${profileId}.${deviceId.slice(0, 8)}`;
}

export function connectionCodes(ws: { code: string | null; personalCode?: string | null; codes?: string[] }): string[] {
  return [...new Set([
    ...(ws.codes ?? []),
    ...(ws.code ? [ws.code] : []),
    ...(ws.personalCode ? [ws.personalCode] : []),
  ])];
}

/** Builds the per-friend snapshot, honoring that connection's sharing choices. */
export function buildMemberSnapshot(friendId?: string | null): MemberSnapshot {
  const s = useStore.getState();
  const profile = s.profiles.find((p) => p.id === s.activeProfileId) ?? s.profiles[0];
  const sharing = friendId ? s.friendSharing[friendId] ?? {
    shareNutrition: false,
    shareFoodLogs: false,
    shareWorkoutHistory: false,
    shareHealth: false,
    shareFarm: false,
    shareWeightTrend: false,
    shareMealPlan: false,
    shareWorkoutPlan: false,
    sharedRecipeIds: [],
  } : {
    shareNutrition: false,
    shareFoodLogs: false,
    shareWorkoutHistory: false,
    shareHealth: false,
    shareFarm: false,
    shareWeightTrend: false,
    shareMealPlan: false,
    shareWorkoutPlan: false,
    sharedRecipeIds: [],
  };
  const game = s.game[profile.id];
  const savedFarm = useGardenStore.getState().gardens[profile.id];
  const farm = savedFarm ?? freshGarden();
  const xp = combinedXp(game?.xp ?? 0);
  const level = levelFromXp(xp);

  const today = todayStr();
  const todayEntries = (s.logs[profile.id] ?? []).filter((e) => e.date === today);
  const tot = sumMacros(todayEntries.map((e) => e.macros));

  const garden: { date: string; hit: boolean }[] = [];
  for (let i = 7; i >= 1; i--) {
    const d = addDays(today, -i);
    garden.push({ date: d, hit: Boolean(game?.history?.[d]) });
  }

  const lastSession = (s.sessions[profile.id] ?? [])
    .filter((x) => x.endedAt)
    .sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0))[0];

  const mealDays = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(today, index);
    return { date, plan: s.planner[date] ?? {} };
  });
  const plannedRecipeIds = new Set(
    mealDays.flatMap(({ plan }) =>
      (["breakfast", "lunch", "dinner", "snack"] as const).flatMap((slot) =>
        (plan[slot] ?? []).map((meal) => meal.recipeId)
      )
    )
  );
  const mealRecipes = s.recipes.filter((recipe) => plannedRecipeIds.has(recipe.id));
  const sharedRecipeIds = new Set(sharing.sharedRecipeIds);
  const sharedRecipes = s.recipes.filter((recipe) => sharedRecipeIds.has(recipe.id));

  const completedSessions = (s.sessions[profile.id] ?? [])
    .filter((session) => session.endedAt)
    .sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0));
  const sessionSummary = (session: (typeof completedSessions)[number]) => ({
    date: session.date,
    name: session.dayName,
    volume: session.entries.reduce(
      (total, entry) => total + entry.sets.filter((set) => set.done).reduce((sum, set) => sum + set.w * set.reps, 0),
      0
    ),
    prs: session.prs,
  });
  const workoutPlan = sharing.shareWorkoutPlan
    ? s.plans.find((plan) => plan.id === (sharing.workoutPlanId ?? profile.planId))
    : undefined;
  const workoutSummaries = completedSessions.map(sessionSummary);
  const foodLogs = sharing.shareFoodLogs
    ? [...(s.logs[profile.id] ?? [])].sort((a, b) => b.at - a.at).slice(0, 100)
    : undefined;
  const health = sharing.shareHealth
    ? Object.values(s.health?.[profile.id] ?? {})
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 7)
      .map((entry) => ({ ...entry, workouts: (entry.workouts ?? []).map((workout) => ({ ...workout })) }))
    : undefined;
  const badges = sharing.shareFarm
    ? gardenAchievements(farm).filter((achievement) => achievement.earned).map((achievement) => achievement.id)
    : undefined;
  const sortedWeights = [...(s.weights[profile.id] ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  const latestWeight = sortedWeights.at(-1);
  const weeklyWeights = latestWeight
    ? sortedWeights.filter((entry) => entry.date >= addDays(latestWeight.date, -7) && entry.date <= latestWeight.date)
    : [];
  const baselineWeight = latestWeight
    ? weeklyWeights.find((entry) => entry.date < latestWeight.date)
    : undefined;
  const weightTrend = sharing.shareWeightTrend && latestWeight && baselineWeight
    ? {
        change: Math.round((latestWeight.value - baselineWeight.value) * 10) / 10,
        unit: profile.unit,
        days: Math.max(1, diffDays(latestWeight.date, baselineWeight.date)),
        asOf: latestWeight.date,
      }
    : undefined;

  return {
    version: 11,
    id: memberIdFor(profile.id, s.ws.deviceId),
    notificationDeviceId: s.ws.deviceId,
    name: profile.name,
    emoji: profile.emoji,
    photoDataUrl: profile.photoDataUrl,
    level,
    xp,
    streak: game?.streak ?? 0,
    best: game?.best ?? 0,
    melons: sharing.shareFarm ? game?.melons ?? 0 : 0,
    golden: sharing.shareFarm ? game?.golden ?? 0 : 0,
    theme: s.theme,
    badges,
    garden: sharing.shareFarm ? garden : undefined,
    today: sharing.shareNutrition ? {
      date: today,
      cal: tot.cal,
      calGoal: profile.goals.cal,
      protein: Math.round(tot.protein),
      proteinGoal: profile.goals.protein,
    } : undefined,
    lastWorkout: sharing.shareWorkoutHistory && lastSession
      ? sessionSummary(lastSession)
      : undefined,
    foodLogs,
    health,
    weightTrend,
    dailyProgress: friendId ? s.friendDailyProgress[friendId] : undefined,
    farm: sharing.shareFarm ? {
      dew: farm.dew,
      unlockedPlots: farm.unlockedPlots,
      plots: farm.plots.map((plot) => ({ ...plot })),
      harvests: { ...farm.harvests },
      totalHarvests: farm.totalHarvests,
      lastTended: farm.lastTended,
    } : undefined,
    mealPlan: sharing.shareMealPlan ? { days: mealDays, recipes: mealRecipes } : undefined,
    sharedRecipes: sharedRecipes.length ? sharedRecipes : undefined,
    workoutPlan: workoutPlan
      ? { plan: workoutPlan, unit: profile.unit }
      : undefined,
    workouts: sharing.shareWorkoutHistory ? {
      unit: profile.unit,
      completed: workoutSummaries.length,
      totalPrs: workoutSummaries.reduce((total, workout) => total + workout.prs, 0),
      totalVolume: workoutSummaries.reduce((total, workout) => total + workout.volume, 0),
      recent: workoutSummaries.slice(0, 6),
    } : undefined,
    updatedAt: Date.now(),
  };
}

async function api(code: string, init?: RequestInit): Promise<WorkspaceDoc> {
  const res = await apiFetch(`/api/ws/${encodeURIComponent(code)}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    let msg = `http-${res.status}`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) msg = data.error;
    } catch {
      /* keep status message */
    }
    throw new Error(msg);
  }
  return (await res.json()) as WorkspaceDoc;
}

async function createApi(member: MemberSnapshot): Promise<{ code: string; doc: WorkspaceDoc }> {
  const res = await apiFetch("/api/ws", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ member }),
    cache: "no-store",
  });
  if (!res.ok) {
    let message = `http-${res.status}`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      /* keep status message */
    }
    throw new Error(message);
  }
  return (await res.json()) as { code: string; doc: WorkspaceDoc };
}

let activeFriendSync: Promise<void> | null = null;
let friendSyncQueued = false;
let activeCodeCreation: Promise<string> | null = null;

/** Pull + merge + push. Concurrent calls are coalesced and one trailing sync preserves edits made in flight. */
export function syncNow(): Promise<void> {
  if (activeFriendSync) {
    friendSyncQueued = true;
    return activeFriendSync;
  }
  const sync = performSync().finally(() => {
    activeFriendSync = null;
    if (friendSyncQueued) {
      friendSyncQueued = false;
      void syncNow();
    }
  });
  activeFriendSync = sync;
  return sync;
}

async function performSync(): Promise<void> {
  const s = useStore.getState();
  const codes = connectionCodes(s.ws);
  if (!codes.length) return;
  s.setWs({ syncing: true });
  const selfId = memberIdFor(s.activeProfileId, s.ws.deviceId);
  const previousFriends = s.friends;
  const nextFriends = { ...previousFriends };
  const nextFriendCodes = { ...s.friendCodes };
  let latestRev = s.sharedRev;
  let firstError: string | null = null;
  let successes = 0;
  const shareNotifications = [] as ReturnType<typeof detectFriendShareNotifications>;

  await Promise.all(codes.map(async (code) => {
    try {
      const knownFriendIds = Object.entries(s.friendCodes)
        .filter(([, friendCode]) => friendCode === code)
        .map(([friendId]) => friendId);
      const ownsCode = s.ws.personalCode === code;
      const targetFriendId = !ownsCode && knownFriendIds.length === 1 ? knownFriendIds[0] : null;
      const views = ownsCode
        ? Object.fromEntries(knownFriendIds.map((friendId) => [friendId, buildMemberSnapshot(friendId)]))
        : undefined;
      const updated = await api(code, {
        method: "PUT",
        body: JSON.stringify({
          member: buildMemberSnapshot(targetFriendId),
          ...(targetFriendId ? { recipientId: targetFriendId } : {}),
          ...(views ? { views } : {}),
        }),
      });
      latestRev = Math.max(latestRev, updated.rev);
      successes += 1;
      for (const member of Object.values(updated.members)) {
        if (member.id === selfId) continue;
        const current = nextFriends[member.id];
        if (!current || member.updatedAt >= current.updatedAt) {
          if (current) shareNotifications.push(...detectFriendShareNotifications(current, member));
          nextFriends[member.id] = member;
        }
        nextFriendCodes[member.id] = code;
      }
    } catch (error) {
      firstError ??= error instanceof Error ? error.message : "sync-failed";
    }
  }));

  const st = useStore.getState();
  if (successes) {
    useStore.setState({
      friends: nextFriends,
      friendCodes: nextFriendCodes,
      sharedRev: latestRev,
      sharedDirty: false,
    });
    useStore.getState().addFriendNotifications(shareNotifications);
  }
  st.setWs({
    lastSync: successes ? Date.now() : st.ws.lastSync,
    error: firstError,
    syncing: false,
  });
}

/** Create this person's permanent six-digit friend code once. */
export async function createWorkspace(): Promise<string> {
  const s = useStore.getState();
  if (s.ws.personalCode) return s.ws.personalCode;
  if (activeCodeCreation) return activeCodeCreation;
  activeCodeCreation = (async () => {
    const current = useStore.getState();
    if (current.ws.personalCode) return current.ws.personalCode;
    const { code, doc } = await createApi(buildMemberSnapshot(null));
    const codes = [...new Set([...connectionCodes(current.ws), code])];
    current.setWs({ code, personalCode: code, codes, lastSync: Date.now(), error: null });
    useStore.setState({ sharedRev: doc.rev, sharedDirty: false });
    return code;
  })().finally(() => {
    activeCodeCreation = null;
  });
  return activeCodeCreation;
}

/** Add the owner of a permanent friend code; repeated joins are idempotent. */
export async function joinWorkspace(rawCode: string): Promise<void> {
  const code = normalizeCode(rawCode);
  if (!code) throw new Error("bad-code");
  const s = useStore.getState();
  if (code === s.ws.personalCode) throw new Error("own-code");
  const doc = await api(code, {
    method: "PUT",
    body: JSON.stringify({ member: buildMemberSnapshot(null) }),
  });
  const selfId = memberIdFor(s.activeProfileId, s.ws.deviceId);
  const incoming = Object.fromEntries(Object.entries(doc.members).filter(([id]) => id !== selfId));
  const friendCodes = {
    ...s.friendCodes,
    ...Object.fromEntries(Object.keys(incoming).map((friendId) => [friendId, code])),
  };
  s.setWs({ codes: [...new Set([...connectionCodes(s.ws), code])], lastSync: Date.now(), error: null });
  useStore.setState({
    friends: { ...s.friends, ...incoming },
    friendCodes,
    sharedRev: doc.rev,
    sharedDirty: false,
  });
}

export function leaveWorkspace(): void {
  const s = useStore.getState();
  s.setWs({ code: null, personalCode: null, codes: [], lastSync: null, error: null, syncing: false });
  useStore.setState({
    friends: {},
    friendCodes: {},
    friendSharing: {},
    friendDailyProgress: {},
    friendNotifications: [],
    sharedRev: 0,
    sharedDirty: false,
  });
}

/** Human label for a sync error. */
export function isSetupError(err: string | null): boolean {
  return err === "sync-not-configured" || err === "storage-unavailable";
}
