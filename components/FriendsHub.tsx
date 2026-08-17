"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppIcon } from "@/components/icons";
import { FriendNotificationButton } from "@/components/FriendShareNotifications";
import ProfileAvatar from "@/components/ProfileAvatar";
import { GlassCard, Sheet, toast } from "@/components/ui";
import { fmtDate, todayStr } from "@/lib/dates";
import { translate, type DictKey } from "@/lib/i18n";
import { fmtNum, sumMacros } from "@/lib/nutrition";
import {
  createWorkspace,
  isSetupError,
  joinWorkspace,
  memberIdFor,
  syncNow,
} from "@/lib/sync";
import { useActiveProfile, useStore } from "@/lib/store";
import type { MemberSnapshot } from "@/lib/types";

export default function FriendsHub({ autoOpenShare = false }: { autoOpenShare?: boolean }) {
  const lang = useStore((state) => state.lang);
  const store = useStore();
  const profile = useActiveProfile();
  const [addOpen, setAddOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(autoOpenShare);
  const selfId = memberIdFor(profile.id, store.ws.deviceId);
  const friends = useMemo(
    () => Object.values(store.friends)
      .filter((member) => member.id !== selfId)
      .sort((left, right) => right.updatedAt - left.updatedAt),
    [selfId, store.friends]
  );

  useEffect(() => {
    if (autoOpenShare) setShareOpen(true);
  }, [autoOpenShare]);

  return (
    <main className="page friends-hub-page">
      <header className="friends-hub-header">
        <Link className="ibtn press" href="/me" aria-label={lang === "zh" ? "返回我的頁面" : "Back to Me"}>
          <AppIcon name="back" size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="t-hero icon-label"><AppIcon name="friends" size={27} /> {lang === "zh" ? "朋友" : "Friends"}</h1>
          <div className="t-cap">{friends.length} {lang === "zh" ? "位朋友" : friends.length === 1 ? "friend" : "friends"}</div>
        </div>
        <FriendNotificationButton />
      </header>

      <GlassCard strong className="friends-daily-share-card mb-4">
        <span className="icon-tile"><AppIcon name="goal" size={22} /></span>
        <div className="min-w-0 flex-1">
          <div className="font-bold">{lang === "zh" ? "分享今日進度" : "Share today’s progress"}</div>
          <div className="t-cap mt-1">{lang === "zh" ? "選擇朋友，傳送今天的營養、活動與連續紀錄摘要。" : "Send selected friends a snapshot of today’s nutrition, activity, and streak."}</div>
        </div>
        <button className="btn btn-primary press" onClick={() => setShareOpen(true)}>
          <AppIcon name="upload" size={17} /> {lang === "zh" ? "分享" : "Share"}
        </button>
      </GlassCard>

      <div className="flex items-end justify-between gap-3 mb-3">
        <div>
          <div className="t-section">{lang === "zh" ? "所有朋友" : "All friends"}</div>
          <div className="t-cap">{lang === "zh" ? "點選朋友查看完整詳情" : "Open a friend to see their full details"}</div>
        </div>
        <button className="chip chip-on press icon-label" onClick={() => setAddOpen(true)}>
          <AppIcon name="addUser" size={16} /> {lang === "zh" ? "新增" : "Add friend"}
        </button>
      </div>

      {friends.length ? (
        <div className="friends-hub-list">
          {friends.map((friend) => (
            <div className="friend-sharing-card" key={friend.id}>
              <FriendProgressCard friend={friend} />
              <FriendSharingControls friend={friend} />
            </div>
          ))}
        </div>
      ) : (
        <GlassCard className="p-6 text-center">
          <div className="empty-icon mx-auto"><AppIcon name="friends" size={34} /></div>
          <div className="font-bold mt-2">{lang === "zh" ? "還沒有朋友" : "No friends yet"}</div>
          <div className="t-sub mt-1">{lang === "zh" ? "建立永久朋友碼，或輸入朋友傳給你的朋友碼。" : "Create your permanent friend code, or enter one a friend sent you."}</div>
          <button className="btn btn-primary press mt-3" onClick={() => setAddOpen(true)}><AppIcon name="addUser" /> {lang === "zh" ? "新增朋友" : "Add friend"}</button>
        </GlassCard>
      )}

      {store.ws.error && (
        <div className="t-cap mt-2" style={{ color: "var(--danger)" }}>
          {isSetupError(store.ws.error) ? translate("syncSetupHint", lang) : translate("syncError", lang)}
        </div>
      )}

      <AddFriendSheet open={addOpen} onClose={() => setAddOpen(false)} />
      <DailyProgressShareSheet open={shareOpen} onClose={() => setShareOpen(false)} friends={friends} />
    </main>
  );
}

function AddFriendSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lang = useStore((state) => state.lang);
  const ws = useStore((state) => state.ws);
  const t = (key: DictKey) => translate(key, lang);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inviteCode = ws.personalCode;

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
      toast(lang === "zh" ? `永久朋友碼 ${nextCode} 已建立` : `Permanent friend code ${nextCode} created`, "fruit");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "sync-failed");
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
      onClose();
      toast(t("joined"), "friends");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "sync-failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={<span className="icon-label"><AppIcon name="addUser" size={21} /> {t("addFriend")}</span>}>
      <div className="flex flex-col gap-3 pb-2">
        <div className="t-sub">{lang === "zh" ? "這組六位數朋友碼永久屬於你，可以分享給多位朋友。每位朋友仍有獨立的分享設定。" : "Your six-digit friend code is permanent and reusable. Each friend still has separate sharing settings."}</div>
        {inviteCode ? (
          <div className="flex flex-col gap-2">
            <button className="btn press w-full" style={{ fontSize: 18, letterSpacing: 1.5 }} onClick={() => void copyCode()}>{inviteCode} · {t("copy")}</button>
            <div className="t-cap text-center">{lang === "zh" ? "這是你的永久朋友碼" : "This is your permanent friend code"}</div>
          </div>
        ) : (
          <button className="btn btn-primary press w-full" onClick={() => void create()} disabled={busy}>
            {busy ? t("syncNow") : lang === "zh" ? "建立朋友邀請碼" : "Create a friend invite"}
          </button>
        )}
        <div className="flex items-center gap-2"><div className="divider flex-1" /><span className="t-cap">{t("or")}</span><div className="divider flex-1" /></div>
        <input className="field tabular" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder={t("friendCodePlaceholder")} autoCapitalize="characters" inputMode="numeric" maxLength={32} />
        <button className="btn press w-full" onClick={() => void join()} disabled={busy || !code.trim()}>{lang === "zh" ? "加入朋友" : "Add friend with code"}</button>
      </div>
      {error && <div className="t-cap mt-2" style={{ color: "var(--danger)" }}>
        {isSetupError(error) ? t("syncSetupHint") : error === "bad-code" ? t("badCode") : error === "space-not-found" ? t("spaceNotFound") : error === "own-code" ? (lang === "zh" ? "這是你自己的朋友碼。" : "That is your own friend code.") : error === "friend-limit" ? (lang === "zh" ? "這組朋友碼目前無法再新增朋友。" : "This friend code cannot add more friends right now.") : error === "space-full" ? (lang === "zh" ? "這是舊版的一次性邀請碼，已經被使用。" : "This is a legacy one-time invite that has already been used.") : t("syncError")}
      </div>}
    </Sheet>
  );
}

