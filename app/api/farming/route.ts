import { type NextRequest, NextResponse } from "next/server";
import { getTeyvatPersistentFarmingQueries } from "../../../lib/teyvat/domain/index.ts";
import { DEMO_FARMING, errorResponse } from "../utils.ts";

export async function GET(request: NextRequest) {
  const databaseUrl = process.env.DATABASE_URL;
  const target = request.nextUrl.searchParams.get("target")?.trim();
  const kind = request.nextUrl.searchParams.get("kind")?.trim() || undefined;
  const headers = { "cache-control": "public, max-age=60, s-maxage=300" };

  if (!target) return errorResponse("A target is required.");
  if (!databaseUrl) return NextResponse.json(DEMO_FARMING, { headers });

  try {
    const farmingQueries = await getTeyvatPersistentFarmingQueries();
    const result = await farmingQueries.getFarmingPlan(target, kind);

    if (!result) return errorResponse("Target entity not found.", 404);

    return NextResponse.json(result, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
