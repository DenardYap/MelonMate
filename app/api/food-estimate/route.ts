import { NextResponse } from "next/server";
import {
  sanitizeFoodPhotoEstimate,
  type FoodPhotoModelEstimate,
} from "@/lib/foodPhoto";
import {
  sanitizeProvidedCandidates,
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
  try {
    const body = (await request.json()) as { imageDataUrl?: unknown; catalog?: unknown };
    imageDataUrl = typeof body.imageDataUrl === "string" ? body.imageDataUrl : "";
    providedCandidates = sanitizeProvidedCandidates(body.catalog);
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
      instructions: `Inspect the entire photo and call search_food_candidates once before estimating nutrition. Create one concise fuzzy-search query per distinct visible food or drink, including separate sides and countable items. Repeated identical items need only one query. Keep a composite prepared dish as one query when its components cannot be reliably portioned separately. Include visible brand/product text when available and preparation words that distinguish the food. Do not calculate calories or macros yet.`,
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: "Identify the visible foods and prepare database search queries." },
          { type: "input_image", image_url: imageDataUrl, detail: "high" },
        ],
      }],
      tools: [{
        type: "function",
        name: "search_food_candidates",
        description: "Fuzzy-search MelonMate foods, saved recipes, recipe ingredients, and Open Food Facts products.",
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
      tool_choice: { type: "function", name: "search_food_candidates" },
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
  const searchCall = searchPlanData.output?.find((item) => item.type === "function_call" && item.name === "search_food_candidates");
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
  const candidates = await searchFoodCandidates(searchPlan.queries, providedCandidates, 30);

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
      instructions: `Estimate every visible food and drink for the full pictured portions.

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
              text: `Identify this food and estimate the nutrition for everything visible. I will ask the user how much of this pictured portion they plan to eat before logging it.\n\nFIRST-PASS VISUAL DESCRIPTION:\n${searchPlan.visual_description}\n\nSEARCH QUERIES USED:\n${JSON.stringify(searchPlan.queries)}\n\nTOP ${candidates.length} FUZZY-SEARCH CANDIDATES (maximum k=30):\n${JSON.stringify(candidates)}`,
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
                    estimated_grams: { type: "number", minimum: 1 },
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
        !Number.isFinite(item.estimated_grams) ||
        item.estimated_grams <= 0 ||
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
