import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDatabase } from "../../../../db/client";
import { teyvatDatasetRevisions } from "../../../../db/schema";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "knowledge_provider_unavailable" }, { status: 503 });
  }
  try {
    const database = getDatabase();
    const [revision] = await database
      .select()
      .from(teyvatDatasetRevisions)
      .orderBy(desc(teyvatDatasetRevisions.installedAt))
      .limit(1);
    if (!revision) return NextResponse.json({ error: "knowledge_provider_not_ready" }, { status: 503 });
    return NextResponse.json({
      id: "@vxnus/teyvat",
      name: "Teyvat Genshin Knowledge Base",
      publisher: "vxnuslabs",
      version: "1.0.0",
      schemaVersion: "1.0",
      description: "Structured Genshin Impact knowledge from the normalized gi-data projection.",
      sources: [{ id: "gi-data", title: "gi-data", license: "see source metadata", uri: "https://github.com/vxnuslabs/gi-data" }],
      capabilities: { lexicalSearch: true, semanticSearch: false, structuredEntities: true, relations: true, revisions: true },
    }, { headers: { "cache-control": "public, max-age=60, s-maxage=300", etag: `"${revision.revision}"` } });
  } catch {
    return NextResponse.json({ error: "knowledge_provider_unavailable" }, { status: 503 });
  }
}
