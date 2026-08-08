"use client";

import React, { useMemo, useState } from "react";
import { AppIcon } from "@/components/icons";
import { Sheet } from "@/components/ui";
import { translate, type DictKey } from "@/lib/i18n";
import { exKey } from "@/lib/nutrition";
import { EXERCISE_LIBRARY, GROUP_LABEL } from "@/lib/plans";
import { newId, useActiveProfile, useStore } from "@/lib/store";
import { recommendExercisePreset, type ExerciseChoiceLike } from "@/lib/workouts";
import type {
  BiText,
  ExerciseEquipment,
  ExerciseSpec,
  MuscleGroup,
  WorkoutPlan,
} from "@/lib/types";

type ExerciseChoice = ExerciseChoiceLike & {
  id: string;
  cue?: BiText;
  aliases?: string[];
  custom: boolean;
  newCustom?: boolean;
};

const EQUIPMENT_LABEL: Record<ExerciseEquipment, BiText> = {
  barbell: { en: "Barbell", zh: "槓鈴" },
  dumbbell: { en: "Dumbbell", zh: "啞鈴" },
  machine: { en: "Machine", zh: "機械" },
  cable: { en: "Cable", zh: "繩索" },
  bodyweight: { en: "Bodyweight", zh: "徒手" },
  kettlebell: { en: "Kettlebell", zh: "壺鈴" },
  band: { en: "Band", zh: "彈力帶" },
  smith: { en: "Smith machine", zh: "史密斯機" },
  landmine: { en: "Landmine", zh: "地雷管" },
  other: { en: "Other", zh: "其他" },
};

