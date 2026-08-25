import { NextResponse } from "next/server";
import { createTeyvatProvider } from "../../../../lib/teyvat/e-provider";

export async function GET() {
  try {
    const { provider, revision } = await createTeyvatProvider();
    return NextResponse.json(provider.handlers.manifest(), { headers: { "cache-control": "public, max-age=60, s-maxage=300", etag: `"${revision}"` } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "knowledge_provider_unavailable" }, { status: 503 });
  }
}
