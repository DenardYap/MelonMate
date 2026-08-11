import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/food-search/route";

describe("online food search route", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns matching Open Food Facts products", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      products: [{
        code: "4710000000001",
        product_name_en: "Pineapple Cake",
        brands: "Example Bakery",
        serving_size: "1 cake (45 g)",
        serving_quantity: 45,
        nutriments: {
          "energy-kcal_100g": 430,
          proteins_100g: 5,
          carbohydrates_100g: 62,
          fat_100g: 18,
        },
      }],
    }), { headers: { "Content-Type": "application/json" } }));

    const response = await GET(new Request("http://localhost/api/food-search?query=pineapple%20cake"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      results: [{
        id: "off-4710000000001",
        source: "Open Food Facts",
        name: "Pineapple Cake",
        brand: "Example Bakery",
        grams: 45,
        cal: 194,
      }],
    });
  });

  it("rejects empty searches without calling upstream", async () => {
    const upstream = vi.spyOn(globalThis, "fetch");
    const response = await GET(new Request("http://localhost/api/food-search?query=a"));
    expect(response.status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });
});
