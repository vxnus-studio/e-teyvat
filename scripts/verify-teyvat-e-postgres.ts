import { config } from "dotenv";
config({ path: ".env.local" });
import pg from "pg";
import { readArtifact, readArtifactManifest } from "../lib/teyvat/artifact.ts";
import { ingestTeyvatProjectionInBatches, openTeyvatEPostgres } from "../lib/teyvat/e-postgres/ingest.ts";
import { ingestTeyvatExtensions, provisionTeyvatExtensions } from "../lib/teyvat/e-postgres/extensions.ts";
import { resolveTeyvatEPostgresAlias } from "../lib/teyvat/e-postgres/compat.ts";

const { Pool } = pg;
const targetUrl = process.env.TEYVAT_E_DATABASE_URL;
const baselineUrl = process.env.DATABASE_URL;
if (!targetUrl) throw new Error("TEYVAT_E_DATABASE_URL is not configured.");
if (!baselineUrl) throw new Error("DATABASE_URL is not configured for read-only parity checks.");

const projection = readArtifact();
const manifest = readArtifactManifest();
const { engine } = await openTeyvatEPostgres();
const target = new Pool({ connectionString: targetUrl, max: 1 });
const baseline = new Pool({ connectionString: baselineUrl, max: 1 });

async function rows(pool: pg.Pool, query: string, values: unknown[] = []) {
  return (await pool.query<Record<string, unknown>>(query, values)).rows;
}
async function databaseMeta(pool: pg.Pool, endpoint: string) {
  const result = await pool.query<{ database: string; schema: string; server: string | null; port: number | null }>("SELECT current_database() AS database, current_schema() AS schema, inet_server_addr()::text AS server, inet_server_port() AS port");
  const row = result.rows[0];
  if (!row) throw new Error(`Unable to fingerprint ${endpoint}`);
  return { endpoint, ...row };
}
async function countTables(pool: pg.Pool, prefix: string) {
  const names = ["entities", "aliases", "relations", "documents"];
  const result: Record<string, number> = {};
  for (const name of names) {
    const table = `${prefix}${name}`;
    result[name] = Number((await rows(pool, `SELECT count(*)::int AS value FROM ${table}`))[0].value);
  }
  return result;
}
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function canonicalEntity(category: string, sourceId: string) {
  return projection.entities.find((entity) => entity.id === `genshin:${category}:${sourceId}`);
}
function relationKey(value: Record<string, unknown>) {
  return `${value.subjectId ?? value.subject_id}|${value.predicate}|${value.objectId ?? value.object_id}`;
}
function signature(value: unknown): string {
  return JSON.stringify(value, (_key, item) => item instanceof Map ? Object.fromEntries(item) : item);
}

const targetMeta = await databaseMeta(target, new URL(targetUrl).hostname);
const baselineMeta = await databaseMeta(baseline, new URL(baselineUrl).hostname);
assert(targetMeta.endpoint !== baselineMeta.endpoint || targetMeta.database !== baselineMeta.database || targetMeta.schema !== baselineMeta.schema || targetMeta.server !== baselineMeta.server || targetMeta.port !== baselineMeta.port, "Target fingerprint matches baseline; refusing parity experiment.");

const provisionStarted = performance.now();
const provisionMs = performance.now() - provisionStarted;

const before = await countTables(target, "e_");
const ingestStarted = performance.now();
const ingest = await ingestTeyvatProjectionInBatches(engine, projection);
const ingestionMs = performance.now() - ingestStarted;
const after = await countTables(target, "e_");
assert(after.entities === 8696 && after.aliases === 8468 && after.relations === 14244 && after.documents === 11610, `Unexpected E counts: ${signature(after)}`);

await provisionTeyvatExtensions(target);
const extensionTables = (await rows(target, `SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('teyvat_e_dataset_revisions','teyvat_e_document_metadata') ORDER BY table_name`)).map((row) => row.table_name);
assert(extensionTables.length === 2, "Teyvat extension tables were not provisioned.");
await ingestTeyvatExtensions(target, projection, manifest);

