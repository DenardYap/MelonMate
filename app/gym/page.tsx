"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { lastSetsFor, makeSessionEntries, newId, openSession, useActiveProfile, useStore } from "@/lib/store";
import { translate, type DictKey } from "@/lib/i18n";
import { fmtDate, fmtDuration, todayStr } from "@/lib/dates";
import { exKey, fmtNum } from "@/lib/nutrition";
import { GROUP_LABEL, groupOf, type MuscleGroup } from "@/lib/plans";
import { EmptyState, GlassCard, Segmented, Sheet, toast } from "@/components/ui";
import { BarChart, LineChart } from "@/components/charts";
import { AppIcon } from "@/components/icons";
import { ExercisePickerSheet } from "@/components/ExercisePickerSheet";
import { exerciseProgressSeries } from "@/lib/workouts";
import { syncNow } from "@/lib/sync";
import type { ExerciseSpec, WorkoutPlan, WorkoutSession, WorkoutWeek } from "@/lib/types";
import { recommendWorkoutPlans } from "@/lib/onboarding";

type Tab = "train" | "plans" | "progress";

function optionalNumber(value: string, min = 0, max = Number.POSITIVE_INFINITY) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : undefined;
}

function displayPlanName(plan: WorkoutPlan, lang: "en" | "zh", profileName: string) {
  return plan.name[lang]
    .replace(`${profileName} · `, "")
    .replace(/\s*\d+\s*(weeks?|週)$/i, "")
    .replace(/\s*\d+[- ]day$/i, "")
    .trim();
}

function blankWeek(daysPerWeek: number): WorkoutWeek {
  return {
    days: Array.from({ length: daysPerWeek }, (_, index) => ({
      id: `day-${newId()}`,
      name: { en: `Day ${index + 1}`, zh: `第 ${index + 1} 天` },
      exercises: [],
    })),
  };
}

function cloneWeek(week: WorkoutWeek): WorkoutWeek {
  return {
    days: week.days.map((day) => ({
      ...structuredClone(day),
      id: `day-${newId()}`,
      exercises: day.exercises.map((exercise) => ({
        ...structuredClone(exercise),
        id: `x-${newId()}`,
      })),
    })),
  };
}

export default function GymPage() {
  const lang = useStore((s) => s.lang);
  const t = (k: DictKey) => translate(k, lang);
  const [tab, setTab] = useState<Tab>("train");

  return (
    <main className="page">
      <header className="flex items-center justify-between mb-4">
        <h1 className="t-hero icon-label"><AppIcon name="gym" size={29} />{t("gym")}</h1>
      </header>
      <Segmented<Tab>
        className="mb-4"
        value={tab}
        onChange={setTab}
        options={[
          { value: "train", label: t("train") },
          { value: "plans", label: t("plans") },
          { value: "progress", label: t("progress") },
        ]}
      />
      {tab === "train" && <TrainTab onChoosePlan={() => setTab("plans")} />}
      {tab === "plans" && <PlansTab />}
      {tab === "progress" && <ProgressTab />}
    </main>
  );
}

/* ================================ TRAIN ================================ */

