import { desc, sql } from "drizzle-orm";
import type { RetrievalRequest, RetrievalResponse } from "@vxnus/e";
import { createKnowledgeProvider } from "@vxnus/e-provider";
import { getDatabase } from "../../db/client";
import { teyvatChunks, teyvatDatasetRevisions, teyvatDocuments, teyvatEmbeddings, teyvatEntities } from "../../db/schema";
import { EMBEDDING_DIMENSIONS, embedTexts, embeddingConfig, vectorLiteral } from "./embeddings";

export async function createTeyvatProvider() {
  if (!process.env.DATABASE_URL) throw new Error("knowledge_provider_unavailable");
  const database = getDatabase();
  const [revision] = await database.select().from(teyvatDatasetRevisions).orderBy(desc(teyvatDatasetRevisions.installedAt)).limit(1);
  if (!revision) throw new Error("knowledge_provider_not_ready");
  const embedding = embeddingConfig();
  const [embeddingState] = embedding ? (await database.execute<{ count: number }>(sql`select count(*)::int as count from teyvat_embeddings where revision = ${revision.revision} and model = ${embedding.model}`)).rows : [{ count: 0 }];
  const [chunkState] = (await database.execute<{ count: number }>(sql`select count(*)::int as count from teyvat_chunks where revision = ${revision.revision}`)).rows;
  const semanticReady = Boolean(embedding && Number(embeddingState?.count) === Number(chunkState?.count) && Number(chunkState?.count) > 0);
  const manifest = {
    id: "@vxnus/e-teyvat", name: "e-teyvat", publisher: "vxnus", version: "1.0.0", schemaVersion: "1.0",
    description: "Structured Genshin Impact knowledge.",
    license: {
      license: "CC-BY-4.0",
      licenseName: "Creative Commons Attribution 4.0 International",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      rightsHolder: "vxnus",
      copyrightNotice: "© 2026 vxnus",
      attributionText: "E-Teyvat by vxnus",
      notice: "E-Teyvat is an unofficial fan project and is not affiliated with, endorsed by, or sponsored by HoYoverse. This license applies only to original material contributed to E-Teyvat and does not grant, transfer, or imply any license or permission to use Genshin Impact or other third-party intellectual property. Users are responsible for ensuring that their use of third-party intellectual property complies with applicable rights, licenses, and terms.",
    },
    sources: [{ id: "e-teyvat", title: "E-Teyvat", license: "CC-BY-4.0", licenseDescription: "Creative Commons Attribution 4.0 International", licenseUrl: "https://creativecommons.org/licenses/by/4.0/", uri: "https://github.com/vxnuslabs/e-teyvat" }],
    capabilities: { lexicalSearch: true, semanticSearch: semanticReady, structuredEntities: true, relations: true, revisions: true },
    ...(semanticReady ? { retrieval: { embedding: { model: embedding!.model, dimensions: EMBEDDING_DIMENSIONS, provider: embedding!.provider } } } : {}),
  };
  const provider = createKnowledgeProvider({ manifest, verificationKey: process.env.E_PUBLISHER_API_KEY || "", retrieve: (request) => retrieveTeyvat(database, request, revision.revision) });
  return { provider, revision: revision.revision };
}

async function retrieveTeyvat(database: ReturnType<typeof getDatabase>, request: RetrievalRequest, activeRevision: string): Promise<RetrievalResponse> {
  const query = request.query.trim();
  if (!query) throw new Error("query must be a non-empty string");
  const mode = request.mode || "lexical";
  const limit = request.limit === undefined ? 8 : Math.max(1, Math.min(request.limit, 1000));
  if (request.revision && request.revision !== activeRevision) throw new Error("revision_not_found");
  const kindValue = request.filters?.kind;
  const kind = kindValue === undefined ? undefined : typeof kindValue === "string" ? kindValue : "";
  if (kindValue !== undefined && !kind) throw new Error("filters.kind must be a string");
  if (mode !== "lexical") {
    const embedding = embeddingConfig();
    if (!embedding) throw new Error("semantic_search_unavailable");
    const [state] = (await database.execute<{ ready: boolean }>(sql`select count(*) = (select count(*) from ${teyvatChunks} where revision = ${activeRevision}) and count(*) > 0 as ready from ${teyvatEmbeddings} where revision = ${activeRevision} and model = ${embedding.model}`)).rows;
    if (!state?.ready) throw new Error("semantic_search_unavailable");
  }
  const lexical = await database.execute<{ id: string; document_id: string; entity_id: string; category: string; title: string; content: string; source_id: string; score: number }>(sql`
    select c.id, c.document_id, d.entity_id, d.category, d.title, c.content, d.source_id,
      ts_rank(to_tsvector('english', c.content), websearch_to_tsquery('english', ${query})) as score
    from ${teyvatChunks} c join ${teyvatDocuments} d on d.id = c.document_id join ${teyvatEntities} e on e.id = d.entity_id
    where c.revision = ${activeRevision} and to_tsvector('english', c.content) @@ websearch_to_tsquery('english', ${query})
      ${kind ? sql`and e.kind = ${kind}` : sql``}
    order by score desc, d.id asc limit ${mode === "lexical" ? limit : Math.min(limit * 3, 1000)}
  `);
  type Candidate = typeof lexical.rows[number];
  let rows: Candidate[] = lexical.rows;
  if (mode !== "lexical") {
    const embedding = embeddingConfig();
    if (!embedding) throw new Error("semantic_search_unavailable");
    const [queryVector] = await embedTexts([query]);
    const vectorResult = await database.execute<Candidate>(sql`
      select c.id, c.document_id, d.entity_id, d.category, d.title, c.content, d.source_id, (1 - (v.embedding <=> ${vectorLiteral(queryVector)}::vector)) as score
      from ${teyvatEmbeddings} v join ${teyvatChunks} c on c.id = v.chunk_id join ${teyvatDocuments} d on d.id = c.document_id join ${teyvatEntities} e on e.id = d.entity_id
      where v.revision = ${activeRevision} and v.model = ${embedding.model} ${kind ? sql`and e.kind = ${kind}` : sql``}
      order by score desc, c.id asc limit ${Math.min(limit * 3, 1000)}
    `);
    if (mode === "semantic") rows = vectorResult.rows;
    else {
      const lexicalScores = new Map(lexical.rows.map((row) => [row.id, Number(row.score)]));
      const vectorScores = new Map(vectorResult.rows.map((row) => [row.id, Number(row.score)]));
      const candidates = new Map([...lexical.rows, ...vectorResult.rows].map((row) => [row.id, row]));
      rows = [...candidates.values()].map((row) => ({ ...row, score: 0.45 * (lexicalScores.get(row.id) || 0) + 0.55 * (vectorScores.get(row.id) || 0) })).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, limit);
    }
  }
  return { revision: activeRevision, results: rows.map((row) => ({ id: row.id, content: row.content, revision: activeRevision, score: Number(row.score), metadata: { entityId: row.entity_id, kind: row.category, section: row.title }, citations: [{ sourceId: row.source_id || "e-teyvat", documentId: row.document_id, chunkId: row.id }] })) };
}
