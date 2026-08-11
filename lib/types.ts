export type Lang = "en" | "zh";
export type ThemeId =
  | "honeydew"
  | "watermelon"
  | "cantaloupe"
  | "canary"
  | "hami"
  | "chamoe"
  | "moon-gold"
  | "densuke";
export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";
export type WeightUnit = "lb" | "kg";
export type Gender = "female" | "male" | "nonbinary" | "unspecified";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "very";
export type FitnessGoal = "lose" | "maintain" | "gain";
export type TrainingFocus = "general" | "hypertrophy" | "strength";
export type MuscleGroup = "quads" | "hams" | "chest" | "back" | "shoulders" | "arms" | "core" | "calves";
export type ExerciseEquipment =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "bodyweight"
  | "kettlebell"
  | "band"
  | "smith"
  | "landmine"
  | "other";

export interface BiText {
  en: string;
  zh: string;
}

export interface Macros {
  cal: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Optional label nutrients. Sodium is stored in milligrams; the rest are grams. */
  fiber?: number;
  sugar?: number;
  sodiumMg?: number;
}

export type FoodCat =
  | "protein"
  | "carb"
  | "veg"
  | "fruit"
  | "dairy"
  | "fat"
  | "drink"
  | "snack"
  | "sauce"
  | "other";

export interface FoodItem {
  id: string;
  name: BiText;
  /** Alternate, regional, or transliterated names accepted by catalog search. */
  aliases?: string[];
  emoji: string;
  /** macros per 100 g (or per 100 ml for liquids) */
  per100: Macros;
  /** A common serving. `unitCount` prevents counted input such as "3 wings"
   * from multiplying a multi-item serving (for example, a 3-wing serving) 3×. */
  serving?: { label: BiText; grams: number; unitCount?: number; unitLabel?: BiText };
  cat: FoodCat;
  /** Nutrition provenance for bundled reference foods. */
  source?: { name: string; id?: string };
  /** Context shown when an ingredient is normally used in tiny amounts. */
  usageNote?: BiText;
  /** True when the bundled macros are a generic estimate rather than a lab value. */
  nutritionEstimate?: boolean;
  /** True for additives whose nutrition is negligible at the provided 1 g logging amount. */
  traceIngredient?: boolean;
  barcode?: string;
  custom?: boolean;
}

export interface LogEntry {
  id: string;
  date: string; // YYYY-MM-DD local
  meal: MealSlot;
  name: BiText;
  emoji?: string;
  grams?: number;
  /** The amount the person logged in the saved item's own unit. */
  amount?: number;
  amountUnit?: NutritionUnit;
  macros: Macros;
  src?: "food" | "recipe" | "manual" | "text" | "voice" | "barcode" | "photo";
  refId?: string;
  /** Immediate XP attached to this entry so deleting it can reverse the reward. */
  xpAwarded?: number;
  at: number;
}

export interface Ingredient {
  name: BiText;
  amount: BiText; // display amount e.g. "200 g" / "2 顆"
  cat?: FoodCat;
}

export type RecipeCat = "asian" | "western" | "pasta" | "breakfast" | "veg" | "custom";

export type NutritionUnit = "serving" | "g" | "ml" | "oz" | "fl_oz" | "cup" | "scoop" | "piece";

export interface RecipeNutritionBasis {
  /** Macros in `perServing` describe this amount, e.g. 1 serving or 100 g. */
  amount: number;
  unit: NutritionUnit;
}

export interface RecipeRoutine {
  /** JavaScript weekday numbers: Sunday = 0 through Saturday = 6. */
  days: number[];
  /** Optional meal used to rank this item in the food logger. */
  meal?: MealSlot;
}

export interface Recipe {
  id: string;
  name: BiText;
  emoji: string;
  cat: RecipeCat;
  minutes: number;
  difficulty: 1 | 2 | 3;
  servings: number;
  perServing: Macros;
  /** Defaults to 1 serving for recipes saved before flexible units existed. */
  nutritionBasis?: RecipeNutritionBasis;
  /** Optional recurring schedule used for timely quick-log suggestions. */
  routine?: RecipeRoutine;
  ingredients: Ingredient[];
  /** Optional ordered cooking method, used by AI-drafted and custom recipes. */
  steps?: BiText[];
  tags: string[];
  custom?: boolean;
}

export interface PlannedMeal {
  recipeId: string;
  servings: number;
}

export type DayPlan = Partial<Record<MealSlot, PlannedMeal[]>>;

export interface MealPlanTemplate {
  id: string;
  name: string;
  /** Seven relative days, Monday through Sunday. */
  days: DayPlan[];
  createdAt: number;
}

export interface GroceryItem {
  id: string;
  name: BiText;
  qty: string;
  checked: boolean;
  cat: FoodCat | "other";
}

