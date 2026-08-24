import type { Entity } from "./types.ts";
import type { CanonicalRecord } from "./types.ts";
import { toEEntityId, toSlug } from "./identity.ts";
import { projectProvenance, projectTemporal } from "./provenance.ts";
import { projectName } from "./names.ts";

export interface EntityProjectionResult {
  entities: Entity[];
  entityByKey: Map<string, Entity>;
  namesFallback: number;
}

export function projectEntities(records: CanonicalRecord[]): EntityProjectionResult {
  const entities: Entity[] = [];
  const entityByKey = new Map<string, Entity>();
  let namesFallback = 0;
  for (const record of [...records].sort((a, b) => `${a.category}:${a.id}`.localeCompare(`${b.category}:${b.id}`))) {
    const { name, usedFallback } = projectName(record);
    if (usedFallback) namesFallback++;
    const entity: Entity = {
      id: toEEntityId(record.category, record.id),
      namespace: "genshin",
      kind: record.category,
      slug: toSlug(record.category, record.id, record.route),
      name,
      data: record as unknown as Entity["data"],
      provenance: projectProvenance(record),
      temporal: projectTemporal(record),
    };
    entities.push(entity);
    entityByKey.set(`${record.category}:${String(record.id)}`, entity);
  }
  return { entities, entityByKey, namesFallback };
}
