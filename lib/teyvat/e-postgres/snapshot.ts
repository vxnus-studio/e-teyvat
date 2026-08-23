import { createHash } from "node:crypto";
import type { Pool } from "pg";
import type { TeyvatArtifactManifest } from "../artifact.ts";
import type { TeyvatProjection } from "../projection/types.ts";

type SnapshotStatus = "staged" | "validating" | "active" | "failed" | "retired";

export interface TeyvatSnapshotResult {
  revision: string;
  status: SnapshotStatus;
  stageSchema: string;
  counts: { entities: number; aliases: number; relations: number; documents: number };
  durationMs: number;
}

export interface TeyvatSnapshotInstallOptions {
  /** Test-only failure injection after a staged dataset has been loaded. */
  failAfter?: "entities" | "aliases" | "relations" | "documents";
}

const ACTIVE_TABLES = ["e_entities", "e_aliases", "e_relations", "e_claims", "e_documents", "teyvat_e_document_metadata", "teyvat_e_dataset_revisions"] as const;

function identifier(value: string): string {
  if (!/^[a-z0-9_]+$/.test(value)) throw new Error(`Unsafe SQL identifier: ${value}`);
  return `"${value}"`;
}

function revisionToken(revision: string): string {
  return createHash("sha256").update(revision).digest("hex").slice(0, 16);
}

function schemaForRevision(revision: string): string {
  return `e_stage_${revisionToken(revision)}`;
}

function retiredSchemaForRevision(revision: string): string {
  return `e_retired_${Date.now().toString(36)}_${revisionToken(revision).slice(0, 8)}`;
}

async function bulkInsert(pool: Pool, table: string, columns: string[], rows: unknown[][], chunkSize = 500): Promise<void> {
  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize);
    const values: unknown[] = [];
    const placeholders = chunk.map((row, rowIndex) => {
      const offset = rowIndex * columns.length;
      values.push(...row);
      return `(${columns.map((_, columnIndex) => `$${offset + columnIndex + 1}`).join(",")})`;
    });
    await pool.query(
      `INSERT INTO ${table} (${columns.map(identifier).join(",")}) VALUES ${placeholders.join(",")}`,
      values,
    );
  }
}

