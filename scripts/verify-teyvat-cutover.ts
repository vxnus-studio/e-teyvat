import { config } from "dotenv";
config({ path: ".env.local" });
import pg from "pg";

const targetUrl = process.env.DATABASE_URL;
if (!targetUrl) throw new Error("DATABASE_URL is not configured.");
const baselineUrl = targetUrl;

const target = new pg.Pool({ connectionString: targetUrl, max: 1 });
const baseline = new pg.Pool({ connectionString: baselineUrl, max: 1 });

type Fingerprint = { endpoint: string; database: string; schema: string; server: string | null; port: number | null };
type DatabaseIdentity = Omit<Fingerprint, "endpoint">;
type SnapshotCounts = { entities: number; aliases: number; relations: number; documents: number };

async function fingerprint(pool: pg.Pool, endpoint: string): Promise<Fingerprint> {
  const result = await pool.query<DatabaseIdentity>("SELECT current_database() AS database, current_schema() AS schema, inet_server_addr()::text AS server, inet_server_port() AS port");
  const row = result.rows[0];
  if (!row) throw new Error("Unable to fingerprint database.");
  return { endpoint, ...row };
}

function sameDatabase(left: Fingerprint, right: Fingerprint): boolean {
  return left.endpoint === right.endpoint && left.database === right.database && left.schema === right.schema && left.server === right.server && left.port === right.port;
}

try {
  const [targetMeta, baselineMeta] = await Promise.all([fingerprint(target, new URL(targetUrl).hostname), fingerprint(baseline, new URL(baselineUrl).hostname)]);
  const sharedTarget = sameDatabase(targetMeta, baselineMeta);
  let activeResult: pg.QueryResult<{ revision: string; counts: SnapshotCounts }>;
  try {
    activeResult = await target.query<{ revision: string; counts: SnapshotCounts }>("SELECT revision, counts FROM teyvat_e_snapshots WHERE status = 'active'");
  } catch (error) {
    if ((error as { code?: string }).code === "42P01") throw new Error("E target is not snapshot-managed; install a revision with teyvat:install-snapshot on a reviewed production-like target first.");
    throw error;
  }
  if (activeResult.rowCount !== 1) throw new Error(`Expected exactly one active E snapshot, found ${activeResult.rowCount ?? 0}.`);
  const active = activeResult.rows[0];
  const countsResult = await target.query<{ entities: string; aliases: string; relations: string; documents: string }>(
    "SELECT (SELECT count(*)::text FROM e_entities) AS entities, (SELECT count(*)::text FROM e_aliases) AS aliases, (SELECT count(*)::text FROM e_relations) AS relations, (SELECT count(*)::text FROM e_documents) AS documents",
  );
  const counts = Object.fromEntries(Object.entries(countsResult.rows[0] ?? {}).map(([key, value]) => [key, Number(value)])) as SnapshotCounts;
  const countKeys: (keyof SnapshotCounts)[] = ["entities", "aliases", "relations", "documents"];
  if (countKeys.some((key) => counts[key] !== active.counts[key])) throw new Error(`Active snapshot counts do not match public tables: ${JSON.stringify({ active: active.counts, public: counts })}`);

  const integrity = await target.query<{ orphan_aliases: string; orphan_subjects: string; orphan_objects: string; orphan_documents: string }>(
    "SELECT (SELECT count(*)::text FROM e_aliases a LEFT JOIN e_entities e ON e.id = a.entity_id WHERE e.id IS NULL) AS orphan_aliases, (SELECT count(*)::text FROM e_relations r LEFT JOIN e_entities e ON e.id = r.subject_id WHERE e.id IS NULL) AS orphan_subjects, (SELECT count(*)::text FROM e_relations r LEFT JOIN e_entities e ON e.id = r.object_id WHERE e.id IS NULL) AS orphan_objects, (SELECT count(*)::text FROM e_documents d LEFT JOIN e_entities e ON e.id = d.entity_id WHERE e.id IS NULL) AS orphan_documents",
  );
  const integrityValues = Object.fromEntries(Object.entries(integrity.rows[0] ?? {}).map(([key, value]) => [key, Number(value)]));
  if (Object.values(integrityValues).some((value) => value !== 0)) throw new Error(`E target integrity failure: ${JSON.stringify(integrityValues)}`);

  let legacyCounts: Record<string, number> | undefined;
  if (sharedTarget) {
    const legacy = await target.query<Record<string, string>>("SELECT (SELECT count(*)::text FROM entities) AS entities, (SELECT count(*)::text FROM aliases) AS aliases, (SELECT count(*)::text FROM relations) AS relations, (SELECT count(*)::text FROM knowledge_documents) AS knowledge_documents, (SELECT count(*)::text FROM banner_phases) AS banner_phases, (SELECT count(*)::text FROM banner_phase_characters) AS banner_phase_characters, (SELECT count(*)::text FROM banner_character_statistics) AS banner_character_statistics");
    legacyCounts = Object.fromEntries(Object.entries(legacy.rows[0] ?? {}).map(([key, value]) => [key, Number(value)]));
    if (!legacyCounts.entities || !legacyCounts.aliases || !legacyCounts.relations || !legacyCounts.knowledge_documents || !legacyCounts.banner_phases || !legacyCounts.banner_phase_characters || !legacyCounts.banner_character_statistics) throw new Error(`Shared target compatibility tables are not populated: ${JSON.stringify(legacyCounts)}`);
  }
  console.log(JSON.stringify({ status: "PASS", separateFromBaseline: !sharedTarget, sharedTarget, activeRevision: active.revision, counts, legacyCounts, integrity: integrityValues }, null, 2));
} finally {
  await target.end();
  await baseline.end();
}