const integrity = {
  counts: after,
  before,
  emptyRequired: Number((await rows(target, `SELECT count(*)::int AS value FROM e_entities WHERE id='' OR namespace='' OR kind='' OR slug='' OR name='' OR data IS NULL`))[0].value) + Number((await rows(target, `SELECT count(*)::int AS value FROM e_aliases WHERE id='' OR entity_id='' OR alias=''`))[0].value) + Number((await rows(target, `SELECT count(*)::int AS value FROM e_relations WHERE id='' OR subject_id='' OR predicate='' OR object_id=''`))[0].value) + Number((await rows(target, `SELECT count(*)::int AS value FROM e_documents WHERE id='' OR entity_id='' OR content IS NULL`))[0].value),
  orphanAliases: Number((await rows(target, "SELECT count(*)::int AS value FROM e_aliases a LEFT JOIN e_entities e ON e.id=a.entity_id WHERE e.id IS NULL"))[0].value),
  orphanRelationSubjects: Number((await rows(target, "SELECT count(*)::int AS value FROM e_relations r LEFT JOIN e_entities e ON e.id=r.subject_id WHERE e.id IS NULL"))[0].value),
  orphanRelationObjects: Number((await rows(target, "SELECT count(*)::int AS value FROM e_relations r LEFT JOIN e_entities e ON e.id=r.object_id WHERE e.id IS NULL"))[0].value),
  orphanDocuments: Number((await rows(target, "SELECT count(*)::int AS value FROM e_documents d LEFT JOIN e_entities e ON e.id=d.entity_id WHERE e.id IS NULL"))[0].value),
  duplicateEntityIds: Number((await rows(target, "SELECT count(*)::int AS value FROM (SELECT id FROM e_entities GROUP BY id HAVING count(*)>1) x"))[0].value),
  duplicateRelationIds: Number((await rows(target, "SELECT count(*)::int AS value FROM (SELECT id FROM e_relations GROUP BY id HAVING count(*)>1) x"))[0].value),
  provenanceRows: Number((await rows(target, "SELECT count(*)::int AS value FROM e_entities WHERE provenance IS NOT NULL"))[0].value),
  temporalRows: Number((await rows(target, "SELECT count(*)::int AS value FROM e_entities WHERE temporal IS NOT NULL"))[0].value),
  syntheticReliquary: Number((await rows(target, "SELECT count(*)::int AS value FROM e_entities WHERE id IN ('genshin:reliquary_set:10001','genshin:reliquary_piece:51140')"))[0].value),
  recipeRelations: Number((await rows(target, "SELECT count(*)::int AS value FROM e_relations WHERE predicate='recipe_ingredient' AND object_id IN ('genshin:food:100001','genshin:food:100002','genshin:food:101212','genshin:food:101230')"))[0].value),
  revisionRows: Number((await rows(target, "SELECT count(*)::int AS value FROM teyvat_e_dataset_revisions"))[0].value),
  documentMetadataRows: Number((await rows(target, "SELECT count(*)::int AS value FROM teyvat_e_document_metadata"))[0].value),
};
assert(integrity.emptyRequired === 0 && integrity.orphanAliases === 0 && integrity.orphanRelationSubjects === 0 && integrity.orphanRelationObjects === 0 && integrity.orphanDocuments === 0 && integrity.duplicateEntityIds === 0 && integrity.duplicateRelationIds === 0, `Integrity failure: ${signature(integrity)}`);
assert(integrity.provenanceRows > 0 && integrity.temporalRows > 0 && integrity.syntheticReliquary === 2 && integrity.recipeRelations > 0 && integrity.revisionRows === 1 && integrity.documentMetadataRows === 11610, `Metadata preservation failure: ${signature(integrity)}`);

let repeatIngestion: Record<string, unknown>;
try {
  await ingestTeyvatProjectionInBatches(engine, projection);
  repeatIngestion = { outcome: "unexpected-success" };
} catch (error) {
  const countsAfterFailure = await countTables(target, "e_");
  repeatIngestion = { outcome: "rolled-back-unique-violation", errorCode: (error as { code?: string }).code ?? "unknown", countsAfterFailure };
  assert(signature(countsAfterFailure) === signature(after), "Failed repeat ingestion changed E-native counts.");
}

