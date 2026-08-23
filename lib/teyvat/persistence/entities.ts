import { and, asc, count, eq, ilike, inArray, not, or } from "drizzle-orm";
import { getDatabase } from "../../../db/client.ts";
import { teyvatAliases, teyvatDatasetRevisions, teyvatEntities, teyvatRelations, type TeyvatEntity } from "../../../db/schema.ts";
import { entityViewModel, normalize, type EntityLike } from "../domain/entities.ts";
import type { EntityDetailResult, EntityQueryOptions, EntitySearchResult, TeyvatEntityViewModel, TeyvatRelationViewModel } from "../domain/types.ts";

const CATEGORY_BY_UI_KIND: Record<string, string> = {
  characters: "avatar", weapons: "weapon", materials: "material", domains: "domain", artifacts: "reliquary", enemies: "monster", geographies: "region",
};
function categoryForKind(kind?: string): string | undefined { return kind ? CATEGORY_BY_UI_KIND[kind] ?? kind : undefined; }

function toEntityLike(row: TeyvatEntity): EntityLike {
  return { id: row.id, kind: row.kind, slug: row.slug, name: row.name, data: row.data, provenance: row.provenance ?? undefined, temporal: row.temporal ?? undefined } as EntityLike;
}

export class TeyvatPersistentEntityQueries {
  private readonly db;

  constructor(db = getDatabase()) {
    this.db = db;
  }

  private async revision(): Promise<string> {
    const [row] = await this.db.select({ revision: teyvatDatasetRevisions.revision }).from(teyvatDatasetRevisions).limit(1);
    if (!row) throw new Error("No Teyvat projection has been ingested into Neon.");
    return row.revision;
  }

  private async aliasesFor(entityIds: string[]): Promise<Map<string, string[]>> {
    if (!entityIds.length) return new Map();
    const rows = await this.db.select({ entityId: teyvatAliases.entityId, alias: teyvatAliases.alias }).from(teyvatAliases).where(inArray(teyvatAliases.entityId, entityIds));
    const result = new Map<string, string[]>();
    for (const row of rows) result.set(row.entityId, [...(result.get(row.entityId) ?? []), row.alias].sort());
    return result;
  }

  private async toViews(rows: TeyvatEntity[], revision: string): Promise<TeyvatEntityViewModel[]> {
    const aliases = await this.aliasesFor(rows.map((row) => row.id));
    return rows.map((row) => entityViewModel(toEntityLike(row), revision, aliases));
  }

  async getEntity(kind: string, slug: string): Promise<TeyvatEntityViewModel | null> {
    const category = categoryForKind(kind);
    const [row] = await this.db.select().from(teyvatEntities).where(and(eq(teyvatEntities.kind, category ?? kind), eq(teyvatEntities.slug, slug))).limit(1);
    if (!row) return null;
    const revision = await this.revision();
    return (await this.toViews([row], revision))[0] ?? null;
  }

  async resolveEntity(query: string, kind?: string): Promise<TeyvatEntityViewModel | null> {
    const category = categoryForKind(kind);
    const normalized = normalize(query);
    const conditions = category ? and(eq(teyvatEntities.kind, category), or(eq(teyvatEntities.slug, query.toLowerCase()), ilike(teyvatEntities.name, query))) : or(eq(teyvatEntities.slug, query.toLowerCase()), ilike(teyvatEntities.name, query));
    const [direct] = await this.db.select().from(teyvatEntities).where(conditions).orderBy(asc(teyvatEntities.name), asc(teyvatEntities.id)).limit(1);
    if (direct) return (await this.toViews([direct], await this.revision()))[0] ?? null;
    const aliasRows = await this.db.select({ entityId: teyvatAliases.entityId }).from(teyvatAliases).where(ilike(teyvatAliases.normalizedAlias, `%${normalized}%`)).limit(20);
    if (!aliasRows.length) return null;
    const ids = aliasRows.map((row) => row.entityId);
    const rows = await this.db.select().from(teyvatEntities).where(and(inArray(teyvatEntities.id, ids), ...(category ? [eq(teyvatEntities.kind, category)] : []))).orderBy(asc(teyvatEntities.name), asc(teyvatEntities.id)).limit(1);
    return rows.length ? (await this.toViews(rows, await this.revision()))[0] ?? null : null;
  }

