import { config } from "dotenv";
config({ path: ".env.local" });
config();
import pg from "pg";
import { cleanupTeyvatStaging } from "../lib/teyvat/e-postgres/snapshot.ts";

const connectionString = process.env.TEYVAT_E_DATABASE_URL;
const olderThanHours = Number(process.argv[2] ?? 24);
if (!connectionString) throw new Error("TEYVAT_E_DATABASE_URL is not configured.");
if (!Number.isFinite(olderThanHours) || olderThanHours < 0) throw new Error("Usage: npm run teyvat:cleanup-staging -- <older-than-hours>");
const pool = new pg.Pool({ connectionString, max: 2 });
try {
  console.log(JSON.stringify({ cleaned: await cleanupTeyvatStaging(pool, olderThanHours) }, null, 2));
} finally {
  await pool.end();
}
