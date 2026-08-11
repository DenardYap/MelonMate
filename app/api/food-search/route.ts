import { searchOpenFoodProducts } from "@/lib/server/foodCandidateSearch";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("query")?.trim() ?? "";
  if (query.length < 2 || query.length > 100) {
    return Response.json({ error: "Enter a search between 2 and 100 characters." }, { status: 400 });
  }

  try {
    const results = await searchOpenFoodProducts(query, 12);
    return Response.json(
      { results },
      { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" } }
    );
  } catch {
    return Response.json({ error: "The online food catalog is temporarily unavailable." }, { status: 502 });
  }
}
