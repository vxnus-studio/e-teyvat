import type { Entity } from "../projection/types.ts";
import type { TeyvatProjection } from "../projection/types.ts";
import type { EntityDetailResult, EntityQueryOptions, EntitySearchResult, TeyvatEntityViewModel, TeyvatRelationViewModel } from "./types.ts";

const CATEGORY_BY_UI_KIND: Record<string, string> = {
  characters: "avatar",
  weapons: "weapon",
  materials: "material",
  domains: "domain",
  artifacts: "reliquary",
  enemies: "monster",
  geographies: "region",
};

const UI_KIND_BY_CATEGORY: Record<string, string> = Object.fromEntries(Object.entries(CATEGORY_BY_UI_KIND).map(([kind, category]) => [category, kind]));

function categoryForKind(kind?: string): string | undefined {
  if (!kind) return undefined;
  return CATEGORY_BY_UI_KIND[kind] ?? kind;
}

function text(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object" && typeof (value as { en?: unknown }).en === "string") {
    const english = (value as { en: string }).en.trim();
    return english || null;
  }
  if (value && typeof value === "object" && typeof (value as { canonical?: unknown }).canonical === "string") {
    return (value as { canonical: string }).canonical.trim() || null;
  }
  return null;
}

export function normalize(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function imageFromData(data: Record<string, unknown>): string | null {
  const custom = typeof data.custom_image_url === "string" ? data.custom_image_url : (typeof data.customImageUrl === "string" ? data.customImageUrl : null);
  if (custom) {
    if (custom.startsWith("http")) return custom;
    const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || "https://cdn.eteyvat.vxnus.xyz";
    return `${cdnUrl}/${custom}`;
  }
  const icon = typeof data.icon === "string" ? data.icon : null;
  if (icon?.startsWith("http")) return icon;
  if (icon) return `https://enka.network/ui/${icon}.png`;
  const images = data.images && typeof data.images === "object" && !Array.isArray(data.images) ? data.images as Record<string, unknown> : null;
  const filename = images && Object.values(images).find((value) => typeof value === "string" && value.length > 0);
  return typeof filename === "string" ? `https://enka.network/ui/${filename}.png` : null;
}

export type EntityLike = Pick<Entity, "id" | "kind" | "slug" | "name" | "data" | "provenance" | "temporal">;

function record(entity: EntityLike): Record<string, unknown> {
  return entity.data as Record<string, unknown>;
}

export function entityViewModel(entity: EntityLike, revision: string, aliasesByEntity: Map<string, string[]>): TeyvatEntityViewModel {
  const data = record(entity);
  const element = text(data.element) ?? text(data.elementText) ?? text(data.element_type);
  const rarityValue = data.rarity ?? data.rankLevel ?? data.rank;
  return {
    id: entity.id,
    canonicalId: `${entity.kind}:${String(data.id ?? entity.id.split(":").at(-1))}`,
    category: entity.kind,
    kind: UI_KIND_BY_CATEGORY[entity.kind] ?? entity.kind,
    slug: entity.slug,
    name: entity.name,
    description: text(data.description),
    gameVersion: typeof data.version === "string" ? data.version : entity.provenance?.sourceRevision ?? null,
    image: imageFromData(data),
    rarity: typeof rarityValue === "number" ? rarityValue : null,
    element,
    canonicalData: data,
    aliases: aliasesByEntity.get(entity.id) ?? [],
    provenance: entity.provenance,
    revision,
  };
}

export class TeyvatEntityQueries {
  private readonly projection: TeyvatProjection;
  private readonly byId = new Map<string, Entity>();
  private readonly byCategorySlug = new Map<string, Entity>();
  private readonly aliasesByEntity = new Map<string, string[]>();
  private readonly aliasIndex = new Map<string, Entity[]>();

  constructor(projection: TeyvatProjection) {
    this.projection = projection;
    for (const entity of projection.entities) {
      this.byId.set(entity.id, entity);
      this.byCategorySlug.set(`${entity.kind}:${entity.slug}`, entity);
    }
    for (const alias of projection.aliases) {
      const values = this.aliasesByEntity.get(alias.entityId) ?? [];
      if (!values.includes(alias.alias)) values.push(alias.alias);
      this.aliasesByEntity.set(alias.entityId, values.sort());
      const key = normalize(alias.alias);
      const entities = this.aliasIndex.get(key) ?? [];
      entities.push(this.byId.get(alias.entityId)!);
      this.aliasIndex.set(key, entities);
    }
  }

  getEntity(kind: string, slug: string): TeyvatEntityViewModel | null {
    const entity = this.byCategorySlug.get(`${categoryForKind(kind)}:${slug}`);
    return entity ? entityViewModel(entity, this.projection.revision, this.aliasesByEntity) : null;
  }

  resolveEntity(query: string, kind?: string): TeyvatEntityViewModel | null {
    const category = categoryForKind(kind);
    const normalized = normalize(query);
    const candidates = [...this.projection.entities].filter((entity) => !category || entity.kind === category).sort(compareEntity);
    const exact = candidates.find((entity) => entity.slug.toLowerCase() === query.toLowerCase() || normalize(entity.name) === normalized);
    const alias = (this.aliasIndex.get(normalized) ?? []).filter((entity) => !category || entity.kind === category).sort(compareEntity)[0];
    const entity = exact ?? alias;
    return entity ? entityViewModel(entity, this.projection.revision, this.aliasesByEntity) : null;
  }

  searchEntities(options: EntityQueryOptions = {}): EntitySearchResult {
    const category = categoryForKind(options.kind);
    const query = options.query?.trim() ?? "";
    const normalized = normalize(query);
    const filtered = this.projection.entities.filter((entity) => {
      if (entity.kind === "reliquary_set" || entity.kind === "reliquary_piece") return false;
      if (category && entity.kind !== category) return false;
      if (!normalized) return true;
      return normalize(entity.name).includes(normalized) || normalize(entity.slug).includes(normalized) || (this.aliasesByEntity.get(entity.id) ?? []).some((alias) => normalize(alias).includes(normalized));
    }).sort(compareEntity);
    const limit = Math.max(1, Math.min(50, options.limit ?? 24));
    const page = Math.max(1, options.page ?? 1);
    const offset = (page - 1) * limit;
    return { items: filtered.slice(offset, offset + limit).map((entity) => entityViewModel(entity, this.projection.revision, this.aliasesByEntity)), total: filtered.length, page, limit, revision: this.projection.revision };
  }

  listEntities(options: EntityQueryOptions = {}): EntitySearchResult {
    return this.searchEntities({ ...options, query: "" });
  }

  detail(kind: string, slug: string): EntityDetailResult | null {
    const item = this.getEntity(kind, slug);
    if (!item) return null;
    const relations: TeyvatRelationViewModel[] = this.projection.relations.filter((relation) => relation.subjectId === item.id).slice(0, 100).map((relation): TeyvatRelationViewModel | null => {
      const object = this.byId.get(relation.objectId);
      if (!object) return null;
      const objectView = entityViewModel(object, this.projection.revision, this.aliasesByEntity);
      return {
        id: relation.id,
        predicate: relation.predicate,
        sourcePath: relation.predicate,
        metadata: (relation.metadata ?? {}) as Record<string, unknown>,
        object: {
          id: objectView.id,
          canonicalId: objectView.canonicalId,
          category: objectView.category,
          kind: objectView.kind,
          slug: objectView.slug,
          name: objectView.name,
          image: objectView.image,
        },
      };
    }).filter((value): value is TeyvatRelationViewModel => Boolean(value));
    return { item, relations, revision: this.projection.revision };
  }
}

function compareEntity(a: Entity, b: Entity): number {
  return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
}
