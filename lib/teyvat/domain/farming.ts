import type { Entity, Relation } from "../projection/types.ts";
import type { TeyvatProjection } from "../projection/types.ts";
import { normalize } from "./entities.ts";
import type { FarmingMaterialViewModel, FarmingPlanResult, FarmingSourceViewModel, FarmingTargetViewModel } from "./types.ts";

const FARMING_REQUIREMENT_PREDICATES = [
  "ascension_cost",
  "ascension_material",
  "talent_material",
  "recipe_ingredient",
  "requires",
  "uses_material_family",
];

const FARMING_SOURCE_PREDICATES = ["drops", "rewards"];

export function extractMaterialQuantity(metadata: Record<string, unknown> | undefined): number | null {
  if (!metadata) return null;
  const canonical = metadata.canonical as Record<string, unknown> | undefined;
  if (canonical) {
    if (typeof canonical.count === "number") return canonical.count;
    if (canonical.count && typeof (canonical.count as { count?: number }).count === "number") {
      return (canonical.count as { count: number }).count;
    }
  }
  if (typeof metadata.quantity === "number") return metadata.quantity;
  if (typeof metadata.count === "number") return metadata.count;
  return null;
}

export function extractMaterialSourceNotes(data: Record<string, unknown> | undefined): string[] {
  if (!data) return [];
  const rawSources = data.sources ?? data.source_info ?? data.source ?? data.howtoobtain ?? [];
  const notes: string[] = [];
  if (Array.isArray(rawSources)) {
    for (const item of rawSources) {
      if (typeof item === "string" && item.trim()) {
        notes.push(item.trim());
      } else if (item && typeof item === "object" && typeof (item as { name?: unknown }).name === "string") {
        notes.push((item as { name: string }).name.trim());
      }
    }
  } else if (typeof rawSources === "string" && rawSources.trim()) {
    notes.push(rawSources.trim());
  }
  return notes;
}

export function extractAvailableDays(metadata: Record<string, unknown> | undefined): string[] {
  if (!metadata) return [];
  const canonical = metadata.canonical as Record<string, unknown> | undefined;
  if (canonical) {
    if (Array.isArray(canonical.days_of_week)) return canonical.days_of_week.map(String).sort();
    if (Array.isArray(canonical.daysOfWeek)) return canonical.daysOfWeek.map(String).sort();
    if (Array.isArray(canonical.days)) return canonical.days.map(String).sort();
  }
  if (Array.isArray(metadata.daysOfWeek)) return metadata.daysOfWeek.map(String).sort();
  if (Array.isArray(metadata.days_of_week)) return metadata.days_of_week.map(String).sort();
  if (Array.isArray(metadata.days)) return metadata.days.map(String).sort();
  return [];
}

export class TeyvatFarmingQueries {
  private readonly projection: TeyvatProjection;
  private readonly byId = new Map<string, Entity>();
  private readonly aliasIndex = new Map<string, Entity[]>();

  constructor(projection: TeyvatProjection) {
    this.projection = projection;
    for (const entity of projection.entities) {
      this.byId.set(entity.id, entity);
    }
    for (const alias of projection.aliases) {
      const key = normalize(alias.alias);
      const list = this.aliasIndex.get(key) ?? [];
      const entity = this.byId.get(alias.entityId);
      if (entity && !list.some((e) => e.id === entity.id)) {
        list.push(entity);
        this.aliasIndex.set(key, list);
      }
    }
  }

  resolveTarget(query: string, kind?: string): Entity | null {
    const normalized = normalize(query);
    const queryLower = query.toLowerCase();
    
    // Check direct slug or normalized name
    const exact = this.projection.entities.filter((e) => !kind || e.kind === kind).filter((e) => e.slug.toLowerCase() === queryLower || normalize(e.name) === normalized);
    if (exact.length > 0) {
      const prioritized = exact.sort((a, b) => {
        const priorityKind = (k: string) => (k === "avatar" ? 1 : k === "weapon" ? 2 : k === "material" ? 3 : k === "domain" ? 4 : k === "food" ? 5 : 6);
        return priorityKind(a.kind) - priorityKind(b.kind) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
      });
      return prioritized[0];
    }

    // Check aliases
    const aliases = (this.aliasIndex.get(normalized) ?? []).filter((e) => !kind || e.kind === kind);
    if (aliases.length > 0) {
      const prioritized = aliases.sort((a, b) => {
        const priorityKind = (k: string) => (k === "avatar" ? 1 : k === "weapon" ? 2 : k === "material" ? 3 : k === "domain" ? 4 : k === "food" ? 5 : 6);
        return priorityKind(a.kind) - priorityKind(b.kind) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
      });
      return prioritized[0];
    }

    return null;
  }

