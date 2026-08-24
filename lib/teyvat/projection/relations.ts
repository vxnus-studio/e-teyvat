import type { Entity, Relation } from "./types.ts";
import { hashId, stableStringify } from "./identity.ts";
import type { CanonicalRecord, CanonicalRelation, JsonObject } from "./types.ts";

function predicate(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function jsonObject(value: unknown): JsonObject {
  return (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as JsonObject;
}

export interface RelationProjectionResult {
  relations: Relation[];
  recipeRemaps: number;
  syntheticEntities: Entity[];
}

export function projectRelations(records: CanonicalRelation[], canonicalRecords: CanonicalRecord[], entities: Map<string, Entity>): RelationProjectionResult {
  const byKey = new Map(canonicalRecords.map((record) => [`${record.category}:${String(record.id)}`, record]));
  const synthetic = new Map<string, Entity>();
  const reliquaryPieces = new Map<string, { parentId: string; data: Record<string, unknown> }>();

  // SET_MEMBER is retained as graph data in this phase because artifact-set
  // traversal and detail queries need stable endpoints. The canonical
  // reliquary records remain untouched; these are E-only projections of their
  // nested suit/piece records.
  for (const record of canonicalRecords.filter((item) => item.category === "reliquary")) {
    const parent = entities.get(`reliquary:${String(record.id)}`);
    if (!parent || !record.suit) continue;
    const setId = `reliquary_set:${String(record.id)}`;
    synthetic.set(setId, {
      id: `genshin:${setId}`,
      namespace: "genshin",
      kind: "reliquary_set",
      slug: parent.slug,
      name: parent.name,
      data: { sourceCategory: "reliquary", sourceId: String(record.id), parentEntityId: parent.id, pieces: record.suit as unknown as JsonObject },
      provenance: parent.provenance,
      temporal: parent.temporal,
    });
    for (const piece of Object.values(record.suit)) {
      if (piece.id === undefined) continue;
      const pieceId = String(piece.id);
      reliquaryPieces.set(pieceId, { parentId: String(record.id), data: piece });
      synthetic.set(`reliquary_piece:${pieceId}`, {
        id: `genshin:reliquary_piece:${pieceId}`,
        namespace: "genshin",
        kind: "reliquary_piece",
        slug: toPieceSlug(piece.name, pieceId),
        name: piece.name?.trim() || `reliquary_piece:${pieceId}`,
        data: { sourceCategory: "reliquary_piece", sourceId: pieceId, parentSetId: `genshin:reliquary_set:${String(record.id)}`, ...piece } as JsonObject,
        provenance: parent.provenance,
        temporal: parent.temporal,
      });
    }
  }

  let recipeRemaps = 0;
  const relations: Relation[] = [];
  for (const record of records) {
    const sourceKey = `${record.source_category}:${String(record.source_id)}`;
    let targetCategory = record.target_category;
    let targetKey = `${targetCategory}:${String(record.target_id)}`;
    if (record.relation_type === "RECIPE_INGREDIENT" && !byKey.has(targetKey) && byKey.has(`food:${String(record.target_id)}`)) {
      targetCategory = "food";
      targetKey = `food:${String(record.target_id)}`;
      recipeRemaps++;
    }
    const subjectId = entities.get(sourceKey)?.id ?? synthetic.get(sourceKey)?.id;
    const objectId = entities.get(targetKey)?.id ?? synthetic.get(targetKey)?.id;
    if (!subjectId || !objectId) throw new Error(`Unresolved projected relation ${sourceKey} ${record.relation_type} ${targetKey}`);
    const key = stableStringify({ sourceKey, predicate: predicate(record.relation_type), targetKey, properties: record.properties ?? {} });
    relations.push({ id: hashId("genshin:relation", key), subjectId, predicate: predicate(record.relation_type), objectId, metadata: { canonical: jsonObject(record.properties), sourceCategory: record.source_category, sourceId: String(record.source_id), targetCategory, targetId: String(record.target_id) } });
  }
  return { relations: relations.sort((a, b) => a.id.localeCompare(b.id)), recipeRemaps, syntheticEntities: [...synthetic.values()].sort((a, b) => a.id.localeCompare(b.id)) };
}

function toPieceSlug(name: string | undefined, id: string): string {
  const base = name?.trim() || `reliquary-piece-${id}`;
  return base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 220) || `reliquary-piece-${id}`;
}