export function ExercisePickerSheet({
  onClose,
  onAdd,
  plan,
}: {
  onClose: () => void;
  onAdd: (spec: ExerciseSpec) => void;
  plan?: WorkoutPlan;
}) {
  const lang = useStore((state) => state.lang);
  const store = useStore();
  const profile = useActiveProfile();
  const t = (key: DictKey) => translate(key, lang);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<ExerciseChoice | null>(null);
  const [name, setName] = useState("");
  const [group, setGroup] = useState<MuscleGroup>("quads");
  const [equipment, setEquipment] = useState<ExerciseEquipment>("other");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("10");
  const [rpe, setRpe] = useState("8");
  const [weight, setWeight] = useState("");
  const [rest, setRest] = useState("1.5");
  const [description, setDescription] = useState("");
  const [presetSources, setPresetSources] = useState<("plan" | "history" | "profile")[]>([]);
  const [estimatedWeight, setEstimatedWeight] = useState(false);

  const choices = useMemo<ExerciseChoice[]>(() => {
    const custom = store.customExercises.map((exercise) => ({
      id: exercise.id,
      historyKey: exercise.historyKey,
      name: exercise.name,
      group: exercise.group,
      equipment: exercise.equipment,
      cue: exercise.cue,
      custom: true,
    }));
    const builtIn = EXERCISE_LIBRARY.map((exercise) => ({
      id: exercise.key,
      historyKey: exKey(exercise.en),
      name: { en: exercise.en, zh: exercise.zh },
      group: exercise.group,
      equipment: exercise.equipment,
      cue: exercise.cue,
      aliases: exercise.aliases,
      timed: exercise.timed,
      custom: false,
    }));
    return [...custom, ...builtIn];
  }, [store.customExercises]);

  const visible = useMemo(() => {
    const needle = normalize(query);
    if (!needle) return choices;
    return choices.filter((choice) =>
      [choice.name.en, choice.name.zh, GROUP_LABEL[choice.group].en, EQUIPMENT_LABEL[choice.equipment].en, ...(choice.aliases ?? [])]
        .map(normalize)
        .some((value) => value.includes(needle))
    );
  }, [choices, query]);

  const choose = (choice: ExerciseChoice) => {
    const preset = recommendExercisePreset({
      profile,
      exercise: choice,
      sessions: store.sessions[profile.id] ?? [],
      plan,
    });
    setPicked(choice);
    setName(choice.name[lang]);
    setGroup(choice.group);
    setEquipment(choice.equipment);
    setSets(String(preset.sets));
    setReps(preset.reps);
    setRpe(String(preset.rpe));
    setWeight(preset.weight == null ? "" : String(preset.weight));
    setRest(String(preset.restMin));
    setPresetSources(preset.sources);
    setEstimatedWeight(preset.estimatedWeight);
  };

  const chooseCustom = () => {
    const value = query.trim();
    if (!value) return;
    choose({
      id: `custom-${newId()}`,
      historyKey: exKey(value),
      name: { en: value, zh: value },
      group: "quads",
      equipment: "other",
      custom: true,
      newCustom: true,
    });
  };

  const updateCustomEstimate = (nextGroup: MuscleGroup, nextEquipment: ExerciseEquipment) => {
    if (!picked?.newCustom) return;
    const preset = recommendExercisePreset({
      profile,
      exercise: { ...picked, group: nextGroup, equipment: nextEquipment },
      sessions: store.sessions[profile.id] ?? [],
      plan,
    });
    if (!weight || estimatedWeight) setWeight(preset.weight == null ? "" : String(preset.weight));
    setPresetSources(preset.sources);
    setEstimatedWeight(preset.estimatedWeight);
  };

  const add = () => {
    if (!picked || !name.trim()) return;
    const finalName = name.trim();
    const historyKey = picked.newCustom ? exKey(finalName) : picked.historyKey;
    const biName =
      finalName === picked.name[lang]
        ? picked.name
        : { en: finalName, zh: finalName };

    if (picked.newCustom) {
      store.addCustomExercise({
        id: picked.id,
        historyKey,
        name: biName,
        group,
        equipment,
        cue: picked.cue,
        createdAt: Date.now(),
      });
    }

    onAdd({
      id: `x-${newId()}`,
      historyKey,
      name: biName,
      sets: Math.max(1, Math.min(20, Number(sets) || 3)),
      reps: reps.trim() || "10",
      rpe: optionalNumber(rpe, 1, 10),
      targetWeight: optionalNumber(weight),
      restMin: optionalNumber(rest, 0, 20),
      description: description.trim()
        ? { en: description.trim(), zh: description.trim() }
        : undefined,
      cue: picked.cue,
    });
  };

  const sourceText = presetSources.length
    ? presetSources
        .map((source) =>
          source === "plan"
            ? lang === "zh" ? "目前課表" : "current plan"
            : source === "history"
              ? lang === "zh" ? "最近表現" : "recent performance"
              : lang === "zh" ? "個人資料" : "your profile"
        )
        .join(lang === "zh" ? "、" : ", ")
    : lang === "zh" ? "訓練目標" : "training goal";

  return (
    <Sheet open onClose={onClose} title={<span className="icon-label"><AppIcon name="plus" />{t("addExercise")}</span>}>
      {!picked ? (
        <>
          <input
            className="field mb-2"
            placeholder={t("searchExercises")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
          />
          <div className="flex items-center justify-between gap-2 mb-2 px-1">
            <span className="t-cap">{visible.length} {lang === "zh" ? "個動作" : "exercises"}</span>
            <span className="t-cap">{store.customExercises.length} {lang === "zh" ? "個自訂" : "custom"}</span>
          </div>
          {query.trim() && (
            <button className="btn btn-primary press w-full mb-2" onClick={chooseCustom}>
              <AppIcon name="plus" />{lang === "zh" ? "建立自訂動作" : "Create custom exercise"} “{query.trim()}”
            </button>
          )}
          <div className="exercise-picker-results hide-scroll">
            {visible.map((choice) => (
              <button key={`${choice.custom ? "custom" : "built-in"}-${choice.id}`} className="row press exercise-result" onClick={() => choose(choice)}>
                <span className="exercise-result-icon"><AppIcon name="gym" size={18} /></span>
                <span className="flex-1 min-w-0 text-left">
                  <span className="font-semibold block truncate" style={{ fontSize: 15 }}>{choice.name[lang]}</span>
                  <span className="t-cap block truncate">
                    {GROUP_LABEL[choice.group][lang]} · {EQUIPMENT_LABEL[choice.equipment][lang]}
                    {choice.custom ? ` · ${lang === "zh" ? "自訂" : "Custom"}` : ""}
                  </span>
                </span>
                <AppIcon name="next" size={17} />
              </button>
            ))}
            {visible.length === 0 && <div className="t-sub text-center py-5">{lang === "zh" ? "找不到動作。你可以在上方建立自訂動作。" : "No match. Create your own exercise above."}</div>}
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-3 pb-2">
          <button className="chip press self-start icon-label" onClick={() => setPicked(null)}><AppIcon name="back" size={16} /> {t("back")}</button>

          <div className="preset-banner">
            <div className="font-semibold icon-label"><AppIcon name="spark" size={17} />{lang === "zh" ? "為你建議的起始設定" : "Suggested starting prescription"}</div>
            <div className="t-cap mt-1">
              {lang === "zh" ? `依據：${sourceText}` : `Based on ${sourceText}`}
              {estimatedWeight ? (lang === "zh" ? " · 重量為保守估計" : " · weight is a conservative estimate") : ""}
            </div>
          </div>

          <input className="field" placeholder={t("exerciseName")} value={name} onChange={(event) => setName(event.target.value)} />

          {picked.newCustom ? (
            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className="t-cap mb-1 block">{lang === "zh" ? "肌群" : "Muscle group"}</span>
                <select
                  className="field"
                  value={group}
                  onChange={(event) => {
                    const value = event.target.value as MuscleGroup;
                    setGroup(value);
                    updateCustomEstimate(value, equipment);
                  }}
                >
                  {(Object.keys(GROUP_LABEL) as MuscleGroup[]).map((value) => <option key={value} value={value}>{GROUP_LABEL[value][lang]}</option>)}
                </select>
              </label>
              <label>
                <span className="t-cap mb-1 block">{lang === "zh" ? "器材" : "Equipment"}</span>
                <select
                  className="field"
                  value={equipment}
                  onChange={(event) => {
                    const value = event.target.value as ExerciseEquipment;
                    setEquipment(value);
                    updateCustomEstimate(group, value);
                  }}
                >
                  {(Object.keys(EQUIPMENT_LABEL) as ExerciseEquipment[]).map((value) => <option key={value} value={value}>{EQUIPMENT_LABEL[value][lang]}</option>)}
                </select>
              </label>
            </div>
          ) : (
            <div className="flex gap-1.5 flex-wrap">
              <span className="chip">{GROUP_LABEL[group][lang]}</span>
              <span className="chip">{EQUIPMENT_LABEL[equipment][lang]}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="t-cap mb-1 block">{t("targetWeight")} ({profile.unit})</span>
              <input className="field" inputMode="decimal" placeholder="—" value={weight} onChange={(event) => setWeight(event.target.value)} />
            </label>
            <label>
              <span className="t-cap mb-1 block">{t("sets")}</span>
              <input className="field" inputMode="numeric" value={sets} onChange={(event) => setSets(event.target.value)} />
            </label>
            <label>
              <span className="t-cap mb-1 block">{t("reps")}</span>
              <input className="field" value={reps} onChange={(event) => setReps(event.target.value)} />
            </label>
            <label>
              <span className="t-cap mb-1 block">RPE</span>
              <input className="field" inputMode="decimal" value={rpe} onChange={(event) => setRpe(event.target.value)} />
            </label>
            <label>
              <span className="t-cap mb-1 block">{t("rest")} (min)</span>
              <input className="field" inputMode="decimal" value={rest} onChange={(event) => setRest(event.target.value)} />
            </label>
          </div>
          <label>
            <span className="t-cap mb-1 block">{t("description")} · {t("optional")}</span>
            <textarea className="field" rows={2} value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          {picked.cue && <div className="t-cap icon-label"><AppIcon name="idea" size={16} />{picked.cue[lang]}</div>}
          <button className="btn btn-primary press w-full" onClick={add} disabled={!name.trim()}>
            <AppIcon name="plus" />{t("addExercise")}
          </button>
        </div>
      )}
    </Sheet>
  );
}

function optionalNumber(value: string, min = 0, max = Number.POSITIVE_INFINITY) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : undefined;
}

function normalize(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\u3400-\u9fff]+/g, " ").trim();
}
