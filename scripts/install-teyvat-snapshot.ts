import { config } from "dotenv";
config({ path: ".env.local" });
config();
import pg from "pg";
import { readArtifact, readArtifactManifest } from "../lib/teyvat/artifact.ts";
import { installTeyvatSnapshot } from "../lib/teyvat/e-postgres/snapshot.ts";

const connectionString = process.env.TEYVAT_E_DATABASE_URL;
if (!connectionString) throw new Error("TEYVAT_E_DATABASE_URL is not configured.");
const failAfter = process.env.TEYVAT_E_SNAPSHOT_FAIL_AFTER;
if (failAfter && !["entities", "aliases", "relations", "documents"].includes(failAfter)) throw new Error("TEYVAT_E_SNAPSHOT_FAIL_AFTER must be entities, aliases, relations, or documents.");
const pool = new pg.Pool({ connectionString, max: 4 });
try {
  const before = await pool.query<{ bytes: string }>("SELECT pg_database_size(current_database())::text AS bytes");
  const result = await installTeyvatSnapshot(pool, readArtifact(), readArtifactManifest(), failAfter ? { failAfter: failAfter as "entities" | "aliases" | "relations" | "documents" } : {});
  const after = await pool.query<{ bytes: string }>("SELECT pg_database_size(current_database())::text AS bytes");
  console.log(JSON.stringify({
    ...result,
    storage: {
      bytesBefore: Number(before.rows[0].bytes),
      bytesAfter: Number(after.rows[0].bytes),
      growthBytes: Number(after.rows[0].bytes) - Number(before.rows[0].bytes),
    },
  }, null, 2));
} finally {
  await pool.end();
}
