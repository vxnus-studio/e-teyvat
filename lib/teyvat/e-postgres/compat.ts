import type { Entity } from "@vxnus/e";
import type { Pool } from "pg";

/**
 * Compatibility query for @vxnus/e-postgres <= 0.2.0.
 *
 * The adapter's resolve query combines SELECT DISTINCT with an ORDER BY
 * expression that is not present in the select list, which PostgreSQL
 * rejects. EXISTS preserves the adapter's exact-match and namespace
 * semantics without producing duplicate entities.
 */
export async function resolveTeyvatEPostgresAlias(
  pool: Pool,
  alias: string,
  namespace?: string,
): Promise<Entity[]> {
  const params: string[] = [alias];
  const namespaceClause = namespace ? " AND e.namespace = $2" : "";
  if (namespace) params.push(namespace);
  const result = await pool.query<Entity>(
    `SELECT e.*
     FROM e_entities e
     WHERE EXISTS (SELECT 1 FROM e_aliases a WHERE a.entity_id = e.id AND a.alias = $1)
     ${namespaceClause}
     ORDER BY e.id COLLATE "C" ASC`,
    params,
  );
  return result.rows.map((row) => ({
    ...row,
    data: row.data ?? {},
    identities: row.identities ?? undefined,
    provenance: row.provenance ?? undefined,
    temporal: row.temporal ?? undefined,
  }));
}