async function provisionControl(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS teyvat_e_snapshots (
      revision VARCHAR(255) PRIMARY KEY,
      status VARCHAR(16) NOT NULL CHECK (status IN ('staged','validating','active','failed','retired')),
      stage_schema VARCHAR(63) NOT NULL,
      counts JSONB NOT NULL,
      manifest JSONB NOT NULL,
      retired_schema VARCHAR(63),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      activated_at TIMESTAMPTZ,
      failure TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS teyvat_e_snapshots_one_active_idx
      ON teyvat_e_snapshots(status) WHERE status = 'active';
    ALTER TABLE teyvat_e_snapshots ADD COLUMN IF NOT EXISTS retired_schema VARCHAR(63);
  `);
}

async function createStage(pool: Pool, schema: string): Promise<void> {
  const s = identifier(schema);
  await pool.query(`CREATE SCHEMA ${s}`);
  await pool.query(`
    CREATE TABLE ${s}.e_entities (
      id VARCHAR(255) PRIMARY KEY, namespace VARCHAR(255) NOT NULL, kind VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL, name VARCHAR(255) NOT NULL, data JSONB NOT NULL DEFAULT '{}',
      identities JSONB, provenance JSONB, temporal JSONB
    );
    CREATE TABLE ${s}.e_aliases (
      id VARCHAR(255) PRIMARY KEY, entity_id VARCHAR(255) NOT NULL REFERENCES ${s}.e_entities(id) ON DELETE CASCADE,
      alias VARCHAR(255) NOT NULL
    );
    CREATE TABLE ${s}.e_relations (
      id VARCHAR(255) PRIMARY KEY, subject_id VARCHAR(255) NOT NULL REFERENCES ${s}.e_entities(id) ON DELETE CASCADE,
      predicate VARCHAR(255) NOT NULL, object_id VARCHAR(255) NOT NULL REFERENCES ${s}.e_entities(id) ON DELETE CASCADE,
      provenance JSONB, temporal JSONB, metadata JSONB
    );
    CREATE TABLE ${s}.e_claims (
      id VARCHAR(255) PRIMARY KEY, entity_id VARCHAR(255) NOT NULL REFERENCES ${s}.e_entities(id) ON DELETE CASCADE,
      statement TEXT NOT NULL, confidence VARCHAR(50) NOT NULL CHECK (confidence IN ('canon','theory','outdated','unverified')),
      source VARCHAR(255) NOT NULL, provenance JSONB, temporal JSONB
    );
    CREATE TABLE ${s}.e_documents (
      id VARCHAR(255) PRIMARY KEY, entity_id VARCHAR(255) NOT NULL REFERENCES ${s}.e_entities(id) ON DELETE CASCADE,
      content TEXT NOT NULL, provenance JSONB
    );
    CREATE TABLE ${s}.teyvat_e_document_metadata (
      document_id VARCHAR(255) PRIMARY KEY REFERENCES ${s}.e_documents(id) ON DELETE CASCADE,
      category VARCHAR(255) NOT NULL, parent_source_id VARCHAR(255) NOT NULL, title TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE ${s}.teyvat_e_dataset_revisions (
      revision VARCHAR(255) PRIMARY KEY, projection_version VARCHAR(255) NOT NULL,
      source_checksums JSONB NOT NULL, entity_count INTEGER NOT NULL, alias_count INTEGER NOT NULL,
      relation_count INTEGER NOT NULL, document_count INTEGER NOT NULL,
      installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX e_entities_namespace_idx ON ${s}.e_entities(namespace);
    CREATE INDEX e_entities_slug_idx ON ${s}.e_entities(slug);
    CREATE INDEX e_aliases_alias_idx ON ${s}.e_aliases(alias);
    CREATE INDEX e_relations_subject_idx ON ${s}.e_relations(subject_id);
    CREATE INDEX e_relations_object_idx ON ${s}.e_relations(object_id);
    CREATE INDEX e_documents_entity_idx ON ${s}.e_documents(entity_id);
  `);
}

async function loadStage(pool: Pool, schema: string, projection: TeyvatProjection, manifest: TeyvatArtifactManifest, options: TeyvatSnapshotInstallOptions): Promise<void> {
  const s = identifier(schema);
  await bulkInsert(pool, `${s}.e_entities`, ["id", "namespace", "kind", "slug", "name", "data", "identities", "provenance", "temporal"], projection.entities.map((item) => [item.id, item.namespace, item.kind, item.slug, item.name, JSON.stringify(item.data), item.identities ? JSON.stringify(item.identities) : null, item.provenance ? JSON.stringify(item.provenance) : null, item.temporal ? JSON.stringify(item.temporal) : null]));
  if (options.failAfter === "entities") throw new Error("Injected snapshot failure after entities");
  await bulkInsert(pool, `${s}.e_aliases`, ["id", "entity_id", "alias"], projection.aliases.map((item) => [item.id, item.entityId, item.alias]));
  if (options.failAfter === "aliases") throw new Error("Injected snapshot failure after aliases");
  await bulkInsert(pool, `${s}.e_relations`, ["id", "subject_id", "predicate", "object_id", "provenance", "temporal", "metadata"], projection.relations.map((item) => [item.id, item.subjectId, item.predicate, item.objectId, item.provenance ? JSON.stringify(item.provenance) : null, item.temporal ? JSON.stringify(item.temporal) : null, item.metadata ? JSON.stringify(item.metadata) : null]));
  if (options.failAfter === "relations") throw new Error("Injected snapshot failure after relations");
  await bulkInsert(pool, `${s}.e_documents`, ["id", "entity_id", "content", "provenance"], projection.documents.map((item) => [item.id, item.entityId, item.content, item.provenance ? JSON.stringify(item.provenance) : null]));
  const metadata = new Map(projection.documentMetadata.map((item) => [item.id, item]));
  await bulkInsert(pool, `${s}.teyvat_e_document_metadata`, ["document_id", "category", "parent_source_id", "title"], projection.documents.map((item) => {
    const key = item.id.replace("genshin:document:", "");
    const value = metadata.get(key);
    if (!value) throw new Error(`Missing document metadata for ${item.id}`);
    return [item.id, value.category, value.parentSourceId, value.title];
  }));
  if (options.failAfter === "documents") throw new Error("Injected snapshot failure after documents");
  await bulkInsert(pool, `${s}.teyvat_e_dataset_revisions`, ["revision", "projection_version", "source_checksums", "entity_count", "alias_count", "relation_count", "document_count"], [[projection.revision, manifest.projectionVersion, JSON.stringify(manifest.source), projection.entities.length, projection.aliases.length, projection.relations.length, projection.documents.length]]);
}

async function validateStage(pool: Pool, schema: string, projection: TeyvatProjection): Promise<void> {
  const s = identifier(schema);
  const expected = { entities: projection.entities.length, aliases: projection.aliases.length, relations: projection.relations.length, documents: projection.documents.length };
  const actual = {
    entities: Number((await pool.query(`SELECT count(*)::int AS count FROM ${s}.e_entities`)).rows[0].count),
    aliases: Number((await pool.query(`SELECT count(*)::int AS count FROM ${s}.e_aliases`)).rows[0].count),
    relations: Number((await pool.query(`SELECT count(*)::int AS count FROM ${s}.e_relations`)).rows[0].count),
    documents: Number((await pool.query(`SELECT count(*)::int AS count FROM ${s}.e_documents`)).rows[0].count),
  };
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Staging count mismatch: ${JSON.stringify({ expected, actual })}`);
  const empty = Number((await pool.query(`SELECT count(*)::int AS count FROM ${s}.e_entities WHERE id='' OR namespace='' OR kind='' OR slug='' OR name='' OR data IS NULL`)).rows[0].count);
  if (empty !== 0) throw new Error(`Staging contains ${empty} invalid entities`);
}

async function promote(pool: Pool, revision: string, schema: string, manifest: TeyvatArtifactManifest, counts: TeyvatSnapshotResult["counts"]): Promise<void> {
  const s = identifier(schema);
  const retiredName = retiredSchemaForRevision(revision);
  const retired = identifier(retiredName);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('teyvat-e-snapshot-promotion'))");
    await client.query(`CREATE SCHEMA ${retired}`);
    for (const table of ACTIVE_TABLES) {
      const exists = await client.query("SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1", [table]);
      if (exists.rowCount) await client.query(`ALTER TABLE public.${identifier(table)} SET SCHEMA ${retired}`);
    }
    for (const table of ACTIVE_TABLES) {
      await client.query(`ALTER TABLE ${s}.${identifier(table)} SET SCHEMA public`);
    }
    await client.query(`DROP SCHEMA ${s} CASCADE`);
    await client.query("UPDATE teyvat_e_snapshots SET status='retired', retired_schema=$1 WHERE status='active'", [retiredName]);
    await client.query("INSERT INTO teyvat_e_snapshots (revision,status,stage_schema,counts,manifest,activated_at) VALUES ($1,'active',$2,$3,$4,NOW()) ON CONFLICT (revision) DO UPDATE SET status='active', stage_schema=EXCLUDED.stage_schema, counts=EXCLUDED.counts, manifest=EXCLUDED.manifest, activated_at=NOW(), failure=NULL, retired_schema=NULL", [revision, schema, counts, manifest]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function installTeyvatSnapshotUnlocked(pool: Pool, projection: TeyvatProjection, manifest: TeyvatArtifactManifest, options: TeyvatSnapshotInstallOptions): Promise<TeyvatSnapshotResult> {
  const started = performance.now();
  const schema = schemaForRevision(projection.revision);
  await provisionControl(pool);
  const existing = await pool.query<{ status: SnapshotStatus; stage_schema: string; counts: TeyvatSnapshotResult["counts"] }>("SELECT status, stage_schema, counts FROM teyvat_e_snapshots WHERE revision=$1", [projection.revision]);
  if (existing.rows[0]?.status === "active") return { revision: projection.revision, status: "active", stageSchema: existing.rows[0].stage_schema, counts: existing.rows[0].counts, durationMs: performance.now() - started };
  if (existing.rows[0]) await pool.query("UPDATE teyvat_e_snapshots SET status='failed', failure='superseded by retry' WHERE revision=$1", [projection.revision]);
  await pool.query("INSERT INTO teyvat_e_snapshots (revision,status,stage_schema,counts,manifest) VALUES ($1,'staged',$2,$3,$4) ON CONFLICT (revision) DO UPDATE SET status='staged', stage_schema=EXCLUDED.stage_schema, counts=EXCLUDED.counts, manifest=EXCLUDED.manifest, failure=NULL", [projection.revision, schema, { entities: 0, aliases: 0, relations: 0, documents: 0 }, manifest]);
  await pool.query(`DROP SCHEMA IF EXISTS ${identifier(schema)} CASCADE`);
  try {
    await createStage(pool, schema);
    await loadStage(pool, schema, projection, manifest, options);
    await pool.query("UPDATE teyvat_e_snapshots SET status='validating' WHERE revision=$1", [projection.revision]);
    await validateStage(pool, schema, projection);
    const counts = { entities: projection.entities.length, aliases: projection.aliases.length, relations: projection.relations.length, documents: projection.documents.length };
    await promote(pool, projection.revision, schema, manifest, counts);
    return { revision: projection.revision, status: "active", stageSchema: schema, counts, durationMs: performance.now() - started };
  } catch (error) {
    await pool.query("UPDATE teyvat_e_snapshots SET status='failed', failure=$2 WHERE revision=$1", [projection.revision, error instanceof Error ? error.message : String(error)]);
    throw error;
  }
}

export async function installTeyvatSnapshot(pool: Pool, projection: TeyvatProjection, manifest: TeyvatArtifactManifest, options: TeyvatSnapshotInstallOptions = {}): Promise<TeyvatSnapshotResult> {
  const lockClient = await pool.connect();
  try {
    await lockClient.query("SELECT pg_advisory_lock(hashtext('teyvat-e-snapshot-install'))");
    return await installTeyvatSnapshotUnlocked(pool, projection, manifest, options);
  } finally {
    try {
      await lockClient.query("SELECT pg_advisory_unlock(hashtext('teyvat-e-snapshot-install'))");
    } finally {
      lockClient.release();
    }
  }
}

export async function rollbackTeyvatSnapshot(pool: Pool, revision: string): Promise<void> {
  const lockClient = await pool.connect();
  try {
    await lockClient.query("SELECT pg_advisory_lock(hashtext('teyvat-e-snapshot-install'))");
    const active = await pool.query<{ revision: string }>("SELECT revision FROM teyvat_e_snapshots WHERE status='active'");
    const previous = await pool.query<{ revision: string; retired_schema: string }>("SELECT revision, retired_schema FROM teyvat_e_snapshots WHERE status='retired' AND retired_schema IS NOT NULL ORDER BY activated_at DESC LIMIT 1");
    if (active.rows[0]?.revision !== revision) throw new Error(`Revision is not active: ${revision}`);
    const previousRow = previous.rows[0];
    if (!previousRow) throw new Error("No retired snapshot is available for rollback");
    if (!/^[a-z0-9_]+$/.test(previousRow.retired_schema)) throw new Error("Invalid retired snapshot schema");

    const retiredName = `e_retired_rollback_${Date.now().toString(36)}`;
    const retired = identifier(retiredName);
    const old = identifier(previousRow.retired_schema);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext('teyvat-e-snapshot-promotion'))");
      await client.query(`CREATE SCHEMA ${retired}`);
      for (const table of ACTIVE_TABLES) {
        await client.query(`ALTER TABLE public.${identifier(table)} SET SCHEMA ${retired}`);
      }
      for (const table of ACTIVE_TABLES) {
        await client.query(`ALTER TABLE ${old}.${identifier(table)} SET SCHEMA public`);
      }
      await client.query(`DROP SCHEMA ${old} CASCADE`);
      await client.query("UPDATE teyvat_e_snapshots SET status='retired', retired_schema=$1 WHERE status='active'", [retiredName]);
      await client.query("UPDATE teyvat_e_snapshots SET status='active', retired_schema=NULL, activated_at=NOW() WHERE revision=$1", [previousRow.revision]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } finally {
    try {
      await lockClient.query("SELECT pg_advisory_unlock(hashtext('teyvat-e-snapshot-install'))");
    } finally {
      lockClient.release();
    }
  }
}

export async function cleanupTeyvatStaging(pool: Pool, olderThanHours = 24): Promise<number> {
  if (!Number.isFinite(olderThanHours) || olderThanHours < 0) throw new Error("olderThanHours must be a non-negative number");
  const lockClient = await pool.connect();
  try {
    await lockClient.query("SELECT pg_advisory_lock(hashtext('teyvat-e-snapshot-install'))");
    const candidates = await pool.query<{ revision: string; stage_schema: string }>("SELECT revision, stage_schema FROM teyvat_e_snapshots WHERE status IN ('staged','validating','failed') AND created_at < NOW() - ($1 * INTERVAL '1 hour')", [olderThanHours]);
    let cleaned = 0;
    for (const candidate of candidates.rows) {
      if (!/^e_stage_[a-z0-9_]+$/.test(candidate.stage_schema)) throw new Error(`Invalid staging schema for ${candidate.revision}`);
      await pool.query(`DROP SCHEMA IF EXISTS ${identifier(candidate.stage_schema)} CASCADE`);
      await pool.query("UPDATE teyvat_e_snapshots SET status='failed', failure='staging schema cleaned' WHERE revision=$1", [candidate.revision]);
      cleaned++;
    }
    return cleaned;
  } finally {
    try {
      await lockClient.query("SELECT pg_advisory_unlock(hashtext('teyvat-e-snapshot-install'))");
    } finally {
      lockClient.release();
    }
  }
}
