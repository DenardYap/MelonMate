import { NextResponse } from "next/server";
import {
  sanitizeProvidedCandidates,
  searchCurrentRecipeCandidates,
} from "@/lib/server/foodCandidateSearch";

export const runtime = "nodejs";

/** Dedicated current-recipe retrieval contract for chat and image agents. The
 * device submits its local recipe list because saved data is client-owned. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { query?: unknown; queries?: unknown; recipes?: unknown; limit?: unknown };
    const queries = Array.isArray(body.queries)
      ? body.queries.map(String)
      : typeof body.query === "string" ? [body.query] : [];
    const recipes = sanitizeProvidedCandidates(body.recipes)
      .filter((candidate) => candidate.kind === "recipe");
    const limit = typeof body.limit === "number" ? body.limit : 12;

    if (!queries.some((query) => query.trim())) {
      return NextResponse.json({ error: "Provide at least one recipe search query." }, { status: 400 });
    }

    return NextResponse.json({ matches: searchCurrentRecipeCandidates(queries, recipes, limit) });
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
}
