import { PostgresEngine } from "@vxnus/e-postgres";
import type { Entity, Relation } from "@vxnus/e";
import type { Pool } from "pg";
import { entityViewModel, normalize, type EntityLike } from "../domain/entities.ts";
import type { EntityDetailResult, EntityQueryOptions, EntitySearchResult, TeyvatEntityViewModel, TeyvatRelationViewModel } from "../domain/types.ts";

const CATEGORY_BY_UI_KIND: Record<string, string> = {
  characters: "avatar", weapons: "weapon", materials: "material", domains: "domain", artifacts: "reliquary", enemies: "monster", geographies: "region",
};

function categoryForKind(kind?: string): string | undefined { return kind ? CATEGORY_BY_UI_KIND[kind] ?? kind : undefined; }

function mapEntity(row: Record<string, unknown>): Entity {
  return {
    id: String(row.id),
    namespace: String(row.namespace ?? ""),
    kind: String(row.kind ?? ""),
    slug: String(row.slug ?? ""),
    name: String(row.name ?? ""),
    data: (row.data ?? {}) as Entity["data"],
    identities: row.identities as Entity["identities"],
    provenance: row.provenance as Entity["provenance"],
    temporal: row.temporal as Entity["temporal"],
  };
}

function toEntityLike(row: Entity): EntityLike { return row; }

function compareEntity(a: Entity, b: Entity): number {
  return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
}

/** E-native Teyvat entity reads backed by the application DATABASE_URL. */
export class TeyvatEPostgresEntityQueries {
  private readonly engine: PostgresEngine;
  private readonly pool: Pool;

  constructor(connectionString = process.env.DATABASE_URL) {
    if (!connectionString) throw new Error("DATABASE_URL is not configured.");
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

  private async aliasesFor(entityIds: string[]): Promise<Map<string, string[]>> {
    if (!entityIds.length) return new Map();
    const result = await this.pool.query<{ entity_id: string; alias: string }>(
      "SELECT entity_id, alias FROM e_aliases WHERE entity_id = ANY($1::varchar[]) ORDER BY entity_id, alias COLLATE \"C\" ASC",
      [entityIds],
    );
    const aliases = new Map<string, string[]>();
    for (const row of result.rows) aliases.set(row.entity_id, [...(aliases.get(row.entity_id) ?? []), row.alias]);
    return aliases;
  }

  private async toViews(rows: Entity[], revision: string): Promise<TeyvatEntityViewModel[]> {
    const aliases = await this.aliasesFor(rows.map((row) => row.id));
    return rows.map((row) => entityViewModel(toEntityLike(row), revision, aliases));
  }

  private async selectEntities(where: string, values: unknown[], order = "name COLLATE \"C\" ASC, id COLLATE \"C\" ASC"): Promise<Entity[]> {
    const result = await this.pool.query<Record<string, unknown>>(`SELECT * FROM e_entities WHERE ${where} ORDER BY ${order}`, values);
    return result.rows.map(mapEntity);
  }

  async getEntity(kind: string, slug: string): Promise<TeyvatEntityViewModel | null> {
    const category = categoryForKind(kind);
    const rows = await this.selectEntities("kind = $1 AND slug = $2", [category ?? kind, slug], "id COLLATE \"C\" ASC");
    const views = await this.toViews(rows.slice(0, 1), await this.revision());
    return views[0] ?? null;
  }

  async resolveEntity(query: string, kind?: string): Promise<TeyvatEntityViewModel | null> {
    const category = categoryForKind(kind);
    const params: unknown[] = [query.toLowerCase(), query];
    let where = "(lower(slug) = $1 OR name ILIKE $2)";
    if (category) { params.push(category); where += ` AND kind = $${params.length}`; }
    let rows = (await this.selectEntities(where, params)).sort(compareEntity);
    if (!rows.length) {
      const normalized = normalize(query);
      const aliasParams: unknown[] = [`%${normalized}%`];
      let aliasWhere = "lower(a.alias) LIKE $1";
      if (category) { aliasParams.push(category); aliasWhere += ` AND e_entities.kind = $${aliasParams.length}`; }
      rows = (await this.selectEntities(`EXISTS (SELECT 1 FROM e_aliases a WHERE a.entity_id = e_entities.id AND ${aliasWhere})`, aliasParams)).sort(compareEntity);
    }
    const views = await this.toViews(rows.slice(0, 1), await this.revision());
    return views[0] ?? null;
  }

  async searchEntities(options: EntityQueryOptions = {}): Promise<EntitySearchResult> {
    const category = categoryForKind(options.kind);
    const query = options.query?.trim() ?? "";
    const params: unknown[] = [];
    const conditions = ["kind NOT IN ('reliquary_set', 'reliquary_piece')"];
    if (category) { params.push(category); conditions.push(`kind = $${params.length}`); }
    if (query) {
      params.push(`%${query}%`, `%${normalize(query)}%`);
      conditions.push(`(name ILIKE $${params.length - 1} OR slug ILIKE $${params.length - 1} OR EXISTS (SELECT 1 FROM e_aliases a WHERE a.entity_id = e_entities.id AND lower(a.alias) LIKE $${params.length}))`);
    }
    const where = conditions.join(" AND ");
    const countResult = await this.pool.query<{ total: string }>(`SELECT count(*)::text AS total FROM e_entities WHERE ${where}`, params);
    const total = Number(countResult.rows[0]?.total ?? 0);
    const limit = Math.max(1, Math.min(50, options.limit ?? 24));
    const page = Math.max(1, Math.floor(options.page ?? 1));
    const rows = (await this.selectEntities(where, params, "id COLLATE \"C\" ASC")).sort(compareEntity);
    return { items: await this.toViews(rows.slice((page - 1) * limit, page * limit), await this.revision()), total, page, limit, revision: await this.revision() };
  }

  async listEntities(options: EntityQueryOptions = {}): Promise<EntitySearchResult> { return this.searchEntities({ ...options, query: "" }); }

  async detail(kind: string, slug: string): Promise<EntityDetailResult | null> {
    const item = await this.getEntity(kind, slug);
    if (!item) return null;
    const result = await this.engine.query({ type: "findRelations", subjectId: item.id, limit: 100 });
    const relations = (result.relations ?? []) as Relation[];
    const objects = new Map((result.entities ?? []).map((entity) => [entity.id, entity]));
    const aliases = await this.aliasesFor([...objects.keys()]);
    const views: TeyvatRelationViewModel[] = relations.flatMap((relation) => {
      const object = objects.get(relation.objectId);
      if (!object) return [];
      const view = entityViewModel(toEntityLike(object), item.revision, aliases);
      return [{ id: relation.id, predicate: relation.predicate, sourcePath: relation.predicate, metadata: (relation.metadata ?? {}) as Record<string, unknown>, object: { id: view.id, canonicalId: view.canonicalId, category: view.category, kind: view.kind, slug: view.slug, name: view.name } }];
    });
    return { item, relations: views, revision: item.revision };
  }
}