  getFarmingPlan(query: string, kind?: string): FarmingPlanResult | null {
    const targetEntity = this.resolveTarget(query, kind);
    if (!targetEntity) return null;

    let requirementEdges = this.projection.relations.filter(
      (rel) => rel.subjectId === targetEntity.id && FARMING_REQUIREMENT_PREDICATES.includes(rel.predicate),
    );

    // If target itself is a domain, it provides drops
    if (requirementEdges.length === 0 && targetEntity.kind === "domain") {
      requirementEdges = this.projection.relations.filter(
        (rel) => rel.subjectId === targetEntity.id && (rel.predicate === "drops" || rel.predicate === "rewards"),
      );
    }

    // If target is directly a material, synthesize a direct material entry
    if (requirementEdges.length === 0 && targetEntity.kind === "material") {
      const sourceEdges = this.projection.relations.filter(
        (rel) => rel.objectId === targetEntity.id && FARMING_SOURCE_PREDICATES.includes(rel.predicate),
      );

      const sources: FarmingSourceViewModel[] = sourceEdges.map((s) => {
        const sourceEntity = this.byId.get(s.subjectId);
        const type: FarmingSourceViewModel["type"] = sourceEntity?.kind === "domain" ? "domain" : "enemy";
        return {
          type,
          name: sourceEntity?.name ?? "Unknown",
          kind: sourceEntity?.kind ?? "unknown",
          slug: sourceEntity?.slug ?? "",
          availableDays: extractAvailableDays(s.metadata as Record<string, unknown>),
          domainEntrance: null,
        };
      }).sort((a, b) => a.name.localeCompare(b.name) || a.slug.localeCompare(b.slug));

      return {
        target: {
          id: targetEntity.id,
          kind: targetEntity.kind,
          slug: targetEntity.slug,
          name: targetEntity.name,
        },
        materials: [
          {
            id: targetEntity.id,
            name: targetEntity.name,
            quantity: null,
            phase: "direct",
            sources,
            sourceNotes: extractMaterialSourceNotes(targetEntity.data as Record<string, unknown>),
          },
        ],
        revision: this.projection.revision,
        preview: false,
      };
    }

    const materialIds = Array.from(new Set(requirementEdges.map((rel) => rel.objectId)));
    const sourceEdges = materialIds.length
      ? this.projection.relations.filter(
          (rel) => materialIds.includes(rel.objectId) && FARMING_SOURCE_PREDICATES.includes(rel.predicate),
        )
      : [];

    const reqsByMaterial = new Map<string, Relation[]>();
    for (const edge of requirementEdges) {
      const list = reqsByMaterial.get(edge.objectId) ?? [];
      list.push(edge);
      reqsByMaterial.set(edge.objectId, list);
    }

    const materials: FarmingMaterialViewModel[] = [];
    for (const [materialId, edges] of reqsByMaterial.entries()) {
      const matEntity = this.byId.get(materialId);
      if (!matEntity) continue;

      let totalQuantity: number | null = null;
      for (const edge of edges) {
        const qty = extractMaterialQuantity(edge.metadata as Record<string, unknown>);
        if (qty !== null) {
          totalQuantity = (totalQuantity ?? 0) + qty;
        }
      }

      const sourcesForMat = sourceEdges.filter((s) => s.objectId === materialId);
      const sources: FarmingSourceViewModel[] = sourcesForMat.map((s) => {
        const sourceEntity = this.byId.get(s.subjectId);
        const type: FarmingSourceViewModel["type"] = sourceEntity?.kind === "domain" ? "domain" : "enemy";
        return {
          type,
          name: sourceEntity?.name ?? "Unknown",
          kind: sourceEntity?.kind ?? "unknown",
          slug: sourceEntity?.slug ?? "",
          availableDays: extractAvailableDays(s.metadata as Record<string, unknown>),
          domainEntrance: null,
        };
      }).sort((a, b) => a.name.localeCompare(b.name) || a.slug.localeCompare(b.slug));

      materials.push({
        id: matEntity.id,
        name: matEntity.name,
        quantity: totalQuantity,
        phase: edges[0].predicate,
        sources,
        sourceNotes: extractMaterialSourceNotes(matEntity.data as Record<string, unknown>),
      });
    }

    const target: FarmingTargetViewModel = {
      id: targetEntity.id,
      kind: targetEntity.kind,
      slug: targetEntity.slug,
      name: targetEntity.name,
    };

    return {
      target,
      materials,
      revision: this.projection.revision,
      preview: false,
    };
  }
}
