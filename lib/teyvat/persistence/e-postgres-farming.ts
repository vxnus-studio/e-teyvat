import { PostgresEngine } from "@vxnus/e-postgres";
import type { Entity, Relation } from "@vxnus/e";
import type { Pool } from "pg";
import { extractAvailableDays, extractMaterialQuantity, extractMaterialSourceNotes } from "../domain/farming.ts";
import { normalize } from "../domain/entities.ts";
import type { FarmingMaterialViewModel, FarmingPlanResult, FarmingSourceViewModel } from "../domain/types.ts";

const REQUIREMENTS = ["ascension_cost", "ascension_material", "talent_material", "recipe_ingredient", "requires", "uses_material_family"];
const SOURCES = ["drops", "rewards"];

function mapEntity(row: Record<string, unknown>): Entity {
  return {
    id: String(row.id), namespace: String(row.namespace ?? ""), kind: String(row.kind ?? ""), slug: String(row.slug ?? ""),
    name: String(row.name ?? ""), data: (row.data ?? {}) as Entity["data"],
    identities: row.identities as Entity["identities"], provenance: row.provenance as Entity["provenance"], temporal: row.temporal as Entity["temporal"],
  };
}

function priority(kind: string): number { return ({ avatar: 1, weapon: 2, material: 3, domain: 4, food: 5 } as Record<string, number>)[kind] ?? 6; }
function compare(a: Entity, b: Entity): number { return priority(a.kind) - priority(b.kind) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id); }

export class TeyvatEPostgresFarmingQueries {
  private readonly engine: PostgresEngine;
  private readonly pool: Pool;

  constructor(connectionString = process.env.TEYVAT_E_DATABASE_URL) {
    if (!connectionString) throw new Error("TEYVAT_E_DATABASE_URL is not configured.");
    this.engine = new PostgresEngine({ connectionString, max: 4 });
    this.pool = (this.engine as unknown as { pool: Pool }).pool;
  }

  async close(): Promise<void> { await this.engine.close(); }

  private async revision(): Promise<string> {
    const result = await this.pool.query<{ revision: string }>("SELECT revision FROM teyvat_e_dataset_revisions ORDER BY installed_at DESC LIMIT 1");
    const revision = result.rows[0]?.revision;
    if (!revision) throw new Error("No E-Teyvat snapshot has been installed.");
    return revision;
  }

  private async entities(where: string, values: unknown[]): Promise<Entity[]> {
    const result = await this.pool.query<Record<string, unknown>>(`SELECT * FROM e_entities WHERE ${where} ORDER BY name COLLATE \"C\" ASC, id COLLATE \"C\" ASC`, values);
    return result.rows.map(mapEntity);
  }

  private async relations(where: string, values: unknown[]): Promise<Relation[]> {
    const result = await this.pool.query<Record<string, unknown>>(`SELECT * FROM e_relations WHERE ${where} ORDER BY id COLLATE \"C\" ASC`, values);
    return result.rows.map((row) => ({ id: String(row.id), subjectId: String(row.subject_id), predicate: String(row.predicate), objectId: String(row.object_id), metadata: (row.metadata ?? {}) as Relation["metadata"] }));
  }

  async resolveTarget(query: string, kind?: string): Promise<Entity | null> {
    const category = kind;
    const values: unknown[] = [query.toLowerCase(), query];
    let where = "(lower(slug) = $1 OR name ILIKE $2)";
    if (category) { values.push(category); where += ` AND kind = $${values.length}`; }
    let matches = (await this.entities(where, values)).sort(compare);
    if (!matches.length) {
      const aliasValues: unknown[] = [`%${normalize(query)}%`];
      let aliasWhere = "lower(a.alias) LIKE $1";
      if (category) { aliasValues.push(category); aliasWhere += ` AND e_entities.kind = $${aliasValues.length}`; }
      matches = (await this.entities(`EXISTS (SELECT 1 FROM e_aliases a WHERE a.entity_id = e_entities.id AND ${aliasWhere})`, aliasValues)).sort(compare);
    }
    return matches[0] ?? null;
  }

