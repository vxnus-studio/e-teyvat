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
  console.log(JSON.stringify(await installTeyvatSnapshot(pool, readArtifact(), readArtifactManifest(), failAfter ? { failAfter: failAfter as "entities" | "aliases" | "relations" | "documents" } : {}), null, 2));
} finally {
  await pool.end();
}