export interface ExerciseSpec {
  id: string;
  /** Stable history key. It stays the same when the display name is edited. */
  historyKey?: string;
  name: BiText;
  sets: number;
  reps: string; // "6", "20 sec", "10/leg"
  rpe?: number;
  /** Intended working weight in the profile's unit. */
  targetWeight?: number;
  restMin?: number;
  description?: BiText;
  cue?: BiText;
  seedWeight?: number; // last known working weight from the imported sheet
}

/** A reusable user-created exercise that appears alongside the built-in catalog. */
export interface CustomExercise {
  id: string;
  historyKey: string;
  name: BiText;
  group: MuscleGroup;
  equipment: ExerciseEquipment;
  cue?: BiText;
  createdAt: number;
}

export interface WorkoutDay {
  id: string;
  name: BiText;
  exercises: ExerciseSpec[];
}

export interface WorkoutWeek {
  days: WorkoutDay[];
}

export interface WorkoutPlan {
  id: string;
  name: BiText;
  note?: BiText;
  weeks: WorkoutWeek[];
  /** Recommendation metadata; the workout itself is suitable for every gender. */
  daysPerWeek?: number;
  focus?: TrainingFocus;
  goals?: FitnessGoal[];
  intensity?: "light" | "moderate" | "focused" | "intense";
}

export interface SetLog {
  w: number; // weight in the profile's unit
  reps: number;
  rpe?: number;
  done: boolean;
}

export interface SessionExercise {
  key: string; // normalized exercise name — history key
  name: BiText;
  targetSets: number;
  targetReps: string;
  targetRpe?: number;
  targetWeight?: number;
  restMin?: number;
  description?: BiText;
  cue?: BiText;
  sets: SetLog[];
}

export interface WorkoutSession {
  id: string;
  date: string;
  planId: string;
  weekIdx: number;
  dayIdx: number;
  dayName: BiText;
  entries: SessionExercise[];
  startedAt: number;
  endedAt?: number;
  prs: number;
}

export interface WeightEntry {
  date: string;
  value: number; // in profile unit (lb or kg)
}

