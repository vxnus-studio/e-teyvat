import { type NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDatabase } from "../../../../db/client";
import { teyvatChunks, teyvatDocuments, teyvatEntities, teyvatDatasetRevisions } from "../../../../db/schema";

type RetrievalBody = { query?: unknown; mode?: unknown; limit?: unknown; revision?: unknown; filters?: { kind?: unknown } };

export async function POST(request: NextRequest) {
  let body: RetrievalBody;
  try { body = await request.json() as RetrievalBody; } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) return NextResponse.json({ error: "query must be a non-empty string" }, { status: 400 });
  if (body.mode !== undefined && body.mode !== "lexical") return NextResponse.json({ error: "only lexical retrieval is supported" }, { status: 400 });
  const limit = typeof body.limit === "number" && Number.isInteger(body.limit) ? Math.max(1, Math.min(1000, body.limit)) : body.limit === undefined ? 8 : 0;
  if (!limit) return NextResponse.json({ error: "limit must be an integer from 1 to 1000" }, { status: 400 });
  const requestedRevision = body.revision === undefined ? undefined : typeof body.revision === "string" ? body.revision : "";
  if (body.revision !== undefined && !requestedRevision) return NextResponse.json({ error: "revision must be a string" }, { status: 400 });
  const kind = body.filters?.kind === undefined ? undefined : typeof body.filters.kind === "string" ? body.filters.kind : "";
  if (body.filters?.kind !== undefined && !kind) return NextResponse.json({ error: "filters.kind must be a string" }, { status: 400 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "knowledge_provider_unavailable" }, { status: 503 });

  try {
    const database = getDatabase();
    const [revision] = await database.select().from(teyvatDatasetRevisions).limit(1);
    if (!revision) return NextResponse.json({ error: "knowledge_provider_not_ready" }, { status: 503 });
    if (requestedRevision && requestedRevision !== revision.revision) return NextResponse.json({ error: "revision_not_found" }, { status: 404 });
    const result = await database.execute<{
      id: string; document_id: string; entity_id: string; category: string; title: string; content: string; source_id: string; score: number;
    }>(sql`
      select c.id, c.document_id, d.entity_id, d.category, d.title, c.content, d.source_id,
        ts_rank(to_tsvector('english', c.content), websearch_to_tsquery('english', ${query})) as score
      from ${teyvatChunks} c
      join ${teyvatDocuments} d on d.id = c.document_id
      join ${teyvatEntities} e on e.id = d.entity_id
      where to_tsvector('english', c.content) @@ websearch_to_tsquery('english', ${query})
        ${kind ? sql`and e.kind = ${kind}` : sql``}
      order by score desc, d.id asc
      limit ${limit}
    `);
    return NextResponse.json({ revision: revision.revision, results: result.rows.map((row) => ({
      id: row.id,
      content: row.content,
      revision: revision.revision,
      score: Number(row.score),
      metadata: { entityId: row.entity_id, kind: row.category, section: row.title },
      citations: [{ sourceId: row.source_id || "gi-data", documentId: row.document_id, chunkId: row.id }],
    })) }, { headers: { "cache-control": "public, max-age=30, s-maxage=60" } });
  } catch {
    return NextResponse.json({ error: "knowledge_provider_unavailable" }, { status: 503 });
  }
}
