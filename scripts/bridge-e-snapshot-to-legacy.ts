import { createHash, randomUUID } from "node:crypto";
import { config } from "dotenv";
import pg from "pg";
import { readArtifact } from "../lib/teyvat/artifact.ts";
import type { Entity, Relation } from "@vxnus/e";

config({ path: ".env.local" });
config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not configured.");

const projection = readArtifact();
const pool = new pg.Pool({ connectionString, max: 4 });

type LegacyEntity = {
  id: number;
  sourceKey: string;
  kind: string;
  slug: string;
  name: string;
  description: string | null;
  canonicalData: Record<string, unknown>;
  contentHash: string;
  gameVersion: string | null;
  sourceUrl: string | null;
  isActive: boolean;
};

function sourceId(entity: Entity): string {
  return entity.id.replace(/^genshin:[^:]+:/, "");
}

function legacyKind(kind: string): string {
  const names: Record<string, string> = {
    avatar: "characters",
    weapon: "weapons",
    material: "materials",
    domain: "domains",
    reliquary: "artifacts",
    monster: "enemies",
    region: "geographies",
    food: "foods",
    craft: "crafts",
    talent: "talents",
    constellation: "constellations",
  };
  if (names[kind]) return names[kind];
  if (kind.endsWith("s")) return kind;
  return `${kind}s`;
}

function textValue(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof (value as { en?: unknown }).en === "string") return (value as { en: string }).en;
  return null;
}

function json(value: unknown): string {
  return JSON.stringify(value ?? {});
}

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function normalizedAlias(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

async function tableCount(table: string): Promise<number> {
  const result = await pool.query<{ count: string }>(`SELECT count(*)::text AS count FROM public."${table}"`);
  return Number(result.rows[0].count);
}

async function bulkInsert(table: string, columns: string[], rows: unknown[][], chunkSize = 250): Promise<void> {
  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize);
    const values: unknown[] = [];
    const placeholders = chunk.map((row, rowIndex) => {
      const offset = rowIndex * columns.length;
      values.push(...row);
      return `(${columns.map((_, columnIndex) => `$${offset + columnIndex + 1}`).join(",")})`;
    });
    await pool.query(`INSERT INTO public."${table}" (${columns.map((column) => `"${column}"`).join(",")}) VALUES ${placeholders.join(",")}`, values);
  }
}

