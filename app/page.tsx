"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { openSession, todayLogs, useActiveProfile, useGame, useStore } from "@/lib/store";
import { makeSessionEntries } from "@/lib/store";
import { MEAL_ORDER, translate, type DictKey } from "@/lib/i18n";
import { addDays, fmtDateLong, todayStr } from "@/lib/dates";
import { fmtNum, mulMacros, sumMacros } from "@/lib/nutrition";
import { isDailyXpEligible, MIN_DAILY_ITEMS } from "@/lib/game";
import { GlassCard, MacroBar, Ring, Sheet, Stepper, EmptyState, toast, useCountUp } from "@/components/ui";
import DailyTargetsSheet from "@/components/DailyTargetsSheet";
import { AppIcon, FoodGlyph, MealGlyph } from "@/components/icons";
import type { LogEntry, MealSlot } from "@/lib/types";
import { connectAndSyncAppleHealth, hasAppleHealthBridge } from "@/lib/appleHealth";

export default function TodayPage() {
  const router = useRouter();
  const lang = useStore((s) => s.lang);
  const profile = useActiveProfile();
  const game = useGame();
  const store = useStore();
  const t = (k: DictKey) => translate(k, lang);

  const [date, setDate] = useState(todayStr());
  const isToday = date === todayStr();
  const entries = useMemo(() => todayLogs(store, date), [store, date]);
  const totals = useMemo(() => sumMacros(entries.map((e) => e.macros)), [entries]);
  const remaining = profile.goals.cal - totals.cal;
  const over = remaining < 0;
  const calShown = useCountUp(Math.abs(Math.round(remaining)));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("greetingMorning") : hour < 18 ? t("greetingAfternoon") : t("greetingEvening");

  const goalHit = isDailyXpEligible(entries.length, totals.cal, profile.goals.cal);

  const [editing, setEditing] = useState<LogEntry | null>(null);
  const [targetsSheet, setTargetsSheet] = useState(false);
  const [healthAvailable, setHealthAvailable] = useState(false);
  const [healthSyncing, setHealthSyncing] = useState(false);

  useEffect(() => setHealthAvailable(hasAppleHealthBridge()), []);

  const healthActivity = store.health?.[profile.id]?.[date];
  const syncAppleHealth = async () => {
    setHealthSyncing(true);
    try {
      const result = await connectAndSyncAppleHealth(date);
      if (result.status === "synced") {
        toast(
          result.xp > 0
            ? `${lang === "zh" ? "Apple 健康已同步" : "Apple Health synced"} · +${result.xp} XP`
            : lang === "zh" ? "Apple 健康已是最新狀態" : "Apple Health is up to date",
          "heart"
        );
      } else {
        toast(
          result.status === "denied"
            ? lang === "zh" ? "請允許讀取步數與站立時間" : "Allow steps and standing access to earn XP"
            : lang === "zh" ? "此裝置無法使用 Apple 健康" : "Apple Health is unavailable on this device",
          "warning"
        );
      }
    } finally {
      setHealthSyncing(false);
    }
  };

  /* ---- workout card data ---- */
  const plan = store.plans.find((p) => p.id === profile.planId);
  const open = openSession(store);
  const doneCount = (store.sessions[profile.id] ?? []).filter((x) => x.endedAt && x.planId === profile.planId).length;
  const weekIdx = plan ? Math.min(Math.floor(doneCount / (plan.weeks[0]?.days.length || 4)), plan.weeks.length - 1) : 0;
  const dayIdx = plan ? doneCount % (plan.weeks[weekIdx]?.days.length || 4) : 0;
  const nextDay = plan?.weeks[weekIdx]?.days[dayIdx];

  const startWorkout = () => {
    if (open) {
      router.push("/gym/session");
      return;
    }
    if (!plan || !nextDay) return;
    const id = store.startSession({
      date: todayStr(),
      planId: plan.id,
      weekIdx,
      dayIdx,
      dayName: nextDay.name,
      entries: makeSessionEntries(nextDay.exercises, store),
    });
    void id;
    router.push("/gym/session");
  };

  return (
    <main className="page stagger">
      {/* header */}
      <header className="flex items-center justify-between mb-3">
        <div>
          <div className="t-sub">{greeting}</div>
          <h1 className="t-hero">{profile.name}</h1>
        </div>
        {game.streak > 0 && (
          <div className="chip" style={{ cursor: "default" }}>
            <AppIcon name="fire" size={16} />
            <b className="tabular">{game.streak}</b>
            <span className="t-cap">{t("dayStreak")}</span>
          </div>
        )}
      </header>

      {/* date navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          className="ibtn press"
          style={{ width: 34, height: 34 }}
          onClick={() => setDate(addDays(date, -1))}
          aria-label={lang === "zh" ? "前一天" : "Previous day"}
        >
          <AppIcon name="back" size={18} />
        </button>
        <div className="flex items-center gap-2">
          <span className="font-bold" style={{ fontSize: 15, color: isToday ? undefined : "var(--canta-600)" }}>
            {isToday ? `${t("today")} · ${fmtDateLong(date, lang)}` : fmtDateLong(date, lang)}
          </span>
          {!isToday && (
            <button className="chip press chip-on" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => setDate(todayStr())}>
              {t("backToToday")}
            </button>
          )}
        </div>
        <button
          className="ibtn press"
          style={{ width: 34, height: 34, fontSize: 15, opacity: isToday ? 0.35 : 1 }}
          disabled={isToday}
          onClick={() => setDate(addDays(date, 1))}
          aria-label={lang === "zh" ? "後一天" : "Next day"}
        >
          <AppIcon name="next" size={18} />
        </button>
      </div>

      {/* hero ring */}
      <GlassCard className="p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="t-section icon-label"><AppIcon name="goal" size={17} /> {t("goals")}</div>
          <button
            type="button"
            className="chip press"
            style={{ fontSize: 12, padding: "5px 10px" }}
            onClick={() => setTargetsSheet(true)}
          >
            <span className="icon-label"><AppIcon name="edit" size={15} /> {t("edit")}</span>
          </button>
        </div>
        <div className="flex items-center gap-4">
          <Ring
            progress={profile.goals.cal > 0 ? totals.cal / profile.goals.cal : 0}
            over={over}
            center={
              <>
                <div className="t-num font-extrabold" style={{ fontSize: 34, lineHeight: 1 }}>
                  {fmtNum(calShown)}
                </div>
                <div className="t-cap font-semibold">
                  {t("cal")} {over ? t("over") : t("left")}
                </div>
              </>
            }
            sub={
              <div className="t-cap tabular" style={{ marginTop: 2 }}>
                {fmtNum(totals.cal)} {t("cal")} {t("eaten")}
              </div>
            }
          />
          <div className="flex flex-col gap-3 flex-1 min-w-0">
            <MacroBar label={t("protein")} value={totals.protein} goal={profile.goals.protein} color="var(--protein)" />
            <MacroBar label={t("carbs")} value={totals.carbs} goal={profile.goals.carbs} color="var(--carbs)" />
            <MacroBar label={t("fat")} value={totals.fat} goal={profile.goals.fat} color="var(--fat)" />
          </div>
        </div>
        <div
          className="mt-4 flex items-center gap-2 glass-sm"
          style={{
            padding: "10px 14px",
            borderRadius: 14,
            background: goalHit ? "var(--garden-hit)" : "var(--track)",
            border: "none",
            boxShadow: "none",
          }}
        >
          <AppIcon name={goalHit ? "checkCircle" : "leaf"} size={19} />
          <span className="t-sub" style={{ color: goalHit ? "var(--melon-600)" : undefined, fontWeight: goalHit ? 700 : 400 }}>
            {goalHit ? t("todayGoalHit") : t("todayGoalHint")}
          </span>
          <span className={`xp-item-count ${entries.length >= MIN_DAILY_ITEMS ? "done" : ""}`}>
            {Math.min(entries.length, MIN_DAILY_ITEMS)}/{MIN_DAILY_ITEMS}
          </span>
        </div>
        {(totals.fiber != null || totals.sugar != null || totals.sodiumMg != null) && (
          <div className="nutrition-details tabular mt-3">
            {totals.fiber != null && <span>{t("fiber")} {totals.fiber}g</span>}
            {totals.sugar != null && <span>{t("sugar")} {totals.sugar}g</span>}
            {totals.sodiumMg != null && <span>{t("sodium")} {totals.sodiumMg}mg</span>}
          </div>
        )}
      </GlassCard>

      {isToday && healthAvailable && (
        <GlassCard className="px-4 py-3 mb-4">
          <div className="health-card-row">
            <span className="icon-tile"><AppIcon name="heart" size={21} /></span>
            <div className="health-card-copy">
              <div className="t-section">Apple Health</div>
              <div className="t-cap tabular mt-1">
                {(healthActivity?.steps ?? 0).toLocaleString()} {lang === "zh" ? "步" : "steps"} · {healthActivity?.standMinutes ?? 0} {lang === "zh" ? "站立分鐘" : "standing min"}
              </div>
              <div className="t-cap mt-1">{lang === "zh" ? "每 3,000 步與每 30 分鐘站立可獲得經驗" : "Earn XP every 3,000 steps and 30 standing minutes"}</div>
            </div>
            <button className="chip press health-card-action" disabled={healthSyncing} onClick={() => void syncAppleHealth()}>
              {healthSyncing ? (lang === "zh" ? "同步中" : "Syncing") : healthActivity ? (lang === "zh" ? "同步" : "Sync") : (lang === "zh" ? "連接" : "Connect")}
            </button>
          </div>
        </GlassCard>
      )}

      {/* workout card */}
      {isToday && plan && nextDay && (
        <GlassCard className="p-4 mb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="t-section mb-1 icon-label"><AppIcon name="gym" size={17} /> {t("workoutToday")}</div>
              <div className="font-bold truncate" style={{ fontSize: 17 }}>
                {open ? open.dayName[lang] : nextDay.name[lang]}
              </div>
              <div className="t-cap">
                {t("week")} {(open ? open.weekIdx : weekIdx) + 1} · {(open ? open.entries.length : nextDay.exercises.length)}{" "}
                {lang === "zh" ? "個動作" : "exercises"}
              </div>
            </div>
            <button className="btn btn-canta press shrink-0" onClick={startWorkout}>
              {open ? t("continueWorkout") : t("startWorkout")}
            </button>
          </div>
        </GlassCard>
      )}

      {/* meals */}
      <section className="mb-4">
        {entries.length === 0 ? (
          <GlassCard className="mb-3">
            <EmptyState
              icon="cutlery"
              title={t("noMealsYet")}
              hint={t("noMealsHint")}
            />
          </GlassCard>
        ) : (
          MEAL_ORDER.map((slot) => {
            const list = entries.filter((e) => e.meal === slot);
            if (list.length === 0) return null;
            const sub = sumMacros(list.map((e) => e.macros));
            return (
              <GlassCard key={slot} className="px-4 py-2 mb-3">
                <div className="flex items-center justify-between pt-2">
                  <div className="t-section">
                    <span className="icon-label"><MealGlyph meal={slot} /> {t(slot as DictKey)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="t-cap tabular font-semibold">{fmtNum(sub.cal)} {t("cal")}</span>
                    <button
                      className="ibtn press"
                      style={{ width: 30, height: 30, fontSize: 15 }}
                      onClick={() => router.push(`/add?meal=${slot}&date=${date}`)}
                      aria-label={`${t("add")} · ${t(slot as DictKey)}`}
                    >
                      <AppIcon name="plus" size={17} />
                    </button>
                  </div>
                </div>
                {list.map((e) => (
                  <button key={e.id} type="button" className="row row-button press cursor-pointer" onClick={() => setEditing(e)}>
                    <FoodGlyph category="other" size={19} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate" style={{ fontSize: 15 }}>
                        {e.name[lang] || e.name.en}
                      </div>
                      <div className="t-cap tabular">
                        {e.grams ? `${fmtNum(e.grams)} g · ` : ""}
                        P {Math.round(e.macros.protein)} · C {Math.round(e.macros.carbs)} · F {Math.round(e.macros.fat)}
                      </div>
                    </div>
                    <div className="t-num font-bold shrink-0" style={{ fontSize: 16 }}>
                      {fmtNum(e.macros.cal)}
                    </div>
                  </button>
                ))}
              </GlassCard>
            );
          })
        )}
      </section>

      {/* edit entry sheet */}
      <EditEntrySheet entry={editing} onClose={() => setEditing(null)} />

      {/* daily targets sheet */}
      <DailyTargetsSheet open={targetsSheet} onClose={() => setTargetsSheet(false)} />
    </main>
  );
}

/* ------------------------------------------------ edit entry sheet */

function EditEntrySheet({ entry, onClose }: { entry: LogEntry | null; onClose: () => void }) {
  const lang = useStore((s) => s.lang);
  const updateLog = useStore((s) => s.updateLog);
  const removeLog = useStore((s) => s.removeLog);
  const t = (k: DictKey) => translate(k, lang);
  const [grams, setGrams] = useState(0);
  const [meal, setMeal] = useState<MealSlot>("lunch");
  const [key, setKey] = useState("");

  // sync when opening a new entry
  if (entry && key !== entry.id) {
    setKey(entry.id);
    setGrams(entry.grams ?? 0);
    setMeal(entry.meal);
  }

  if (!entry) return null;

  const scale = entry.grams && grams > 0 ? grams / entry.grams : 1;

  const save = () => {
    const m = entry.macros;
    updateLog(entry.id, {
      meal,
      grams: entry.grams ? grams : undefined,
      macros: mulMacros(m, scale),
    });
    toast(t("saved"), "checkCircle");
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={<span className="icon-label"><AppIcon name="cutlery" size={21} /> {entry.name[lang] || entry.name.en}</span>}>
      <div className="flex flex-col gap-4 pb-2">
        {entry.grams != null && (
          <div className="entry-amount-row">
            <span className="t-sub font-semibold">{t("amount")}</span>
            <Stepper value={grams} onChange={setGrams} step={5} bigStep={50} min={5} format={(v) => `${v} g`} />
          </div>
        )}
        <div>
          <div className="t-sub font-semibold mb-2">{t("logTo")}</div>
          <div className="seg meal-slot-tabs">
            {MEAL_ORDER.map((s) => (
              <button key={s} className={`seg-item ${meal === s ? "on" : ""}`} onClick={() => setMeal(s)}>
                <span className="icon-label"><MealGlyph meal={s} size={16} /> {translate(s as DictKey, lang)}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="t-cap tabular text-center">
          {fmtNum(entry.macros.cal * scale)} cal · P {Math.round(entry.macros.protein * scale)} · C{" "}
          {Math.round(entry.macros.carbs * scale)} · F {Math.round(entry.macros.fat * scale)}
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-ghost btn-danger press"
            onClick={() => {
              removeLog(entry.id);
              toast(t("deleted"), "trash");
              onClose();
            }}
          >
            {t("delete")}
          </button>
          <button className="btn btn-primary press flex-1" onClick={save}>
            {t("save")}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
