"use client";

import { useEffect, useState } from "react";
import { translate, type DictKey } from "@/lib/i18n";
import { useActiveProfile, useStore } from "@/lib/store";
import type { Goals } from "@/lib/types";
import { Sheet, toast } from "@/components/ui";
import { AppIcon } from "@/components/icons";

type GoalKey = keyof Goals;
type Draft = Record<GoalKey | "water", string>;

const toDraft = (goals: Goals, waterGoal: number): Draft => ({
  cal: String(goals.cal),
  protein: String(goals.protein),
  carbs: String(goals.carbs),
  fat: String(goals.fat),
  water: String(waterGoal),
});

export default function DailyTargetsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lang = useStore((s) => s.lang);
  const updateProfile = useStore((s) => s.updateProfile);
  const profile = useActiveProfile();
  const t = (key: DictKey) => translate(key, lang);
  const [draft, setDraft] = useState<Draft>(() => toDraft(profile.goals, profile.waterGoal ?? 8));

  useEffect(() => {
    if (open) setDraft(toDraft(profile.goals, profile.waterGoal ?? 8));
  }, [open, profile.id, profile.goals, profile.waterGoal]);

  const numberValue = (key: keyof Draft) => Number(draft[key]);
  const goals: Goals = {
    cal: numberValue("cal"),
    protein: numberValue("protein"),
    carbs: numberValue("carbs"),
    fat: numberValue("fat"),
  };
  const waterGoal = numberValue("water");
  const valid =
    Number.isFinite(goals.cal) &&
    goals.cal >= 200 &&
    goals.cal <= 10000 &&
    [goals.protein, goals.carbs, goals.fat].every(
      (value) => Number.isFinite(value) && value >= 0 && value <= 1000
    ) &&
    Number.isInteger(waterGoal) &&
    waterGoal >= 1 &&
    waterGoal <= 20;

  const update = (key: keyof Draft, value: string) => {
    if (value === "" || /^\d{0,5}$/.test(value)) {
      setDraft((current) => ({ ...current, [key]: value }));
    }
  };

  const Field = ({ label, field, unit }: { label: string; field: GoalKey; unit: string }) => (
    <label className="target-field" htmlFor={`target-${field}`}>
      <span className="t-cap font-semibold">{label}</span>
      <span className="field-with-unit">
        <input
          id={`target-${field}`}
          className="field tabular"
          type="number"
          inputMode="numeric"
          min={field === "cal" ? 200 : 0}
          max={field === "cal" ? 10000 : 1000}
          value={draft[field]}
          onChange={(event) => update(field, event.target.value)}
        />
        <span className="field-unit">{unit}</span>
      </span>
    </label>
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={<span className="icon-label"><AppIcon name="goal" />{t("goals")} · {profile.name}</span>}
    >
      <p className="t-sub mb-4">{t("targetsHint")}</p>

      <section className="target-section" aria-labelledby="nutrition-targets-heading">
        <div id="nutrition-targets-heading" className="t-section icon-label mb-3">
          <AppIcon name="cutlery" size={18} />{t("nutritionTargets")}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("cal")} field="cal" unit={t("cal")} />
          <Field label={t("protein")} field="protein" unit="g" />
          <Field label={t("carbs")} field="carbs" unit="g" />
          <Field label={t("fat")} field="fat" unit="g" />
        </div>
      </section>

      <section className="target-section mt-3" aria-labelledby="hydration-target-heading">
        <div id="hydration-target-heading" className="t-section icon-label mb-3">
          <AppIcon name="water" size={18} />{t("hydrationGoal")}
        </div>
        <label className="target-field" htmlFor="target-water">
          <span className="field-with-unit">
            <input
              id="target-water"
              className="field tabular"
              type="number"
              inputMode="numeric"
              min={1}
              max={20}
              value={draft.water}
              onChange={(event) => update("water", event.target.value)}
            />
            <span className="field-unit field-unit-wide">{t("cupsPerDay")}</span>
          </span>
        </label>
      </section>

      {!valid && <div className="target-error mt-3" role="alert">{t("targetsInvalid")}</div>}
      <button
        className="btn btn-primary press w-full mt-4"
        disabled={!valid}
        onClick={() => {
          updateProfile(profile.id, { goals, waterGoal });
          toast(t("saved"), "goal");
          onClose();
        }}
      >
        {t("save")}
      </button>
    </Sheet>
  );
}
