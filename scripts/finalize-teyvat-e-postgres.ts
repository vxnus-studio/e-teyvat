import { config } from "dotenv";
config({ path: ".env.local" });
import { performance } from "node:perf_hooks";
import { PostgresEngine } from "@vxnus/e-postgres";
import { readArtifact } from "../lib/teyvat/artifact.ts";
import { TeyvatEPostgresFarmingQueries } from "../lib/teyvat/persistence/e-postgres-farming.ts";
import { TeyvatPersistentFarmingQueries } from "../lib/teyvat/persistence/farming.ts";
import pg from "pg";

const targetUrl = process.env.TEYVAT_E_DATABASE_URL;
const baselineUrl = process.env.DATABASE_URL;
if (!targetUrl || !baselineUrl) throw new Error("Both database URLs are required.");
const allowSharedTarget = process.env.TEYVAT_ALLOW_SHARED_TARGET === "1";
const projection = readArtifact();
const target = new pg.Pool({ connectionString: targetUrl, max: 2 });
const baseline = new pg.Pool({ connectionString: baselineUrl, max: 1 });
const engine = new PostgresEngine({ connectionString: targetUrl, max: 2 });
const rows = async (pool: pg.Pool, sql: string, values: unknown[] = []) => (await pool.query<Record<string, unknown>>(sql, values)).rows;
const databaseMeta = async (pool: pg.Pool, endpoint: string) => {
  const result = await pool.query<{ database: string; schema: string; server: string | null; port: number | null }>("select current_database() as database, current_schema() as schema, inet_server_addr()::text as server, inet_server_port() as port");
  const row = result.rows[0];
  if (!row) throw new Error(`Unable to fingerprint ${endpoint}`);
  return { endpoint, ...row };
};
const timed = async <T>(fn: () => Promise<T>) => { const start = performance.now(); const value = await fn(); return { value, ms: performance.now() - start }; };
const safeTimed = async <T>(fn: () => Promise<T>) => { const start = performance.now(); try { return { value: await fn(), ms: performance.now() - start }; } catch (error) { return { error: error instanceof Error ? error.message : String(error), code: (error as { code?: string }).code, ms: performance.now() - start }; } };
const relationKey = (item: { subjectId?: unknown; subject_id?: unknown; predicate?: unknown; objectId?: unknown; object_id?: unknown }) => `${item.subjectId ?? item.subject_id}|${item.predicate}|${item.objectId ?? item.object_id}`;

const targetMeta = await databaseMeta(target, new URL(targetUrl).hostname);
const baselineMeta = await databaseMeta(baseline, new URL(baselineUrl).hostname);
const sharedTarget = targetMeta.endpoint === baselineMeta.endpoint && JSON.stringify(targetMeta) === JSON.stringify(baselineMeta);
if (sharedTarget && !allowSharedTarget) throw new Error("Target matches baseline; refusing final checks. Set TEYVAT_ALLOW_SHARED_TARGET=1 only after the unified target has been populated and reviewed.");

const counts: Record<string, number> = {};
for (const table of ["e_entities", "e_aliases", "e_relations", "e_documents", "e_claims", "e_schema_migrations", "teyvat_e_dataset_revisions", "teyvat_e_document_metadata"]) counts[table] = Number((await rows(target, `select count(*)::int as n from ${table}`))[0].n);
const integrity = {
  orphanAliases: Number((await rows(target, "select count(*)::int as n from e_aliases a left join e_entities e on e.id=a.entity_id where e.id is null"))[0].n),
  orphanRelationSubjects: Number((await rows(target, "select count(*)::int as n from e_relations r left join e_entities e on e.id=r.subject_id where e.id is null"))[0].n),
  orphanRelationObjects: Number((await rows(target, "select count(*)::int as n from e_relations r left join e_entities e on e.id=r.object_id where e.id is null"))[0].n),
  orphanDocuments: Number((await rows(target, "select count(*)::int as n from e_documents d left join e_entities e on e.id=d.entity_id where e.id is null"))[0].n),
  emptyRequired: Number((await rows(target, "select count(*)::int as n from e_entities where id='' or namespace='' or kind='' or slug='' or name=''"))[0].n),
  provenance: Number((await rows(target, "select count(*)::int as n from e_entities where provenance is not null"))[0].n),
  temporal: Number((await rows(target, "select count(*)::int as n from e_entities where temporal is not null"))[0].n),
  syntheticReliquary: Number((await rows(target, "select count(*)::int as n from e_entities where id in ('genshin:reliquary_set:10001','genshin:reliquary_piece:51140')"))[0].n),
  recipeRemapped: Number((await rows(target, "select count(*)::int as n from e_relations where predicate='recipe_ingredient' and object_id in ('genshin:food:100001','genshin:food:100002','genshin:food:101212','genshin:food:101230')"))[0].n),
};

