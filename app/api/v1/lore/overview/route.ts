import { NextResponse } from "next/server";
import { getTeyvatLoreQueries } from "@/lib/teyvat/engine";
import { errorResponse } from "@/app/api/utils";

export async function GET() {
  try {
    const loreQueries = await getTeyvatLoreQueries();
    const result = loreQueries.overview();

    return NextResponse.json(result, {
      headers: {
        "cache-control": "public, max-age=60, s-maxage=300",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lore overview failed";
    return errorResponse(message, 500);
  }
}
