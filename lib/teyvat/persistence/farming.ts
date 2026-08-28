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

  async getDailyRotationSchedule(): Promise<{
    days: Record<
      number,
      {
        dayName: string;
        chars: Array<{
          name: string;
          slug: string;
          element: "Pyro" | "Hydro" | "Anemo" | "Electro" | "Dendro" | "Cryo" | "Geo";
          rarity: number;
          talentBook: string;
          nation: string;
        }>;
        weapons: Array<{
          name: string;
          slug: string;
          type: "Sword" | "Claymore" | "Polearm" | "Bow" | "Catalyst";
          rarity: number;
          material: string;
          nation: string;
        }>;
      }
    >;
    revision: string;
  }> {
    const revision = await this.revision();

    // 1. Fetch domain drop relations
    const dropRelations = await this.db
      .select()
      .from(teyvatRelations)
      .where(inArray(teyvatRelations.predicate, ["drops", "rewards"]));

    const DAY_MAP: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    const DAY_NAMES: Record<number, string> = {
      0: "Sunday",
      1: "Monday",
      2: "Tuesday",
      3: "Wednesday",
      4: "Thursday",
      5: "Friday",
      6: "Saturday",
    };

    const excludedMatIds = new Set(["genshin:material:202", "genshin:material:102", "genshin:material:105"]);
    const materialDays = new Map<string, Set<number>>();

    for (const rel of dropRelations) {
      if (excludedMatIds.has(rel.objectId)) continue;
      const days = extractAvailableDays(rel.metadata as Record<string, unknown>);
      if (!days.length || days.length > 3) continue;

      const current = materialDays.get(rel.objectId) ?? new Set<number>();
      for (const day of days) {
        const dayIdx = DAY_MAP[day.toLowerCase()];
        if (dayIdx !== undefined) current.add(dayIdx);
      }
      if (current.size > 0) {
        materialDays.set(rel.objectId, current);
      }
    }

    const scheduledMaterialIds = Array.from(materialDays.keys());

    // 2. Fetch avatar and weapon requirement relations
    const requirementRelations = scheduledMaterialIds.length
      ? await this.db
          .select()
          .from(teyvatRelations)
          .where(
            and(
              inArray(teyvatRelations.objectId, scheduledMaterialIds),
              inArray(teyvatRelations.predicate, ["talent_material", "ascension_material"]),
            ),
          )
      : [];

    const neededSubjectIds = Array.from(new Set(requirementRelations.map((r) => r.subjectId)));
    const neededEntities = neededSubjectIds.length
      ? await this.db
          .select()
          .from(teyvatEntities)
          .where(inArray(teyvatEntities.id, neededSubjectIds))
      : [];

    const materialEntities = scheduledMaterialIds.length
      ? await this.db
          .select()
          .from(teyvatEntities)
          .where(inArray(teyvatEntities.id, scheduledMaterialIds))
      : [];

    const entityMap = new Map(neededEntities.map((e) => [e.id, e]));
    const materialMap = new Map(materialEntities.map((m) => [m.id, m]));

    const daysResult: Record<
      number,
      {
        dayName: string;
        chars: Map<string, {
          name: string;
          slug: string;
          element: "Pyro" | "Hydro" | "Anemo" | "Electro" | "Dendro" | "Cryo" | "Geo";
          rarity: number;
          talentBook: string;
          nation: string;
        }>;
        weapons: Map<string, {
          name: string;
          slug: string;
          type: "Sword" | "Claymore" | "Polearm" | "Bow" | "Catalyst";
          rarity: number;
          material: string;
          nation: string;
        }>;
      }
    > = {
      0: { dayName: "Sunday", chars: new Map(), weapons: new Map() },
      1: { dayName: "Monday", chars: new Map(), weapons: new Map() },
      2: { dayName: "Tuesday", chars: new Map(), weapons: new Map() },
      3: { dayName: "Wednesday", chars: new Map(), weapons: new Map() },
      4: { dayName: "Thursday", chars: new Map(), weapons: new Map() },
      5: { dayName: "Friday", chars: new Map(), weapons: new Map() },
      6: { dayName: "Saturday", chars: new Map(), weapons: new Map() },
    };

    for (const rel of requirementRelations) {
      const subject = entityMap.get(rel.subjectId);
      const material = materialMap.get(rel.objectId);
      const days = materialDays.get(rel.objectId);
      if (!subject || !material || !days) continue;

      const data = (subject.data ?? {}) as Record<string, unknown>;

      if (subject.kind === "avatar" && rel.predicate === "talent_material") {
        const elementObj = data.element as Record<string, unknown> | undefined;
        const element = (elementObj?.canonical as "Pyro" | "Hydro" | "Anemo" | "Electro" | "Dendro" | "Cryo" | "Geo") || "Pyro";
        const rarity = (typeof data.rarity === "number" ? data.rarity : 5);
        const region = typeof data.region === "string" ? data.region : "Mondstadt";
        const nation = region.charAt(0).toUpperCase() + region.slice(1).toLowerCase();
        const talentBook = material.name
          .replace("Teachings of ", "")
          .replace("Guide to ", "")
          .replace("Philosophies of ", "");

        const charObj = {
          name: subject.name,
          slug: subject.slug,
          element,
          rarity,
          talentBook,
          nation,
        };

        for (const dayIdx of days) {
          daysResult[dayIdx].chars.set(subject.slug, charObj);
        }
        daysResult[0].chars.set(subject.slug, charObj);
      } else if (subject.kind === "weapon" && rel.predicate === "ascension_material") {
        const typeObj = data.type as Record<string, unknown> | undefined;
        const typeStr = (typeof typeObj?.canonical === "string" ? typeObj.canonical : "Sword");
        const type = (typeStr.charAt(0).toUpperCase() + typeStr.slice(1).toLowerCase()) as "Sword" | "Claymore" | "Polearm" | "Bow" | "Catalyst";
        const rarity = (typeof data.rarity === "number" ? data.rarity : 4);

        const wepObj = {
          name: subject.name,
          slug: subject.slug,
          type,
          rarity,
          material: material.name,
          nation: "",
        };

        for (const dayIdx of days) {
          daysResult[dayIdx].weapons.set(subject.slug, wepObj);
        }
        daysResult[0].weapons.set(subject.slug, wepObj);
      }
    }

    const outputDays: Record<
      number,
      {
        dayName: string;
        chars: Array<{
          name: string;
          slug: string;
          element: "Pyro" | "Hydro" | "Anemo" | "Electro" | "Dendro" | "Cryo" | "Geo";
          rarity: number;
          talentBook: string;
          nation: string;
        }>;
        weapons: Array<{
          name: string;
          slug: string;
          type: "Sword" | "Claymore" | "Polearm" | "Bow" | "Catalyst";
          rarity: number;
          material: string;
          nation: string;
        }>;
      }
    > = {};

    for (let day = 0; day <= 6; day++) {
      outputDays[day] = {
        dayName: DAY_NAMES[day],
        chars: Array.from(daysResult[day].chars.values()).sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name)),
        weapons: Array.from(daysResult[day].weapons.values()).sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name)),
      };
    }

    return {
      days: outputDays,
      revision,
    };
  }
}