async function main() {
  const active = await pool.query<{ revision: string; counts: { entities: number; aliases: number; relations: number; documents: number } }>("SELECT revision, counts FROM public.teyvat_e_snapshots WHERE status='active'");
  if (active.rowCount !== 1 || active.rows[0].revision !== projection.revision) throw new Error("DATABASE_URL is not the active E snapshot target for this artifact.");
  const expected = { entities: projection.entities.length, aliases: projection.aliases.length, relations: projection.relations.length, documents: projection.documents.length };
  const activeCounts = active.rows[0].counts;
  if (["entities", "aliases", "relations", "documents"].some((key) => Number(activeCounts[key as keyof typeof expected]) !== expected[key as keyof typeof expected])) throw new Error(`Active E snapshot counts do not match the artifact: ${JSON.stringify({ active: activeCounts, expected })}`);

  const compatibilityTables = ["sync_runs", "entities", "aliases", "relations", "knowledge_documents", "banner_sources", "banner_phases", "banner_phase_characters", "banner_character_statistics"];
  const existing = await Promise.all(compatibilityTables.map(async (table) => [table, await tableCount(table)] as const));
  const nonEmpty = existing.filter(([, count]) => count !== 0);
  if (nonEmpty.length) throw new Error(`Refusing to bridge into non-empty compatibility tables: ${JSON.stringify(Object.fromEntries(nonEmpty))}`);

  const legacyEntities: LegacyEntity[] = projection.entities.map((entity, index) => {
    const data = entity.data as Record<string, unknown>;
    const provenance = entity.provenance as Record<string, unknown> | null | undefined;
    const temporal = entity.temporal as Record<string, unknown> | null | undefined;
    return {
      id: index + 1,
      sourceKey: `${legacyKind(entity.kind)}:${sourceId(entity)}`,
      kind: legacyKind(entity.kind),
      slug: entity.slug,
      name: entity.name,
      description: textValue(data.description),
      canonicalData: data,
      contentHash: typeof provenance?.raw_sha256 === "string" ? provenance.raw_sha256 : hash(data),
      gameVersion: typeof provenance?.source_version === "string" ? provenance.source_version : null,
      sourceUrl: typeof provenance?.endpoint === "string" ? provenance.endpoint : null,
      isActive: temporal?.is_active !== false,
    };
  });
  const usedSlugs = new Set<string>();
  for (const entity of legacyEntities) {
    const key = `${entity.kind}:${entity.slug}`;
    if (!usedSlugs.has(key)) {
      usedSlugs.add(key);
      continue;
    }
    const suffix = sourceId(projection.entities[entity.id - 1]);
    let candidate = `${entity.slug}-${suffix}`;
    let attempt = 2;
    while (usedSlugs.has(`${entity.kind}:${candidate}`)) candidate = `${entity.slug}-${suffix}-${attempt++}`;
    entity.slug = candidate;
    usedSlugs.add(`${entity.kind}:${candidate}`);
  }
  const entityIdByEId = new Map(projection.entities.map((entity, index) => [entity.id, index + 1]));
  const syncId = randomUUID();

  await pool.query("BEGIN");
  try {
    await bulkInsert("sync_runs", ["id", "status", "source", "source_revision", "content_digest", "entity_count", "relation_count", "unresolved_relation_count", "summary", "completed_at"], [[syncId, "ready", "e-snapshot", projection.revision, projection.revision, projection.entities.length, projection.relations.length, 0, json(projection.stats), new Date()]]);
    await bulkInsert("entities", ["id", "source_key", "kind", "slug", "name", "description", "canonical_data", "content_hash", "game_version", "source_url", "is_active", "last_seen_sync_id"], legacyEntities.map((entity) => [entity.id, entity.sourceKey, entity.kind, entity.slug, entity.name, entity.description, json(entity.canonicalData), entity.contentHash, entity.gameVersion, entity.sourceUrl, entity.isActive, syncId]));

    const aliases = projection.aliases.flatMap((alias) => {
      const entityId = entityIdByEId.get(alias.entityId);
      if (!entityId) return [];
      return [[entityId, "English", alias.alias, normalizedAlias(alias.alias)]];
    });
    await bulkInsert("aliases", ["entity_id", "language", "alias", "normalized_alias"], aliases);

    const relations = new Map<string, unknown[]>();
    for (const relation of projection.relations as Relation[]) {
      const subjectId = entityIdByEId.get(relation.subjectId);
      const objectId = entityIdByEId.get(relation.objectId);
      if (!subjectId || !objectId) continue;
      const metadata = relation.metadata as Record<string, unknown>;
      const sourcePath = `${String(metadata.sourceCategory ?? "e")}:${String(metadata.sourceId ?? relation.subjectId)}`;
      const identity = `${subjectId}\0${relation.predicate}\0${objectId}\0${sourcePath}`;
      if (!relations.has(identity)) relations.set(identity, [subjectId, relation.predicate, objectId, sourcePath, json(metadata), syncId]);
    }
    await bulkInsert("relations", ["subject_id", "predicate", "object_id", "source_path", "metadata", "last_seen_sync_id"], [...relations.values()]);

    const metadataByDocumentId = new Map(projection.documentMetadata.map((item) => [item.id, item]));
    const documents = new Map<string, unknown[]>();
    for (const document of projection.documents) {
      const entityId = entityIdByEId.get(document.entityId);
      if (!entityId) continue;
      const metadata = metadataByDocumentId.get(document.id.replace("genshin:document:", ""));
      const section = metadata?.category ?? "document";
      const identity = `${entityId}\0${section}`;
      if (!documents.has(identity)) documents.set(identity, [entityId, section, document.content, hash(document.content), null, json({ title: metadata?.title ?? "", provenance: document.provenance }), new Date()]);
    }
    await bulkInsert("knowledge_documents", ["entity_id", "section", "content", "content_hash", "embedding", "metadata", "updated_at"], [...documents.values()]);

    for (const table of ["entities", "aliases", "relations", "knowledge_documents"]) {
      await pool.query(`SELECT setval(pg_get_serial_sequence('public."${table}"', 'id'), coalesce((SELECT max(id) FROM public."${table}"), 1), true)`);
    }
    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }

  console.log(JSON.stringify({ status: "PASS", revision: projection.revision, entities: legacyEntities.length, aliases: aliasesCount(projection), relations: await tableCount("relations"), documents: projection.documents.length }, null, 2));
}

function aliasesCount(value: typeof projection): number {
  return value.aliases.length;
}

try {
  await main();
} finally {
  await pool.end();
}
