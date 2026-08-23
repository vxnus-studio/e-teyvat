import { config } from "dotenv";
config({ path: ".env.local" });
config();
import pg from "pg";
import { readArtifactManifest } from "../lib/teyvat/artifact.ts";
import type { TeyvatProjection } from "../lib/teyvat/projection/types.ts";
import { installTeyvatSnapshot, rollbackTeyvatSnapshot } from "../lib/teyvat/e-postgres/snapshot.ts";

const connectionString = process.env.TEYVAT_E_SNAPSHOT_TEST_DATABASE_URL;
if (!connectionString) throw new Error("TEYVAT_E_SNAPSHOT_TEST_DATABASE_URL is not configured.");
const pool = new pg.Pool({ connectionString, max: 4 });
const manifest = readArtifactManifest();

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function fixture(revision: string, suffix: string): TeyvatProjection {
  return {
    entities: [{ id: `test:${suffix}:entity`, namespace: "test", kind: "fixture", slug: suffix, name: suffix, data: { fixture: true } }],
    aliases: [{ id: `test:${suffix}:alias`, entityId: `test:${suffix}:entity`, alias: suffix }],
    relations: [],
    claims: [],
    documents: [],
    documentMetadata: [],
    revision,
    stats: { inputEntities: 1, inputRelations: 0, inputDocuments: 0, projectedEntities: 1, projectedAliases: 1, projectedRelations: 0, projectedDocuments: 0, syntheticReliquaryEntities: 0, recipeRemaps: 0, nameFallbacks: 0, projectionMs: 0 },
  };
}

async function tableCount(table: string): Promise<number> {
  if (!/^[a-z0-9_]+$/.test(table)) throw new Error("Unsafe table name");
  const result = await pool.query(`SELECT count(*)::int AS count FROM public."${table}"`);
  return result.rows[0].count;
}

try {
  const existing = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('e_entities','e_aliases','e_relations','e_claims','e_documents','teyvat_e_document_metadata','teyvat_e_dataset_revisions')");
  assert(existing.rowCount === 0, "Snapshot test target is not empty; refusing to modify it.");

  const first = fixture("phase2-fixture-a", "alpha");
  const firstManifest = { ...manifest, revision: first.revision, counts: { entities: 1, aliases: 1, relations: 0, documents: 0 }, artifactSha256: "fixture", artifactBytes: 0 };
  let failed = false;
  try { await installTeyvatSnapshot(pool, first, firstManifest, { failAfter: "entities" }); } catch { failed = true; }
  assert(failed, "Injected staging failure unexpectedly succeeded");
  const failedState = await pool.query<{ status: string }>("SELECT status FROM teyvat_e_snapshots WHERE revision=$1", [first.revision]);
  assert(failedState.rows[0]?.status === "failed", "Failed staging was not recorded");

  const installed = await installTeyvatSnapshot(pool, first, firstManifest);
  assert(installed.status === "active" && await tableCount("e_entities") === 1, "Initial snapshot promotion failed");
  const repeated = await installTeyvatSnapshot(pool, first, firstManifest);
  assert(repeated.status === "active" && await tableCount("e_entities") === 1, "Repeated snapshot install was not idempotent");

  const second = fixture("phase2-fixture-b", "beta");
  const secondManifest = { ...firstManifest, revision: second.revision };
  await installTeyvatSnapshot(pool, second, secondManifest);
  const active = await pool.query<{ revision: string; count: string }>("SELECT s.revision, count(e.id)::text AS count FROM teyvat_e_snapshots s JOIN e_entities e ON true WHERE s.status='active' GROUP BY s.revision");
  assert(active.rows.length === 1 && active.rows[0].revision === second.revision && active.rows[0].count === "1", "Promotion did not produce one active revision");
  await rollbackTeyvatSnapshot(pool, second.revision);
  const restored = await pool.query<{ id: string }>("SELECT id FROM e_entities");
  assert(restored.rows.length === 1 && restored.rows[0].id === "test:alpha:entity", "Rollback did not restore the prior snapshot");
  console.log(JSON.stringify({ status: "PASS", failureIsolation: true, idempotentRepeat: true, promotion: second.revision, rollback: first.revision }, null, 2));
} finally {
  await pool.end();
}
