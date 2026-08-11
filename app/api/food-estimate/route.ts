import { NextResponse } from "next/server";
import {
  sanitizeFoodPhotoEstimate,
  type FoodPhotoModelEstimate,
} from "@/lib/foodPhoto";
import {
  sanitizeProvidedCandidates,
  searchCurrentRecipeCandidates,
  searchFoodCandidates,
  type FoodCandidate,
} from "@/lib/server/foodCandidateSearch";

export const runtime = "nodejs";

const MAX_DATA_URL_CHARS = 12_000_000;

interface ImageFoodSearchPlan {
  queries: string[];
  visual_description: string;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI photo estimates are not configured yet.", code: "AI_NOT_CONFIGURED" },
      { status: 503 }
    );
  }

  let imageDataUrl = "";
  let providedCandidates: FoodCandidate[] = [];
  let currentRecipes: FoodCandidate[] = [];
  try {
    const body = (await request.json()) as { imageDataUrl?: unknown; catalog?: unknown; recipeCatalog?: unknown };
    imageDataUrl = typeof body.imageDataUrl === "string" ? body.imageDataUrl : "";
    providedCandidates = sanitizeProvidedCandidates(body.catalog);
    currentRecipes = sanitizeProvidedCandidates(body.recipeCatalog ?? body.catalog)
      .filter((candidate) => candidate.kind === "recipe");
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (
    !/^data:image\/(?:jpeg|png|webp);base64,/i.test(imageDataUrl) ||
    imageDataUrl.length > MAX_DATA_URL_CHARS
  ) {
    return NextResponse.json(
      { error: "Use a JPEG, PNG, or WebP image under 8 MB." },
      { status: 400 }
    );
  }

  const searchPlanResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL || "gpt-5.6-sol",
      store: false,
      reasoning: { effort: "low" },
      max_output_tokens: 600,
      instructions: `Inspect the entire photo and call search_current_recipes once before estimating nutrition. The user may photograph plated food, a packaged product, or a Nutrition Facts/nutrition-information panel.

If the image contains a nutrition label, say so in visual_description and transcribe the visible product/brand, serving size, servings per container, and column headings. Create a query from the visible product and brand when identifiable; otherwise use a concise generic product description from the package or label. Do not treat nutrient names as separate foods.

Otherwise, create one concise fuzzy-search query per distinct visible food or drink so the app can separately check the user's current recipe list and the general food catalog. Include separate sides and countable items. Repeated identical items need only one query. Keep a composite prepared dish as one query when its components cannot be reliably portioned separately. Include visible brand/product text when available and preparation words that distinguish the food. Do not calculate calories or macros yet.`,
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: "Identify the visible food or nutrition label and prepare database search queries." },
          { type: "input_image", image_url: imageDataUrl, detail: "high" },
        ],
      }],
      tools: [{
        type: "function",
        name: "search_current_recipes",
        description: "Search the user's current saved recipe list for potential visual matches before searching general foods.",
        strict: true,
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {
            queries: { type: "array", minItems: 1, maxItems: 12, items: { type: "string" } },
            visual_description: { type: "string" },
          },
          required: ["queries", "visual_description"],
        },
      }],
      tool_choice: { type: "function", name: "search_current_recipes" },
    }),
  });

  const searchPlanData = await searchPlanResponse.json() as {
    error?: { message?: string };
    output?: { type?: string; name?: string; arguments?: string }[];
  };
  if (!searchPlanResponse.ok) {
    console.error("OpenAI photo search planning failed", searchPlanResponse.status, searchPlanData.error?.message);
    return NextResponse.json({ error: "The photo could not be analyzed. Try a clearer, well-lit photo." }, { status: 502 });
  }
  const searchCall = searchPlanData.output?.find((item) => item.type === "function_call" && item.name === "search_current_recipes");
  let searchPlan: ImageFoodSearchPlan = { queries: ["food"], visual_description: "Food visible in the uploaded photo." };
  if (searchCall?.arguments) {
    try {
      const parsed = JSON.parse(searchCall.arguments) as ImageFoodSearchPlan;
      const queries = Array.isArray(parsed.queries) ? parsed.queries.map((query) => String(query).trim()).filter(Boolean).slice(0, 12) : [];
      if (queries.length) searchPlan = {
        queries,
        visual_description: String(parsed.visual_description || "").trim().slice(0, 500),
      };
    } catch {
      // The second visual pass can still produce a conservative estimate.
    }
  }
  const recipeMatches = searchCurrentRecipeCandidates(searchPlan.queries, currentRecipes, 12);
  const generalMatches = await searchFoodCandidates(searchPlan.queries, providedCandidates, 30);
  const recipeIds = new Set(recipeMatches.map((candidate) => candidate.id));
  const candidates = [...recipeMatches, ...generalMatches.filter((candidate) => !recipeIds.has(candidate.id))].slice(0, 30);

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL || "gpt-5.6-sol",
      store: false,
      reasoning: { effort: "low" },
      max_output_tokens: 1800,
      instructions: `Analyze the image as either a food photo, a Nutrition Facts/nutrition-information label, or a combination of both. A user may intentionally photograph a label instead of the food.

Nutrition-label rules (take priority whenever a readable label is present):
1. Read the printed serving size and servings per container before reading any nutrients. Return nutrition for exactly ONE printed serving by default so the app's serving control can scale it correctly.
2. Use calories, total fat, total carbohydrate, protein, dietary fiber, total sugars, and sodium from the same per-serving column. Never mistake % Daily Value for grams or milligrams. Total sugars includes added sugars, so do not add the "Includes X g Added Sugars" value again.
3. If the label has both per-serving and per-container/per-package columns, use the per-serving column. Mention the printed servings per container in assumptions, but do not multiply the macros by it.
4. If the label reports only per-container values, return one container as the serving basis. If it reports only per-100-g values and gives a serving weight, calculate one serving from that weight and disclose the calculation. If it gives no serving size, use 100 g as the explicit basis.
5. Copy only the printed serving size into portion_description (for example, "2/3 cup (55 g)"). Do not prefix it with "1 serving" or include servings per container there; the app presents and scales this as one serving. Set estimated_grams to the printed gram weight. Use null when the label gives only a count or volume; do not invent a weight.
6. Treat readable label values as authoritative over database estimates. Set ref_id only when a candidate clearly identifies the same product. State that values were read from the label and identify the chosen serving column in assumptions.
7. Do not infer that the user ate the whole package. Do not multiply nutrients by servings per container. Do not fabricate obscured values; lower confidence and disclose anything unclear.
8. Return the labeled product as one item, unless the image clearly contains multiple separate labels/products.

For an ordinary food photo, estimate every visible food and drink for the full pictured portions.

Itemization rules:
1. Return one item for each distinct, separately portionable food or drink. A banana beside an apple must be two items. A plate containing steak, potatoes, and broccoli must be three items.
2. Group repeated identical foods into one item with a counted portion, such as "2 eggs".
3. Keep a genuinely composite prepared dish such as soup, lasagna, a smoothie, or an assembled sandwich as one item when its internal components cannot be estimated reliably as separate portions. Still return visible side dishes separately.
4. Include a visible sauce, topping, oil, or drink as a separate item when it is identifiable and materially affects nutrition. Do not invent hidden ingredients.

Candidate rules:
1. Inspect the supplied fuzzy-search results from the MelonMate food library, recipes, recipe ingredients, and Open Food Facts independently for each item.
2. Use a candidate only when its identity genuinely matches that item. Prefer a matching saved recipe or library food; use an Open Food Facts result for a matching branded/product food.
3. Preserve the exact selected candidate id as ref_id and scale its serving nutrition to the visible amount.
4. Never use a merely similar candidate. When no candidate credibly matches, make a general nutrition estimate only if the item is visually identifiable, set ref_id to null, and explicitly disclose "No database match" in that item's assumptions.
5. If an item is too visually ambiguous to identify, describe it conservatively, use low confidence, and do not invent a specific identity.

Write description as one short sentence covering the whole photo. Score each item's confidence from 0 to 100 based on identity, candidate quality, and portion certainty. In each item's assumptions, name the selected candidate and source or disclose the fallback. Always call estimate_food_nutrition exactly once.`,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Identify the photographed food or nutrition label and return its nutrition. For a label, use one printed serving as the base; otherwise estimate the full pictured portion. The app will let the user adjust the number of servings before logging.\n\nFIRST-PASS VISUAL DESCRIPTION:\n${searchPlan.visual_description}\n\nSEARCH QUERIES USED:\n${JSON.stringify(searchPlan.queries)}\n\nCURRENT RECIPE LIST MATCHES (${recipeMatches.length}):\n${JSON.stringify(recipeMatches)}\n\nGENERAL FOOD CANDIDATES (${candidates.length - recipeMatches.length} additional):\n${JSON.stringify(candidates.filter((candidate) => !recipeIds.has(candidate.id)))}`,
            },
            { type: "input_image", image_url: imageDataUrl, detail: "high" },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          name: "estimate_food_nutrition",
          description: "Return separate structured nutrition estimates for every distinct food and drink in the photo.",
          strict: true,
          parameters: {
            type: "object",
            additionalProperties: false,
            properties: {
              description: { type: "string" },
              items: {
                type: "array",
                minItems: 1,
                maxItems: 12,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    name: { type: "string" },
                    emoji: { type: "string" },
                    portion_description: { type: "string" },
                    estimated_grams: { type: ["number", "null"], minimum: 1 },
                    ref_id: { type: ["string", "null"] },
                    cal: { type: "number", minimum: 0 },
                    protein_g: { type: "number", minimum: 0 },
                    carbs_g: { type: "number", minimum: 0 },
                    fat_g: { type: "number", minimum: 0 },
                    fiber_g: { type: "number", minimum: 0 },
                    sugar_g: { type: "number", minimum: 0 },
                    sodium_mg: { type: "number", minimum: 0 },
                    confidence_score: { type: "integer", minimum: 0, maximum: 100 },
                    assumptions: { type: "array", items: { type: "string" }, maxItems: 4 },
                  },
                  required: [
                    "name",
                    "emoji",
                    "portion_description",
                    "estimated_grams",
                    "ref_id",
                    "cal",
                    "protein_g",
                    "carbs_g",
                    "fat_g",
                    "fiber_g",
                    "sugar_g",
                    "sodium_mg",
                    "confidence_score",
                    "assumptions",
                  ],
                },
              },
            },
            required: ["description", "items"],
          },
        },
      ],
      tool_choice: { type: "function", name: "estimate_food_nutrition" },
    }),
  });

  const data = (await response.json()) as {
    error?: { message?: string };
    output?: { type?: string; name?: string; arguments?: string }[];
  };

  if (!response.ok) {
    console.error("OpenAI food estimate failed", response.status, data.error?.message);
    return NextResponse.json(
      { error: "The photo could not be analyzed. Try a clearer, well-lit photo." },
      { status: 502 }
    );
  }

  const call = data.output?.find(
    (item) => item.type === "function_call" && item.name === "estimate_food_nutrition"
  );
  if (!call?.arguments) {
    return NextResponse.json({ error: "No food estimate was returned." }, { status: 502 });
  }

  try {
    const estimate = JSON.parse(call.arguments) as FoodPhotoModelEstimate;
    if (
      !estimate.description ||
      !Array.isArray(estimate.items) ||
      !estimate.items.length ||
      estimate.items.some((item) =>
        !item.name ||
        (item.estimated_grams != null && (
          !Number.isFinite(item.estimated_grams) ||
          item.estimated_grams <= 0
        )) ||
        !Number.isFinite(item.cal) ||
        !Number.isFinite(item.confidence_score)
      )
    ) {
      throw new Error("invalid estimate");
    }
    return NextResponse.json({ estimate: sanitizeFoodPhotoEstimate(estimate) });
  } catch {
    return NextResponse.json({ error: "The nutrition estimate was incomplete. Try again." }, { status: 502 });
  }
}