  async searchEntities(options: EntityQueryOptions = {}): Promise<EntitySearchResult> {
    const category = categoryForKind(options.kind);
    const query = options.query?.trim() ?? "";
    const normalized = normalize(query);
    const categoryCondition = category ? eq(teyvatEntities.kind, category) : undefined;
    const queryCondition = normalized ? or(ilike(teyvatEntities.name, `%${query}%`), ilike(teyvatEntities.slug, `%${query}%`)) : undefined;
    const base = [categoryCondition, queryCondition, not(inArray(teyvatEntities.kind, ["reliquary_set", "reliquary_piece"]))].filter(Boolean) as Parameters<typeof and>;
    let rows = await this.db.select().from(teyvatEntities).where(base.length ? and(...base) : undefined).orderBy(asc(teyvatEntities.name), asc(teyvatEntities.id));
    if (normalized) {
      const aliasRows = await this.db.select({ entityId: teyvatAliases.entityId }).from(teyvatAliases).where(ilike(teyvatAliases.normalizedAlias, `%${normalized}%`));
      const aliasIds = new Set(aliasRows.map((row) => row.entityId));
      const aliasEntities = aliasIds.size ? await this.db.select().from(teyvatEntities).where(inArray(teyvatEntities.id, [...aliasIds])).orderBy(asc(teyvatEntities.name), asc(teyvatEntities.id)) : [];
      const merged = new Map(rows.map((row) => [row.id, row]));
      for (const row of aliasEntities) if (!category || row.kind === category) merged.set(row.id, row);
      rows = [...merged.values()].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
    }
    rows = rows.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
    const limit = Math.max(1, Math.min(50, options.limit ?? 24));
    const page = Math.max(1, options.page ?? 1);
    const revision = await this.revision();
    const views = await this.toViews(rows.slice((page - 1) * limit, page * limit), revision);
    return { items: views, total: rows.length, page, limit, revision };
  }

  async listEntities(options: EntityQueryOptions = {}): Promise<EntitySearchResult> { return this.searchEntities({ ...options, query: "" }); }

  async detail(kind: string, slug: string): Promise<EntityDetailResult | null> {
    const item = await this.getEntity(kind, slug);
    if (!item) return null;
    const relationRows = await this.db.select().from(teyvatRelations).where(eq(teyvatRelations.subjectId, item.id)).limit(100);
    const objectIds = relationRows.map((row) => row.objectId);
    const objects = objectIds.length ? await this.db.select().from(teyvatEntities).where(inArray(teyvatEntities.id, objectIds)) : [];
    const objectMap = new Map(objects.map((row) => [row.id, row]));
    const revision = item.revision;
    const aliases = await this.aliasesFor(objects.map((row) => row.id));
    const relations: TeyvatRelationViewModel[] = [];
    for (const relation of relationRows) {
      const object = objectMap.get(relation.objectId);
      if (!object) continue;
      const objectView = entityViewModel(toEntityLike(object), revision, aliases);
      relations.push({ id: relation.id, predicate: relation.predicate, sourcePath: relation.predicate, metadata: relation.metadata, object: { id: objectView.id, canonicalId: objectView.canonicalId, category: objectView.category, kind: objectView.kind, slug: objectView.slug, name: objectView.name } });
    }
    return { item, relations, revision };
  }
}

export async function countTeyvatEntities(db = getDatabase()) {
  const [row] = await db.select({ count: count() }).from(teyvatEntities);
  return Number(row?.count ?? 0);
}
