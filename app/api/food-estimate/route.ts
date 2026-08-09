import { NextResponse } from "next/server";
import { clampPhotoConfidence, type FoodPhotoEstimate } from "@/lib/foodPhoto";
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
      instructions: `Inspect the photo and call search_food_candidates once before estimating nutrition. Create one concise fuzzy-search query per distinct visible food or drink. Include visible brand/product text when available and preparation words that distinguish the food. Do not calculate calories or macros yet.`,
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
            queries: { type: "array", minItems: 1, maxItems: 6, items: { type: "string" } },
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
      const queries = Array.isArray(parsed.queries) ? parsed.queries.map((query) => String(query).trim()).filter(Boolean).slice(0, 6) : [];
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
      max_output_tokens: 900,
      instructions:
        "Estimate the visible food and nutrition for the full pictured portion. First inspect the supplied fuzzy-search results from the MelonMate food library, recipes, recipe ingredients, and Open Food Facts. Use a candidate only when it genuinely matches what is visible; prefer a matching recipe or library food, and use an Open Food Facts result for a matching branded/product food. Scale the candidate serving nutrition to the visible amount. Only as a last resort, when no candidate credibly matches, make a general nutrition estimate and explicitly say in assumptions that no database match was used. Account for visible oils, sauces, toppings, and drinks. If several foods are present, return one combined meal. Write description as one short plain-language sentence. Score confidence_score from 0 to 100 based on identification, candidate-match quality, and portion certainty. In assumptions, name each selected candidate and its source, or disclose the free-text fallback. Never select a merely similar candidate. Always call estimate_food_nutrition exactly once.",
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
          description: "Return a structured nutrition estimate for the pictured food.",
          strict: true,
          parameters: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              emoji: { type: "string" },
              description: { type: "string" },
              portion_description: { type: "string" },
              estimated_grams: { type: "number", minimum: 1 },
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
              "description",
              "portion_description",
              "estimated_grams",
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
    const estimate = JSON.parse(call.arguments) as FoodPhotoEstimate;
    if (
      !estimate.name ||
      !estimate.description ||
      !Number.isFinite(estimate.estimated_grams) ||
      estimate.estimated_grams <= 0 ||
      !Number.isFinite(estimate.cal) ||
      !Number.isFinite(estimate.confidence_score)
    ) {
      throw new Error("invalid estimate");
    }
    return NextResponse.json({ estimate: sanitizeEstimate(estimate) });
  } catch {
    return NextResponse.json({ error: "The nutrition estimate was incomplete. Try again." }, { status: 502 });
  }
}

function sanitizeEstimate(estimate: FoodPhotoEstimate): FoodPhotoEstimate {
  const safe = (value: number, decimals = 1) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    const factor = 10 ** decimals;
    return Math.max(0, Math.round(numeric * factor) / factor);
  };

  return {
    ...estimate,
    name: estimate.name.trim().slice(0, 100),
    emoji: estimate.emoji.trim().slice(0, 8) || "🍽️",
    description: estimate.description.trim().slice(0, 180),
    portion_description: estimate.portion_description.trim().slice(0, 180),
    estimated_grams: Math.max(1, Math.round(estimate.estimated_grams)),
    cal: Math.round(safe(estimate.cal, 0)),
    protein_g: safe(estimate.protein_g),
    carbs_g: safe(estimate.carbs_g),
    fat_g: safe(estimate.fat_g),
    fiber_g: safe(estimate.fiber_g),
    sugar_g: safe(estimate.sugar_g),
    sodium_mg: Math.round(safe(estimate.sodium_mg, 0)),
    confidence_score: clampPhotoConfidence(estimate.confidence_score),
    assumptions: (Array.isArray(estimate.assumptions) ? estimate.assumptions : [])
      .map((item) => String(item).trim())
      .filter(Boolean)
      .slice(0, 4),
  };
}
