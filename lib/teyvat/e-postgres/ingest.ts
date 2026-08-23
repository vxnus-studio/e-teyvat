import { config } from "dotenv";
config({ path: ".env.local" });
import pg from "pg";
import { PostgresEngine } from "@vxnus/e-postgres";
import { readArtifact, readArtifactManifest } from "../artifact.ts";
import { provisionTeyvatExtensions, ingestTeyvatExtensions } from "./extensions.ts";
import type { TeyvatProjection } from "../projection/types.ts";

export async function openTeyvatEPostgres() {
  const connectionString = process.env.TEYVAT_E_DATABASE_URL;
  if (!connectionString) throw new Error("TEYVAT_E_DATABASE_URL is not configured.");
  const engine = await PostgresEngine.open({ connectionString, max: 8 });
  return { engine, connectionString };
}

export async function ingestTeyvatProjectionInBatches(
  engine: PostgresEngine,
  projection: TeyvatProjection,
  chunkSize = 500,
) {
  const batches = <T>(items: T[]) => Array.from({ length: Math.ceil(items.length / chunkSize) }, (_, index) => items.slice(index * chunkSize, (index + 1) * chunkSize));
  const results = [];
  // Preserve foreign-key order while allowing independent chunks to use the
  // adapter's pool concurrently. This is still PostgresEngine.ingestBatch for
  // every write; it is not a replacement bulk loader.
  for (const [key, items] of [
    ["entities", projection.entities],
    ["aliases", projection.aliases],
    ["relations", projection.relations],
    ["documents", projection.documents],
  ] as const) {
    const chunks = batches(items);
    const chunkResults = await Promise.all(chunks.map((chunk) => engine.ingestBatch({ [key]: chunk })));
    results.push(...chunkResults);
  }
  return {
    entitiesInserted: results.reduce((sum, item) => sum + item.entitiesInserted, 0),
    aliasesInserted: results.reduce((sum, item) => sum + item.aliasesInserted, 0),
    relationsInserted: results.reduce((sum, item) => sum + item.relationsInserted, 0),
    claimsInserted: results.reduce((sum, item) => sum + item.claimsInserted, 0),
    documentsInserted: results.reduce((sum, item) => sum + item.documentsInserted, 0),
    timeMs: results.reduce((sum, item) => sum + item.timeMs, 0),
  };
}

export async function ingestTeyvatEPostgres() {
  const projection = readArtifact();
  const manifest = readArtifactManifest();
  const { engine, connectionString } = await openTeyvatEPostgres();
  const pool = new pg.Pool({ connectionString, max: 1 });
  try {
    await provisionTeyvatExtensions(pool);
    const started = performance.now();
    const result = await ingestTeyvatProjectionInBatches(engine, projection);
    const ingestionMs = performance.now() - started;
    await ingestTeyvatExtensions(pool, projection, manifest);
    return { engine, pool, projection, manifest, result, ingestionMs };
  } catch (error) {
    await engine.close();
    await pool.end();
    throw error;
  }
}
