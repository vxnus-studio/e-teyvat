import { and, asc, eq, ilike, inArray, or } from "drizzle-orm";
import { getDatabase } from "../../../db/client.ts";
import {
  teyvatAliases,
  teyvatDatasetRevisions,
  teyvatEntities,
  teyvatRelations,
  type TeyvatEntity,
  type TeyvatRelation,
} from "../../../db/schema.ts";
import {
  extractAvailableDays,
  extractMaterialQuantity,
  extractMaterialSourceNotes,
} from "../domain/farming.ts";
import { normalize } from "../domain/entities.ts";
import type {
  FarmingMaterialViewModel,
  FarmingPlanResult,
  FarmingSourceViewModel,
} from "../domain/types.ts";

const FARMING_REQUIREMENT_PREDICATES = [
  "ascension_cost",
  "ascension_material",
  "talent_material",
  "recipe_ingredient",
  "requires",
  "uses_material_family",
];

const FARMING_SOURCE_PREDICATES = ["drops", "rewards"];

export class TeyvatPersistentFarmingQueries {
  private readonly db;

  constructor(db = getDatabase()) {
    this.db = db;
  }

  private async revision(): Promise<string> {
    const [row] = await this.db
      .select({ revision: teyvatDatasetRevisions.revision })
      .from(teyvatDatasetRevisions)
      .limit(1);
    if (!row) throw new Error("No Teyvat projection has been ingested into Neon.");
    return row.revision;
  }

  async resolveTarget(query: string, kind?: string): Promise<TeyvatEntity | null> {
    const normalized = normalize(query);
    const conditions = kind
      ? and(
          eq(teyvatEntities.kind, kind),
          or(eq(teyvatEntities.slug, query.toLowerCase()), ilike(teyvatEntities.name, query)),
        )
      : or(eq(teyvatEntities.slug, query.toLowerCase()), ilike(teyvatEntities.name, query));

    const direct = await this.db
      .select()
      .from(teyvatEntities)
      .where(conditions)
      .orderBy(asc(teyvatEntities.name), asc(teyvatEntities.id));

    if (direct.length > 0) {
      const prioritized = direct.sort((a, b) => {
        const priorityKind = (k: string) => (k === "avatar" ? 1 : k === "weapon" ? 2 : k === "material" ? 3 : k === "domain" ? 4 : k === "food" ? 5 : 6);
        return priorityKind(a.kind) - priorityKind(b.kind) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
      });
      return prioritized[0];
    }

    const aliasRows = await this.db
      .select({ entityId: teyvatAliases.entityId })
      .from(teyvatAliases)
      .where(ilike(teyvatAliases.normalizedAlias, `%${normalized}%`))
      .limit(20);

    if (!aliasRows.length) return null;

    const ids = aliasRows.map((row) => row.entityId);
    const aliasMatches = await this.db
      .select()
      .from(teyvatEntities)
      .where(and(inArray(teyvatEntities.id, ids), ...(kind ? [eq(teyvatEntities.kind, kind)] : [])))
      .orderBy(asc(teyvatEntities.name), asc(teyvatEntities.id));

    if (!aliasMatches.length) return null;

    const prioritized = aliasMatches.sort((a, b) => {
      const priorityKind = (k: string) => (k === "avatar" ? 1 : k === "weapon" ? 2 : k === "material" ? 3 : k === "domain" ? 4 : k === "food" ? 5 : 6);
      return priorityKind(a.kind) - priorityKind(b.kind) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
    });

    return prioritized[0];
  }

  async getFarmingPlan(query: string, kind?: string): Promise<FarmingPlanResult | null> {
    const targetEntity = await this.resolveTarget(query, kind);
    if (!targetEntity) return null;

    let requirementEdges = await this.db
      .select()
      .from(teyvatRelations)
      .where(
        and(
          eq(teyvatRelations.subjectId, targetEntity.id),
          inArray(teyvatRelations.predicate, FARMING_REQUIREMENT_PREDICATES),
        ),
      );

    // If target itself is a domain, it provides drops
    if (requirementEdges.length === 0 && targetEntity.kind === "domain") {
      requirementEdges = await this.db
        .select()
        .from(teyvatRelations)
        .where(
          and(
            eq(teyvatRelations.subjectId, targetEntity.id),
            inArray(teyvatRelations.predicate, ["drops", "rewards"]),
          ),
        );
    }

    const revision = await this.revision();

    // If target is directly a material, synthesize a direct material entry
    if (requirementEdges.length === 0 && targetEntity.kind === "material") {
      const sourceEdges = await this.db
        .select()
        .from(teyvatRelations)
        .where(
          and(
            eq(teyvatRelations.objectId, targetEntity.id),
            inArray(teyvatRelations.predicate, FARMING_SOURCE_PREDICATES),
          ),
        );

      const sourceSubjectIds = Array.from(new Set(sourceEdges.map((s) => s.subjectId)));
      const sourceEntities = sourceSubjectIds.length
        ? await this.db
            .select()
            .from(teyvatEntities)
            .where(inArray(teyvatEntities.id, sourceSubjectIds))
        : [];
      const sourceMap = new Map(sourceEntities.map((s) => [s.id, s]));

      const sources: FarmingSourceViewModel[] = sourceEdges.map((s) => {
        const sourceEntity = sourceMap.get(s.subjectId);
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
        revision,
        preview: false,
      };
    }

    const materialIds = Array.from(new Set(requirementEdges.map((edge) => edge.objectId)));

    const materialEntities = materialIds.length
      ? await this.db
          .select()
          .from(teyvatEntities)
          .where(inArray(teyvatEntities.id, materialIds))
      : [];
    const materialMap = new Map(materialEntities.map((m) => [m.id, m]));

    const sourceEdges = materialIds.length
      ? await this.db
          .select()
          .from(teyvatRelations)
          .where(
            and(
              inArray(teyvatRelations.objectId, materialIds),
              inArray(teyvatRelations.predicate, FARMING_SOURCE_PREDICATES),
            ),
          )
      : [];

    const sourceSubjectIds = Array.from(new Set(sourceEdges.map((s) => s.subjectId)));
    const sourceEntities = sourceSubjectIds.length
      ? await this.db
          .select()
          .from(teyvatEntities)
          .where(inArray(teyvatEntities.id, sourceSubjectIds))
      : [];
    const sourceMap = new Map(sourceEntities.map((s) => [s.id, s]));

    const reqsByMaterial = new Map<string, TeyvatRelation[]>();
    for (const edge of requirementEdges) {
      const list = reqsByMaterial.get(edge.objectId) ?? [];
      list.push(edge);
      reqsByMaterial.set(edge.objectId, list);
    }

    const materials: FarmingMaterialViewModel[] = [];
    for (const [materialId, edges] of reqsByMaterial.entries()) {
      const matEntity = materialMap.get(materialId);
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
        const sourceEntity = sourceMap.get(s.subjectId);
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

    return {
      target: {
        id: targetEntity.id,
        kind: targetEntity.kind,
        slug: targetEntity.slug,
        name: targetEntity.name,
      },
      materials,
      revision,
      preview: false,
    };
  }
}
