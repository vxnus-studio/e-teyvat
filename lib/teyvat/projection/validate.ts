import { validateBatchDataset } from "@vxnus/e";
import type { BatchDataset } from "@vxnus/e";
import type { TeyvatProjection } from "./types.ts";

export interface ProjectionValidationResult {
  entities: number;
  aliases: number;
  relations: number;
  documents: number;
  unresolvedEndpoints: number;
  duplicateIds: number;
}

export function validateProjection(projection: TeyvatProjection): ProjectionValidationResult {
  const entityIds = new Set<string>();
  const aliasIds = new Set<string>();
  const relationIds = new Set<string>();
  const documentIds = new Set<string>();
  let duplicateIds = 0;
  for (const entity of projection.entities) { if (entityIds.has(entity.id)) duplicateIds++; entityIds.add(entity.id); }
  for (const alias of projection.aliases) { if (aliasIds.has(alias.id)) duplicateIds++; aliasIds.add(alias.id); if (!entityIds.has(alias.entityId)) throw new Error(`Alias ${alias.id} references missing entity ${alias.entityId}`); }
  let unresolvedEndpoints = 0;
  for (const relation of projection.relations) {
    if (relationIds.has(relation.id)) duplicateIds++;
    relationIds.add(relation.id);
    if (!entityIds.has(relation.subjectId) || !entityIds.has(relation.objectId)) unresolvedEndpoints++;
  }
  for (const document of projection.documents) { if (documentIds.has(document.id)) duplicateIds++; documentIds.add(document.id); if (!entityIds.has(document.entityId)) throw new Error(`Document ${document.id} references missing entity ${document.entityId}`); }
  if (duplicateIds) throw new Error(`Projection has ${duplicateIds} duplicate IDs`);
  if (unresolvedEndpoints) throw new Error(`Projection has ${unresolvedEndpoints} unresolved relation endpoints`);
  const dataset: BatchDataset = { entities: projection.entities, aliases: projection.aliases, relations: projection.relations, documents: projection.documents };
  validateBatchDataset(dataset);
  return { entities: entityIds.size, aliases: aliasIds.size, relations: relationIds.size, documents: documentIds.size, unresolvedEndpoints, duplicateIds };
}
