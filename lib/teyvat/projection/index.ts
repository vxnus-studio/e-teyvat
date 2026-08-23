import { createHash } from "node:crypto";
import type { Entity } from "@vxnus/e";
import { projectAliases } from "./aliases.ts";
import { projectDocuments } from "./documents.ts";
import { projectEntities } from "./entities.ts";
import { loadCanonicalInput } from "./input.ts";
import { PROJECTION_VERSION, stableStringify } from "./identity.ts";
import { projectRelations } from "./relations.ts";
import type { ProjectionInput, TeyvatProjection } from "./types.ts";
import { validateProjection } from "./validate.ts";

export function projectTeyvat(input: ProjectionInput): TeyvatProjection {
  const started = performance.now();
  const entityProjection = projectEntities(input.entities);
  const relationProjection = projectRelations(input.relations, input.entities, entityProjection.entityByKey);
  const entities = [...entityProjection.entities, ...relationProjection.syntheticEntities].sort((a, b) => a.id.localeCompare(b.id));
  const entityMap = new Map<string, Entity>();
  for (const entity of entities) entityMap.set(entity.id, entity);
  const aliases = projectAliases(input.entities, entityProjection.entityByKey);
  const documents = projectDocuments(input.documents, entityProjection.entityByKey);
  const dataset = { entities, aliases, relations: relationProjection.relations, documents: documents.documents };
  const revision = projectionRevision(dataset);
  const projection: TeyvatProjection = {
    ...dataset,
    documentMetadata: documents.metadata,
    revision,
    stats: {
      inputEntities: input.entities.length,
      inputRelations: input.relations.length,
      inputDocuments: input.documents.length,
      projectedEntities: entities.length,
      projectedAliases: aliases.length,
      projectedRelations: relationProjection.relations.length,
      projectedDocuments: documents.documents.length,
      syntheticReliquaryEntities: relationProjection.syntheticEntities.length,
      recipeRemaps: relationProjection.recipeRemaps,
      nameFallbacks: entityProjection.namesFallback,
      projectionMs: performance.now() - started,
    },
  };
  const validationStarted = performance.now();
  validateProjection(projection);
  projection.stats.validationMs = performance.now() - validationStarted;
  return projection;
}

export function projectionRevision(dataset: Pick<TeyvatProjection, "entities" | "aliases" | "relations" | "documents">): string {
  return createHash("sha256").update(stableStringify({ projectionVersion: PROJECTION_VERSION, entities: dataset.entities, aliases: dataset.aliases, relations: dataset.relations, documents: dataset.documents })).digest("hex");
}

export function loadTeyvatProjection(): TeyvatProjection {
  return projectTeyvat(loadCanonicalInput());
}