export function DailyProgressShareSheet({ open, onClose, friends }: { open: boolean; onClose: () => void; friends: MemberSnapshot[] }) {
  const lang = useStore((state) => state.lang);
  const store = useStore();
  const profile = useActiveProfile();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const date = todayStr();
  const totals = useMemo(
    () => sumMacros((store.logs[profile.id] ?? []).filter((entry) => entry.date === date).map((entry) => entry.macros)),
    [date, profile.id, store.logs]
  );
  const health = store.health[profile.id]?.[date];
  const workouts = (store.sessions[profile.id] ?? []).filter((session) => session.date === date && session.endedAt).length + (health?.workouts?.length ?? 0);
  const water = store.water[profile.id]?.[date] ?? 0;

  useEffect(() => {
    if (!open) return;
    setSelected(friends.length === 1 ? new Set([friends[0].id]) : new Set());
  }, [friends, open]);

  const toggle = (friendId: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(friendId)) next.delete(friendId);
    else next.add(friendId);
    return next;
  });
  const share = async () => {
    selected.forEach((friendId) => store.shareDailyProgress(friendId));
    onClose();
    try {
      await syncNow();
      toast(lang === "zh" ? `已與 ${selected.size} 位朋友分享今日進度` : `Today’s progress shared with ${selected.size} ${selected.size === 1 ? "friend" : "friends"}`, "goal");
    } catch {
      toast(lang === "zh" ? "進度已儲存，稍後會再同步" : "Progress saved; sync will retry shortly", "warning");
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={<span className="icon-label"><AppIcon name="goal" size={20} />{lang === "zh" ? "分享今日進度" : "Share today’s progress"}</span>}>
      <div className="daily-progress-preview">
        <DailyStat icon="goal" label={lang === "zh" ? "熱量" : "Calories"} value={`${fmtNum(totals.cal)} / ${fmtNum(profile.goals.cal)}`} />
        <DailyStat icon="cutlery" label={lang === "zh" ? "蛋白質" : "Protein"} value={`${fmtNum(totals.protein)} / ${fmtNum(profile.goals.protein)}g`} />
        <DailyStat icon="water" label={lang === "zh" ? "飲水" : "Water"} value={`${water} / ${profile.waterGoal ?? 8}`} />
        <DailyStat icon="gym" label={lang === "zh" ? "訓練" : "Workouts"} value={String(workouts)} />
        <DailyStat icon="heart" label={lang === "zh" ? "步數" : "Steps"} value={fmtNum(health?.steps ?? 0)} />
        <DailyStat icon="fire" label={lang === "zh" ? "連續紀錄" : "Streak"} value={String(store.game[profile.id]?.streak ?? 0)} />
      </div>

      <div className="t-section mt-4 mb-2">{lang === "zh" ? "分享給" : "Share with"}</div>
      {friends.length ? <div className="daily-progress-friend-list">
        {friends.map((friend) => {
          const checked = selected.has(friend.id);
          const sharedToday = store.friendDailyProgress[friend.id]?.date === date;
          return <button type="button" className={`press ${checked ? "is-selected" : ""}`} key={friend.id} onClick={() => toggle(friend.id)} aria-pressed={checked}>
            <ProfileAvatar className="friend-avatar-small" name={friend.name} photoDataUrl={friend.photoDataUrl} iconSize={20} />
            <span className="min-w-0"><b>{friend.name}</b><small>{sharedToday ? (lang === "zh" ? "今天已分享，可再次更新" : "Shared today · send an update") : (lang === "zh" ? "尚未分享" : "Not shared today")}</small></span>
            <i className={`share-check ${checked ? "checked" : ""}`}>{checked && <AppIcon name="check" size={14} />}</i>
          </button>;
        })}
      </div> : <div className="t-sub text-center py-4">{lang === "zh" ? "新增朋友後即可分享每日進度。" : "Add a friend before sharing daily progress."}</div>}

      <button className="btn btn-primary press w-full mt-4" onClick={() => void share()} disabled={selected.size === 0}>
        <AppIcon name="upload" size={18} /> {lang === "zh" ? `分享給 ${selected.size} 位朋友` : `Share with ${selected.size || ""} ${selected.size === 1 ? "friend" : "friends"}`}
      </button>
      <div className="t-cap text-center mt-2">{lang === "zh" ? "只會傳送這次摘要，不會變更長期分享設定。" : "This sends one snapshot and does not change ongoing sharing settings."}</div>
    </Sheet>
  );
}

