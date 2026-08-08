import type { FoodCat, MealSlot, RecipeCat } from "./types";

export interface AgentFoodPayload {
  name: string;
  emoji: string | null;
  meal: MealSlot;
  grams: number | null;
  cal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  sodiumMg: number | null;
}

export interface AgentRecipeIngredient {
  name: string;
  amount: string;
  category: FoodCat;
}

export interface AgentRecipePayload {
  name: string;
  emoji: string;
  category: RecipeCat;
  minutes: number;
  difficulty: 1 | 2 | 3;
  servings: number;
  cal: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: AgentRecipeIngredient[];
  steps: string[];
  tags: string[];
}

export interface AgentTargetsPayload {
  cal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  waterCups: number | null;
}

export interface AgentExercisePayload {
  name: string;
  sets: number;
  reps: string;
  rpe: number | null;
  restMin: number | null;
  cue: string | null;
  seedWeight: number | null;
}

export interface AgentWorkoutExercisePatch {
  planId: string;
  weekNumber: number;
  dayNumber: number;
  exerciseNumber: number;
  name: string | null;
  sets: number | null;
  reps: string | null;
  rpe: number | null;
  restMin: number | null;
  cue: string | null;
}

export interface AgentWorkoutDayPayload {
  planId: string;
  weekNumber: number;
  dayNumber: number;
  dayName: string;
  exercises: AgentExercisePayload[];
}

export type AgentAction =
  | { id: string; kind: "log_food"; payload: AgentFoodPayload }
  | { id: string; kind: "draft_recipe"; payload: AgentRecipePayload }
  | { id: string; kind: "update_daily_targets"; payload: AgentTargetsPayload }
  | { id: string; kind: "update_workout_exercise"; payload: AgentWorkoutExercisePatch }
  | { id: string; kind: "replace_workout_day"; payload: AgentWorkoutDayPayload };

export interface AgentChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: AgentAction[];
  error?: boolean;
}

export function actionTitle(action: AgentAction, lang: "en" | "zh"): string {
  const zh = lang === "zh";
  switch (action.kind) {
    case "log_food":
      return zh ? `記錄 ${action.payload.name}` : `Log ${action.payload.name}`;
    case "draft_recipe":
      return zh ? `儲存食譜：${action.payload.name}` : `Save recipe: ${action.payload.name}`;
    case "update_daily_targets":
      return zh ? "更新每日目標" : "Update daily targets";
    case "update_workout_exercise":
      return zh ? "編輯訓練動作" : "Edit workout exercise";
    case "replace_workout_day":
      return zh ? `更新訓練日：${action.payload.dayName}` : `Update workout day: ${action.payload.dayName}`;
  }
}

export function actionPreviewLines(action: AgentAction, lang: "en" | "zh"): string[] {
  const zh = lang === "zh";
  switch (action.kind) {
    case "log_food": {
      const p = action.payload;
      return [
        `${formatCalories(p.cal)} cal · P ${round(p.protein)}g · C ${round(p.carbs)}g · F ${round(p.fat)}g`,
        `${mealLabel(p.meal, lang)}${p.grams == null ? "" : ` · ${round(p.grams)} g`}`,
      ];
    }
    case "draft_recipe": {
      const p = action.payload;
      return [
        `${p.minutes} ${zh ? "分鐘" : "min"} · ${p.servings} ${zh ? "份" : p.servings === 1 ? "serving" : "servings"}`,
        `${formatCalories(p.cal)} cal · P ${round(p.protein)}g · C ${round(p.carbs)}g · F ${round(p.fat)}g`,
        `${p.ingredients.length} ${zh ? "項食材" : p.ingredients.length === 1 ? "ingredient" : "ingredients"}`,
      ];
    }
    case "update_daily_targets": {
      const p = action.payload;
      const values = [
        p.cal == null ? null : `${zh ? "熱量" : "Calories"} ${formatCalories(p.cal)} cal`,
        p.protein == null ? null : `${zh ? "蛋白質" : "Protein"} ${round(p.protein)}g`,
        p.carbs == null ? null : `${zh ? "碳水" : "Carbs"} ${round(p.carbs)}g`,
        p.fat == null ? null : `${zh ? "脂肪" : "Fat"} ${round(p.fat)}g`,
        p.waterCups == null ? null : `${zh ? "飲水" : "Water"} ${round(p.waterCups)} ${zh ? "杯" : "cups"}`,
      ].filter((v): v is string => Boolean(v));
      return values.length ? values : [zh ? "沒有目標變更" : "No target changes"];
    }
    case "update_workout_exercise": {
      const p = action.payload;
      const changes = [
        p.name,
        p.sets == null ? null : `${p.sets} ${zh ? "組" : "sets"}`,
        p.reps == null ? null : `${p.reps} ${zh ? "次" : "reps"}`,
        p.rpe == null ? null : `RPE ${p.rpe}`,
        p.restMin == null ? null : `${zh ? "休息" : "rest"} ${p.restMin} min`,
      ].filter((v): v is string => Boolean(v));
      return [
        `${zh ? "第" : "Week "}${p.weekNumber}${zh ? "週 · 第" : " · Day "}${p.dayNumber}${zh ? "天 · 動作 " : " · Exercise "}${p.exerciseNumber}`,
        changes.join(" · ") || (zh ? "更新提示" : "Update cue"),
      ];
    }
    case "replace_workout_day": {
      const p = action.payload;
      return [
        `${zh ? "第" : "Week "}${p.weekNumber}${zh ? "週 · 第" : " · Day "}${p.dayNumber}${zh ? "天" : ""}`,
        `${p.exercises.length} ${zh ? "個動作" : p.exercises.length === 1 ? "exercise" : "exercises"}`,
      ];
    }
  }
}

function round(value: number): string {
  return Number(value.toFixed(1)).toString();
}

function formatCalories(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

function mealLabel(meal: MealSlot, lang: "en" | "zh"): string {
  const labels: Record<MealSlot, { en: string; zh: string }> = {
    breakfast: { en: "Breakfast", zh: "早餐" },
    lunch: { en: "Lunch", zh: "午餐" },
    dinner: { en: "Dinner", zh: "晚餐" },
    snack: { en: "Snack", zh: "點心" },
  };
  return labels[meal][lang];
}
