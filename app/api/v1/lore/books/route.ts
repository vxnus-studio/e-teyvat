import { type NextRequest, NextResponse } from "next/server";
import { getTeyvatLoreQueries } from "@/lib/teyvat/engine";
import { boundedLimit, errorResponse } from "@/app/api/utils";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? undefined;
  const limit = boundedLimit(request.nextUrl.searchParams.get("limit"), 24);
  const page = Math.max(1, Number.parseInt(request.nextUrl.searchParams.get("page") ?? "1", 10));

  try {
    const loreQueries = await getTeyvatLoreQueries();
    const result = loreQueries.listBooks({ query, limit, page });

    return NextResponse.json(result, {
      headers: {
        "cache-control": "public, max-age=60, s-maxage=300",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to retrieve books";
    return errorResponse(message, 500);
  }
}
