import type { Recipe, RecipeCat } from "./types";
import { recipeMatchesRestrictions } from "./ingredientRestrictions";

export interface RecipeDiscoveryFilters {
  query?: string;
  category?: RecipeCat | "all";
  diet?: string | "all";
  cuisine?: string | "all";
  excludeIngredients?: string[];
}

function normalizeTag(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeSearch(value: string): string {
  return value.normalize("NFKD").toLowerCase().replace(/\p{Diacritic}/gu, "");
}

export function filterRecipes(recipes: Recipe[], filters: RecipeDiscoveryFilters): Recipe[] {
  const query = normalizeSearch(filters.query?.trim() ?? "");
  const diet = normalizeTag(filters.diet ?? "all");
  const cuisine = normalizeTag(filters.cuisine ?? "all");

  return recipes.filter((recipe) => {
    if (filters.excludeIngredients?.length && recipeMatchesRestrictions(recipe, filters.excludeIngredients)) return false;
    if (filters.category && filters.category !== "all" && recipe.cat !== filters.category) return false;

    const tags = recipe.tags.map(normalizeTag);
    if (diet !== "all" && !tags.includes(diet)) return false;
    if (cuisine !== "all" && !tags.includes(cuisine)) return false;

    if (!query) return true;
    const searchableName = normalizeSearch(`${recipe.name.en} ${recipe.name.zh}`);
    return searchableName.includes(query);
  });
}

export function paginateRecipes<T>(items: T[], requestedPage: number, pageSize: number) {
  const safePageSize = Math.max(1, Math.floor(pageSize) || 1);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const page = Math.min(totalPages, Math.max(1, Math.floor(requestedPage) || 1));
  const start = (page - 1) * safePageSize;

  return {
    items: items.slice(start, start + safePageSize),
    page,
    totalPages,
    totalItems,
  };
}