const representativeIds = [
  canonicalEntity("avatar", "10000089")?.id,
  canonicalEntity("avatar", "10000052")?.id,
  canonicalEntity("weapon", "11509")?.id,
  canonicalEntity("material", "100011")?.id,
  canonicalEntity("food", "100001")?.id,
  canonicalEntity("domain", "1142")?.id,
].filter((id): id is string => Boolean(id));
const entityParity = [];
for (const id of representativeIds) {
  const e = (await engine.query({ type: "getEntity", id })).entities?.[0];
  const b = (await rows(baseline, "SELECT id, namespace, kind, slug, name, data, provenance, temporal FROM teyvat_entities WHERE id=$1", [id]))[0];
  entityParity.push({ id, equal: Boolean(e && b && e.id === b.id && e.namespace === b.namespace && e.kind === b.kind && e.slug === b.slug && e.name === b.name && signature(e.data) === signature(b.data)) });
}
assert(entityParity.every((item) => item.equal), `Entity parity failure: ${signature(entityParity)}`);

const furina = representativeIds.find((id) => id.includes("avatar:10000089")) ?? projection.entities.find((e) => e.name.toLowerCase() === "furina")?.id;
assert(furina, "Furina representative entity missing.");
const eRelations = (await engine.query({ type: "findRelations", subjectId: furina, limit: 1000 })).relations ?? [];
const bRelations = await rows(baseline, "SELECT subject_id, predicate, object_id FROM teyvat_relations WHERE subject_id=$1 ORDER BY id", [furina]);
const relationParity = { e: new Set(eRelations.map((relation) => relationKey(relation as unknown as Record<string, unknown>))).size, baseline: new Set(bRelations.map(relationKey)).size, equal: signature(eRelations.map((relation) => relationKey(relation as unknown as Record<string, unknown>)).sort()) === signature(bRelations.map(relationKey).sort()) };
assert(relationParity.equal, `Relation parity failure: ${signature(relationParity)}`);

const documentEntity = projection.documents[0]?.entityId;
assert(documentEntity, "Document representative missing.");
const eDocs = (await engine.query({ type: "findDocuments", entityId: documentEntity, limit: 1000 })).documents ?? [];
const bDocs = await rows(baseline, "SELECT id, entity_id, content, provenance FROM teyvat_documents WHERE entity_id=$1 ORDER BY id", [documentEntity]);
const documentParity = { e: eDocs.length, baseline: bDocs.length, equal: eDocs.length === bDocs.length && eDocs.every((doc) => bDocs.some((row) => row.id === doc.id && row.entity_id === doc.entityId && row.content === doc.content)) };
assert(documentParity.equal, `Document parity failure: ${signature(documentParity)}`);

const alias = projection.aliases.find((item) => item.alias.toLowerCase().includes("raiden") || item.alias.toLowerCase().includes("shogun"));
assert(alias, "Raiden representative alias missing.");
const aliasEntities = await resolveTeyvatEPostgresAlias(target, alias.alias, "genshin");
const searchResult = await engine.query({ type: "search", search: { query: "Furina", mode: "lexical", limit: 20 } });
const traversalResult = await engine.query({ type: "traverse", startId: furina, maxDepth: 2, maxPaths: 100 });
const capabilities = await engine.query({ type: "getCapabilities" });
assert(aliasEntities.some((item) => item.id === alias.entityId), "Alias query failed.");
assert(searchResult.search?.entities?.some((item) => item.id === furina), "Entity search failed.");
assert((traversalResult.traversal?.relations?.length ?? 0) > 0, "Relation traversal failed.");

console.log(JSON.stringify({
  target: { database: targetMeta.database, schema: targetMeta.schema, separateFromBaseline: true },
  schema: { provisionMs, nativeTables: await rows(target, "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'e_%' ORDER BY table_name"), extensions: extensionTables },
  ingestion: { result: ingest, ingestionMs },
  integrity,
  repeatIngestion,
  parity: { entityParity, relationParity, documentParity },
  queries: { capabilities: capabilities.capabilities, aliasEntityId: aliasEntities.map((item) => item.id), searchCount: searchResult.search?.entities?.length, traversal: { entities: traversalResult.traversal?.entities?.length, relations: traversalResult.traversal?.relations?.length, paths: traversalResult.traversal?.paths?.length } },
}, null, 2));

await engine.close();
await target.end();
await baseline.end();
