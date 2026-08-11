import type { FoodItem, Macros } from "./types";

/** Look up a barcode on Open Food Facts (free, no key). */
export async function lookupBarcode(code: string): Promise<FoodItem | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,product_name_en,product_name_zh,brands,nutriments,serving_size,serving_quantity`,
      { signal: ctrl.signal, headers: { "Accept-Language": "en-US,en;q=0.9" } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status: number;
      product?: {
        product_name?: string;
        product_name_en?: string;
        product_name_zh?: string;
        brands?: string;
        serving_size?: string;
        serving_quantity?: number | string;
        nutriments?: Record<string, number>;
      };
    };
    if (data.status !== 1 || !data.product) return null;
    const p = data.product;
    const n = p.nutriments ?? {};
    const labelCalories =
      n["energy-kcal_100g"] ??
      (n["energy_100g"] != null ? Math.round(n["energy_100g"] / 4.184) : undefined);
    const hasNutrition = [
      labelCalories,
      n["proteins_100g"],
      n["carbohydrates_100g"],
      n["fat_100g"],
      n["fiber_100g"],
      n["sugars_100g"],
      n["sodium_100g"],
    ].some((value) => value != null);
    const per100: Macros = {
      cal: Math.round(labelCalories ?? 0),
      protein: round1(n["proteins_100g"] ?? 0),
      carbs: round1(n["carbohydrates_100g"] ?? 0),
      fat: round1(n["fat_100g"] ?? 0),
      fiber: optionalRound1(n["fiber_100g"]),
      sugar: optionalRound1(n["sugars_100g"]),
      sodiumMg: n["sodium_100g"] != null ? Math.round(n["sodium_100g"] * 1000) : undefined,
    };
    if (!hasNutrition) return null;
    const englishName = p.product_name_en || p.product_name;
    const name = p.product_name_zh || englishName || `#${code}`;
    const servingG =
      typeof p.serving_quantity === "string"
        ? parseFloat(p.serving_quantity)
        : p.serving_quantity;
    return {
      id: `bc-${code}`,
      name: { en: englishName || name, zh: p.product_name_zh || englishName || name },
      emoji: "🛒",
      cat: "snack",
      per100,
      serving:
        servingG && servingG > 0
          ? {
              label: {
                en: cleanServingLabel(p.serving_size) || "1 serving",
                zh: cleanServingLabel(p.serving_size) || "1 份",
              },
              grams: servingG,
            }
          : undefined,
      barcode: code,
      custom: true,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function cleanServingLabel(value: string | undefined): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, 80) : "";
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

function optionalRound1(x: number | undefined): number | undefined {
  return x == null ? undefined : round1(x);
}
