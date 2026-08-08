import type {
  ActivityLevel,
  FitnessGoal,
  Gender,
  Goals,
  Profile,
  Recipe,
  TrainingFocus,
  WorkoutPlan,
} from "./types";

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
};

export interface CalorieEstimateInput {
  gender?: Gender;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  activityLevel?: ActivityLevel;
  fitnessGoal?: FitnessGoal;
  weeklyChangeKg?: number;
}

export interface CalorieEstimate {
  bmr: number;
  maintenanceCal: number;
  goals: Goals;
  usedDefaults: boolean;
}

/** Mifflin-St Jeor estimate with a neutral midpoint when sex is not supplied. */
export function estimateDailyTargets(input: CalorieEstimateInput): CalorieEstimate {
  const age = valid(input.age, 13, 100) ? input.age! : 30;
  const height = valid(input.heightCm, 120, 230) ? input.heightCm! : 170;
  const weight = valid(input.weightKg, 35, 300) ? input.weightKg! : 70;
  const activity = input.activityLevel ?? "light";
  const goal = input.fitnessGoal ?? "maintain";
  const genderOffset = input.gender === "male" ? 5 : input.gender === "female" ? -161 : -78;
  const bmrInFoodCalories = 10 * weight + 6.25 * height - 5 * age + genderOffset;
  const maintenanceInFoodCalories = bmrInFoodCalories * ACTIVITY_FACTOR[activity];
  const weeklyChange = Math.min(0.9, Math.max(0, input.weeklyChangeKg ?? 0));
  const rawAdjustment = (weeklyChange * 7700) / 7;
  const adjustment = goal === "lose" ? -rawAdjustment : goal === "gain" ? rawAdjustment : 0;
  const conservativeFloor = input.gender === "male" ? 1500 : 1200;
  const dailyFoodCalories = roundTo50(Math.max(conservativeFloor, maintenanceInFoodCalories + adjustment));
  const protein = Math.round(weight * (goal === "maintain" ? 1.6 : 1.8));
  const fat = Math.round(Math.max(weight * 0.75, (dailyFoodCalories * 0.22) / 9));
  const carbs = Math.max(40, Math.round((dailyFoodCalories - protein * 4 - fat * 9) / 4));

  return {
    bmr: Math.round(bmrInFoodCalories),
    maintenanceCal: roundTo50(maintenanceInFoodCalories),
    goals: { cal: dailyFoodCalories, protein, carbs, fat },
    usedDefaults: !valid(input.age, 13, 100) || !valid(input.heightCm, 120, 230) || !valid(input.weightKg, 35, 300),
  };
}

export function recommendWorkoutPlans(
  profile: Pick<Profile, "trainingDays" | "trainingFocus" | "fitnessGoal">,
  plans: WorkoutPlan[],
  limit = 3
): WorkoutPlan[] {
  const days = profile.trainingDays ?? 3;
  const focus: TrainingFocus = profile.trainingFocus ?? "general";
  const goal: FitnessGoal = profile.fitnessGoal ?? "maintain";

  return [...plans]
    .map((plan, index) => ({
      plan,
      index,
      score:
        (plan.daysPerWeek === days ? 8 : -Math.abs((plan.daysPerWeek ?? 4) - days) * 2) +
        (plan.focus === focus ? 5 : 0) +
        (plan.goals?.includes(goal) ? 8 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ plan }) => plan);
}

export function recommendRecipes(
  profile: Pick<Profile, "dietPreferences" | "cuisinePreferences" | "fitnessGoal">,
  recipes: Recipe[],
  limit = 6
): Recipe[] {
  const wanted = [...(profile.dietPreferences ?? []), ...(profile.cuisinePreferences ?? [])].map(normalize);
  const goalTag = profile.fitnessGoal === "gain" ? "massgain" : profile.fitnessGoal === "lose" ? "fatloss" : "balanced";

  return [...recipes]
    .map((recipe, index) => {
      const tags = recipe.tags.map(normalize);
      const preferenceHits = wanted.filter((tag) => tags.includes(tag)).length;
      return {
        recipe,
        index,
        score:
          preferenceHits * 8 +
          (tags.includes(goalTag) ? 3 : 0) +
          (tags.includes("mealprep") ? 3 : 0) +
          (recipe.minutes <= 35 ? 2 : 0) +
          (recipe.difficulty === 1 ? 1 : 0),
      };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ recipe }) => recipe);
}

/** The personal recipe library contains only explicit picks and user-created recipes. */
export function selectedRecipesForProfile(
  profile: Pick<Profile, "selectedRecipeIds">,
  recipes: Recipe[]
): Recipe[] {
  const selected = new Set(profile.selectedRecipeIds ?? []);
  return recipes.filter((recipe) => selected.has(recipe.id) || recipe.custom);
}

export function kgToLb(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10;
}

export function lbToKg(lb: number): number {
  return Math.round((lb / 2.20462) * 10) / 10;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function valid(value: number | undefined, min: number, max: number) {
  return value != null && Number.isFinite(value) && value >= min && value <= max;
}

function roundTo50(value: number) {
  return Math.round(value / 50) * 50;
}
