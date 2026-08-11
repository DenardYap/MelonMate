"use client";

import { useStore } from "./store";
import { addDays, todayStr } from "./dates";
import { sumMacros } from "./nutrition";
import { combinedXp, levelFromXp } from "./game";
import { useGardenStore } from "./gardenStore";
import { freshGarden } from "./garden";
import type { MemberSnapshot, WorkspaceDoc } from "./types";
import { apiFetch } from "./api";

/**
 * Client sync engine for friend progress.
 *
 * Each invite code represents one friend connection. A device may create or
 * join many codes, publishes a tailored snapshot into each connection, and
 * merges those friends into one list. Detailed food logs, groceries, goals,
 * and other private device data never sync.
 */

export function normalizeCode(raw: string): string | null {
  const c = raw.trim().toUpperCase().replace(/\s+/g, "");
  return /^[A-Z0-9-]{6,32}$/.test(c) ? c : null;
}

export function memberIdFor(profileId: string, deviceId: string): string {
  return `${profileId}.${deviceId.slice(0, 8)}`;
}

export function connectionCodes(ws: { code: string | null; codes?: string[] }): string[] {
  return [...new Set([...(ws.codes ?? []), ...(ws.code ? [ws.code] : [])])];
}

/** `friendId: null` shares progress only; `undefined` preserves legacy global sharing. */
export function buildMemberSnapshot(friendId?: string | null): MemberSnapshot {
  const s = useStore.getState();
  const profile = s.profiles.find((p) => p.id === s.activeProfileId) ?? s.profiles[0];
  const game = s.game[profile.id];
  const savedFarm = useGardenStore.getState().gardens[profile.id];
  const farm = savedFarm ?? freshGarden();
  const farmEarnedXp = farm.gardenXp;
  const xp = combinedXp(game?.xp ?? 0, farmEarnedXp);
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
  const sharing = friendId
    ? s.friendSharing[friendId] ?? { shareMealPlan: false, shareWorkoutPlan: false, sharedRecipeIds: [] }
    : friendId === undefined
      ? {
          shareMealPlan: Boolean(profile.shareMealPlan),
          shareWorkoutPlan: Boolean(profile.shareWorkoutPlan),
          sharedRecipeIds: profile.sharedRecipeIds ?? [],
        }
      : { shareMealPlan: false, shareWorkoutPlan: false, sharedRecipeIds: [] };
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
  const workoutPlan = s.plans.find(
    (plan) => plan.id === (sharing.workoutPlanId ?? profile.planId)
  );
  const workoutSummaries = completedSessions.map(sessionSummary);

  return {
    version: 6,
    id: memberIdFor(profile.id, s.ws.deviceId),
    name: profile.name,
    emoji: profile.emoji,
    photoDataUrl: profile.photoDataUrl,
    level,
    xp,
    streak: game?.streak ?? 0,
    best: game?.best ?? 0,
    melons: game?.melons ?? 0,
    golden: game?.golden ?? 0,
    garden,
    today: {
      date: today,
      cal: tot.cal,
      calGoal: profile.goals.cal,
      protein: Math.round(tot.protein),
      proteinGoal: profile.goals.protein,
    },
    lastWorkout: lastSession
      ? sessionSummary(lastSession)
      : undefined,
    farm: {
      dew: farm.dew,
      gardenXp: farm.gardenXp,
      unlockedPlots: farm.unlockedPlots,
      plots: farm.plots.map((plot) => ({ ...plot })),
      harvests: { ...farm.harvests },
      totalHarvests: farm.totalHarvests,
      lastTended: farm.lastTended,
    },
    mealPlan: sharing.shareMealPlan
      ? { days: mealDays, recipes: mealRecipes }
      : undefined,
    sharedRecipes: sharedRecipes.length ? sharedRecipes : undefined,
    workoutPlan: sharing.shareWorkoutPlan && workoutPlan
      ? { plan: workoutPlan, unit: profile.unit }
      : undefined,
    workouts: {
      unit: profile.unit,
      completed: workoutSummaries.length,
      totalPrs: workoutSummaries.reduce((total, workout) => total + workout.prs, 0),
      totalVolume: workoutSummaries.reduce((total, workout) => total + workout.volume, 0),
      recent: workoutSummaries.slice(0, 6),
    },
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

/** Pull + merge + push. Safe to call repeatedly. */
export async function syncNow(): Promise<void> {
  const s = useStore.getState();
  const codes = connectionCodes(s.ws);
  if (!codes.length || s.ws.syncing) return;
  s.setWs({ syncing: true });
  const selfId = memberIdFor(s.activeProfileId, s.ws.deviceId);
  const previousFriends = s.friends;
  const nextFriends = { ...previousFriends };
  const nextFriendCodes = { ...s.friendCodes };
  let latestRev = s.sharedRev;
  let firstError: string | null = null;
  let successes = 0;

  await Promise.all(codes.map(async (code) => {
    try {
      const knownFriendIds = Object.entries(s.friendCodes)
        .filter(([, friendCode]) => friendCode === code)
        .map(([friendId]) => friendId);
      const targetFriendId = knownFriendIds.length === 1 ? knownFriendIds[0] : knownFriendIds.length > 1 ? undefined : null;
      const updated = await api(code, {
        method: "PUT",
        body: JSON.stringify({ member: buildMemberSnapshot(targetFriendId) }),
      });
      latestRev = Math.max(latestRev, updated.rev);
      successes += 1;
      for (const member of Object.values(updated.members)) {
        if (member.id === selfId) continue;
        const current = nextFriends[member.id];
        if (!current || member.updatedAt >= current.updatedAt) nextFriends[member.id] = member;
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
  }
  st.setWs({
    lastSync: successes ? Date.now() : st.ws.lastSync,
    error: firstError,
    syncing: false,
  });
}

/** Create a fresh one-to-one invite without replacing existing friends. */
export async function createWorkspace(): Promise<string> {
  const s = useStore.getState();
  const { code, doc } = await createApi(buildMemberSnapshot(null));
  const codes = [...new Set([...connectionCodes(s.ws), code])];
  s.setWs({ code, codes, lastSync: Date.now(), error: null });
  useStore.setState({ sharedRev: doc.rev, sharedDirty: false });
  return code;
}

/** Join another one-to-one invite without replacing existing connections. */
export async function joinWorkspace(rawCode: string): Promise<void> {
  const code = normalizeCode(rawCode);
  if (!code) throw new Error("bad-code");
  const s = useStore.getState();
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
  s.setWs({ code, codes: [...new Set([...connectionCodes(s.ws), code])], lastSync: Date.now(), error: null });
  useStore.setState({
    friends: { ...s.friends, ...incoming },
    friendCodes,
    sharedRev: doc.rev,
    sharedDirty: false,
  });
}

export function leaveWorkspace(): void {
  const s = useStore.getState();
  s.setWs({ code: null, codes: [], lastSync: null, error: null, syncing: false });
  useStore.setState({ friends: {}, friendCodes: {}, friendSharing: {}, sharedRev: 0, sharedDirty: false });
}

/** Human label for a sync error. */
export function isSetupError(err: string | null): boolean {
  return err === "sync-not-configured" || err === "storage-unavailable";
}
