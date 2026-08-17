"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { openSession, todayLogs, useActiveProfile, useGame, useStore } from "@/lib/store";
import { makeSessionEntries } from "@/lib/store";
import { MEAL_ORDER, translate, type DictKey } from "@/lib/i18n";
import { addDays, fmtDate, fmtDateLong, todayStr } from "@/lib/dates";
import { fmtNum, mulMacros, sumMacros } from "@/lib/nutrition";
import { healthWorkoutXp, isDailyXpEligible, MIN_DAILY_ITEMS } from "@/lib/game";
import { GlassCard, MacroBar, Ring, Sheet, Stepper, EmptyState, toast, useCountUp } from "@/components/ui";
import { LineChart } from "@/components/charts";
import DailyTargetsSheet from "@/components/DailyTargetsSheet";
import { AppIcon, FoodGlyph, MealGlyph } from "@/components/icons";
import type { LogEntry, MealSlot } from "@/lib/types";
import { connectAndSyncAppleHealth, hasAppleHealthBridge, isAppleHealthConnected } from "@/lib/appleHealth";
import { nutritionUnitLabel, nutritionUnitStep } from "@/lib/customRecipes";

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

  const goalHit = isDailyXpEligible(entries.length);

  const [editing, setEditing] = useState<LogEntry | null>(null);
  const [targetsSheet, setTargetsSheet] = useState(false);
  const [healthAvailable, setHealthAvailable] = useState(false);
  const [healthConnected, setHealthConnected] = useState(false);
  const [healthSyncing, setHealthSyncing] = useState(false);

  useEffect(() => {
    setHealthAvailable(hasAppleHealthBridge());
    setHealthConnected(isAppleHealthConnected());
  }, []);

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
      } else if (result.status === "error") {
        toast(
          lang === "zh" ? "無法讀取 Apple 健康，請再試一次" : "Couldn’t read Apple Health. Please try again.",
          "warning"
        );
      } else {
        toast(
          result.status === "denied"
            ? lang === "zh" ? "請允許讀取步數、站立時間與訓練" : "Allow steps, standing, and workouts to earn XP"
            : lang === "zh" ? "此裝置無法使用 Apple 健康" : "Apple Health is unavailable on this device",
          "warning"
        );
      }
    } catch {
      toast(
        lang === "zh" ? "Apple 健康同步失敗，請再試一次" : "Apple Health sync failed. Please try again.",
        "warning"
      );
    } finally {
      setHealthConnected(isAppleHealthConnected());
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

      <WeightTrendCard />

      {isToday && healthAvailable && (
        <GlassCard className="px-4 py-3 mb-4">
          <div className="health-card-row">
            <span className="icon-tile"><AppIcon name="heart" size={21} /></span>
            <div className="health-card-copy">
              <div className="t-section">Apple Health</div>
              <div className="t-cap tabular mt-1">
                {(healthActivity?.steps ?? 0).toLocaleString()} {lang === "zh" ? "步" : "steps"} · {healthActivity?.standMinutes ?? 0} {lang === "zh" ? "站立分鐘" : "standing min"}
              </div>
              <div className="t-cap mt-1">{lang === "zh" ? "步數、站立與已完成訓練都能獲得經驗" : "Earn XP from steps, standing, and completed workouts"}</div>
            </div>
            {!healthConnected && (
              <button className="chip press health-card-action" disabled={healthSyncing} onClick={() => void syncAppleHealth()}>
                {healthSyncing ? (lang === "zh" ? "連接中" : "Connecting") : (lang === "zh" ? "連接" : "Connect")}
              </button>
            )}
          </div>
          {(healthActivity?.workouts ?? []).length > 0 && (
            <div className="health-card-workouts mt-3">
              {(healthActivity?.workouts ?? []).map((workout) => (
                <div key={workout.id}>
                  <AppIcon name="gym" size={17} />
                  <span><b>{workout.activityType}</b><small>{Math.round(workout.durationMinutes)} min · {Math.round(workout.activeCalories)} cal</small></span>
                  <em className="health-workout-xp">+{workout.earnedXp ?? healthWorkoutXp(workout.durationMinutes)} XP</em>
                </div>
              ))}
            </div>
          )}
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
                        {e.amount != null && e.amountUnit
                          ? `${fmtNum(e.amount)} ${nutritionUnitLabel(e.amountUnit, e.amount, lang)} · `
                          : e.grams ? `${fmtNum(e.grams)} g · ` : ""}
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

/* ------------------------------------------------ weight trend */

function WeightTrendCard() {
  const lang = useStore((s) => s.lang);
  const profile = useActiveProfile();
  const rawWeights = useStore((s) => s.weights[profile.id]);
  const logWeight = useStore((s) => s.logWeight);
  const t = (k: DictKey) => translate(k, lang);
  const inputId = `weight-${profile.id}`;
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  const weights = useMemo(
    () => [...(rawWeights ?? [])].sort((a, b) => a.date.localeCompare(b.date)).slice(-30),
    [rawWeights]
  );
  const latest = weights.at(-1);
  const previous = weights.at(-2);
  const todayWeight = weights.find((entry) => entry.date === todayStr());
  const change = latest && previous ? latest.value - previous.value : null;
  const formatWeight = (weight: number) =>
    new Intl.NumberFormat(lang === "zh" ? "zh-TW" : "en-US", { maximumFractionDigits: 1 }).format(weight);

  const showForm = () => {
    setValue(String(todayWeight?.value ?? latest?.value ?? ""));
    setError(false);
    setOpen(true);
  };

  const save = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError(true);
      return;
    }
    const xp = logWeight(Math.round(parsed * 10) / 10);
    setOpen(false);
    toast(
      `${lang === "zh" ? "已記錄今天的體重" : "Today’s weight saved"}${xp > 0 ? ` · +${xp} XP` : ""}`,
      "checkCircle"
    );
  };

  return (
    <>
      <GlassCard className="p-4 mb-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="t-section icon-label">
            <AppIcon name="chart" size={17} /> {t("weightTrend")} ({profile.unit})
          </div>
          <button type="button" className="chip chip-on press icon-label" onClick={showForm}>
            <AppIcon name={todayWeight ? "edit" : "plus"} size={15} />
            {todayWeight ? (lang === "zh" ? "更新今天" : "Update today") : t("logWeight")}
          </button>
        </div>

        {latest ? (
          <>
            <div className="flex items-end gap-2 mb-1">
              <span className="t-num font-extrabold" style={{ fontSize: 28, lineHeight: 1 }}>
                {formatWeight(latest.value)}
              </span>
              <span className="t-sub font-semibold">{profile.unit}</span>
              {change != null && (
                <span className="t-cap tabular" style={{ marginLeft: "auto" }}>
                  {change > 0 ? "+" : ""}{formatWeight(Math.round(change * 10) / 10)} {profile.unit}
                  {lang === "zh" ? "（較上次）" : " since last log"}
                </span>
              )}
            </div>
            <LineChart
              points={weights.map((entry) => entry.value)}
              labels={weights.map((entry, index) =>
                index === 0 || index === weights.length - 1 ? fmtDate(entry.date, lang) : ""
              )}
              height={130}
              color="var(--canta-500)"
              unit={` ${profile.unit}`}
              showLastValue={false}
              accessibleLabel={`${t("weightTrend")}: ${weights.map((entry) => `${fmtDate(entry.date, lang)} ${entry.value} ${profile.unit}`).join(", ")}`}
            />
          </>
        ) : (
          <div className="target-section mt-3 text-center">
            <div className="empty-icon mx-auto"><AppIcon name="weight" size={28} /></div>
            <div className="font-bold mt-2">
              {lang === "zh" ? "從今天開始追蹤" : "Start your trend today"}
            </div>
            <div className="t-sub mt-1">
              {lang === "zh" ? "記錄今天的體重後，變化會顯示在這裡。" : "Log today’s weight and your progress will appear here."}
            </div>
          </div>
        )}
      </GlassCard>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={<span className="icon-label"><AppIcon name="weight" size={21} /> {t("logWeight")}</span>}
      >
        <form className="flex flex-col gap-4 pb-2" onSubmit={save}>
          <div>
            <label className="t-sub font-semibold mb-2 block" htmlFor={inputId}>
              {lang === "zh" ? "今天的體重" : "Today’s weight"}
            </label>
            <div className="field-with-unit">
              <input
                id={inputId}
                className="field tabular"
                type="number"
                inputMode="decimal"
                min="0.1"
                step="0.1"
                value={value}
                onChange={(event) => {
                  setValue(event.target.value);
                  setError(false);
                }}
                placeholder={latest ? String(latest.value) : "—"}
                aria-invalid={error}
                aria-describedby={error ? `${inputId}-error` : undefined}
              />
              <span>{profile.unit}</span>
            </div>
            {error && (
              <div id={`${inputId}-error`} className="target-error mt-2">
                {lang === "zh" ? "請輸入有效的體重。" : "Enter a valid weight."}
              </div>
            )}
          </div>
          <button className="btn btn-primary press w-full" type="submit">
            {todayWeight ? (lang === "zh" ? "更新體重" : "Update weight") : t("logWeight")}
          </button>
        </form>
      </Sheet>
    </>
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
    setGrams(entry.amount ?? entry.grams ?? 0);
    setMeal(entry.meal);
  }

  if (!entry) return null;

  const originalAmount = entry.amount ?? entry.grams;
  const scale = originalAmount && grams > 0 ? grams / originalAmount : 1;

  const save = () => {
    const m = entry.macros;
    updateLog(entry.id, {
      meal,
      grams: entry.amount == null && entry.grams ? grams : entry.grams,
      amount: entry.amount != null ? grams : undefined,
      macros: mulMacros(m, scale),
    });
    toast(t("saved"), "checkCircle");
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={<span className="icon-label"><AppIcon name="cutlery" size={21} /> {entry.name[lang] || entry.name.en}</span>}>
      <div className="flex flex-col gap-4 pb-2">
        {(entry.amount != null || entry.grams != null) && (
          <div className="entry-amount-row">
            <span className="t-sub font-semibold">{t("amount")}</span>
            <Stepper
              value={grams}
              onChange={setGrams}
              step={entry.amountUnit ? nutritionUnitStep(entry.amountUnit) : 5}
              bigStep={entry.amountUnit ? nutritionUnitStep(entry.amountUnit) * 5 : 50}
              min={entry.amountUnit ? nutritionUnitStep(entry.amountUnit) : 5}
              format={(v) => entry.amountUnit ? `${v} ${nutritionUnitLabel(entry.amountUnit, v, lang)}` : `${v} g`}
            />
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
