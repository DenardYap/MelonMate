import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface CatalogCandidate {
  id: string;
  kind: "food" | "recipe";
  name: string;
  emoji?: string;
  serving?: string;
  ingredients?: string[];
  cal: number;
  protein: number;
  carbs: number;
  fat: number;
}

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
  let catalog: CatalogCandidate[] = [];
  try {
    const body = (await request.json()) as { text?: unknown; lang?: unknown; catalog?: unknown };
    text = typeof body.text === "string" ? body.text.trim().slice(0, 500) : "";
    lang = body.lang === "zh" ? "zh" : "en";
    catalog = Array.isArray(body.catalog)
      ? body.catalog.filter(isCatalogCandidate).slice(0, 30)
      : [];
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!text) return NextResponse.json({ error: "Describe what you ate." }, { status: 400 });

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
      instructions: `Turn a short food note into a confirmation preview. Reply in ${lang === "zh" ? "Traditional Chinese" : "English"}. Prefer an exact candidate from the supplied catalog, especially a saved recipe or ingredient, and preserve its ref_id and nutrition. Scale candidate nutrition to the quantity the user stated. Only estimate from general nutrition knowledge when the catalog has no good match. The rationale must briefly say which source and portion assumption produced the numbers. Confidence is 0-100 and must reflect both identity and portion certainty. Never claim the food is already logged. Always call estimate_food_log exactly once.`,
      input: [{
        role: "user",
        content: [{
          type: "input_text",
          text: `FOOD NOTE:\n${text}\n\nSEARCHED FOOD, RECIPE, AND INGREDIENT CANDIDATES:\n${JSON.stringify(catalog)}`,
        }],
      }],
      tools: [{
        type: "function",
        name: "estimate_food_log",
        description: "Return a reviewable food log estimate.",
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
      }],
      tool_choice: { type: "function", name: "estimate_food_log" },
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

function isCatalogCandidate(value: unknown): value is CatalogCandidate {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CatalogCandidate>;
  return typeof item.id === "string" && (item.kind === "food" || item.kind === "recipe") && typeof item.name === "string";
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
