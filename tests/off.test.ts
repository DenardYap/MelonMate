import { afterEach, describe, expect, test, vi } from "vitest";
import { lookupBarcode } from "../lib/off";

describe("U.S. barcode lookup", () => {
  afterEach(() => vi.unstubAllGlobals());

  test("maps Open Food Facts label nutrients, including zero-calorie products", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: 1,
            product: {
              product_name_en: "Sparkling Water",
              serving_quantity: 355,
              nutriments: {
                "energy-kcal_100g": 0,
                proteins_100g: 0,
                carbohydrates_100g: 0,
                fat_100g: 0,
                sodium_100g: 0.004,
              },
            },
          }),
          { status: 200 }
        )
      )
    );

    const food = await lookupBarcode("049000042566");
    expect(food).toMatchObject({
      id: "bc-049000042566",
      name: { en: "Sparkling Water" },
      serving: { grams: 355 },
      per100: { cal: 0, sodiumMg: 4 },
    });
  });

  test("returns null when the product has no usable nutrition label", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: 1, product: { product_name: "Mystery item", nutriments: {} } }))
      )
    );
    await expect(lookupBarcode("012345678905")).resolves.toBeNull();
  });
});
