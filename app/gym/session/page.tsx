"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { makeSessionEntries, openSession, useActiveProfile, useStore } from "@/lib/store";
import { translate, type DictKey } from "@/lib/i18n";
import { fmtDate, fmtDuration } from "@/lib/dates";
import { est1RM, fmtNum } from "@/lib/nutrition";
import { completedSets, exerciseProgressSeries, lastCompletedSessionForDay } from "@/lib/workouts";
import { DecimalInput, fireConfetti, GlassCard, Sheet, toast } from "@/components/ui";
import { AppIcon } from "@/components/icons";
import { LineChart } from "@/components/charts";
import { ExercisePickerSheet } from "@/components/ExercisePickerSheet";
import type { SessionExercise, WorkoutSession } from "@/lib/types";
import { playSound } from "@/lib/soundscape";

export default function SessionPage() {
  const router = useRouter();
  const lang = useStore((s) => s.lang);
  const store = useStore();
  const profile = useActiveProfile();
  const t = (k: DictKey) => translate(k, lang);

  const session = openSession(store);
  const [rest, setRest] = useState<{ total: number; endsAt: number } | null>(null);
  const [summary, setSummary] = useState<{
    volume: number;
    prs: number;
    durationMs: number;
    xp: number;
    completedSets: number;
    completedExercises: number;
  } | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);

  const completedSessions = useMemo(
    () => (store.sessions[profile.id] ?? []).filter((item) => item.endedAt).sort((a, b) => a.startedAt - b.startedAt),
    [store.sessions, profile.id]
  );

  // previous bests per exercise key (for live PR detection)
  const prevBest = useMemo(() => {
    const map: Record<string, number> = {};
    if (!session) return map;
    for (const s of store.sessions[profile.id] ?? []) {
      if (!s.endedAt || s.id === session.id) continue;
      for (const e of s.entries) {
        for (const st of e.sets) {
          if (!st.done || st.w <= 0) continue;
          map[e.key] = Math.max(map[e.key] ?? 0, est1RM(st.w, st.reps));
        }
      }
    }
    return map;
  }, [store.sessions, profile.id, session]);

  const previousDaySession = useMemo(() => {
    if (!session) return undefined;
    return lastCompletedSessionForDay(
      store.sessions[profile.id] ?? [],
      session.planId,
      session.dayIdx,
      session.startedAt
    );
  }, [store.sessions, profile.id, session]);

  const prFiredRef = useRef<Set<string>>(new Set());

  if (!session && !summary) {
    return (
      <main className="page">
        <GlassCard className="p-6 text-center">
          <span className="empty-icon" style={{ marginInline: "auto" }}><AppIcon name="stretch" size={30} /></span>
          <div className="t-sub mt-2">{t("restDay")}</div>
          <button className="btn btn-primary press mt-4" onClick={() => router.push("/gym")}>
            {t("back")}
          </button>
        </GlassCard>
      </main>
    );
  }

  const doneSets = session?.entries.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0) ?? 0;
  const totalSets = session?.entries.reduce((n, e) => n + e.sets.length, 0) ?? 0;
  const allDone = doneSets === totalSets && totalSets > 0;

  const mutateSession = (fn: (s: WorkoutSession) => void) => {
    if (!session) return;
    store.updateSession(session.id, (s) => {
      fn(s);
      return s;
    });
  };

  const toggleSet = (ei: number, si: number) => {
    if (!session) return;
    const entry = session.entries[ei];
    const st = entry.sets[si];
    const nowDone = !st.done;
    mutateSession((s) => {
      s.entries[ei].sets[si].done = nowDone;
    });
    if (nowDone) {
      // rest timer
      const mins = entry.restMin ?? 1.5;
      setRest({ total: mins * 60, endsAt: Date.now() + mins * 60 * 1000 });
      // live PR check
      if (st.w > 0 && st.reps > 0) {
        const rm = est1RM(st.w, st.reps);
        const best = prevBest[entry.key] ?? 0;
        if (best > 0 && rm > best && !prFiredRef.current.has(entry.key)) {
          prFiredRef.current.add(entry.key);
          fireConfetti();
          toast(`${t("newPr")} ${entry.name[lang]} ${fmtNum(rm)} ${profile.unit}`, "medal");
        }
      }
    }
  };

  const finish = () => {
    if (!session) return;
    const res = store.finishSession(session.id);
    setRest(null);
    setSummary(res);
    playSound("success");
    if (res.prs > 0) fireConfetti();
  };

  return (
    <main className="page workout-session-page">
      {/* header */}
      <header className="flex items-center justify-between mb-3">
        <div>
          <div className="t-cap">{session ? `${t("week")} ${session.weekIdx + 1}` : ""}</div>
          <h1 className="t-title">{session?.dayName[lang]}</h1>
          {previousDaySession && (
            <div className="t-cap mt-1">
              {t("previousWorkout")}: {fmtDate(previousDaySession.date, lang)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ElapsedClock startedAt={session?.startedAt ?? Date.now()} />
          <button className="chip press" onClick={() => setConfirmDiscard(true)} aria-label={t("discardWorkout")}><AppIcon name="close" size={17} /></button>
        </div>
      </header>

      {/* progress */}
      <div
        className="mb-4"
        role="progressbar"
        aria-label={t("progress")}
        aria-valuemin={0}
        aria-valuemax={totalSets}
        aria-valuenow={doneSets}
        style={{ height: 8, borderRadius: 5, background: "var(--track)", overflow: "hidden" }}
      >
        <div
          style={{
            width: `${totalSets ? (doneSets / totalSets) * 100 : 0}%`,
            height: "100%",
            background: "linear-gradient(90deg,var(--cal-from),var(--cal-to))",
            borderRadius: 5,
            transition: "width 0.4s ease",
          }}
        />
      </div>

      {session?.entries.map((e, ei) => (
        <ExerciseCard
          key={ei}
          e={e}
          ei={ei}
          unit={profile.unit}
          onToggle={toggleSet}
          onMutate={mutateSession}
          prevBest={prevBest[e.key]}
          previous={previousDaySession?.entries.find((entry) => entry.key === e.key)}
          previousDate={previousDaySession?.date}
          progress={exerciseProgressSeries(completedSessions, e.key)}
        />
      ))}

      {session && (
        <button className="btn press w-full mb-3" onClick={() => setShowAddExercise(true)}>
          <AppIcon name="plus" />{t("addExercise")}
        </button>
      )}

      {allDone && (
        <div className="t-sub icon-label justify-center my-3 a-pop"><AppIcon name="spark" />{t("allDone")}</div>
      )}

      <button className="btn btn-primary press w-full mt-2" onClick={finish} disabled={doneSets === 0}>
        <AppIcon name="checkCircle" />{t("finishWorkout")} ({doneSets}/{totalSets})
      </button>

      {/* rest timer */}
      {rest && <RestTimer total={rest.total} endsAt={rest.endsAt} onDone={() => setRest(null)} onExtend={() => setRest((r) => (r ? { ...r, endsAt: r.endsAt + 15000 } : r))} />}

      {session && showAddExercise && (
        <ExercisePickerSheet
          plan={store.plans.find((plan) => plan.id === session.planId)}
          onClose={() => setShowAddExercise(false)}
          onAdd={(spec) => {
            const entry = makeSessionEntries([spec], useStore.getState(), {
              planId: session.planId,
              dayIdx: session.dayIdx,
            })[0];
            mutateSession((current) => {
              current.entries.push(entry);
            });
            setShowAddExercise(false);
            toast(t("saved"), "checkCircle");
          }}
        />
      )}

      {/* discard confirm */}
      <Sheet open={confirmDiscard} onClose={() => setConfirmDiscard(false)} title={t("discardWorkout")}>
        <div className="flex gap-2 pb-2">
          <button className="btn press flex-1" onClick={() => setConfirmDiscard(false)}>{t("cancel")}</button>
          <button
            className="btn btn-ghost btn-danger press flex-1"
            onClick={() => {
              if (session) store.discardSession(session.id);
              setConfirmDiscard(false);
              router.push("/gym");
            }}
          >
            {t("delete")}
          </button>
        </div>
      </Sheet>

      {/* summary sheet */}
      {summary && (
        <Sheet open onClose={() => router.push("/gym")} title={<span className="icon-label"><AppIcon name="spark" />{t("workoutDone")}</span>}>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="text-center">
              <div className="t-num font-extrabold" style={{ fontSize: 22 }}>{fmtDuration(summary.durationMs, lang)}</div>
              <div className="t-cap">{t("duration")}</div>
            </div>
            <div className="text-center">
              <div className="t-num font-extrabold" style={{ fontSize: 22 }}>{summary.completedExercises}</div>
              <div className="t-cap">{lang === "zh" ? "完成動作" : "Exercises finished"}</div>
            </div>
            <div className="text-center">
              <div className="t-num font-extrabold" style={{ fontSize: 22 }}>{summary.completedSets}</div>
              <div className="t-cap">{lang === "zh" ? "完成組數" : "Sets finished"}</div>
            </div>
            <div className="text-center">
              <div className="t-num font-extrabold icon-label justify-center" style={{ fontSize: 22 }}><AppIcon name="star" size={20} />+{summary.xp}</div>
              <div className="t-cap">XP</div>
            </div>
          </div>
          {summary.prs > 0 && <div className="chip chip-on icon-label justify-center mt-2"><AppIcon name="medal" size={18} /> {summary.prs} {t("prsToday")}</div>}
          <button className="btn btn-primary press w-full mt-3" onClick={() => router.push("/gym")}>
            {t("done")}
          </button>
        </Sheet>
      )}
    </main>
  );
}

/* -------------------------------- exercise card -------------------------------- */

function ExerciseCard({
  e,
  ei,
  unit,
  onToggle,
  onMutate,
  prevBest,
  previous,
  previousDate,
  progress,
}: {
  e: SessionExercise;
  ei: number;
  unit: string;
  onToggle: (ei: number, si: number) => void;
  onMutate: (fn: (s: WorkoutSession) => void) => void;
  prevBest?: number;
  previous?: SessionExercise;
  previousDate?: string;
  progress: ReturnType<typeof exerciseProgressSeries>;
}) {
  const lang = useStore((s) => s.lang);
  const t = (k: DictKey) => translate(k, lang);
  const [showCue, setShowCue] = useState(false);
  const complete = e.sets.every((x) => x.done);
  const actualSets = e.sets.filter((set) => set.done).length;
  const previousSets = previous ? completedSets(previous.sets) : [];

  return (
    <GlassCard className="px-4 py-3 mb-3" strong={!complete && e.sets.some((x) => x.done)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-bold icon-label" style={{ fontSize: 16, opacity: complete ? 0.55 : 1 }}>
            {complete && <AppIcon name="checkCircle" size={18} />}{e.name[lang]}
          </div>
          <div className="t-cap tabular">
            {t("targets")}: {e.targetWeight != null ? `${e.targetWeight} ${unit} · ` : ""}{e.targetSets} × {e.targetReps}
            {e.targetRpe ? ` @ RPE ${e.targetRpe}` : ""}
            {prevBest ? ` · ${t("est1rm")} ${fmtNum(prevBest)}` : ""}
          </div>
        </div>
        {e.cue && (
          <button
            className="ibtn press shrink-0"
            style={{ width: 30, height: 30, fontSize: 14 }}
            onClick={() => setShowCue(!showCue)}
            aria-label={`${showCue ? (lang === "zh" ? "隱藏" : "Hide") : (lang === "zh" ? "顯示" : "Show")} ${e.name[lang]} ${lang === "zh" ? "提示" : "cue"}`}
            aria-expanded={showCue}
          >
            <AppIcon name="idea" size={17} />
          </button>
        )}
      </div>
      {e.description?.[lang] && <div className="t-sub mt-2">{e.description[lang]}</div>}
      {showCue && e.cue && <div className="t-cap icon-label mt-1 a-fadeUp"><AppIcon name="idea" size={16} />{e.cue[lang]}</div>}

      <div className="exercise-session-progress mt-3">
        <div className="flex items-center justify-between gap-2">
          <div className="t-cap font-semibold">{t("progress")}</div>
          <div className="t-cap">
            {progress.metric === "est1rm" ? `${t("est1rm")} (${unit})` : t("bestReps")}
          </div>
        </div>
        {progress.points.length > 0 ? (
          <LineChart
            points={progress.points.slice(-8).map((point) => point.v)}
            labels={progress.points.slice(-8).map((point, index, items) =>
              index === 0 || index === items.length - 1 ? fmtDate(point.date, lang) : ""
            )}
            height={76}
            unit={progress.metric === "est1rm" ? unit : ""}
          />
        ) : (
          <div className="t-cap py-2">{lang === "zh" ? "完成此動作後，進度圖會顯示在這裡。" : "Your graph starts after you complete this exercise."}</div>
        )}
      </div>

      {previousSets.length > 0 && previousDate && (
        <div className="previous-sets mt-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="t-cap font-semibold">{t("previousSets")} · {fmtDate(previousDate, lang)}</div>
            <span className="t-cap tabular">{previousSets.length} {t("sets")}</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {previousSets.map((set, index) => (
              <span className="previous-set-chip tabular" key={index}>
                {set.w > 0 ? `${set.w}${unit} × ` : ""}{set.reps}{set.rpe ? ` @${set.rpe}` : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 mb-1">
        <div className="t-cap font-semibold">{t("actualSets")}</div>
        <div className="t-cap tabular"><b style={{ color: "var(--ink)" }}>{actualSets}</b> / {e.sets.length}</div>
      </div>

      <div>
        <div className="set-grid set-grid-head">
          <span>#</span>
          <span>{t("weight")} ({unit})</span>
          <span>{t("reps")}</span>
          <span>RPE</span>
          <span />
        </div>
        {e.sets.map((st, si) => (
          <div key={si} className={`set-grid set-grid-row ${st.done ? "done" : ""}`}>
            <span className="t-cap tabular text-center">{si + 1}</span>
            <NumInput
              value={st.w}
              ariaLabel={`${e.name[lang]} ${t("weight")} ${si + 1}`}
              onChange={(v) => onMutate((s) => { s.entries[ei].sets[si].w = v; })}
            />
            <NumInput
              value={st.reps}
              ariaLabel={`${e.name[lang]} ${t("reps")} ${si + 1}`}
              onChange={(v) => onMutate((s) => { s.entries[ei].sets[si].reps = v; })}
            />
            <NumInput
              value={st.rpe ?? 0}
              placeholder="—"
              ariaLabel={`${e.name[lang]} RPE ${si + 1}`}
              onChange={(v) => onMutate((s) => { s.entries[ei].sets[si].rpe = v || undefined; })}
            />
            <button
              className="press"
              onClick={() => onToggle(ei, si)}
              aria-label={
                lang === "zh"
                  ? `${st.done ? "取消完成" : "完成"}${e.name[lang]}第 ${si + 1} 組`
                  : `${st.done ? "Mark incomplete" : "Complete"} ${e.name[lang]} set ${si + 1}`
              }
              aria-pressed={st.done}
              style={{
                width: 34,
                height: 34,
                borderRadius: 12,
                border: st.done ? "none" : "2px solid var(--ink-3)",
                background: st.done ? "linear-gradient(160deg,var(--cal-from),var(--cal-to))" : "transparent",
                color: "#fff",
                fontSize: 16,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {st.done ? <AppIcon name="check" size={18} /> : ""}
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-2">
        <button
          className="chip press"
          onClick={() =>
            onMutate((s) => {
              const sets = s.entries[ei].sets;
              const last = sets[sets.length - 1];
              sets.push({ w: last?.w ?? 0, reps: last?.reps ?? 0, rpe: undefined, done: false });
            })
          }
        >
          <AppIcon name="plus" size={16} />{t("addSet")}
        </button>
        {e.sets.length > 1 && (
          <button
            className="chip press"
            onClick={() => onMutate((s) => { s.entries[ei].sets.pop(); })}
          >
            <AppIcon name="trash" size={15} />{t("removeSet")}
          </button>
        )}
      </div>
    </GlassCard>
  );
}

function NumInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  ariaLabel: string;
}) {
  return <DecimalInput
    className="field tabular set-input"
    value={value}
    min={0}
    onChange={onChange}
    placeholder={placeholder ?? "0"}
    ariaLabel={ariaLabel}
    selectOnFocus
  />;
}

/* -------------------------------- clocks -------------------------------- */

function ElapsedClock({ startedAt }: { startedAt: number }) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const s = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return (
    <span className="chip tabular" role="timer" aria-label={`Elapsed time ${mm} minutes ${ss} seconds`} style={{ cursor: "default" }}>
      <AppIcon name="timer" size={17} />{mm}:{ss}
    </span>
  );
}

function RestTimer({
  total,
  endsAt,
  onDone,
  onExtend,
}: {
  total: number;
  endsAt: number;
  onDone: () => void;
  onExtend: () => void;
}) {
  const lang = useStore((s) => s.lang);
  const [, force] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
    const id = setInterval(() => {
      force((x) => x + 1);
      if (Date.now() >= endsAt && !doneRef.current) {
        doneRef.current = true;
        playSound("timer");
        setTimeout(onDone, 1_200);
      }
    }, 250);
    return () => clearInterval(id);
  }, [endsAt, onDone]);

  const remain = Math.max(0, (endsAt - Date.now()) / 1000);
  const isDone = remain <= 0;
  const p = Math.min(1, Math.max(0, remain / total));
  const mm = Math.floor(remain / 60);
  const ss = String(Math.floor(remain % 60)).padStart(2, "0");

  return (
    <div className="resttimer glass-strong a-pop" role="status" aria-live="polite">
      <div style={{ position: "absolute", inset: 0, width: `${(1 - p) * 100}%`, background: "rgba(143,186,97,0.16)", transition: "width 0.25s linear" }} />
      <div className="flex items-center justify-between px-4 py-3" style={{ position: "relative" }}>
        <div className="flex items-center gap-2">
          <AppIcon name="stretch" size={22} />
          <span className="font-bold">{isDone ? (lang === "zh" ? "開始！" : "GO!") : translate("restTimer", lang)}</span>
          <span className="t-num font-extrabold tabular" style={{ fontSize: 22 }}>
            {isDone ? <AppIcon name="spark" size={24} /> : `${mm}:${ss}`}
          </span>
        </div>
        {!isDone && <div className="flex gap-2">
          <button className="chip press" onClick={onExtend}>+15s</button>
          <button className="chip press" onClick={onDone}>{translate("skipRest", lang)}</button>
        </div>}
      </div>
    </div>
  );
}
