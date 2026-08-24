import { NextResponse } from "next/server";
import { desc, sql } from "drizzle-orm";
import { getDatabase } from "../../../../db/client";
import { teyvatDatasetRevisions } from "../../../../db/schema";
import { embeddingConfig, EMBEDDING_DIMENSIONS } from "../../../../lib/teyvat/embeddings";

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
    const embedding = embeddingConfig();
    const [embeddingState] = embedding ? (await database.execute<{ count: number }>(sql`select count(*)::int as count from teyvat_embeddings where revision = ${revision.revision} and model = ${embedding.model}`)).rows : [{ count: 0 }];
    const [chunkState] = (await database.execute<{ count: number }>(sql`select count(*)::int as count from teyvat_chunks where revision = ${revision.revision}`)).rows;
    const semanticReady = Boolean(embedding && Number(embeddingState?.count) === Number(chunkState?.count) && Number(chunkState?.count) > 0);
    return NextResponse.json({
      id: "@vxnus/teyvat",
      name: "Teyvat Genshin Knowledge Base",
      publisher: "vxnuslabs",
      version: "1.0.0",
      schemaVersion: "1.0",
      description: "Structured Genshin Impact knowledge from the normalized gi-data projection.",
      sources: [{ id: "gi-data", title: "gi-data", license: "see source metadata", uri: "https://github.com/vxnuslabs/gi-data" }],
      capabilities: { lexicalSearch: true, semanticSearch: semanticReady, structuredEntities: true, relations: true, revisions: true },
      ...(semanticReady ? { retrieval: { embedding: { model: embedding!.model, dimensions: EMBEDDING_DIMENSIONS, provider: embedding!.provider } } } : {}),
    }, { headers: { "cache-control": "public, max-age=60, s-maxage=300", etag: `"${revision.revision}"` } });
  } catch {
    return NextResponse.json({ error: "knowledge_provider_unavailable" }, { status: 503 });
  }
}
