import type { FoodItem, Recipe } from "./types";

export type FoodSearchResult =
  | { kind: "food"; item: FoodItem; score: number; matchedOn: string }
  | { kind: "recipe"; item: Recipe; score: number; matchedOn: string };

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\u3400-\u9fff]+/g, " ")
    .trim();
}

function scoreText(query: string, value: string): number {
  const normalized = normalize(value);
  if (!normalized) return 0;
  if (normalized === query) return 120;
  if (query.endsWith("s") && normalized === query.slice(0, -1)) return 112;
  if (normalized.startsWith(query)) return 92;
  if (normalized.includes(query)) return 72;
  const words = query.split(" ").filter(Boolean);
  if (words.length && words.every((word) => normalized.includes(word))) return 58;
  return 0;
}

/** Searches built-in foods plus the user's curated foods, recipes, and recipe ingredients. */
export function searchFoodCatalog(
  rawQuery: string,
  foods: FoodItem[],
  recipes: Recipe[],
  limit = 12
): FoodSearchResult[] {
  const query = normalize(rawQuery);
  if (!query) return [];

  const results: FoodSearchResult[] = [];
  for (const item of foods) {
    const en = scoreText(query, item.name.en);
    const zh = scoreText(query, item.name.zh);
    const score = Math.max(en, zh);
    if (score > 0) {
      results.push({
        kind: "food",
        item,
        score: score + (item.custom ? 8 : 0),
        matchedOn: item.custom ? "My ingredient" : "Food library",
      });
    }
  }

  for (const item of recipes) {
    const nameScore = Math.max(scoreText(query, item.name.en), scoreText(query, item.name.zh));
    let ingredientScore = 0;
    let ingredientName = "";
    for (const ingredient of item.ingredients) {
      const score = Math.max(scoreText(query, ingredient.name.en), scoreText(query, ingredient.name.zh));
      if (score > ingredientScore) {
        ingredientScore = score;
        ingredientName = ingredient.name.en || ingredient.name.zh;
      }
    }
    const score = Math.max(nameScore, ingredientScore ? Math.min(68, ingredientScore) : 0);
    if (score > 0) {
      results.push({
        kind: "recipe",
        item,
        score: score + (item.custom ? 10 : 0),
        matchedOn: nameScore >= ingredientScore
          ? item.custom ? "My recipe" : "Recipe"
          : `Ingredient: ${ingredientName}`,
      });
    }
  }

  return results
    .sort((a, b) => b.score - a.score || a.item.name.en.localeCompare(b.item.name.en))
    .slice(0, Math.max(1, limit));
}