export interface Goals {
  cal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Profile {
  id: string;
  name: string;
  emoji: string;
  /** A safe built-in avatar path or compact locally selected raster data URL. */
  photoDataUrl?: string;
  goals: Goals;
  /** Personal hydration target; older saved profiles fall back to 8 cups. */
  waterGoal?: number;
  planId: string;
  unit: WeightUnit;
  gender?: Gender;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  activityLevel?: ActivityLevel;
  fitnessGoal?: FitnessGoal;
  /** Absolute desired change per week. Direction comes from fitnessGoal. */
  weeklyChangeKg?: number;
  trainingDays?: 3 | 4 | 5 | 6;
  trainingFocus?: TrainingFocus;
  dietPreferences?: string[];
  cuisinePreferences?: string[];
  /** Ingredient names or general classes excluded from recipe discovery. */
  ingredientRestrictions?: string[];
  /** Legacy comma-separated restriction field retained for saved-data compatibility. */
  allergies?: string;
  suggestedRecipeIds?: string[];
  /** Recipe IDs the user explicitly added to their personal recipe library. */
  selectedRecipeIds?: string[];
  /** Friend-circle content is opt-in and separate from progress sharing. */
  shareMealPlan?: boolean;
  shareWorkoutPlan?: boolean;
  sharedRecipeIds?: string[];
}

export interface GameState {
  streak: number;
  best: number;
  melons: number; // grown melons (goal days)
  golden: number; // PR melons
  xp: number;
  lastEval: string; // last date evaluated (YYYY-MM-DD)
  history: Record<string, boolean>; // date -> goal hit
  /** Lifetime per-day claims prevent add/delete food-log XP farming. */
  foodLogXpClaims?: Record<string, number>;
  /** Highest HealthKit milestone already rewarded for each local date. */
  healthXpClaims?: Record<string, { stepTier: number; standTier: number }>;
}

export interface HealthActivitySnapshot {
  date: string;
  steps: number;
  standMinutes: number;
  syncedAt: number;
  source: "apple-health";
}

export type MelonVarietyId =
  | "honeydew"
  | "cantaloupe"
  | "watermelon"
  | "hami"
  | "chamoe"
  | "moon-gold"
  | "yubari-ruby"
  | "snow-leopard"
  | "densuke";

export type GardenQuestId = "food" | "cook" | "nutrition" | "hydrate" | "workout";
export type GardenAchievementId =
  | "firstRoots"
  | "allMelons"
  | "hundredEach"
  | "fiveHundredEach"
  | "thousandEach"
  | "fiveSpells"
  | "fiftySpells"
  | "everySpell"
  | "rareMelons"
  | "harvests"
  | "fields";
export type GardenSpellId =
  | "pantry-spark"
  | "trailwind"
  | "hearth-flame"
  | "balance-bloom"
  | "ironroot"
  | "starlight-season"
  | "everripe-eclipse";

export interface GardenPlot {
  id: number;
  variety: MelonVarietyId | null;
  /** Legacy stage progress retained for old saves; new crops use real timestamps. */
  growth: number;
  plantedOn?: string;
  plantedAt?: number;
  readyAt?: number;
}

export interface GardenState {
  dew: number;
  /** Farm-earned contribution to the user's unified XP total. */
  gardenXp: number;
  unlockedPlots: number;
  plots: GardenPlot[];
  harvests: Partial<Record<MelonVarietyId, number>>;
  totalHarvests: number;
  /** Lifetime successful plantings per variety, used for permanent achievements. */
  plantCounts: Partial<Record<MelonVarietyId, number>>;
  /** Lifetime successful spell casts. Buying and claiming do not increment this. */
  totalSpellCasts: number;
  /** Distinct spell types successfully cast at least once. */
  spellIdsUsed: GardenSpellId[];
  /** Achievement celebrations already acknowledged by the user. */
  achievementClaims: GardenAchievementId[];
  /** Achievement XP and Dew rewards already collected by the user. */
  achievementRewardClaims: GardenAchievementId[];
  dailyClaims: Record<string, GardenQuestId[]>;
  /** One free spell redemption per completed daily or weekly goal period. */
  spellClaims: Record<string, GardenSpellId[]>;
  /** Owned spell items, including duplicate copies of the same spell. */
  spellInventory: Partial<Record<GardenSpellId, number>>;
  /** Exact spell items awarded at each level, used to prevent duplicate grants. */
  levelSpellRewards: Record<string, GardenSpellId[]>;
  /** Legacy generic casts are migrated into the spell inventory. */
  bonusSpellCasts?: number;
  lastTended?: string;
}

/* ---------------- shared workspace (friends sync) ---------------- */

/** A bounded, read-only view of a friend's farm. Private quest history stays local. */
export interface FriendFarmSnapshot {
  dew: number;
  gardenXp: number;
  unlockedPlots: number;
  plots: GardenPlot[];
  harvests: Partial<Record<MelonVarietyId, number>>;
  totalHarvests: number;
  lastTended?: string;
}

/** The upcoming meal schedule plus only the recipes referenced by it. */
export interface FriendMealPlanSnapshot {
  days: { date: string; plan: DayPlan }[];
  recipes: Recipe[];
}

/** Aggregate training progress and a small recent-history window. */
export interface FriendWorkoutProgress {
  unit: WeightUnit;
  completed: number;
  totalPrs: number;
  totalVolume: number;
  recent: { date: string; name: BiText; volume: number; prs: number }[];
}

/** The plan currently selected by the friend. */
export interface FriendWorkoutPlanSnapshot {
  plan: WorkoutPlan;
  unit: WeightUnit;
}

/** Content this device has chosen to expose to one specific friend. */
export interface FriendSharingSettings {
  shareMealPlan: boolean;
  shareWorkoutPlan: boolean;
  /** The specific plan shared with this friend. Falls back to the active plan for legacy settings. */
  workoutPlanId?: string;
  sharedRecipeIds: string[];
}

/** What a member publishes for friends to see. */
export interface MemberSnapshot {
  version?: 2 | 3 | 4 | 5 | 6;
  id: string; // profileId.deviceId
  name: string;
  emoji: string;
  photoDataUrl?: string;
  level: number;
  xp: number;
  streak: number;
  best: number;
  melons: number;
  golden: number;
  garden: { date: string; hit: boolean }[]; // last 7 evaluated days
  today: {
    date: string;
    cal: number;
    calGoal: number;
    protein: number;
    proteinGoal: number;
  };
  lastWorkout?: { date: string; name: BiText; volume: number; prs: number };
  farm?: FriendFarmSnapshot;
  mealPlan?: FriendMealPlanSnapshot;
  /** Standalone recipes the owner explicitly chose to share. */
  sharedRecipes?: Recipe[];
  workoutPlan?: FriendWorkoutPlanSnapshot;
  workouts?: FriendWorkoutProgress;
  updatedAt: number;
}

/** Household/friend-editable content that syncs to the workspace. */
export interface WorkspaceShared {
  recipes: Recipe[];
  planner: Record<string, DayPlan>;
  groceries: GroceryItem[];
  customFoods: FoodItem[];
  favorites: string[];
  plans: WorkoutPlan[];
}

export interface WorkspaceDoc {
  rev: number;
  shared: WorkspaceShared | null;
  members: Record<string, MemberSnapshot>;
}
