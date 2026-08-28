import { type NextRequest, NextResponse } from "next/server";
import { getTeyvatPersistentFarmingQueries } from "@/lib/teyvat/domain";
import { errorResponse } from "@/app/api/utils";

export async function GET(request: NextRequest) {
  const headers = { "cache-control": "public, max-age=300, s-maxage=1800" };

  try {
    const farmingQueries = await getTeyvatPersistentFarmingQueries();
    const result = await farmingQueries.getDailyRotationSchedule();

    return NextResponse.json(result, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