  private async sourceViews(edges: Relation[]): Promise<FarmingSourceViewModel[]> {
    const ids = [...new Set(edges.map((edge) => edge.subjectId))];
    const sourceEntities = ids.length ? await this.entities("id = ANY($1::varchar[])", [ids]) : [];
    const sourceMap = new Map(sourceEntities.map((entity) => [entity.id, entity]));
    return edges.map((edge) => {
      const source = sourceMap.get(edge.subjectId);
      return {
        type: (source?.kind === "domain" ? "domain" : "enemy") as FarmingSourceViewModel["type"],
        name: source?.name ?? "Unknown", kind: source?.kind ?? "unknown", slug: source?.slug ?? "",
        availableDays: extractAvailableDays(edge.metadata as Record<string, unknown>), domainEntrance: null,
      };
    }).sort((a, b) => a.name.localeCompare(b.name) || a.slug.localeCompare(b.slug));
  }

  async getFarmingPlan(query: string, kind?: string): Promise<FarmingPlanResult | null> {
    const target = await this.resolveTarget(query, kind);
    if (!target) return null;
    let requirementEdges = (await Promise.all(REQUIREMENTS.map((predicate) => this.relations("subject_id = $1 AND predicate = $2", [target.id, predicate])))).flat();
    if (!requirementEdges.length && target.kind === "domain") {
      requirementEdges = (await Promise.all(SOURCES.map((predicate) => this.relations("subject_id = $1 AND predicate = $2", [target.id, predicate])))).flat();
    }
    const revision = await this.revision();
    if (!requirementEdges.length && target.kind === "material") {
      const sourceEdges = (await Promise.all(SOURCES.map((predicate) => this.relations("object_id = $1 AND predicate = $2", [target.id, predicate])))).flat();
      return { target: { id: target.id, kind: target.kind, slug: target.slug, name: target.name }, materials: [{ id: target.id, name: target.name, quantity: null, phase: "direct", sources: await this.sourceViews(sourceEdges), sourceNotes: extractMaterialSourceNotes(target.data as Record<string, unknown>) }], revision, preview: false };
    }

    const materialIds = [...new Set(requirementEdges.map((edge) => edge.objectId))];
    const materialEntities = materialIds.length ? await this.entities("id = ANY($1::varchar[])", [materialIds]) : [];
    const materialMap = new Map(materialEntities.map((entity) => [entity.id, entity]));
    const sourceEdges = materialIds.length ? (await Promise.all(SOURCES.map((predicate) => this.relations("object_id = ANY($1::varchar[]) AND predicate = $2", [materialIds, predicate])))).flat() : [];
    const sourcesByMaterial = new Map<string, Relation[]>();
    for (const edge of sourceEdges) sourcesByMaterial.set(edge.objectId, [...(sourcesByMaterial.get(edge.objectId) ?? []), edge]);
    const requirementsByMaterial = new Map<string, Relation[]>();
    for (const edge of requirementEdges) requirementsByMaterial.set(edge.objectId, [...(requirementsByMaterial.get(edge.objectId) ?? []), edge]);
    const materials: FarmingMaterialViewModel[] = [];
    for (const [materialId, edges] of requirementsByMaterial) {
      const material = materialMap.get(materialId);
      if (!material) continue;
      let quantity: number | null = null;
      for (const edge of edges) { const value = extractMaterialQuantity(edge.metadata as Record<string, unknown>); if (value !== null) quantity = (quantity ?? 0) + value; }
      materials.push({ id: material.id, name: material.name, quantity, phase: edges[0]?.predicate ?? "", sources: await this.sourceViews(sourcesByMaterial.get(materialId) ?? []), sourceNotes: extractMaterialSourceNotes(material.data as Record<string, unknown>) });
    }
    return { target: { id: target.id, kind: target.kind, slug: target.slug, name: target.name }, materials, revision, preview: false };
  }
}
