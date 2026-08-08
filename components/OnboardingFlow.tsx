"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { BrandMark, AppIcon, FoodGlyph } from "./icons";
import { GlassCard } from "./ui";
import { IngredientRestrictionEditor } from "./IngredientRestrictionEditor";
import { useActiveProfile, useStore } from "@/lib/store";
import {
  estimateDailyTargets,
  kgToLb,
  lbToKg,
  recommendRecipes,
  recommendWorkoutPlans,
} from "@/lib/onboarding";
import type {
  ActivityLevel,
  FitnessGoal,
  Gender,
  Lang,
  TrainingFocus,
  WeightUnit,
} from "@/lib/types";
import { filterRecipes } from "@/lib/recipeDiscovery";
import { restrictionsFromProfile } from "@/lib/ingredientRestrictions";

const DIETS = [
  ["highProtein", "High protein", "高蛋白"],
  ["vegetarian", "Vegetarian", "蛋奶素"],
  ["vegan", "Vegan", "純素"],
  ["keto", "Keto", "生酮"],
  ["halal", "Halal", "清真"],
  ["kosher", "Kosher", "猶太潔食"],
  ["glutenFree", "Gluten-free", "無麩質"],
  ["dairyFree", "Dairy-free", "無乳製品"],
  ["lowFODMAP", "Low-FODMAP", "低 FODMAP"],
  ["paleo", "Paleo", "原始飲食"],
] as const;

const CUISINES = [
  ["chinese", "Chinese", "中式"],
  ["taiwanese", "Taiwanese", "台灣"],
  ["vietnamese", "Vietnamese", "越南"],
  ["korean", "Korean", "韓國"],
  ["japanese", "Japanese", "日本"],
  ["thai", "Thai", "泰國"],
  ["indian", "Indian", "印度"],
  ["middleEastern", "Middle Eastern", "中東"],
  ["mediterranean", "Mediterranean", "地中海"],
  ["mexican", "Mexican", "墨西哥"],
  ["westAfrican", "West African", "西非"],
  ["easternEuropean", "Eastern European", "東歐"],
] as const;

