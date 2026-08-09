import type { FoodItem, Recipe } from "./types";

export type FoodSearchResult =
  | { kind: "food"; item: FoodItem; score: number; matchedOn: string }
  | { kind: "recipe"; item: Recipe; score: number; matchedOn: string };

const SEARCH_SYNONYMS: Record<string, string[]> = {
  lychee: ["litchi", "litchis"],
  venison: ["deer", "game meat deer"],
  cilantro: ["coriander leaves"],
  scallion: ["spring onion", "green onion"],
  scallions: ["spring onions", "green onions"],
  arugula: ["rocket"],
  zucchini: ["summer squash"],
  aubergine: ["eggplant"],
  garbanzo: ["chickpea"],
  garbanzos: ["chickpeas"],
  prawn: ["shrimp"],
  prawns: ["shrimp"],
  capsicum: ["bell pepper"],
  yuca: ["cassava", "manioc"],
  pitaya: ["dragon fruit"],
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\u3400-\u9fff]+/g, " ")
    .trim();
}

function singularizeWord(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("oes")) return word.slice(0, -2);
  if (word.endsWith("ches") || word.endsWith("shes") || word.endsWith("xes") || word.endsWith("zes")) {
    return word.slice(0, -2);
  }
  if (word.endsWith("ses") && !word.endsWith("sses")) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function singularizePhrase(value: string): string {
  return value.split(" ").map(singularizeWord).join(" ");
}

function scoreText(query: string, value: string): number {
  const normalized = normalize(value);
  if (!normalized) return 0;
  const synonyms = SEARCH_SYNONYMS[query] ?? [];
  const queryVariants = [...new Set([query, singularizePhrase(query), ...synonyms.map(normalize), ...synonyms.map((item) => singularizePhrase(normalize(item)))])];
  const valueVariants = [...new Set([normalized, singularizePhrase(normalized)])];
  if (queryVariants.some((candidate) => valueVariants.includes(candidate))) return 120;
  if (queryVariants.some((candidate) => valueVariants.some((target) => target.startsWith(candidate)))) return 92;
  if (queryVariants.some((candidate) => valueVariants.some((target) => target.includes(candidate)))) return 72;
  if (queryVariants.some((candidate) => {
    const words = candidate.split(" ").filter(Boolean);
    return words.length && valueVariants.some((target) => words.every((word) => target.includes(word)));
  })) return 58;
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