function DailyStat({ icon, label, value }: { icon: "goal" | "cutlery" | "water" | "gym" | "heart" | "fire"; label: string; value: string }) {
  return <div><AppIcon name={icon} size={17} /><span><small>{label}</small><b className="tabular">{value}</b></span></div>;
}

function FriendSharingControls({ friend }: { friend: MemberSnapshot }) {
  const lang = useStore((state) => state.lang);
  const profile = useActiveProfile();
  const recipes = useStore((state) => state.recipes);
  const plans = useStore((state) => state.plans);
  const settings = useStore((state) => state.friendSharing[friend.id]) ?? {
    shareNutrition: false, shareFoodLogs: false, shareWorkoutHistory: false, shareHealth: false,
    shareFarm: false, shareWeightTrend: false, shareMealPlan: false, shareWorkoutPlan: false, sharedRecipeIds: [],
  };
  const updateSharing = useStore((state) => state.updateFriendSharing);
  const toggleRecipe = useStore((state) => state.toggleFriendSharedRecipe);
  const [open, setOpen] = useState(false);
  const activePlan = plans.find((plan) => plan.id === profile.planId);
  const recipeChoices = recipes.filter((recipe) => recipe.custom || (profile.selectedRecipeIds ?? []).includes(recipe.id));
  const sharedCount = settings.sharedRecipeIds.length + Number(settings.shareNutrition) + Number(settings.shareFoodLogs) + Number(settings.shareWorkoutHistory) + Number(settings.shareHealth) + Number(settings.shareFarm) + Number(settings.shareWeightTrend) + Number(settings.shareWorkoutPlan) + Number(settings.shareMealPlan);
  const syncSharing = () => void syncNow().catch(() => toast(lang === "zh" ? "分享設定已儲存，稍後會再同步" : "Sharing saved; sync will retry shortly", "warning"));
  const options = [
    { key: "shareNutrition", icon: "goal", en: "Today’s nutrition progress", zh: "今日營養進度" },
    { key: "shareFoodLogs", icon: "cutlery", en: "Food diary and portions", zh: "飲食記錄與份量" },
    { key: "shareWorkoutHistory", icon: "chart", en: "Workout history and progress", zh: "訓練記錄與進度" },
    { key: "shareHealth", icon: "heart", en: "Apple Health activity", zh: "Apple 健康活動" },
    { key: "shareFarm", icon: "soil", en: "Farm and badges", zh: "農場與徽章" },
    { key: "shareWeightTrend", icon: "weight", en: "Weekly weight change (never actual weight)", zh: "每週體重增減（不含實際體重）" },
  ] as const;

  return <>
    <button type="button" className="friend-sharing-manage press" onClick={() => setOpen(true)}><AppIcon name="friends" size={15} />{lang === "zh" ? `管理分享${sharedCount ? ` · ${sharedCount}` : ""}` : `Manage sharing${sharedCount ? ` · ${sharedCount}` : ""}`}</button>
    <Sheet open={open} onClose={() => setOpen(false)} title={<span className="icon-label"><AppIcon name="friends" size={19} />{lang === "zh" ? `分享給 ${friend.name}` : `Share with ${friend.name}`}</span>}>
      <div className="friend-sharing-sheet">
        <p className="t-sub">{lang === "zh" ? "你的個人檔案、等級、XP 與連續紀錄會保持可見；其他內容只會在此處選擇後分享。" : "Your profile, level, XP, and streak stay visible. Everything else is shared only when selected here."}</p>
        <div className="t-section">{lang === "zh" ? "每日活動" : "Daily activity"}</div>
        {options.map((option) => {
          const enabled = settings[option.key];
          return <button type="button" className={`friend-sharing-toggle press ${enabled ? "is-on" : ""}`} key={option.key} onClick={() => { updateSharing(friend.id, { [option.key]: !enabled }); syncSharing(); }}>
            <span><AppIcon name={option.icon} size={18} /><b>{option[lang]}</b></span><i>{enabled ? (lang === "zh" ? "已分享" : "Shared") : (lang === "zh" ? "關閉" : "Off")}</i>
          </button>;
        })}
        <div className="t-section mt-2">{lang === "zh" ? "計畫與食譜" : "Plans and recipes"}</div>
        <button type="button" className={`friend-sharing-toggle press ${settings.shareMealPlan ? "is-on" : ""}`} onClick={() => { updateSharing(friend.id, { shareMealPlan: !settings.shareMealPlan }); syncSharing(); }}><span><AppIcon name="calendar" size={18} /><b>{lang === "zh" ? "未來 7 天餐點計畫" : "Next 7 days meal plan"}</b></span><i>{settings.shareMealPlan ? (lang === "zh" ? "已分享" : "Shared") : (lang === "zh" ? "關閉" : "Off")}</i></button>
        <button type="button" disabled={!activePlan} className={`friend-sharing-toggle press ${settings.shareWorkoutPlan ? "is-on" : ""}`} onClick={() => { if (!activePlan) return; updateSharing(friend.id, { shareWorkoutPlan: !settings.shareWorkoutPlan, workoutPlanId: activePlan.id }); syncSharing(); }}><span><AppIcon name="gym" size={18} /><b>{activePlan ? (activePlan.name[lang] || activePlan.name.en) : (lang === "zh" ? "尚未選擇訓練計畫" : "No workout plan selected")}</b></span><i>{settings.shareWorkoutPlan ? (lang === "zh" ? "已分享" : "Shared") : (lang === "zh" ? "關閉" : "Off")}</i></button>
        <div className="t-section mt-2">{lang === "zh" ? "選擇食譜" : "Choose recipes"}</div>
        {recipeChoices.length ? <div className="friend-sharing-recipes">{recipeChoices.map((recipe) => {
          const selected = settings.sharedRecipeIds.includes(recipe.id);
          return <button type="button" key={recipe.id} className={`press ${selected ? "is-on" : ""}`} onClick={() => { toggleRecipe(friend.id, recipe.id); syncSharing(); }}><AppIcon name={selected ? "checkCircle" : "kitchen"} size={16} /><span>{recipe.name[lang] || recipe.name.en}</span></button>;
        })}</div> : <div className="t-sub">{lang === "zh" ? "先在餐點頁儲存或建立食譜。" : "Save or create a recipe on the Meal page first."}</div>}
      </div>
    </Sheet>
  </>;
}

