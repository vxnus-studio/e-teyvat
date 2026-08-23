import type { Pool } from "pg";
import type { TeyvatProjection } from "../projection/types.ts";

export async function provisionTeyvatExtensions(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS teyvat_e_dataset_revisions (
      revision VARCHAR(255) PRIMARY KEY,
      projection_version VARCHAR(255) NOT NULL,
      source_checksums JSONB NOT NULL,
      entity_count INTEGER NOT NULL,
      alias_count INTEGER NOT NULL,
      relation_count INTEGER NOT NULL,
      document_count INTEGER NOT NULL,
      installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS teyvat_e_document_metadata (
      document_id VARCHAR(255) PRIMARY KEY REFERENCES e_documents(id) ON DELETE CASCADE,
      category VARCHAR(255) NOT NULL,
      parent_source_id VARCHAR(255) NOT NULL,
      title TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS teyvat_e_document_metadata_category_idx
      ON teyvat_e_document_metadata(category);
  `);
}

export async function ingestTeyvatExtensions(
  pool: Pool,
  projection: TeyvatProjection,
  manifest: { projectionVersion: string; source: Record<string, string> },
): Promise<void> {
  await pool.query("BEGIN");
  try {
    await pool.query("DELETE FROM teyvat_e_document_metadata");
    await pool.query("DELETE FROM teyvat_e_dataset_revisions");
    const chunkSize = 500;
    for (let start = 0; start < projection.documentMetadata.length; start += chunkSize) {
      const chunk = projection.documentMetadata.slice(start, start + chunkSize);
      const values: unknown[] = [];
      const placeholders = chunk.map((item, index) => {
        const offset = index * 4;
        values.push(`genshin:document:${item.id}`, item.category, item.parentSourceId, item.title);
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
      });
      await pool.query(
        `INSERT INTO teyvat_e_document_metadata (document_id, category, parent_source_id, title) VALUES ${placeholders.join(",")}`,
        values,
      );
    }
    await pool.query(
      `INSERT INTO teyvat_e_dataset_revisions
       (revision, projection_version, source_checksums, entity_count, alias_count, relation_count, document_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        projection.revision,
        manifest.projectionVersion,
        manifest.source,
        projection.entities.length,
        projection.aliases.length,
        projection.relations.length,
        projection.documents.length,
      ],
    );
    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
}
