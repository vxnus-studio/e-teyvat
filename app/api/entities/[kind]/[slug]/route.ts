import { type NextRequest, NextResponse } from "next/server";
import { getTeyvatPersistentEntityQueries } from "../../../../../lib/teyvat/engine.ts";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ kind: string; slug: string }> },
) {
  const { kind, slug } = await params;
  const result = await (await getTeyvatPersistentEntityQueries()).detail(kind.toLowerCase(), slug);
  if (!result) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ...result, preview: false }, { headers: { "cache-control": "public, max-age=60, s-maxage=300" } });
}
