import { config } from "dotenv";
config({ path: ".env.local" });
config();
import pg from "pg";
import { rollbackTeyvatSnapshot } from "../lib/teyvat/e-postgres/snapshot.ts";

const connectionString = process.env.DATABASE_URL;
const revision = process.argv[2];
if (!connectionString) throw new Error("DATABASE_URL is not configured.");
if (!revision) throw new Error("Usage: npm run teyvat:rollback-snapshot -- <active-revision>");
const pool = new pg.Pool({ connectionString, max: 2 });
try {
  await rollbackTeyvatSnapshot(pool, revision);
  console.log(JSON.stringify({ status: "active", revision }, null, 2));
} finally {
  await pool.end();
}
