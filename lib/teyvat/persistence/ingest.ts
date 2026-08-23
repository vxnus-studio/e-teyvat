import { readFileSync } from "node:fs";
import { artifactSha256, ARTIFACT_PATH, MANIFEST_PATH, readArtifact, readArtifactManifest } from "../artifact.ts";
import { normalize } from "../domain/entities.ts";
import { createTransactionalDatabase } from "./db.ts";
import { teyvatAliases, teyvatDatasetRevisions, teyvatDocuments, teyvatEntities, teyvatRelations, type NewTeyvatEntity, type NewTeyvatRelation, type NewTeyvatDocument } from "../../../db/schema.ts";
import type { TeyvatProjection } from "../projection/types.ts";

const CHUNK_SIZE = 250;

function chunks<T>(items: T[], size = CHUNK_SIZE): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

function validateManifest(projection: TeyvatProjection) {
  const manifest = readArtifactManifest(MANIFEST_PATH);
  const artifact = readFileSync(ARTIFACT_PATH);
  if (artifactSha256(projection) !== artifactSha256(JSON.parse(artifact.toString()))) throw new Error("Artifact content changed while loading");
  if (manifest.revision !== projection.revision) throw new Error(`Artifact revision mismatch: ${projection.revision}`);
  if (manifest.counts.entities !== projection.entities.length || manifest.counts.aliases !== projection.aliases.length || manifest.counts.relations !== projection.relations.length || manifest.counts.documents !== projection.documents.length) throw new Error("Artifact manifest counts do not match projection");
  return manifest;
}

async function insertChunks<T>(items: T[], insert: (chunk: T[]) => Promise<unknown>) {
  for (const chunk of chunks(items)) if (chunk.length) await insert(chunk);
}

export async function ingestTeyvatArtifact(connectionString = process.env.DATABASE_URL) {
  const started = performance.now();
  const projection = readArtifact();
  const manifest = validateManifest(projection);
  const { pool, db } = createTransactionalDatabase(connectionString);
  try {
    await db.transaction(async (tx) => {
      await tx.delete(teyvatRelations);
      await tx.delete(teyvatAliases);
      await tx.delete(teyvatDocuments);
      await tx.delete(teyvatEntities);
      await tx.delete(teyvatDatasetRevisions);

      await insertChunks(projection.entities, (chunk) => tx.insert(teyvatEntities).values(chunk.map((entity) => ({
        id: entity.id,
        namespace: entity.namespace,
        kind: entity.kind,
        slug: entity.slug,
        name: entity.name,
        data: entity.data,
        provenance: entity.provenance ? entity.provenance as unknown as Record<string, unknown> : null,
        temporal: entity.temporal ? entity.temporal as unknown as Record<string, unknown> : null,
      }) as NewTeyvatEntity)));
      await insertChunks(projection.aliases, (chunk) => tx.insert(teyvatAliases).values(chunk.map((alias) => ({ id: alias.id, entityId: alias.entityId, alias: alias.alias, normalizedAlias: normalize(alias.alias) }))));
      await insertChunks(projection.relations, (chunk) => tx.insert(teyvatRelations).values(chunk.map((relation) => ({ id: relation.id, subjectId: relation.subjectId, predicate: relation.predicate, objectId: relation.objectId, metadata: relation.metadata ?? {}, provenance: relation.provenance ? relation.provenance as unknown as Record<string, unknown> : null, temporal: relation.temporal ? relation.temporal as unknown as Record<string, unknown> : null }) as NewTeyvatRelation)));
      const metadata = new Map(projection.documentMetadata.map((item) => [item.id, item]));
      await insertChunks(projection.documents, (chunk) => tx.insert(teyvatDocuments).values(chunk.map((document) => {
        const item = metadata.get(document.id.replace("genshin:document:", ""));
        if (!item) throw new Error(`Missing document metadata for ${document.id}`);
        return { id: document.id, entityId: document.entityId, content: document.content, provenance: document.provenance ? document.provenance as unknown as Record<string, unknown> : null, category: item.category, title: item.title, parentSourceId: item.parentSourceId, } as NewTeyvatDocument;
      })));
      await tx.insert(teyvatDatasetRevisions).values({
        revision: projection.revision,
        projectionVersion: manifest.projectionVersion,
        sourceChecksums: manifest.source,
        entityCount: projection.entities.length,
        aliasCount: projection.aliases.length,
        relationCount: projection.relations.length,
        documentCount: projection.documents.length,
      });
    });
    return { revision: projection.revision, counts: { entities: projection.entities.length, aliases: projection.aliases.length, relations: projection.relations.length, documents: projection.documents.length }, durationMs: performance.now() - started };
  } finally {
    await pool.end();
  }
}