function FriendProgressCard({ friend }: { friend: MemberSnapshot }) {
  const lang = useStore((state) => state.lang);
  const t = (key: DictKey) => translate(key, lang);
  const calProgress = friend.today && friend.today.calGoal > 0 ? Math.min(1, friend.today.cal / friend.today.calGoal) : 0;
  const proteinProgress = friend.today && friend.today.proteinGoal > 0 ? Math.min(1, friend.today.protein / friend.today.proteinGoal) : 0;
  return <Link className="glass p-4 press friend-progress-card" href={`/friends/${encodeURIComponent(friend.id)}`}>
    <div className="flex items-center gap-3 mb-3">
      <ProfileAvatar className="profile-icon" name={friend.name} photoDataUrl={friend.photoDataUrl} iconSize={24} />
      <div className="flex-1 min-w-0"><div className="font-bold" style={{ fontSize: 16 }}>{friend.name}</div><div className="t-cap">{t("level")} {friend.level} · {friend.xp} {t("xp")}</div></div>
      <div className="flex items-center gap-2"><span className="chip icon-label" style={{ cursor: "default" }}><AppIcon name="fire" size={15} /> {friend.streak}</span><AppIcon name="next" size={17} /></div>
    </div>
    {friend.today && <div className="grid grid-cols-2 gap-3 mb-3"><FriendProgressBar label={t("calToday")} value={friend.today.cal} goal={friend.today.calGoal} progress={calProgress} color="linear-gradient(90deg,var(--cal-from),var(--cal-to))" /><FriendProgressBar label={t("protein")} value={friend.today.protein} goal={friend.today.proteinGoal} progress={proteinProgress} color="var(--protein)" /></div>}
    {friend.garden && <div className="flex items-center gap-1 mb-3" aria-label={t("friendGarden")}>{friend.garden.map((day) => <div key={day.date} title={day.date} style={{ width: 28, height: 28, borderRadius: 9, display: "grid", placeItems: "center", fontSize: 13, background: day.hit ? "var(--garden-hit)" : "var(--track)" }}>{day.hit ? <AppIcon name="leaf" size={14} /> : ""}</div>)}</div>}
    {friend.lastWorkout && <div className="t-cap icon-label"><AppIcon name="gym" size={15} /> {t("lastWorkoutLabel")}: {friend.lastWorkout.name[lang]} · {fmtDate(friend.lastWorkout.date, lang)}{friend.lastWorkout.prs > 0 ? <span className="icon-label">· <AppIcon name="medal" size={14} /> {friend.lastWorkout.prs}</span> : ""}</div>}
  </Link>;
}

function FriendProgressBar({ label, value, goal, progress, color }: { label: string; value: number; goal: number; progress: number; color: string }) {
  return <div><div className="flex items-center justify-between t-cap mb-1"><span>{label}</span><span className="tabular">{fmtNum(value)} / {fmtNum(goal)}</span></div><div style={{ height: 6, borderRadius: 99, overflow: "hidden", background: "var(--track)" }}><div style={{ width: `${progress * 100}%`, height: "100%", borderRadius: 99, background: color }} /></div></div>;
}
