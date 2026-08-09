import { BUILTIN_FOODS } from "../foods";
import { BUILTIN_RECIPES } from "../recipes";
import { resolveFoodServing } from "../foodServing";
import type { FoodItem, Recipe } from "../types";

export type FoodCandidateKind = "food" | "recipe" | "open_food_facts";

export interface FoodCandidate {
  id: string;
  kind: FoodCandidateKind;
  source: "MelonMate food library" | "MelonMate recipe" | "Open Food Facts";
  name: string;
  brand?: string;
  serving: string;
  grams: number | null;
  ingredients?: string[];
  cal: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface OffProduct {
  code?: unknown;
  product_name?: unknown;
  product_name_en?: unknown;
  generic_name?: unknown;
  brands?: unknown;
  quantity?: unknown;
  serving_size?: unknown;
  serving_quantity?: unknown;
  nutriments?: Record<string, number>;
}

const OFF_FIELDS = [
  "code",
  "product_name",
  "product_name_en",
  "generic_name",
  "brands",
  "quantity",
  "serving_size",
  "serving_quantity",
  "nutriments",
].join(",");
const OFF_USER_AGENT = process.env.OPEN_FOOD_FACTS_USER_AGENT || "MelonMate/1.0 (https://melon-mate.vercel.app)";
const SEARCH_CACHE = new Map<string, { expiresAt: number; candidates: FoodCandidate[] }>();

/** Search local foods/recipes and Open Food Facts, returning the closest k usable candidates. */
export async function searchFoodCandidates(
  rawQueries: string[],
  providedCandidates: FoodCandidate[] = [],
  k = 30
): Promise<FoodCandidate[]> {
  const queries = [...new Set(rawQueries.map(cleanQuery).filter(Boolean))].slice(0, 12);
  if (!queries.length) return [];
  const limit = Math.min(30, Math.max(1, Math.round(k)));

  const rankedLocal = queries.flatMap((query) => [
    ...BUILTIN_FOODS.map((item) => ({
      score: Math.max(fuzzyScore(query, item.name.en), fuzzyScore(query, item.name.zh)),
      candidate: foodCandidate(item),
    })),
    ...BUILTIN_RECIPES.map((item) => ({
      score: Math.max(
        fuzzyScore(query, item.name.en),
        fuzzyScore(query, item.name.zh),
        fuzzyScore(query, item.ingredients.map((ingredient) => `${ingredient.name.en} ${ingredient.name.zh}`).join(" ")) - 15
      ),
      candidate: recipeCandidate(item),
    })),
    ...providedCandidates.map((candidate) => ({
      score: fuzzyScore(query, `${candidate.name} ${candidate.brand ?? ""} ${(candidate.ingredients ?? []).join(" ")}`) + 35,
      candidate,
    })),
  ]).filter((match) => match.score >= 48);

  const perQueryLimit = Math.max(6, Math.ceil(limit / queries.length) + 4);
  const offMatches = (await Promise.all(queries.map((query) => searchOpenFoodFacts(query, perQueryLimit)))).flat();
  const rankedOff = queries.flatMap((query) => offMatches.map((candidate) => ({
    score: fuzzyScore(query, `${candidate.name} ${candidate.brand ?? ""}`) + 12,
    candidate,
  }))).filter((match) => match.score >= 48);

  const seen = new Set<string>();
  return [...rankedLocal, ...rankedOff]
    .sort((a, b) => b.score - a.score || sourceRank(a.candidate) - sourceRank(b.candidate))
    .filter(({ candidate }) => {
      const key = `${candidate.kind}:${candidate.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}

export function sanitizeProvidedCandidates(value: unknown, limit = 120): FoodCandidate[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isFoodCandidate).slice(0, limit).map((candidate) => ({
    ...candidate,
    name: candidate.name.trim().slice(0, 100),
    brand: candidate.brand?.trim().slice(0, 80),
    serving: candidate.serving.trim().slice(0, 80),
    ingredients: candidate.ingredients?.map((item) => String(item).trim().slice(0, 80)).filter(Boolean).slice(0, 30),
    grams: candidate.grams == null ? null : nonNegative(candidate.grams),
    cal: nonNegative(candidate.cal),
    protein: nonNegative(candidate.protein),
    carbs: nonNegative(candidate.carbs),
    fat: nonNegative(candidate.fat),
  }));
}

async function searchOpenFoodFacts(query: string, limit: number): Promise<FoodCandidate[]> {
  const cacheKey = `${query}:${limit}`;
  const cached = SEARCH_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.candidates;

  const products = await searchALicious(query, limit) || await legacyOffSearch(query, limit);
  const candidates = (products ?? []).map(offCandidate).filter((item): item is FoodCandidate => Boolean(item)).slice(0, limit);
  SEARCH_CACHE.set(cacheKey, { expiresAt: Date.now() + 10 * 60_000, candidates });
  if (SEARCH_CACHE.size > 100) SEARCH_CACHE.delete(SEARCH_CACHE.keys().next().value ?? "");
  return candidates;
}

async function searchALicious(query: string, limit: number): Promise<OffProduct[] | null> {
  const url = new URL("https://search.openfoodfacts.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("page", "1");
  url.searchParams.set("page_size", String(limit));
  url.searchParams.set("langs", "en,zh");
  url.searchParams.set("fields", OFF_FIELDS);
  url.searchParams.set("boost_phrase", "true");
  return fetchOffProducts(url);
}

async function legacyOffSearch(query: string, limit: number): Promise<OffProduct[] | null> {
  const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
  url.searchParams.set("search_terms", query);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", String(limit));
  url.searchParams.set("fields", OFF_FIELDS);
  return fetchOffProducts(url);
}

async function fetchOffProducts(url: URL): Promise<OffProduct[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2800);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "Accept-Language": "en-US,en;q=0.9,zh;q=0.6", "User-Agent": OFF_USER_AGENT },
    });
    if (!response.ok || !response.headers.get("content-type")?.includes("json")) return null;
    const data = await response.json() as unknown;
    return extractOffProducts(data);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function extractOffProducts(value: unknown): OffProduct[] | null {
  if (!value || typeof value !== "object") return null;
  const data = value as { products?: unknown; hits?: unknown; results?: unknown };
  if (Array.isArray(data.products)) return data.products as OffProduct[];
  if (Array.isArray(data.results)) return data.results as OffProduct[];
  if (Array.isArray(data.hits)) return data.hits.map(unwrapOffHit).filter((item): item is OffProduct => Boolean(item));
  if (data.hits && typeof data.hits === "object" && Array.isArray((data.hits as { hits?: unknown }).hits)) {
    return ((data.hits as { hits: unknown[] }).hits).map(unwrapOffHit).filter((item): item is OffProduct => Boolean(item));
  }
  return null;
}

function unwrapOffHit(value: unknown): OffProduct | null {
  if (!value || typeof value !== "object") return null;
  const hit = value as { _source?: unknown };
  return (hit._source && typeof hit._source === "object" ? hit._source : hit) as OffProduct;
}

function offCandidate(product: OffProduct): FoodCandidate | null {
  const code = textValue(product.code);
  const name = textValue(product.product_name_en) || textValue(product.product_name) || textValue(product.generic_name);
  const brand = textValue(product.brands);
  const nutriments = product.nutriments ?? {};
  const per100Calories = nutriments["energy-kcal_100g"] ??
    (nutriments["energy_100g"] != null ? nutriments["energy_100g"] / 4.184 : undefined);
  if (!code || !name || per100Calories == null) return null;
  const servingGrams = parsePositive(product.serving_quantity);
  const factor = servingGrams ? servingGrams / 100 : 1;
  const serving = textValue(product.serving_size) || (servingGrams ? `${servingGrams} g serving` : "100 g");
  return {
    id: `off-${code}`,
    kind: "open_food_facts",
    source: "Open Food Facts",
    name: name.slice(0, 100),
    brand: brand ? brand.slice(0, 80) : undefined,
    serving: String(serving).slice(0, 80),
    grams: servingGrams ?? 100,
    cal: rounded(per100Calories * factor, 0),
    protein: rounded((nutriments["proteins_100g"] ?? 0) * factor),
    carbs: rounded((nutriments["carbohydrates_100g"] ?? 0) * factor),
    fat: rounded((nutriments["fat_100g"] ?? 0) * factor),
  };
}

function foodCandidate(item: FoodItem): FoodCandidate {
  const serving = resolveFoodServing(item, "en");
  return {
    id: item.id,
    kind: "food",
    source: "MelonMate food library",
    name: item.name.en,
    serving: serving.label,
    grams: serving.grams,
    cal: serving.macros.cal,
    protein: serving.macros.protein,
    carbs: serving.macros.carbs,
    fat: serving.macros.fat,
  };
}

function recipeCandidate(item: Recipe): FoodCandidate {
  return {
    id: item.id,
    kind: "recipe",
    source: "MelonMate recipe",
    name: item.name.en,
    serving: "1 serving",
    grams: null,
    ingredients: item.ingredients.map((ingredient) => ingredient.name.en),
    cal: item.perServing.cal,
    protein: item.perServing.protein,
    carbs: item.perServing.carbs,
    fat: item.perServing.fat,
  };
}

function fuzzyScore(rawQuery: string, rawCandidate: string): number {
  const query = normalize(rawQuery);
  const candidate = normalize(rawCandidate);
  if (!query || !candidate) return 0;
  if (candidate === query) return 180;
  if (candidate.startsWith(query)) return 150;
  if (candidate.includes(query)) return 125;
  const queryWords = query.split(" ").filter(Boolean);
  const candidateWords = candidate.split(" ").filter(Boolean);
  const similarities = queryWords.map((word) => Math.max(...candidateWords.map((other) => similarity(word, other))));
  const average = similarities.reduce((sum, value) => sum + value, 0) / similarities.length;
  const coverage = similarities.filter((value) => value >= 0.72).length / similarities.length;
  const reverseSimilarities = candidateWords.map((word) => Math.max(...queryWords.map((other) => similarity(word, other))));
  const reverseAverage = reverseSimilarities.reduce((sum, value) => sum + value, 0) / reverseSimilarities.length;
  const reverseCoverage = reverseSimilarities.filter((value) => value >= 0.72).length / reverseSimilarities.length;
  return Math.round(Math.max(average * 62 + coverage * 38, reverseAverage * 62 + reverseCoverage * 38));
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length > 2 && (a.includes(b) || b.includes(a))) return Math.min(a.length, b.length) / Math.max(a.length, b.length);
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length, 1);
}

function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

function cleanQuery(value: string): string {
  return String(value).trim().replace(/\s+/g, " ").slice(0, 100);
}

function normalize(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\u3400-\u9fff]+/g, " ").trim();
}

function sourceRank(candidate: FoodCandidate): number {
  return candidate.kind === "recipe" ? 0 : candidate.kind === "food" ? 1 : 2;
}

function isFoodCandidate(value: unknown): value is FoodCandidate {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<FoodCandidate>;
  return typeof candidate.id === "string" &&
    (candidate.kind === "food" || candidate.kind === "recipe" || candidate.kind === "open_food_facts") &&
    (candidate.source === "MelonMate food library" || candidate.source === "MelonMate recipe" || candidate.source === "Open Food Facts") &&
    typeof candidate.name === "string" && typeof candidate.serving === "string" &&
    typeof candidate.cal === "number" && typeof candidate.protein === "number" &&
    typeof candidate.carbs === "number" && typeof candidate.fat === "number";
}

function parsePositive(value: unknown): number | null {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? parseFloat(value) : NaN;
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function textValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join(", ");
  if (value && typeof value === "object") {
    const localized = value as Record<string, unknown>;
    return textValue(localized.en) || textValue(localized.zh) || textValue(localized.default);
  }
  return "";
}

function nonNegative(value: number): number {
  return Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0);
}

function rounded(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(Math.max(0, value) * factor) / factor;
}
