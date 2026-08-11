import { NextResponse } from "next/server";
import {
  sanitizeProvidedCandidates,
  searchCurrentRecipeCandidates,
  searchFoodCandidates,
  type FoodCandidate,
} from "@/lib/server/foodCandidateSearch";

export const runtime = "nodejs";

interface EstimateItem {
  name: string;
  emoji: string;
  qty_label: string;
  grams: number | null;
  ref_id: string | null;
  cal: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface TextEstimate {
  description: string;
  rationale: string;
  confidence_score: number;
  items: EstimateItem[];
}

interface FoodClarification {
  question: string;
}

interface FoodSearchPlan {
  queries: string[];
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI food estimates are not configured yet.", code: "AI_NOT_CONFIGURED" },
      { status: 503 }
    );
  }

  let text = "";
  let lang: "en" | "zh" = "en";
  let providedCandidates: FoodCandidate[] = [];
  let currentRecipes: FoodCandidate[] = [];
  try {
    const body = (await request.json()) as { text?: unknown; lang?: unknown; catalog?: unknown; recipeCatalog?: unknown };
    text = typeof body.text === "string" ? body.text.trim().slice(0, 500) : "";
    lang = body.lang === "zh" ? "zh" : "en";
    providedCandidates = sanitizeProvidedCandidates(body.catalog);
    currentRecipes = sanitizeProvidedCandidates(body.recipeCatalog ?? body.catalog)
      .filter((candidate) => candidate.kind === "recipe");
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!text) return NextResponse.json({ error: "Describe what you ate." }, { status: 400 });

  const searchPlanResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_FOOD_MODEL || "gpt-5.6-sol",
      store: false,
      reasoning: { effort: "low" },
      max_output_tokens: 500,
      instructions: `Identify each distinct food or drink in the note and call search_current_recipes once. Create one concise name query per item so the app can separately search the user's current recipe list before the general food catalog. Keep useful brand or preparation words, but remove quantities, filler words, and meal-time phrases. Do not estimate nutrition yet.`,
      input: [{ role: "user", content: [{ type: "input_text", text }] }],
      tools: [{
        type: "function",
        name: "search_current_recipes",
        description: "Search the user's current saved recipe list for potential matches before searching general foods.",
        strict: true,
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {
            queries: {
              type: "array",
              minItems: 1,
              maxItems: 6,
              items: { type: "string" },
            },
          },
          required: ["queries"],
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
    console.error("OpenAI food search planning failed", searchPlanResponse.status, searchPlanData.error?.message);
    return NextResponse.json({ error: "That food note could not be analyzed. Try again." }, { status: 502 });
  }
  const searchCall = searchPlanData.output?.find((item) => item.type === "function_call" && item.name === "search_current_recipes");
  let queries = [text];
  if (searchCall?.arguments) {
    try {
      const plan = JSON.parse(searchCall.arguments) as FoodSearchPlan;
      const planned = Array.isArray(plan.queries) ? plan.queries.map((query) => String(query).trim()).filter(Boolean).slice(0, 6) : [];
      if (planned.length) queries = planned;
    } catch {
      // The original note remains a safe retrieval query.
    }
  }
  const recipeMatches = searchCurrentRecipeCandidates(queries, currentRecipes, 12);
  const generalMatches = await searchFoodCandidates(queries, providedCandidates, 30);
  const recipeIds = new Set(recipeMatches.map((candidate) => candidate.id));
  const candidates = [...recipeMatches, ...generalMatches.filter((candidate) => !recipeIds.has(candidate.id))].slice(0, 30);

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_FOOD_MODEL || "gpt-5.6-sol",
      store: false,
      reasoning: { effort: "low" },
      max_output_tokens: 1100,
      instructions: `Turn a natural spoken food note into a confirmation preview. Reply in ${lang === "zh" ? "Traditional Chinese" : "English"}.

Decision order:
1. First inspect the supplied fuzzy-search results from the MelonMate library, saved recipes, recipe ingredients, and Open Food Facts. Select a candidate only when its identity genuinely fits. Prefer a matching saved recipe or MelonMate food; use an Open Food Facts result when it is the matching branded/product food. Preserve the selected candidate id as ref_id and scale its listed serving nutrition to the stated quantity.
2. When no candidate is a credible match, estimate from general nutrition knowledge only if both the food identity and amount are specific enough for a useful estimate. A standard counted item such as "1 avocado toast" is specific enough; "some breakfast", "a plate of food", or "I ate healthy" is not.
3. If any necessary food identity or amount is truly vague, do not invent ingredients, portions, calories, or macros. Call request_food_clarification with one short, focused question instead.

Return one item for each distinct food the user mentioned, including multiple foods in one sentence. The rationale must briefly identify catalog matches and any general estimate or portion assumption. Confidence is 0-100 and must reflect identity and portion certainty. Never claim the food is already logged. Call exactly one function.`,
      input: [{
        role: "user",
        content: [{
          type: "input_text",
          text: `FOOD NOTE:\n${text}\n\nSEARCH QUERIES USED:\n${JSON.stringify(queries)}\n\nCURRENT RECIPE LIST MATCHES (${recipeMatches.length}):\n${JSON.stringify(recipeMatches)}\n\nGENERAL FOOD CANDIDATES (${candidates.length - recipeMatches.length} additional):\n${JSON.stringify(candidates.filter((candidate) => !recipeIds.has(candidate.id)))}`,
        }],
      }],
      tools: [
        {
          type: "function",
          name: "estimate_food_log",
          description: "Return a reviewable food log estimate when every mentioned item is sufficiently clear.",
          strict: true,
          parameters: {
            type: "object",
            additionalProperties: false,
            properties: {
              description: { type: "string" },
              rationale: { type: "string" },
              confidence_score: { type: "integer", minimum: 0, maximum: 100 },
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
                    qty_label: { type: "string" },
                    grams: { type: ["number", "null"], minimum: 0 },
                    ref_id: { type: ["string", "null"] },
                    cal: { type: "number", minimum: 0 },
                    protein: { type: "number", minimum: 0 },
                    carbs: { type: "number", minimum: 0 },
                    fat: { type: "number", minimum: 0 },
                  },
                  required: ["name", "emoji", "qty_label", "grams", "ref_id", "cal", "protein", "carbs", "fat"],
                },
              },
            },
            required: ["description", "rationale", "confidence_score", "items"],
          },
        },
        {
          type: "function",
          name: "request_food_clarification",
          description: "Ask for missing food or portion detail instead of guessing.",
          strict: true,
          parameters: {
            type: "object",
            additionalProperties: false,
            properties: {
              question: { type: "string" },
            },
            required: ["question"],
          },
        },
      ],
      tool_choice: "required",
    }),
  });

  const data = (await response.json()) as {
    error?: { message?: string };
    output?: { type?: string; name?: string; arguments?: string }[];
  };
  if (!response.ok) {
    console.error("OpenAI text food estimate failed", response.status, data.error?.message);
    return NextResponse.json({ error: "That food note could not be analyzed. Try a shorter description." }, { status: 502 });
  }

  const clarificationCall = data.output?.find((item) => item.type === "function_call" && item.name === "request_food_clarification");
  if (clarificationCall?.arguments) {
    try {
      const clarification = JSON.parse(clarificationCall.arguments) as FoodClarification;
      const question = String(clarification.question || "").trim().slice(0, 240);
      if (question) return NextResponse.json({ clarification: question });
    } catch {
      return NextResponse.json({ error: "A little more detail is needed. Try naming the food and amount." }, { status: 502 });
    }
  }

  const call = data.output?.find((item) => item.type === "function_call" && item.name === "estimate_food_log");
  if (!call?.arguments) return NextResponse.json({ error: "No food estimate was returned." }, { status: 502 });

  try {
    const estimate = JSON.parse(call.arguments) as TextEstimate;
    if (!estimate.description || !estimate.rationale || !Array.isArray(estimate.items) || !estimate.items.length) {
      throw new Error("invalid estimate");
    }
    return NextResponse.json({ estimate: sanitizeEstimate(estimate) });
  } catch {
    return NextResponse.json({ error: "The food estimate was incomplete. Try again." }, { status: 502 });
  }
}

function safeNumber(value: number, decimals = 1): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  const factor = 10 ** decimals;
  return Math.max(0, Math.round(numeric * factor) / factor);
}

function sanitizeEstimate(estimate: TextEstimate): TextEstimate {
  return {
    description: String(estimate.description).trim().slice(0, 220),
    rationale: String(estimate.rationale).trim().slice(0, 320),
    confidence_score: Math.min(100, Math.max(0, Math.round(Number(estimate.confidence_score) || 0))),
    items: estimate.items.slice(0, 12).map((item) => ({
      name: String(item.name).trim().slice(0, 90) || "Food",
      emoji: String(item.emoji || "🍽️").trim().slice(0, 8),
      qty_label: String(item.qty_label).trim().slice(0, 80) || "1 serving",
      grams: item.grams == null ? null : Math.max(0, Math.round(Number(item.grams) || 0)),
      ref_id: item.ref_id ? String(item.ref_id).slice(0, 120) : null,
      cal: Math.round(safeNumber(item.cal, 0)),
      protein: safeNumber(item.protein),
      carbs: safeNumber(item.carbs),
      fat: safeNumber(item.fat),
    })),
  };
}
