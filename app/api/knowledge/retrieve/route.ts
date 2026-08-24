import { type NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDatabase } from "../../../../db/client";
import { teyvatChunks, teyvatDocuments, teyvatEntities, teyvatDatasetRevisions, teyvatEmbeddings } from "../../../../db/schema";
import { embedTexts, embeddingConfig, vectorLiteral } from "../../../../lib/teyvat/embeddings";

type RetrievalBody = { query?: unknown; mode?: unknown; limit?: unknown; revision?: unknown; filters?: { kind?: unknown } };

export async function POST(request: NextRequest) {
  let body: RetrievalBody;
  try { body = await request.json() as RetrievalBody; } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) return NextResponse.json({ error: "query must be a non-empty string" }, { status: 400 });
  const mode = body.mode === undefined ? "lexical" : body.mode;
  if (mode !== "lexical" && mode !== "semantic" && mode !== "hybrid") return NextResponse.json({ error: "mode must be lexical, semantic, or hybrid" }, { status: 400 });
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
    if (mode !== "lexical") {
      const embedding = embeddingConfig();
      const [state] = embedding ? (await database.execute<{ ready: boolean }>(sql`select count(*) = (select count(*) from ${teyvatChunks} where revision = ${revision.revision}) and count(*) > 0 as ready from ${teyvatEmbeddings} where revision = ${revision.revision} and model = ${embedding.model}`)).rows : [{ ready: false }];
      if (!embedding || !state?.ready) return NextResponse.json({ error: "semantic_search_unavailable" }, { status: 503 });
    }
    const lexical = await database.execute<{
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
      limit ${mode === "lexical" ? limit : Math.min(limit * 3, 1000)}
    `);
    type Candidate = { id: string; document_id: string; entity_id: string; category: string; title: string; content: string; source_id: string; score: number };
    let rows: Candidate[] = lexical.rows;
    if (mode !== "lexical") {
      const embedding = embeddingConfig();
      if (!embedding) return NextResponse.json({ error: "semantic_search_unavailable" }, { status: 503 });
      const [queryVector] = await embedTexts([query]);
      const vectorResult = await database.execute<Candidate>(sql`
        select c.id, c.document_id, d.entity_id, d.category, d.title, c.content, d.source_id,
          (1 - (v.embedding <=> ${vectorLiteral(queryVector)}::vector)) as score
        from ${teyvatEmbeddings} v
        join ${teyvatChunks} c on c.id = v.chunk_id
        join ${teyvatDocuments} d on d.id = c.document_id
        join ${teyvatEntities} e on e.id = d.entity_id
        where v.revision = ${revision.revision} and v.model = ${embedding.model}
          ${kind ? sql`and e.kind = ${kind}` : sql``}
        order by score desc, c.id asc
        limit ${Math.min(limit * 3, 1000)}
      `);
      if (mode === "semantic") rows = vectorResult.rows;
      else {
        const lexicalScores = new Map(lexical.rows.map((row) => [row.id, Number(row.score)]));
        const vectorScores = new Map(vectorResult.rows.map((row) => [row.id, Number(row.score)]));
        const candidates = new Map([...lexical.rows, ...vectorResult.rows].map((row) => [row.id, row]));
        rows = [...candidates.values()].map((row) => ({ ...row, score: 0.45 * (lexicalScores.get(row.id) || 0) + 0.55 * (vectorScores.get(row.id) || 0) })).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, limit);
      }
    }
    return NextResponse.json({ revision: revision.revision, results: rows.map((row) => ({
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