function TrainTab({ onChoosePlan }: { onChoosePlan: () => void }) {
  const router = useRouter();
  const lang = useStore((s) => s.lang);
  const store = useStore();
  const profile = useActiveProfile();
  const t = (k: DictKey) => translate(k, lang);

  const plan = store.plans.find((p) => p.id === profile.planId);
  const open = openSession(store);
  const sessions = (store.sessions[profile.id] ?? []).filter((x) => x.endedAt).sort((a, b) => b.startedAt - a.startedAt);
  const doneCount = sessions.filter((x) => x.planId === profile.planId).length;
  const daysPerWeek = plan?.weeks[0]?.days.length || 4;
  const weekIdx = plan ? Math.min(Math.floor(doneCount / daysPerWeek), plan.weeks.length - 1) : 0;
  const dayIdx = plan ? doneCount % daysPerWeek : 0;
  const nextDay = plan?.weeks[weekIdx]?.days[dayIdx];
  const activeExercises = open ? open.entries : nextDay?.exercises ?? [];
  const planLabel = plan ? displayPlanName(plan, lang, profile.name) : "";
  const totalSets = activeExercises.reduce(
    (total, exercise) => total + ("targetSets" in exercise ? exercise.targetSets : (exercise as ExerciseSpec).sets),
    0
  );

  const start = () => {
    if (open) return router.push("/gym/session");
    if (!plan || !nextDay) return;
    store.startSession({
      date: todayStr(),
      planId: plan.id,
      weekIdx,
      dayIdx,
      dayName: nextDay.name,
      entries: makeSessionEntries(nextDay.exercises, store, { planId: plan.id, dayIdx }),
    });
    router.push("/gym/session");
  };

  return (
    <div className="a-fadeUp stagger">
      {plan && nextDay ? (
        <GlassCard strong className="p-5 mb-4">
          <div className="t-section mb-1">
            {planLabel} · {t("week")} {weekIdx + 1}/{plan.weeks.length}
          </div>
          <div className="t-title mb-1">{open ? open.dayName[lang] : nextDay.name[lang]}</div>
          <div className="t-sub mb-3">
            {activeExercises.length} {lang === "zh" ? "個動作" : "exercises"} · {totalSets} {t("sets")} · {daysPerWeek} {lang === "zh" ? "天／週" : "days/week"}
          </div>
          <div className="flex flex-wrap gap-1 mb-4">
            {activeExercises.slice(0, 4).map((exercise, index) => (
              <span key={index} className="chip" style={{ fontSize: 12.5, padding: "4px 10px" }}>
                {exercise.name[lang]}
              </span>
            ))}
            {activeExercises.length > 4 && <span className="t-cap self-center">+{activeExercises.length - 4} {lang === "zh" ? "個" : "more"}</span>}
          </div>
          <button className="btn btn-primary press w-full" onClick={start}>
            <AppIcon name="play" />{open ? t("continueWorkout") : t("startWorkout")}
          </button>
        </GlassCard>
      ) : (
        <GlassCard className="mb-4">
          <EmptyState
            icon="gym"
            title={lang === "zh" ? "尚未選擇訓練計畫" : "No workout plan selected"}
            hint={lang === "zh" ? "訓練內容只會在你親自選擇計畫後出現。" : "Workouts appear here only after you explicitly choose a plan."}
            action={<button className="btn btn-primary press" onClick={onChoosePlan}><AppIcon name="spark" size={17} />{lang === "zh" ? "選擇計畫" : "Choose a plan"}</button>}
          />
        </GlassCard>
      )}

      {/* week overview */}
      {plan && (
        <GlassCard className="p-4 mb-4">
          <div className="t-section mb-2">{t("week")} {weekIdx + 1}</div>
          <div className="flex flex-col gap-2">
            {plan.weeks[weekIdx].days.map((d, i) => {
              const done = i < dayIdx || (weekIdx * daysPerWeek + i) < doneCount;
              const isNext = i === dayIdx && !done;
              return (
                <div key={d.id} className="flex items-center gap-3">
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 99,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 700,
                      color: done || isNext ? "#fff" : "var(--ink-3)",
                      background: done
                        ? "linear-gradient(160deg,var(--cal-from),var(--cal-to))"
                        : isNext
                        ? "linear-gradient(160deg,#f8cf95,#e79a4e)"
                        : "var(--track)",
                    }}
                  >
                    {done ? <AppIcon name="check" size={15} /> : i + 1}
                  </span>
                  <span className={done ? "t-sub" : "font-semibold"} style={{ fontSize: 15 }}>
                    {d.name[lang]}
                  </span>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* history */}
      <div className="t-section mb-2">{t("sessionHistory")}</div>
      {sessions.length === 0 ? (
        <GlassCard>
          <EmptyState icon="leaf" title={t("noSessions")} />
        </GlassCard>
      ) : (
        <GlassCard className="px-4 py-1 mb-4">
          {sessions.slice(0, 14).map((s) => {
            const vol = s.entries.reduce((n, e) => n + e.sets.filter((x) => x.done).reduce((m, x) => m + x.w * x.reps, 0), 0);
            return (
              <div key={s.id} className="row">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold" style={{ fontSize: 15 }}>{s.dayName[lang]}</div>
                  <div className="t-cap">
                    {fmtDate(s.date, lang)} · {s.endedAt ? fmtDuration(s.endedAt - s.startedAt, lang) : ""}
                  </div>
                </div>
                {s.prs > 0 && <span className="chip chip-canta-on icon-label" style={{ fontSize: 12 }}><AppIcon name="medal" size={15} />{s.prs}</span>}
                <div className="t-num t-sub tabular">{fmtNum(vol)} {profile.unit}</div>
              </div>
            );
          })}
        </GlassCard>
      )}
    </div>
  );
}

/* ================================ PLANS ================================ */

function PlansTab() {
  const lang = useStore((s) => s.lang);
  const store = useStore();
  const profile = useActiveProfile();
  const t = (k: DictKey) => translate(k, lang);
  const [openPlanId, setOpenPlanId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const plan = store.plans.find((p) => p.id === openPlanId);
  const recommendedIds = new Set(recommendWorkoutPlans(profile, store.plans, 3).map((item) => item.id));
  const orderedPlans = [...store.plans].sort((a, b) => Number(recommendedIds.has(b.id)) - Number(recommendedIds.has(a.id)));

  if (plan) return <PlanEditor plan={plan} onBack={() => setOpenPlanId(null)} />;

  return (
    <div className="a-fadeUp flex flex-col gap-3">
      <div className="plan-list-head">
        <div>
          <div className="t-section">{lang === "zh" ? "我的訓練計畫" : "My workout plans"}</div>
          <div className="t-cap">{store.plans.length} {lang === "zh" ? "個計畫" : store.plans.length === 1 ? "plan" : "plans"}</div>
        </div>
        <button className="btn btn-primary press plan-new-btn" onClick={() => setCreating(true)}>
          <AppIcon name="plus" size={17} />{lang === "zh" ? "新增計畫" : "New plan"}
        </button>
      </div>
      {orderedPlans.length === 0 && (
        <GlassCard>
          <EmptyState
            icon="gym"
            title={lang === "zh" ? "建立你的第一個計畫" : "Build your first plan"}
            hint={lang === "zh" ? "設定週數，再依照自己的方式加入訓練動作。" : "Choose a duration, then add exercises week by week."}
          />
        </GlassCard>
      )}
      {orderedPlans.map((p) => {
        const planName = displayPlanName(p, lang, profile.name);
        return (
        <GlassCard key={p.id} className="p-4" strong={p.id === profile.planId}>
          <div className="plan-card-row">
            <button className="plan-card-open press" onClick={() => setOpenPlanId(p.id)}>
              <span className="plan-card-title">{planName}</span>
              <span className="t-cap">
                {p.weeks.length} {lang === "zh" ? "週" : "weeks"} · {p.weeks[0]?.days.length ?? 0} {lang === "zh" ? "天／週" : "days/week"}
              </span>
            </button>
            <div className="plan-card-actions">
              {recommendedIds.has(p.id) && <span className="chip chip-canta-on plan-card-recommended">{lang === "zh" ? "推薦" : "Recommended"}</span>}
              {p.id === profile.planId ? (
                <span className="chip chip-on plan-card-selected" aria-label={lang === "zh" ? "已選擇" : "Selected"}><AppIcon name="check" size={15} /></span>
              ) : (
                <button
                  className="chip press"
                  onClick={() => {
                    store.updateProfile(profile.id, { planId: p.id });
                    toast(t("saved"), "checkCircle");
                  }}
                >
                  {t("usePlan")}
                </button>
              )}
            </div>
          </div>
        </GlassCard>
        );
      })}
      {creating && (
        <PlanCreateSheet
          onClose={() => setCreating(false)}
          onCreated={(planId) => {
            setCreating(false);
            setOpenPlanId(planId);
          }}
        />
      )}
    </div>
  );
}

function PlanCreateSheet({ onClose, onCreated }: { onClose: () => void; onCreated: (planId: string) => void }) {
  const lang = useStore((state) => state.lang);
  const addPlan = useStore((state) => state.addPlan);
  const [name, setName] = useState(lang === "zh" ? "我的訓練計畫" : "My workout plan");
  const [weeks, setWeeks] = useState("4");
  const [daysPerWeek, setDaysPerWeek] = useState("4");

  const createPlan = () => {
    const finalName = name.trim();
    if (!finalName) return;
    const weekCount = Math.max(1, Math.min(52, Number(weeks) || 4));
    const dayCount = Math.max(1, Math.min(7, Number(daysPerWeek) || 4));
    const firstWeek = blankWeek(dayCount);
    const plan: WorkoutPlan = {
      id: `plan-${newId()}`,
      name: { en: finalName, zh: finalName },
      weeks: Array.from({ length: weekCount }, (_, index) => index === 0 ? firstWeek : cloneWeek(firstWeek)),
      daysPerWeek: dayCount,
    };
    addPlan(plan);
    toast(lang === "zh" ? "計畫已建立" : "Plan created", "checkCircle");
    onCreated(plan.id);
  };

  return (
    <Sheet open onClose={onClose} title={<span className="icon-label"><AppIcon name="plus" />{lang === "zh" ? "新增訓練計畫" : "New workout plan"}</span>}>
      <div className="flex flex-col gap-3 pb-2">
        <label>
          <span className="t-cap mb-1 block">{lang === "zh" ? "計畫名稱" : "Plan name"}</span>
          <input className="field" value={name} onChange={(event) => setName(event.target.value)} autoFocus />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="t-cap mb-1 block">{lang === "zh" ? "週數" : "Number of weeks"}</span>
            <input className="field" type="number" inputMode="numeric" min={1} max={52} value={weeks} onChange={(event) => setWeeks(event.target.value)} />
          </label>
          <label>
            <span className="t-cap mb-1 block">{lang === "zh" ? "每週天數" : "Days per week"}</span>
            <input className="field" type="number" inputMode="numeric" min={1} max={7} value={daysPerWeek} onChange={(event) => setDaysPerWeek(event.target.value)} />
          </label>
        </div>
        <div className="preset-banner t-sub">
          {lang === "zh" ? "每一週都可以獨立修改，也可以隨時從其他週複製內容。" : "Every week stays editable, and you can copy any previous week whenever you need it."}
        </div>
        <button className="btn btn-primary press w-full" disabled={!name.trim()} onClick={createPlan}>
          <AppIcon name="check" />{lang === "zh" ? "建立計畫" : "Create plan"}
        </button>
      </div>
    </Sheet>
  );
}

function PlanEditor({ plan, onBack }: { plan: WorkoutPlan; onBack: () => void }) {
  const lang = useStore((s) => s.lang);
  const store = useStore();
  const profile = useActiveProfile();
  const t = (k: DictKey) => translate(k, lang);
  const [weekIdx, setWeekIdx] = useState(0);
  const [editEx, setEditEx] = useState<{ dayIdx: number; exIdx: number } | null>(null);
  const [addTo, setAddTo] = useState<number | null>(null);
  const [editDay, setEditDay] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const activeWeekIdx = Math.min(weekIdx, Math.max(0, plan.weeks.length - 1));
  const week = plan.weeks[activeWeekIdx];

  const mutate = (fn: (p: WorkoutPlan) => void) =>
    store.updatePlan(plan.id, (p) => {
      fn(p);
      return p;
    });

  const copyWeekFrom = (sourceIdx: number) => {
    mutate((p) => {
      p.weeks[activeWeekIdx] = cloneWeek(p.weeks[sourceIdx]);
    });
    setCopyOpen(false);
    toast(t("weekCopied"), "copy");
  };

  if (!week) return null;

  return (
    <div className="a-fadeUp">
      <div className="plan-editor-nav mb-3">
        <button className="chip press icon-label" onClick={onBack}><AppIcon name="back" size={16} /> {t("back")}</button>
        <div className="flex gap-2">
          <button className="ibtn press plan-editor-icon" onClick={() => setShareOpen(true)} aria-label={lang === "zh" ? "分享計畫" : "Share plan"}>
            <AppIcon name="upload" size={17} />
          </button>
          <button className="ibtn press plan-editor-icon" onClick={() => setSettingsOpen(true)} aria-label={lang === "zh" ? "計畫設定" : "Plan settings"}>
            <AppIcon name="edit" size={17} />
          </button>
        </div>
      </div>
      <div className="plan-editor-title-row mb-3">
        <div className="min-w-0">
          <div className="t-title">{displayPlanName(plan, lang, profile.name)}</div>
          <div className="t-cap mt-1">
            {plan.weeks.length} {lang === "zh" ? "週" : plan.weeks.length === 1 ? "week" : "weeks"}
            {plan.note?.[lang] ? ` · ${plan.note[lang]}` : ""}
          </div>
        </div>
        {plan.id === profile.planId && <span className="chip chip-on"><AppIcon name="check" size={14} />{lang === "zh" ? "使用中" : "Active"}</span>}
      </div>

      <div className="flex gap-2 mb-2 overflow-x-auto hide-scroll pb-1">
        {plan.weeks.map((_, i) => (
          <button key={i} className={`chip press ${i === weekIdx ? "chip-on" : ""}`} onClick={() => setWeekIdx(i)}>
            W{i + 1}
          </button>
        ))}
      </div>

      <div className="week-builder-head mb-3">
        <div>
          <div className="font-bold">{lang === "zh" ? `第 ${activeWeekIdx + 1} 週` : `Week ${activeWeekIdx + 1}`}</div>
          <div className="t-cap">{week.days.length} {lang === "zh" ? "個訓練日" : week.days.length === 1 ? "training day" : "training days"}</div>
        </div>
        <button className="chip press icon-label" disabled={plan.weeks.length < 2} onClick={() => setCopyOpen(true)}>
          <AppIcon name="copy" size={15} />{lang === "zh" ? "從其他週複製" : "Copy from…"}
        </button>
      </div>

      {week.days.map((d, di) => (
        <GlassCard key={`${d.id}-${di}`} className="px-4 py-3 mb-3">
          <div className="workout-day-head mb-1">
            <button className="workout-day-title press" onClick={() => setEditDay(di)}>
              <span className="workout-day-number">{di + 1}</span>
              <span>
                <b>{d.name[lang]}</b>
                <small>{d.exercises.length} {lang === "zh" ? "個動作" : d.exercises.length === 1 ? "exercise" : "exercises"}</small>
              </span>
              <AppIcon name="edit" size={15} />
            </button>
            <button className="ibtn press plan-editor-icon" onClick={() => setAddTo(di)} aria-label={`${t("addExercise")} · ${d.name[lang]}`}>
              <AppIcon name="plus" size={17} />
            </button>
          </div>
          {d.exercises.map((e, ei) => (
            <button key={e.id} type="button" className="row row-button press cursor-pointer" onClick={() => setEditEx({ dayIdx: di, exIdx: ei })}>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate" style={{ fontSize: 15 }}>{e.name[lang]}</div>
                <div className="t-cap tabular">
                  {(e.targetWeight ?? e.seedWeight) != null ? `${e.targetWeight ?? e.seedWeight} ${profile.unit} · ` : ""}
                  {e.sets} × {e.reps}
                  {e.rpe ? ` @ RPE ${e.rpe}` : ""}
                  {e.restMin ? ` · ${t("rest")} ${e.restMin}'` : ""}
                </div>
                {e.description?.[lang] && <div className="t-cap truncate mt-0.5">{e.description[lang]}</div>}
              </div>
              <AppIcon name="next" size={16} />
            </button>
          ))}
          {d.exercises.length === 0 && (
            <button className="empty-exercise-row press" onClick={() => setAddTo(di)}>
              <AppIcon name="plus" size={16} />{lang === "zh" ? "加入第一個動作" : "Add the first exercise"}
            </button>
          )}
        </GlassCard>
      ))}

      <button
        className="btn press w-full mb-6"
        onClick={() => mutate((p) => {
          p.weeks[activeWeekIdx].days.push({
            id: `day-${newId()}`,
            name: { en: `Day ${p.weeks[activeWeekIdx].days.length + 1}`, zh: `第 ${p.weeks[activeWeekIdx].days.length + 1} 天` },
            exercises: [],
          });
        })}
      >
        <AppIcon name="plus" />{lang === "zh" ? "新增訓練日" : "Add training day"}
      </button>

      {/* edit exercise sheet */}
      {editEx && (
        <ExerciseEditSheet
          plan={plan}
          weekIdx={activeWeekIdx}
          dayIdx={editEx.dayIdx}
          exIdx={editEx.exIdx}
          onClose={() => setEditEx(null)}
        />
      )}

      {/* add exercise sheet */}
      {addTo != null && (
        <AddExerciseSheet
          plan={plan}
          onClose={() => setAddTo(null)}
          onAdd={(spec) => {
            mutate((p) => {
              p.weeks[activeWeekIdx].days[addTo].exercises.push(spec);
            });
            setAddTo(null);
            toast(t("saved"), "checkCircle");
          }}
        />
      )}

      {editDay != null && (
        <DayEditSheet
          plan={plan}
          weekIdx={activeWeekIdx}
          dayIdx={editDay}
          onClose={() => setEditDay(null)}
        />
      )}

      {copyOpen && (
        <CopyWeekSheet
          plan={plan}
          targetWeekIdx={activeWeekIdx}
          onClose={() => setCopyOpen(false)}
          onCopy={copyWeekFrom}
        />
      )}

      {settingsOpen && (
        <PlanSettingsSheet
          plan={plan}
          onClose={() => setSettingsOpen(false)}
          onWeekCountChange={(count) => setWeekIdx((current) => Math.min(current, count - 1))}
          onDelete={() => {
            setSettingsOpen(false);
            setDeleteOpen(true);
          }}
        />
      )}

      {shareOpen && <SharePlanSheet plan={plan} onClose={() => setShareOpen(false)} />}

      {deleteOpen && (
        <Sheet open onClose={() => setDeleteOpen(false)} title={<span className="icon-label"><AppIcon name="warning" />{lang === "zh" ? "刪除訓練計畫？" : "Delete workout plan?"}</span>}>
          <div className="t-sub mb-4">
            {lang === "zh" ? `「${displayPlanName(plan, lang, profile.name)}」會被刪除。過去的訓練紀錄仍會保留。` : `“${displayPlanName(plan, lang, profile.name)}” will be deleted. Your completed workout history will stay intact.`}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn press" onClick={() => setDeleteOpen(false)}>{lang === "zh" ? "取消" : "Cancel"}</button>
            <button className="btn btn-ghost btn-danger press" onClick={() => {
              store.deletePlan(plan.id);
              toast(t("deleted"), "trash");
              onBack();
            }}><AppIcon name="trash" />{t("delete")}</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function PlanSettingsSheet({
  plan,
  onClose,
  onWeekCountChange,
  onDelete,
}: {
  plan: WorkoutPlan;
  onClose: () => void;
  onWeekCountChange: (count: number) => void;
  onDelete: () => void;
}) {
  const lang = useStore((state) => state.lang);
  const updatePlan = useStore((state) => state.updatePlan);
  const [name, setName] = useState(plan.name[lang]);
  const [note, setNote] = useState(plan.note?.[lang] ?? "");
  const [weeks, setWeeks] = useState(String(plan.weeks.length));

  const save = () => {
    const finalName = name.trim();
    if (!finalName) return;
    const weekCount = Math.max(1, Math.min(52, Number(weeks) || plan.weeks.length));
    updatePlan(plan.id, (next) => {
      const namesMatched = next.name.en === next.name.zh;
      next.name = namesMatched ? { en: finalName, zh: finalName } : { ...next.name, [lang]: finalName };
      const finalNote = note.trim();
      if (finalNote) {
        const notesMatched = !next.note || next.note.en === next.note.zh;
        next.note = notesMatched
          ? { en: finalNote, zh: finalNote }
          : { ...(next.note ?? { en: "", zh: "" }), [lang]: finalNote };
      } else {
        next.note = undefined;
      }
      if (weekCount < next.weeks.length) next.weeks = next.weeks.slice(0, weekCount);
      while (next.weeks.length < weekCount) {
        next.weeks.push(cloneWeek(next.weeks[next.weeks.length - 1] ?? blankWeek(next.daysPerWeek ?? 4)));
      }
      return next;
    });
    onWeekCountChange(weekCount);
    toast(lang === "zh" ? "計畫已更新" : "Plan updated", "checkCircle");
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={<span className="icon-label"><AppIcon name="edit" />{lang === "zh" ? "計畫設定" : "Plan settings"}</span>}>
      <div className="flex flex-col gap-3 pb-2">
        <label>
          <span className="t-cap mb-1 block">{lang === "zh" ? "計畫名稱" : "Plan name"}</span>
          <input className="field" value={name} onChange={(event) => setName(event.target.value)} autoFocus />
        </label>
        <label>
          <span className="t-cap mb-1 block">{lang === "zh" ? "備註" : "Note"} · {lang === "zh" ? "選填" : "optional"}</span>
          <input className="field" value={note} onChange={(event) => setNote(event.target.value)} placeholder={lang === "zh" ? "例如：增肌階段" : "e.g. Hypertrophy block"} />
        </label>
        <label>
          <span className="t-cap mb-1 block">{lang === "zh" ? "計畫週數" : "Plan duration (weeks)"}</span>
          <input className="field" type="number" inputMode="numeric" min={1} max={52} value={weeks} onChange={(event) => setWeeks(event.target.value)} />
          <span className="t-cap mt-1 block">{lang === "zh" ? "增加週數時會複製最後一週，之後仍可個別修改。" : "Added weeks start as copies of the last week and remain fully editable."}</span>
        </label>
        <button className="btn btn-primary press w-full" disabled={!name.trim()} onClick={save}><AppIcon name="save" />{lang === "zh" ? "儲存變更" : "Save changes"}</button>
        <button className="btn btn-ghost btn-danger press w-full" onClick={onDelete}><AppIcon name="trash" />{lang === "zh" ? "刪除計畫" : "Delete plan"}</button>
      </div>
    </Sheet>
  );
}

function CopyWeekSheet({
  plan,
  targetWeekIdx,
  onClose,
  onCopy,
}: {
  plan: WorkoutPlan;
  targetWeekIdx: number;
  onClose: () => void;
  onCopy: (sourceIdx: number) => void;
}) {
  const lang = useStore((state) => state.lang);
  const [sourceIdx, setSourceIdx] = useState(targetWeekIdx === 0 ? 1 : targetWeekIdx - 1);
  const source = plan.weeks[sourceIdx];
  return (
    <Sheet open onClose={onClose} title={<span className="icon-label"><AppIcon name="copy" />{lang === "zh" ? `複製到第 ${targetWeekIdx + 1} 週` : `Copy into week ${targetWeekIdx + 1}`}</span>}>
      <div className="t-sub mb-3">{lang === "zh" ? "選擇來源週。這會取代目前這一週的內容。" : "Choose a source week. This replaces the current week’s contents."}</div>
      <div className="week-copy-options mb-4">
        {plan.weeks.map((week, index) => index === targetWeekIdx ? null : (
          <button key={index} className={`week-copy-option press ${sourceIdx === index ? "selected" : ""}`} onClick={() => setSourceIdx(index)}>
            <span><b>{lang === "zh" ? `第 ${index + 1} 週` : `Week ${index + 1}`}</b><small>{week.days.length} {lang === "zh" ? "天" : week.days.length === 1 ? "day" : "days"} · {week.days.reduce((sum, day) => sum + day.exercises.length, 0)} {lang === "zh" ? "個動作" : "exercises"}</small></span>
            {sourceIdx === index && <AppIcon name="checkCircle" size={20} />}
          </button>
        ))}
      </div>
      <button className="btn btn-primary press w-full" disabled={!source || sourceIdx === targetWeekIdx} onClick={() => onCopy(sourceIdx)}><AppIcon name="copy" />{lang === "zh" ? "複製這一週" : "Copy this week"}</button>
    </Sheet>
  );
}

function DayEditSheet({ plan, weekIdx, dayIdx, onClose }: { plan: WorkoutPlan; weekIdx: number; dayIdx: number; onClose: () => void }) {
  const lang = useStore((state) => state.lang);
  const updatePlan = useStore((state) => state.updatePlan);
  const day = plan.weeks[weekIdx]?.days[dayIdx];
  const [name, setName] = useState(day?.name[lang] ?? "");
  if (!day) return null;

  const save = () => {
    const finalName = name.trim();
    if (!finalName) return;
    updatePlan(plan.id, (next) => {
      const target = next.weeks[weekIdx].days[dayIdx];
      target.name = target.name.en === target.name.zh ? { en: finalName, zh: finalName } : { ...target.name, [lang]: finalName };
      return next;
    });
    toast(lang === "zh" ? "訓練日已更新" : "Training day updated", "checkCircle");
    onClose();
  };

  const remove = () => {
    updatePlan(plan.id, (next) => {
      next.weeks[weekIdx].days.splice(dayIdx, 1);
      return next;
    });
    toast(lang === "zh" ? "訓練日已刪除" : "Training day deleted", "trash");
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={<span className="icon-label"><AppIcon name="edit" />{lang === "zh" ? "編輯訓練日" : "Edit training day"}</span>}>
      <div className="flex flex-col gap-3 pb-2">
        <label>
          <span className="t-cap mb-1 block">{lang === "zh" ? "訓練日名稱" : "Day name"}</span>
          <input className="field" value={name} onChange={(event) => setName(event.target.value)} autoFocus />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn btn-ghost btn-danger press" disabled={plan.weeks[weekIdx].days.length <= 1} onClick={remove}><AppIcon name="trash" />{lang === "zh" ? "刪除" : "Delete"}</button>
          <button className="btn btn-primary press" disabled={!name.trim()} onClick={save}><AppIcon name="save" />{lang === "zh" ? "儲存" : "Save"}</button>
        </div>
      </div>
    </Sheet>
  );
}

function SharePlanSheet({ plan, onClose }: { plan: WorkoutPlan; onClose: () => void }) {
  const router = useRouter();
  const lang = useStore((state) => state.lang);
  const friends = useStore((state) => Object.values(state.friends));
  const sharing = useStore((state) => state.friendSharing);
  const updateFriendSharing = useStore((state) => state.updateFriendSharing);
  const profile = useActiveProfile();

  const toggle = (friendId: string) => {
    const current = sharing[friendId] ?? { shareMealPlan: false, shareWorkoutPlan: false, sharedRecipeIds: [] };
    const checked = current.shareWorkoutPlan && (current.workoutPlanId ?? profile.planId) === plan.id;
    updateFriendSharing(friendId, checked
      ? { shareWorkoutPlan: false, workoutPlanId: undefined }
      : { shareWorkoutPlan: true, workoutPlanId: plan.id });
    toast(checked ? (lang === "zh" ? "已停止分享" : "Sharing stopped") : (lang === "zh" ? "計畫已分享" : "Plan shared"), "upload");
    void syncNow();
  };

  return (
    <Sheet open onClose={onClose} title={<span className="icon-label"><AppIcon name="friends" />{lang === "zh" ? "分享訓練計畫" : "Share workout plan"}</span>}>
      <div className="t-sub mb-3">{lang === "zh" ? "朋友可以查看並儲存自己的副本。每組訓練紀錄和重量仍為私人資料。" : "Friends can view this plan and save an editable copy. Your set history and body weight stay private."}</div>
      {friends.length ? (
        <div className="glass glass-sm px-3 py-1 mb-3">
          {friends.map((friend) => {
            const current = sharing[friend.id];
            const checked = Boolean(current?.shareWorkoutPlan && (current.workoutPlanId ?? profile.planId) === plan.id);
            return (
              <button key={friend.id} className="share-plan-friend press" onClick={() => toggle(friend.id)}>
                <span className="friend-avatar-small">{friend.emoji}</span>
                <span className="flex-1 min-w-0"><b className="truncate block">{friend.name}</b><small>{checked ? (lang === "zh" ? "可以查看此計畫" : "Can view this plan") : (lang === "zh" ? "未分享" : "Not shared")}</small></span>
                <span className={`share-check ${checked ? "checked" : ""}`}>{checked && <AppIcon name="check" size={15} />}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="preset-banner text-center mb-3">
          <div className="font-semibold">{lang === "zh" ? "還沒有朋友" : "No friends yet"}</div>
          <div className="t-cap mt-1">{lang === "zh" ? "先用邀請碼新增朋友，再回來分享計畫。" : "Add a friend with an invite code, then come back to share."}</div>
        </div>
      )}
      {!friends.length && <button className="btn btn-primary press w-full" onClick={() => router.push("/me")}><AppIcon name="addUser" />{lang === "zh" ? "前往新增朋友" : "Add friends"}</button>}
    </Sheet>
  );
}

function ExerciseEditSheet({
  plan,
  weekIdx,
  dayIdx,
  exIdx,
  onClose,
}: {
  plan: WorkoutPlan;
  weekIdx: number;
  dayIdx: number;
  exIdx: number;
  onClose: () => void;
}) {
  const lang = useStore((s) => s.lang);
  const updatePlan = useStore((s) => s.updatePlan);
  const profile = useActiveProfile();
  const t = (k: DictKey) => translate(k, lang);

  const ex = plan.weeks[weekIdx]?.days[dayIdx]?.exercises[exIdx];
  const [name, setName] = useState(ex?.name[lang] ?? "");
  const [sets, setSets] = useState(String(ex?.sets ?? 3));
  const [reps, setReps] = useState(ex?.reps ?? "10");
  const [rpe, setRpe] = useState(ex?.rpe != null ? String(ex.rpe) : "");
  const [weight, setWeight] = useState(
    ex?.targetWeight != null || ex?.seedWeight != null
      ? String(ex.targetWeight ?? ex.seedWeight)
      : ""
  );
  const [rest, setRest] = useState(ex?.restMin != null ? String(ex.restMin) : "");
  const [description, setDescription] = useState(ex?.description?.[lang] ?? "");

  if (!ex) return null;

  const save = () => {
    updatePlan(plan.id, (p) => {
      const target = p.weeks[weekIdx].days[dayIdx].exercises[exIdx];
      target.historyKey = target.historyKey ?? exKey(target.name.en);
      if (name.trim() && name.trim() !== ex.name[lang]) {
        target.name = { en: name.trim(), zh: name.trim() };
      }
      target.sets = Math.max(1, Number(sets) || 3);
      target.reps = reps.trim() || "10";
      target.rpe = optionalNumber(rpe, 1, 10);
      target.targetWeight = optionalNumber(weight);
      target.restMin = optionalNumber(rest);
      target.description = description.trim()
        ? { en: description.trim(), zh: description.trim() }
        : undefined;
      return p;
    });
    toast(t("saved"), "checkCircle");
    onClose();
  };

  const move = (dir: -1 | 1) => {
    updatePlan(plan.id, (p) => {
      const list = p.weeks[weekIdx].days[dayIdx].exercises;
      const j = exIdx + dir;
      if (j < 0 || j >= list.length) return p;
      [list[exIdx], list[j]] = [list[j], list[exIdx]];
      return p;
    });
    onClose();
  };

  const remove = () => {
    updatePlan(plan.id, (p) => {
      p.weeks[weekIdx].days[dayIdx].exercises.splice(exIdx, 1);
      return p;
    });
    toast(t("deleted"), "trash");
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={<span className="icon-label"><AppIcon name="edit" />{ex.name[lang]}</span>}>
      <div className="flex flex-col gap-3 pb-2">
        <input className="field" placeholder={t("exerciseName")} value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="t-cap mb-1">{t("targetWeight")} ({profile.unit})</div>
            <input className="field" inputMode="decimal" placeholder="—" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </div>
          <div>
            <div className="t-cap mb-1">{t("sets")}</div>
            <input className="field" inputMode="numeric" value={sets} onChange={(e) => setSets(e.target.value)} />
          </div>
          <div>
            <div className="t-cap mb-1">{t("reps")}</div>
            <input className="field" value={reps} onChange={(e) => setReps(e.target.value)} />
          </div>
          <div>
            <div className="t-cap mb-1">RPE</div>
            <input className="field" inputMode="decimal" value={rpe} onChange={(e) => setRpe(e.target.value)} />
          </div>
          <div>
            <div className="t-cap mb-1">{t("rest")} (min)</div>
            <input className="field" inputMode="decimal" value={rest} onChange={(e) => setRest(e.target.value)} />
          </div>
        </div>
        <div>
          <div className="t-cap mb-1">{t("description")} · {t("optional")}</div>
          <textarea
            className="field"
            rows={3}
            placeholder={lang === "zh" ? "器材設定、進度目標或提醒⋯" : "Setup, progression goal, or reminder…"}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        {ex.cue && <div className="t-cap icon-label"><AppIcon name="idea" size={16} />{ex.cue[lang]}</div>}
        <div className="flex gap-2">
          <button className="ibtn press" onClick={() => move(-1)} aria-label={lang === "zh" ? "上移" : "Move up"}><AppIcon name="up" size={18} /></button>
          <button className="ibtn press" onClick={() => move(1)} aria-label={lang === "zh" ? "下移" : "Move down"}><AppIcon name="down" size={18} /></button>
          <button className="btn btn-ghost btn-danger press" onClick={remove}>{t("delete")}</button>
          <button className="btn btn-primary press flex-1" onClick={save}>{t("save")}</button>
        </div>
      </div>
    </Sheet>
  );
}

function AddExerciseSheet({ plan, onClose, onAdd }: { plan: WorkoutPlan; onClose: () => void; onAdd: (spec: ExerciseSpec) => void }) {
  return <ExercisePickerSheet plan={plan} onClose={onClose} onAdd={onAdd} />;
}

/* ================================ PROGRESS ================================ */

function ProgressTab() {
  const lang = useStore((s) => s.lang);
  const store = useStore();
  const profile = useActiveProfile();
  const t = (k: DictKey) => translate(k, lang);

  const sessions = useMemo(
    () => (store.sessions[profile.id] ?? []).filter((x) => x.endedAt).sort((a, b) => a.startedAt - b.startedAt),
    [store.sessions, profile.id]
  );

  // exercises with history
  const keys = useMemo(() => {
    const map = new Map<string, { en: string; zh: string }>();
    for (const s of sessions) {
      for (const e of s.entries) {
        if (e.sets.some((x) => x.done)) map.set(e.key, e.name);
      }
    }
    return Array.from(map.entries());
  }, [sessions]);

  const [selKey, setSelKey] = useState<string | null>(null);
  const activeKey = selKey ?? keys[keys.length - 1]?.[0] ?? null;
  const activeName = keys.find(([k]) => k === activeKey)?.[1];

  // 1RM series for selected exercise
  const series = useMemo(
    () => (activeKey ? exerciseProgressSeries(sessions, activeKey) : { points: [], metric: "est1rm" as const }),
    [sessions, activeKey]
  );

  const trend =
    series.points.length >= 2
      ? series.points[series.points.length - 1].v > series.points[series.points.length - 2].v
        ? "up"
        : series.points[series.points.length - 1].v === series.points[series.points.length - 2].v
        ? "flat"
        : "down"
      : null;

  const [progressQuery, setProgressQuery] = useState("");
  const visibleKeys = keys.filter(([, name]) =>
    name[lang].toLowerCase().includes(progressQuery.trim().toLowerCase())
  );

  // weekly volume (last 6 ISO weeks) + per-group split of latest week
  const weekly = useMemo(() => {
    const byWeek = new Map<string, number>();
    const byGroupLatest = new Map<MuscleGroup, number>();
    const weekKey = (d: string) => {
      const dt = new Date(d);
      const onejan = new Date(dt.getFullYear(), 0, 1);
      const week = Math.ceil(((dt.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
      return `${dt.getFullYear()}-${week}`;
    };
    const latest = sessions.length ? weekKey(sessions[sessions.length - 1].date) : "";
    for (const s of sessions) {
      const wk = weekKey(s.date);
      let vol = 0;
      for (const e of s.entries) {
        const v = e.sets.filter((x) => x.done).reduce((n, x) => n + x.w * x.reps, 0);
        vol += v;
        if (wk === latest && v > 0) {
          const g = groupOf(e.name.en);
          byGroupLatest.set(g, (byGroupLatest.get(g) ?? 0) + v);
        }
      }
      byWeek.set(wk, (byWeek.get(wk) ?? 0) + vol);
    }
    const weeks = Array.from(byWeek.entries()).slice(-6);
    return { weeks, groups: Array.from(byGroupLatest.entries()).sort((a, b) => b[1] - a[1]) };
  }, [sessions]);

  if (sessions.length === 0) {
    return (
      <GlassCard>
        <EmptyState
          icon="chart"
          title={t("noSessions")}
          hint={lang === "zh" ? "完成第一次訓練後，圖表會顯示在這裡。" : "Charts appear after your first completed session."}
        />
      </GlassCard>
    );
  }

  return (
    <div className="a-fadeUp flex flex-col gap-4">
      {/* exercise picker */}
      <div className="flex gap-2 overflow-x-auto hide-scroll pb-1">
        {keys.map(([k, name]) => (
          <button key={k} className={`chip press ${k === activeKey ? "chip-on" : ""}`} onClick={() => setSelKey(k)}>
            {name[lang]}
          </button>
        ))}
      </div>

      {activeName && series.points.length > 0 && (
        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-1">
            <div>
              <div className="font-bold" style={{ fontSize: 16 }}>{activeName[lang]}</div>
              <div className="t-cap">
                {series.metric === "est1rm" ? `${t("est1rm")} (${profile.unit})` : t("bestReps")}
              </div>
            </div>
            {trend && (
              <span
                className="chip"
                style={{
                  background: trend === "up" ? "rgba(143,186,97,0.16)" : trend === "down" ? "rgba(232,84,74,0.15)" : undefined,
                  color: trend === "up" ? "var(--melon-600)" : trend === "down" ? "var(--danger)" : undefined,
                }}
              >
                <AppIcon name={trend === "up" ? "up" : trend === "down" ? "down" : "next"} size={14} />
                {trend === "up" ? t("overloadUp") : trend === "down" ? t("overloadDown") : t("overloadFlat")}
              </span>
            )}
          </div>
          <LineChart
            points={series.points.map((x) => x.v)}
            labels={series.points.map((x, i) => (i === 0 || i === series.points.length - 1 ? fmtDate(x.date, lang) : ""))}
          />
        </GlassCard>
      )}

      <div>
        <div className="flex items-end justify-between gap-3 mb-2">
          <div>
            <div className="t-section">{t("exerciseProgress")}</div>
            <div className="t-cap">{keys.length} {t("trackedExercises")}</div>
          </div>
        </div>
        {keys.length > 5 && (
          <input
            className="field mb-3"
            placeholder={t("searchExercises")}
            value={progressQuery}
            onChange={(event) => setProgressQuery(event.target.value)}
          />
        )}
        <div className="flex flex-col gap-3">
          {visibleKeys.map(([key, name]) => (
            <ExerciseProgressCard
              key={key}
              exerciseKey={key}
              name={name[lang]}
              sessions={sessions}
              lang={lang}
              unit={profile.unit}
              active={key === activeKey}
              onSelect={() => setSelKey(key)}
            />
          ))}
        </div>
      </div>

      <GlassCard className="p-4">
        <div className="t-section mb-2">{t("volume")} / {t("week")} ({profile.unit})</div>
        <BarChart
          values={weekly.weeks.map(([, v]) => v)}
          labels={weekly.weeks.map(([k]) => `W${k.split("-")[1]}`)}
          highlight={weekly.weeks.length - 1}
        />
        {weekly.groups.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {weekly.groups.map(([g, v]) => (
              <span key={g} className="chip" style={{ fontSize: 12 }}>
                {GROUP_LABEL[g][lang]} <b className="tabular">{fmtNum(v)}</b>
              </span>
            ))}
          </div>
        )}
      </GlassCard>

      {/* last session detail for selected exercise */}
      {activeKey && <LastSetsCard k={activeKey} />}
    </div>
  );
}

function ExerciseProgressCard({
  exerciseKey,
  name,
  sessions,
  lang,
  unit,
  active,
  onSelect,
}: {
  exerciseKey: string;
  name: string;
  sessions: WorkoutSession[];
  lang: "en" | "zh";
  unit: string;
  active: boolean;
  onSelect: () => void;
}) {
  const t = (key: DictKey) => translate(key, lang);
  const series = exerciseProgressSeries(sessions, exerciseKey);
  const lastSession = [...sessions]
    .reverse()
    .find((session) => session.entries.some((entry) => entry.key === exerciseKey));
  const lastEntry = lastSession?.entries.find((entry) => entry.key === exerciseKey);
  const doneSets = lastEntry?.sets.filter((set) => set.done) ?? [];
  const averageRpe = doneSets.filter((set) => set.rpe != null).length
    ? doneSets.reduce((sum, set) => sum + (set.rpe ?? 0), 0) /
      doneSets.filter((set) => set.rpe != null).length
    : null;

  return (
    <GlassCard className={`p-4 press ${active ? "exercise-progress-active" : ""}`} onClick={onSelect}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-bold truncate">{name}</div>
          <div className="t-cap">
            {series.points.length} {lang === "zh" ? "次訓練" : series.points.length === 1 ? "session" : "sessions"}
            {lastSession ? ` · ${fmtDate(lastSession.date, lang)}` : ""}
          </div>
        </div>
        <span className="chip" style={{ fontSize: 11, padding: "4px 8px" }}>
          {series.metric === "est1rm" ? t("est1rm") : t("bestReps")}
        </span>
      </div>
      <LineChart
        points={series.points.map((point) => point.v)}
        labels={series.points.map((point, index) =>
          index === 0 || index === series.points.length - 1 ? fmtDate(point.date, lang) : ""
        )}
        height={88}
        unit={series.metric === "est1rm" ? unit : ""}
      />
      <div className="flex gap-1.5 flex-wrap mt-1">
        <span className="previous-set-chip">{doneSets.length} {t("sets")}</span>
        {doneSets.length > 0 && (
          <span className="previous-set-chip tabular">
            {doneSets[doneSets.length - 1].w > 0 ? `${doneSets[doneSets.length - 1].w}${unit} × ` : ""}
            {doneSets[doneSets.length - 1].reps}
          </span>
        )}
        {averageRpe != null && <span className="previous-set-chip tabular">RPE {fmtNum(averageRpe)}</span>}
      </div>
    </GlassCard>
  );
}

function LastSetsCard({ k }: { k: string }) {
  const lang = useStore((s) => s.lang);
  const store = useStore();
  const profile = useActiveProfile();
  const t = (kk: DictKey) => translate(kk, lang);
  const last = lastSetsFor(store, k);
  if (!last) return null;
  return (
    <GlassCard className="p-4">
      <div className="t-section mb-2">
        {t("lastTime")} · {fmtDate(last.date, lang)}
      </div>
      <div className="flex gap-2 flex-wrap">
        {last.sets.map((s, i) => (
          <span key={i} className="chip tabular">
            {s.w > 0 ? `${s.w}${profile.unit} × ` : ""}{s.reps}{s.rpe ? ` @${s.rpe}` : ""}
          </span>
        ))}
      </div>
    </GlassCard>
  );
}
