import { type NextRequest, NextResponse } from "next/server";
import { RetrievalValidationError } from "@vxnus/e";
import { createTeyvatProvider } from "../../../../lib/teyvat/e-provider";

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  try {
    const { provider } = await createTeyvatProvider();
    const response = await provider.handlers.retrieve(body);
    return NextResponse.json(response, { headers: { "cache-control": "public, max-age=30, s-maxage=60" } });
  } catch (error) {
    if (error instanceof RetrievalValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof Error && ["query must be a non-empty string", "filters.kind must be a string", "revision_not_found"].includes(error.message)) return NextResponse.json({ error: error.message }, { status: error.message === "revision_not_found" ? 404 : 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "knowledge_provider_unavailable" }, { status: 503 });
  }
}