const cases: Record<string, string> = { character: "genshin:avatar:10000089", weapon: "genshin:weapon:11509", material: "genshin:material:100011", food: "genshin:food:100001", domain: "genshin:domain:1142" };
const entityChecks = [];
for (const [name, id] of Object.entries(cases)) {
  const e = (await timed(() => engine.query({ type: "getEntity", id }))).value.entities?.[0];
  const b = (await rows(baseline, "select id,namespace,kind,slug,name,data from teyvat_entities where id=$1", [id]))[0];
  entityChecks.push({ name, id, equal: Boolean(e && b && e.id === b.id && e.namespace === b.namespace && e.kind === b.kind && e.slug === b.slug && e.name === b.name && JSON.stringify(e.data) === JSON.stringify(b.data)) });
}
const furinaRelations = (await engine.query({ type: "findRelations", subjectId: cases.character, limit: 1000 })).relations ?? [];
const baselineRelations = await rows(baseline, "select subject_id,predicate,object_id from teyvat_relations where subject_id=$1 order by id", [cases.character]);
const relationParity = { e: furinaRelations.length, baseline: baselineRelations.length, equal: JSON.stringify(furinaRelations.map(relationKey).sort()) === JSON.stringify(baselineRelations.map(relationKey).sort()) };
const documentEntity = projection.documents[0].entityId;
const eDocs = (await engine.query({ type: "findDocuments", entityId: documentEntity, limit: 1000 })).documents ?? [];
const bDocs = await rows(baseline, "select id,entity_id,content from teyvat_documents where entity_id=$1 order by id", [documentEntity]);
const documentParity = { e: eDocs.length, baseline: bDocs.length, equal: eDocs.length === bDocs.length && eDocs.every((doc) => bDocs.some((row) => row.id === doc.id && row.entity_id === doc.entityId && row.content === doc.content)) };
const alias = projection.aliases.find((item) => item.alias.toLowerCase().includes("raiden") || item.alias.toLowerCase().includes("shogun"));
const capabilities = await engine.query({ type: "getCapabilities" });
const queryTimings = {
  lookup: await timed(() => engine.query({ type: "getEntity", id: cases.character })),
  search: await timed(() => engine.query({ type: "search", search: { query: "Furina", mode: "lexical", limit: 20 } })),
  alias: await safeTimed(async () => (await engine.query({ type: "resolve", alias: alias?.alias ?? "Raiden Shogun", namespace: "genshin" })).entities ?? []),
  traversal: await timed(() => engine.query({ type: "traverse", startId: cases.character, maxDepth: 2, maxPaths: 100 })),
  documents: await timed(() => engine.query({ type: "findDocuments", entityId: documentEntity, limit: 20 })),
};

const eFarming = new TeyvatEPostgresFarmingQueries(targetUrl);
const baselineFarming = new TeyvatPersistentFarmingQueries();
const farmingCases = ["Furina", alias?.alias ?? "Raiden Shogun", "Mistsplitter Reforged", "Lakkaberry Madame", "Philosophies of Transience", "Mushroom", "invalid target"];
const farming = [];
for (const query of farmingCases) {
  const direct = (await engine.query({ type: "search", search: { query, mode: "lexical", limit: 20 } })).search?.entities?.[0];
  let aliasMatch;
  if (!direct) {
    try { aliasMatch = (await engine.query({ type: "resolve", alias: query, namespace: "genshin" })).entities?.[0]; } catch { aliasMatch = undefined; }
  }
  const targetEntity = direct ?? aliasMatch;
  const ePlanValue = await eFarming.getFarmingPlan(query);
  const bPlan = await timed(() => baselineFarming.getFarmingPlan(query));
  const ePlan = ePlanValue ? { target: ePlanValue.target.id, materials: ePlanValue.materials.map((item) => item.id).sort() } : null;
  const baseline = bPlan.value ? { target: bPlan.value.target.id, materials: bPlan.value.materials.map((item) => item.id).sort() } : null;
  farming.push({ query, targetFound: Boolean(targetEntity), e: ePlan, baseline, equal: JSON.stringify(ePlan) === JSON.stringify(baseline), baselineMs: bPlan.ms });
}
if (farming.some((item) => !item.equal)) throw new Error(`Farming parity failure: ${JSON.stringify(farming)}`);

console.log(JSON.stringify({ target: { database: targetMeta.database, schema: targetMeta.schema, separateFromBaseline: !sharedTarget, sharedTarget }, counts, integrity, entityChecks, relationParity, documentParity, capabilities: capabilities.capabilities, queryTimings: { lookupMs: queryTimings.lookup.ms, searchMs: queryTimings.search.ms, aliasMs: queryTimings.alias.ms, traversalMs: queryTimings.traversal.ms, documentsMs: queryTimings.documents.ms, searchCount: queryTimings.search.value.search?.entities?.length, traversalPaths: queryTimings.traversal.value.traversal?.paths?.length }, farming }, null, 2));
await engine.close();
await eFarming.close();
await target.end();
await baseline.end();