export default function OnboardingFlow({ edit = false, onClose }: { edit?: boolean; onClose?: () => void }) {
  const store = useStore();
  const saved = useActiveProfile();
  const [step, setStep] = useState(0);
  const [lang, setLang] = useState<Lang>(store.lang);
  const [name, setName] = useState(saved.name === "Melon friend" ? "" : saved.name);
  const [gender, setGender] = useState<Gender>(saved.gender ?? "unspecified");
  const [age, setAge] = useState(saved.age ? String(saved.age) : "");
  const [unit, setUnit] = useState<WeightUnit>(saved.unit);
  const [heightCm, setHeightCm] = useState(saved.heightCm ? String(saved.heightCm) : "");
  const [weight, setWeight] = useState(saved.weightKg ? String(saved.unit === "kg" ? saved.weightKg : kgToLb(saved.weightKg)) : "");
  const [activity, setActivity] = useState<ActivityLevel>(saved.activityLevel ?? "light");
  const [goal, setGoal] = useState<FitnessGoal>(saved.fitnessGoal ?? "maintain");
  const [weeklyRate, setWeeklyRate] = useState(saved.weeklyChangeKg ?? 0.25);
  const [trainingDays, setTrainingDays] = useState<3 | 4 | 5 | 6>(saved.trainingDays ?? 3);
  const [focus, setFocus] = useState<TrainingFocus>(saved.trainingFocus ?? "general");
  const [diets, setDiets] = useState<string[]>(saved.dietPreferences ?? []);
  const [cuisines, setCuisines] = useState<string[]>(saved.cuisinePreferences ?? []);
  const [restrictions, setRestrictions] = useState<string[]>(restrictionsFromProfile(saved));
  const [selectedPlan, setSelectedPlan] = useState(saved.planId);
  const [selectedRecipes, setSelectedRecipes] = useState<string[]>(saved.selectedRecipeIds ?? []);

  const c = (en: string, zh: string) => (lang === "zh" ? zh : en);
  const parsedWeightKg = numberOrUndefined(weight)
    ? unit === "kg"
      ? Number(weight)
      : lbToKg(Number(weight))
    : undefined;

  const estimate = useMemo(
    () =>
      estimateDailyTargets({
        gender,
        age: numberOrUndefined(age),
        heightCm: numberOrUndefined(heightCm),
        weightKg: parsedWeightKg,
        activityLevel: activity,
        fitnessGoal: goal,
        weeklyChangeKg: goal === "maintain" ? 0 : weeklyRate,
      }),
    [gender, age, heightCm, parsedWeightKg, activity, goal, weeklyRate]
  );

  const planSuggestions = useMemo(
    () => recommendWorkoutPlans({ trainingDays, trainingFocus: focus, fitnessGoal: goal }, store.plans),
    [trainingDays, focus, goal, store.plans]
  );

  const recipeSuggestions = useMemo(
    () =>
      recommendRecipes(
        { dietPreferences: diets, cuisinePreferences: cuisines, fitnessGoal: goal },
        filterRecipes(store.recipes, { excludeIngredients: restrictions }),
        6
      ),
    [diets, cuisines, goal, restrictions, store.recipes]
  );
  const eligibleRecipeIds = useMemo(
    () => new Set(filterRecipes(store.recipes, { excludeIngredients: restrictions }).map((recipe) => recipe.id)),
    [restrictions, store.recipes]
  );
  const eligibleSelectedRecipes = selectedRecipes.filter((recipeId) => eligibleRecipeIds.has(recipeId));

  const skip = () => {
    if (edit) onClose?.();
    else store.skipOnboarding();
  };

  const finish = () => {
    const suggestedIds = recipeSuggestions.map((recipe) => recipe.id);
    store.completeOnboarding({
      lang,
      recipeIds: eligibleSelectedRecipes,
      profile: {
        name: name.trim() || saved.name || c("Melon friend", "瓜友"),
        gender,
        age: numberOrUndefined(age),
        heightCm: numberOrUndefined(heightCm),
        weightKg: parsedWeightKg,
        activityLevel: activity,
        fitnessGoal: goal,
        weeklyChangeKg: goal === "maintain" ? 0 : weeklyRate,
        trainingDays,
        trainingFocus: focus,
        dietPreferences: diets,
        cuisinePreferences: cuisines,
        ingredientRestrictions: restrictions,
        allergies: restrictions.join(", "),
        suggestedRecipeIds: suggestedIds,
        selectedRecipeIds: eligibleSelectedRecipes,
        goals: estimate.goals,
        planId: selectedPlan,
        unit,
      },
    });
    onClose?.();
  };

  const toggle = (value: string, list: string[], setList: (next: string[]) => void) =>
    setList(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

  return (
    <div
      className="onboarding-shell"
      role="dialog"
      aria-modal="true"
      aria-label={c("Personal setup", "個人設定")}
      lang={lang === "zh" ? "zh-Hant" : "en"}
    >
      <div className="bg-melon" />
      <div className="onboarding-frame">
        <header className="onboarding-topbar">
          <div className="icon-label font-extrabold"><BrandMark size={28} /> MelonMate</div>
          <button className="chip press" onClick={skip}>{edit ? c("Cancel", "取消") : c("Skip for now", "暫時跳過")}</button>
        </header>

        <div className="onboarding-progress" aria-label={`${step + 1}/4`}>
          {[0, 1, 2, 3].map((index) => <span key={index} className={index <= step ? "on" : ""} />)}
        </div>

        <GlassCard strong className="onboarding-card a-pop">
          {step === 0 && (
            <section className="onboarding-step">
              <div className="text-center">
                <div className="onboarding-honey-art a-floaty mx-auto" aria-hidden="true">
                  <Image
                    src="/brand/honey-setup-2d.png"
                    alt=""
                    width={164}
                    height={164}
                    sizes="164px"
                    priority
                  />
                </div>
                <h1 className="t-title mt-2">{edit ? c("Update your setup", "更新個人設定") : c("Let’s make this yours", "打造你的專屬計畫")}</h1>
                <p className="t-sub mt-1">{c("No guessed goals. Tell us only what you’re comfortable sharing.", "不再預設目標；只需分享你願意提供的資訊。")}</p>
              </div>
              <div className="seg">
                <button className={`seg-item ${lang === "en" ? "on" : ""}`} onClick={() => setLang("en")}>English</button>
                <button className={`seg-item ${lang === "zh" ? "on" : ""}`} onClick={() => setLang("zh")} lang="zh-Hant">繁體中文</button>
              </div>
              <Field label={c("What should we call you?", "怎麼稱呼你？")} icon="user">
                <input className="field" value={name} onChange={(event) => setName(event.target.value)} placeholder={c("Your name", "你的名字")} autoComplete="name" />
              </Field>
              <Field label={c("Gender", "性別")} hint={c("Used only to improve the calorie estimate.", "僅用於改善熱量估算。") }>
                <ChoiceRow
                  value={gender}
                  onChange={(value) => setGender(value as Gender)}
                  options={[
                    ["female", c("Female", "女性")],
                    ["male", c("Male", "男性")],
                    ["nonbinary", c("Nonbinary", "非二元")],
                    ["unspecified", c("Skip", "跳過")],
                  ]}
                />
              </Field>
              <Field label={c("Age", "年齡")}>
                <input className="field" inputMode="numeric" value={age} onChange={(event) => setAge(event.target.value)} placeholder={c("Optional", "選填")} />
              </Field>
            </section>
          )}

          {step === 1 && (
            <section className="onboarding-step">
              <StepHeading icon="weight" title={c("Your starting point", "你的起點")} sub={c("These details make the calorie suggestion more useful. Every field is optional.", "這些資料能讓熱量建議更準確；所有欄位皆可跳過。") } />
              <div className="seg">
                {(["lb", "kg"] as WeightUnit[]).map((value) => (
                  <button
                    key={value}
                    className={`seg-item ${unit === value ? "on" : ""}`}
                    onClick={() => {
                      if (weight && unit !== value) setWeight(String(value === "kg" ? lbToKg(Number(weight)) : kgToLb(Number(weight))));
                      setUnit(value);
                    }}
                  >{value}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={c("Current weight", "目前體重")}>
                  <div className="field-with-unit"><input className="field" inputMode="decimal" value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="—" /><span>{unit}</span></div>
                </Field>
                <Field label={c("Height", "身高")}>
                  <div className="field-with-unit"><input className="field" inputMode="decimal" value={heightCm} onChange={(event) => setHeightCm(event.target.value)} placeholder="—" /><span>cm</span></div>
                </Field>
              </div>
              <Field label={c("Daily activity", "日常活動量")}>
                <div className="onboarding-choice-grid">
                  {([
                    ["sedentary", c("Mostly seated", "大多坐著"), c("Little walking", "很少走動")],
                    ["light", c("Lightly active", "輕度活動"), c("Some walking", "偶爾走動")],
                    ["moderate", c("Active", "中度活動"), c("On your feet often", "經常走動")],
                    ["very", c("Very active", "高度活動"), c("Physical work or sport", "體力工作或運動")],
                  ] as const).map(([value, label, sub]) => (
                    <button key={value} className={`onboarding-choice press ${activity === value ? "on" : ""}`} onClick={() => setActivity(value)}>
                      <b>{label}</b><small>{sub}</small>
                    </button>
                  ))}
                </div>
              </Field>
            </section>
          )}

          {step === 2 && (
            <section className="onboarding-step">
              <StepHeading icon="goal" title={c("Choose your direction", "選擇你的方向")} sub={c("We’ll suggest targets—not prescribe them. You can change everything later.", "這些只是建議，之後都能隨時修改。") } />
              <ChoiceRow
                value={goal}
                onChange={(value) => setGoal(value as FitnessGoal)}
                options={[["lose", c("Lose", "減重")], ["maintain", c("Maintain", "維持")], ["gain", c("Gain", "增重")]]}
              />
              {goal !== "maintain" && (
                <Field label={c(`How much per week?`, "每週想變化多少？")} hint={c("A slower rate is usually easier to sustain.", "較慢的速度通常更容易持續。") }>
                  <ChoiceRow
                    value={String(weeklyRate)}
                    onChange={(value) => setWeeklyRate(Number(value))}
                    options={[0.25, 0.5, 0.75].map((kg) => [String(kg), unit === "kg" ? `${kg} kg` : `${kgToLb(kg)} lb`])}
                  />
                </Field>
              )}
              <div className="onboarding-target-card">
                <div>
                  <span>{c("Suggested daily target", "建議每日目標")}</span>
                  <strong>{estimate.goals.cal.toLocaleString()} cal</strong>
                  <small>P {estimate.goals.protein}g · C {estimate.goals.carbs}g · F {estimate.goals.fat}g</small>
                </div>
                <div className="onboarding-maintenance">{c("Maintenance", "維持熱量")}<b>{estimate.maintenanceCal.toLocaleString()}</b></div>
              </div>
              {estimate.usedDefaults && <p className="t-cap">{c("Some body details were skipped, so this uses neutral starting assumptions. You can still edit the target directly later.", "部分身體資料已跳過，因此目前採用中性起始假設；之後仍可直接修改。")}</p>}
              <div className="grid grid-cols-2 gap-3">
                <Field label={c("Days per week", "每週天數")}>
                  <ChoiceRow value={String(trainingDays)} onChange={(value) => setTrainingDays(Number(value) as 3 | 4 | 5 | 6)} options={[3, 4, 5, 6].map((day) => [String(day), String(day)])} />
                </Field>
                <Field label={c("Training focus", "訓練方向")}>
                  <select className="field" value={focus} onChange={(event) => setFocus(event.target.value as TrainingFocus)}>
                    <option value="general">{c("General fitness", "綜合體能")}</option>
                    <option value="hypertrophy">{c("Hypertrophy", "肌肥大")}</option>
                    <option value="strength">{c("Strength / lifting", "力量／舉重")}</option>
                  </select>
                </Field>
              </div>
              <div>
                <div className="t-section mb-1">{c("Recommended plans", "推薦計畫")}</div>
                <div className="t-cap mb-2">{c("No plan is added until you tap one. Tap it again to remove it.", "點選後才會加入計畫；再次點選即可取消。")}</div>
                <div className="flex flex-col gap-2">
                  {planSuggestions.map((plan, index) => (
                    <button key={plan.id} className={`onboarding-plan press ${selectedPlan === plan.id ? "on" : ""}`} onClick={() => setSelectedPlan((current) => current === plan.id ? "" : plan.id)}>
                      <span className="onboarding-plan-rank">{index + 1}</span>
                      <span><b>{plan.name[lang]}</b><small>{plan.daysPerWeek} {c("days/week", "天／週")} · {plan.weeks.length} {c("weeks", "週")}</small></span>
                      <AppIcon name={selectedPlan === plan.id ? "checkCircle" : "next"} size={19} />
                    </button>
                  ))}
                </div>
                {selectedPlan && (
                  <button className="chip press mt-2" onClick={() => setSelectedPlan("")}>
                    <AppIcon name="close" size={15} />{c("Continue without a workout plan", "暫不使用訓練計畫")}
                  </button>
                )}
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="onboarding-step">
              <StepHeading icon="kitchen" title={c("Food you’ll look forward to", "讓你期待的餐點")} sub={c("Pick preferences, then add only the recipes you actually want.", "選擇飲食與口味偏好，再加入你真正想要的食譜。") } />
              <Field label={c("Diet preferences", "飲食偏好")}>
                <div className="flex flex-wrap gap-2">
                  {DIETS.map(([value, en, zh]) => <button key={value} className={`chip press ${diets.includes(value) ? "chip-on" : ""}`} onClick={() => toggle(value, diets, setDiets)}>{lang === "zh" ? zh : en}</button>)}
                </div>
              </Field>
              <Field label={c("Cuisines you enjoy", "喜歡的料理")}>
                <div className="flex flex-wrap gap-2">
                  {CUISINES.map(([value, en, zh]) => <button key={value} className={`chip press ${cuisines.includes(value) ? "chip-canta-on" : ""}`} onClick={() => toggle(value, cuisines, setCuisines)}>{lang === "zh" ? zh : en}</button>)}
                </div>
              </Field>
              <Field label={c("Allergies or ingredients to avoid", "過敏或避免食材")} hint={c("Saved as a reminder; always verify labels yourself.", "僅作提醒；請自行確認食品標示。") }>
                <IngredientRestrictionEditor value={restrictions} onChange={setRestrictions} lang={lang} />
              </Field>
              <div>
                <div className="flex items-end justify-between mb-2"><div><div className="t-section">{c("Choose your meal-prep recipes", "選擇你的備餐食譜")}</div><div className="t-cap">{c("Nothing is added automatically. Your picks will also be placed into the next 3 days of Planner.", "不會自動加入；你選取的食譜也會排入接下來三天的餐點規劃。")}</div></div><span className="chip">{eligibleSelectedRecipes.length}</span></div>
                <div className="onboarding-recipe-grid">
                  {recipeSuggestions.map((recipe) => {
                    const checked = eligibleSelectedRecipes.includes(recipe.id);
                    return (
                      <button key={recipe.id} className={`onboarding-recipe press ${checked ? "on" : ""}`} onClick={() => toggle(recipe.id, selectedRecipes, setSelectedRecipes)}>
                        <FoodGlyph category={recipe.cat} size={18} compact />
                        <span><b>{recipe.name[lang]}</b><small>{recipe.minutes} min · {Math.round(recipe.perServing.protein)}g P</small></span>
                        <AppIcon name={checked ? "checkCircle" : "plus"} size={18} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          <footer className="onboarding-actions">
            {step > 0 ? <button className="btn press" onClick={() => setStep((value) => value - 1)}><AppIcon name="back" size={17} />{c("Back", "返回")}</button> : <span />}
            {step < 3 ? (
              <button className="btn btn-primary press" onClick={() => setStep((value) => value + 1)}>{c("Continue", "繼續")}<AppIcon name="next" size={17} /></button>
            ) : (
              <button className="btn btn-primary press" onClick={finish}><AppIcon name="checkCircle" size={18} />{edit ? c("Save changes", "儲存變更") : c("Finish setup", "完成設定")}</button>
            )}
          </footer>
        </GlassCard>
      </div>
    </div>
  );
}

function Field({ label, hint, icon, children }: { label: string; hint?: string; icon?: Parameters<typeof AppIcon>[0]["name"]; children: React.ReactNode }) {
  return <div><div className="t-cap mb-1 font-semibold icon-label">{icon && <AppIcon name={icon} size={15} />}{label}</div>{children}{hint && <div className="t-cap mt-1">{hint}</div>}</div>;
}

function StepHeading({ icon, title, sub }: { icon: Parameters<typeof AppIcon>[0]["name"]; title: string; sub: string }) {
  return <div><div className="empty-icon mb-2"><AppIcon name={icon} size={26} /></div><h1 className="t-title">{title}</h1><p className="t-sub mt-1">{sub}</p></div>;
}

function ChoiceRow({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: (readonly [string, string])[] }) {
  return <div className="seg">{options.map(([option, label]) => <button key={option} className={`seg-item ${value === option ? "on" : ""}`} onClick={() => onChange(option)}>{label}</button>)}</div>;
}

function numberOrUndefined(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
