import { type NextRequest, NextResponse } from "next/server";
import { getTeyvatPersistentEntityQueries } from "../../../lib/teyvat/engine.ts";

export async function GET(request: NextRequest) {
  const kind = request.nextUrl.searchParams.get("kind")?.toLowerCase() || undefined;
  const query = request.nextUrl.searchParams.get("q")?.trim() || "";
  const parsedLimit = Number(request.nextUrl.searchParams.get("limit") ?? 24);
  const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(50, parsedLimit)) : 24;
  const parsedPage = Number(request.nextUrl.searchParams.get("page") ?? 1);
  const page = Number.isFinite(parsedPage) ? Math.max(1, Math.floor(parsedPage)) : 1;
  const result = await (await getTeyvatPersistentEntityQueries()).searchEntities({ kind, query, limit, page });
  return NextResponse.json({ ...result, preview: false }, { headers: { "cache-control": "public, max-age=60, s-maxage=300" } });
}
