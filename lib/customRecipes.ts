import type { Macros, MealSlot, NutritionUnit, Recipe, RecipeNutritionBasis } from "./types";
import { mulMacros } from "./nutrition";

export const NUTRITION_UNITS: NutritionUnit[] = [
  "serving",
  "g",
  "ml",
  "oz",
  "fl_oz",
  "cup",
  "scoop",
  "piece",
];

export function caloriesFromMacros(macros: Pick<Macros, "protein" | "carbs" | "fat">): number {
  return Math.round(Math.max(0, macros.protein * 4 + macros.carbs * 4 + macros.fat * 9));
}

export function nutritionBasis(recipe: Pick<Recipe, "nutritionBasis">): RecipeNutritionBasis {
  const basis = recipe.nutritionBasis;
  if (!basis || !Number.isFinite(basis.amount) || basis.amount <= 0) {
    return { amount: 1, unit: "serving" };
  }
  return basis;
}

export function macrosForRecipeAmount(recipe: Recipe, amount: number): Macros {
  const basis = nutritionBasis(recipe);
  return mulMacros(recipe.perServing, Math.max(0, amount) / basis.amount);
}

export function nutritionUnitLabel(unit: NutritionUnit, amount: number, lang: "en" | "zh"): string {
  if (lang === "zh") {
    const labels: Record<NutritionUnit, string> = {
      serving: "份",
      g: "克",
      ml: "毫升",
      oz: "盎司",
      fl_oz: "液量盎司",
      cup: "杯",
      scoop: "匙",
      piece: "個",
    };
    return labels[unit];
  }
  const singular: Record<NutritionUnit, string> = {
    serving: "serving",
    g: "g",
    ml: "ml",
    oz: "oz",
    fl_oz: "fl oz",
    cup: "cup",
    scoop: "scoop",
    piece: "piece",
  };
  if (amount === 1 || unit === "g" || unit === "ml" || unit === "oz" || unit === "fl_oz") return singular[unit];
  return `${singular[unit]}s`;
}

export function nutritionUnitStep(unit: NutritionUnit): number {
  if (unit === "g" || unit === "ml") return 10;
  if (unit === "oz" || unit === "fl_oz") return 0.5;
  return 0.5;
}

export function routineMatches(
  recipe: Pick<Recipe, "routine">,
  date: Date,
  meal?: MealSlot
): boolean {
  const routine = recipe.routine;
  if (!routine?.days.includes(date.getDay())) return false;
  return !meal || !routine.meal || routine.meal === meal;
}

function normalize(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\u3400-\u9fff]+/g, " ").trim();
}

function score(query: string, value: string): number {
  const candidate = normalize(value);
  if (!candidate) return 0;
  if (candidate === query) return 160;
  if (candidate.startsWith(query)) return 130;
  if (candidate.includes(query)) return 100;
  const words = query.split(" ").filter(Boolean);
  if (words.length && words.every((word) => candidate.includes(word))) return 75;
  return 0;
}

/** Dedicated search over the user's current saved recipe list. */
export function searchCurrentRecipes(queryValue: string, recipes: Recipe[], limit = 12): Recipe[] {
  const query = normalize(queryValue);
  const current = recipes.filter((recipe) => recipe.custom);
  if (!query) return current.slice(0, Math.max(1, limit));

  return current
    .map((recipe) => {
      const nameScore = Math.max(score(query, recipe.name.en), score(query, recipe.name.zh));
      const tagScore = score(query, recipe.tags.join(" "));
      const ingredientScore = score(
        query,
        recipe.ingredients.flatMap((ingredient) => [ingredient.name.en, ingredient.name.zh]).join(" ")
      );
      return { recipe, score: Math.max(nameScore, tagScore - 5, ingredientScore - 15) };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.recipe.name.en.localeCompare(b.recipe.name.en))
    .slice(0, Math.max(1, limit))
    .map((result) => result.recipe);
}
