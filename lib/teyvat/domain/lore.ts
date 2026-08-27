import type { Entity, Document } from "../projection/types.ts";
import type { TeyvatProjection } from "../projection/types.ts";
import { normalize } from "./entities.ts";

export interface LoreDocumentViewModel {
  id: string;
  entityId: string;
  category: "book" | "artifact" | "weapon" | "monster" | "character" | "gcg";
  title: string;
  entityName: string;
  entitySlug: string;
  entityKind: string;
  volumeNumber?: number | null;
  content: string;
  snippet: string;
  rarity?: number | null;
  icon?: string | null;
  provenance?: Record<string, unknown>;
}

export interface LoreBookVolumeViewModel {
  id: string;
  volumeNumber: number;
  title: string;
  content: string;
}

export interface LoreBookDetailViewModel {
  id: string;
  slug: string;
  name: string;
  rarity: number | null;
  icon: string | null;
  volumeCount: number;
  volumes: LoreBookVolumeViewModel[];
  description?: string | null;
  revision: string;
}

export interface LoreSearchResult {
  items: LoreDocumentViewModel[];
  total: number;
  page: number;
  limit: number;
  categories: {
    all: number;
    books: number;
    artifacts: number;
    weapons: number;
    monsters: number;
    characters: number;
  };
  revision: string;
  preview: boolean;
}

export interface LoreOverviewResult {
  bookCount: number;
  bookVolumeCount: number;
  artifactStoryCount: number;
  weaponLoreCount: number;
  monsterLoreCount: number;
  characterProfileCount: number;
  totalDocuments: number;
  revision: string;
}

function extractText(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object") {
    const obj = value as { en?: unknown; canonical?: unknown };
    if (typeof obj.en === "string" && obj.en.trim()) return obj.en.trim();
    if (typeof obj.canonical === "string" && obj.canonical.trim()) return obj.canonical.trim();
  }
  return null;
}

function parseVolumeNumber(docId: string): number | null {
  const match = docId.match(/vol_(\d+)/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

function imageFromData(data: Record<string, unknown>): string | null {
  const icon = typeof data.icon === "string" ? data.icon : null;
  if (icon?.startsWith("http")) return icon;
  if (icon) return `https://enka.network/ui/${icon}.png`;
  return null;
}

export class TeyvatLoreQueries {
  private readonly projection: TeyvatProjection;
  private readonly byId = new Map<string, Entity>();
  private readonly books = new Map<string, Entity>();
  private readonly docsByEntity = new Map<string, Document[]>();
  private readonly loreDocuments: LoreDocumentViewModel[] = [];

  constructor(projection: TeyvatProjection) {
    this.projection = projection;

    for (const entity of projection.entities) {
      this.byId.set(entity.id, entity);
      if (entity.kind === "book") {
        this.books.set(entity.id, entity);
        this.books.set(entity.slug, entity);
      }
    }

    for (const doc of projection.documents) {
      const list = this.docsByEntity.get(doc.entityId) ?? [];
      list.push(doc);
      this.docsByEntity.set(doc.entityId, list);
    }

    // Index all documents with readable narrative text
    for (const doc of projection.documents) {
      if (!doc.content || doc.content.trim().length === 0) continue;

      const parent = this.byId.get(doc.entityId);
      const data = (parent?.data ?? {}) as Record<string, unknown>;
      const volNum = parseVolumeNumber(doc.id);

      let category: LoreDocumentViewModel["category"] = "book";
      let title = parent?.name ?? "Document";

      if (doc.id.startsWith("genshin:document:doc_book")) {
        category = "book";
        title = volNum ? `${parent?.name ?? "Book"} — Vol. ${volNum}` : (parent?.name ?? "Book Volume");
      } else if (doc.id.startsWith("genshin:document:doc_relic")) {
        category = "artifact";
        title = `${parent?.name ?? "Artifact"} Lore`;
      } else if (doc.id.startsWith("genshin:document:doc_gcg")) {
        category = "gcg";
        title = `${parent?.name ?? "Card"} Lore`;
      }

      this.loreDocuments.push({
        id: doc.id,
        entityId: doc.entityId,
        category,
        title,
        entityName: parent?.name ?? "Unknown",
        entitySlug: parent?.slug ?? "",
        entityKind: parent?.kind ?? "unknown",
        volumeNumber: volNum,
        content: doc.content,
        snippet: doc.content.slice(0, 240).replace(/\\n/g, " ").trim() + (doc.content.length > 240 ? "..." : ""),
        rarity: typeof data.rarity === "number" ? data.rarity : null,
        icon: imageFromData(data),
        provenance: doc.provenance as Record<string, unknown> | undefined,
      });
    }

    // Also index weapon lore descriptions
    for (const entity of projection.entities) {
      if (entity.kind === "weapon") {
        const data = entity.data as Record<string, unknown>;
        const desc = extractText(data.description);
        if (desc && desc.trim().length > 10) {
          this.loreDocuments.push({
            id: `lore:weapon:${entity.slug}`,
            entityId: entity.id,
            category: "weapon",
            title: `${entity.name} — Legend`,
            entityName: entity.name,
            entitySlug: entity.slug,
            entityKind: "weapon",
            content: desc,
            snippet: desc.slice(0, 240).replace(/\\n/g, " ").trim() + (desc.length > 240 ? "..." : ""),
            rarity: typeof data.rarity === "number" ? data.rarity : (typeof data.rankLevel === "number" ? data.rankLevel : null),
            icon: imageFromData(data),
          });
        }
      }

      // Index monster descriptions
      if (entity.kind === "monster") {
        const data = entity.data as Record<string, unknown>;
        const desc = extractText(data.description);
        if (desc && desc.trim().length > 10) {
          this.loreDocuments.push({
            id: `lore:monster:${entity.slug}`,
            entityId: entity.id,
            category: "monster",
            title: `${entity.name} — Bestiary Archive`,
            entityName: entity.name,
            entitySlug: entity.slug,
            entityKind: "monster",
            content: desc,
            snippet: desc.slice(0, 240).replace(/\\n/g, " ").trim() + (desc.length > 240 ? "..." : ""),
            icon: imageFromData(data),
          });
        }
      }

      // Index character fetter details
      if (entity.kind === "avatar") {
        const data = entity.data as Record<string, unknown>;
        const fetter = (data.fetter ?? {}) as Record<string, unknown>;
        const detail = extractText(fetter.detail);
        if (detail && detail.trim().length > 10) {
          this.loreDocuments.push({
            id: `lore:avatar:${entity.slug}`,
            entityId: entity.id,
            category: "character",
            title: `${entity.name} — Overview & Profile`,
            entityName: entity.name,
            entitySlug: entity.slug,
            entityKind: "avatar",
            content: detail,
            snippet: detail.slice(0, 240).replace(/\\n/g, " ").trim() + (detail.length > 240 ? "..." : ""),
            rarity: typeof data.rarity === "number" ? data.rarity : 4,
            icon: imageFromData(data),
          });
        }
      }
    }
  }

  overview(): LoreOverviewResult {
    const bookVolumes = this.loreDocuments.filter((d) => d.category === "book").length;
    const artifactStories = this.loreDocuments.filter((d) => d.category === "artifact").length;
    const weaponStories = this.loreDocuments.filter((d) => d.category === "weapon").length;
    const monsterStories = this.loreDocuments.filter((d) => d.category === "monster").length;
    const characterProfiles = this.loreDocuments.filter((d) => d.category === "character").length;

    return {
      bookCount: Array.from(new Set(this.projection.entities.filter((e) => e.kind === "book").map((e) => e.id))).length,
      bookVolumeCount: bookVolumes,
      artifactStoryCount: artifactStories,
      weaponLoreCount: weaponStories,
      monsterLoreCount: monsterStories,
      characterProfileCount: characterProfiles,
      totalDocuments: this.loreDocuments.length,
      revision: this.projection.revision,
    };
  }

  search(options: { query?: string; category?: string; limit?: number; page?: number } = {}): LoreSearchResult {
    const rawQuery = options.query?.trim() ?? "";
    const normalizedQuery = normalize(rawQuery);
    const category = options.category && options.category !== "all" ? options.category.toLowerCase() : null;

    let filtered = this.loreDocuments;

    if (rawQuery) {
      filtered = filtered.filter((doc) => {
        const titleMatch = normalize(doc.title).includes(normalizedQuery) || doc.title.toLowerCase().includes(rawQuery.toLowerCase());
        const entityMatch = normalize(doc.entityName).includes(normalizedQuery);
        const contentMatch = doc.content.toLowerCase().includes(rawQuery.toLowerCase());
        return titleMatch || entityMatch || contentMatch;
      });
    }

    const counts = {
      all: filtered.length,
      books: filtered.filter((d) => d.category === "book").length,
      artifacts: filtered.filter((d) => d.category === "artifact").length,
      weapons: filtered.filter((d) => d.category === "weapon").length,
      monsters: filtered.filter((d) => d.category === "monster").length,
      characters: filtered.filter((d) => d.category === "character").length,
    };

    if (category) {
      filtered = filtered.filter((d) => d.category === category);
    }

    const limit = Math.max(1, Math.min(50, options.limit ?? 20));
    const page = Math.max(1, options.page ?? 1);
    const startIndex = (page - 1) * limit;
    const items = filtered.slice(startIndex, startIndex + limit);

    return {
      items,
      total: filtered.length,
      page,
      limit,
      categories: counts,
      revision: this.projection.revision,
      preview: false,
    };
  }

  listBooks(options: { query?: string; limit?: number; page?: number } = {}): {
    items: Array<{
      id: string;
      slug: string;
      name: string;
      rarity: number | null;
      icon: string | null;
      volumeCount: number;
      sampleSnippet: string;
    }>;
    total: number;
    page: number;
    limit: number;
    revision: string;
  } {
    const rawQuery = options.query?.trim().toLowerCase() ?? "";
    const books = this.projection.entities.filter((e) => e.kind === "book");

    let filtered = books;
    if (rawQuery) {
      filtered = filtered.filter((b) => b.name.toLowerCase().includes(rawQuery) || b.slug.toLowerCase().includes(rawQuery));
    }

    filtered.sort((a, b) => a.name.localeCompare(b.name));

    const limit = Math.max(1, Math.min(50, options.limit ?? 24));
    const page = Math.max(1, options.page ?? 1);
    const startIndex = (page - 1) * limit;
    const slice = filtered.slice(startIndex, startIndex + limit);

    const items = slice.map((book) => {
      const data = book.data as Record<string, unknown>;
      const docs = this.docsByEntity.get(book.id) ?? [];
      const firstDoc = docs.find((d) => Boolean(d.content?.trim()));
      return {
        id: book.id,
        slug: book.slug,
        name: book.name,
        rarity: typeof data.rarity === "number" ? data.rarity : null,
        icon: imageFromData(data),
        volumeCount: typeof data.volume_count === "number" ? data.volume_count : docs.length,
        sampleSnippet: firstDoc?.content ? firstDoc.content.slice(0, 160).replace(/\\n/g, " ") + "..." : "Ancient text chronicle.",
      };
    });

    return {
      items,
      total: filtered.length,
      page,
      limit,
      revision: this.projection.revision,
    };
  }

  getBook(idOrSlug: string): LoreBookDetailViewModel | null {
    const book = this.books.get(idOrSlug);
    if (!book) return null;

    const data = book.data as Record<string, unknown>;
    const docs = this.docsByEntity.get(book.id) ?? [];

    const volumes: LoreBookVolumeViewModel[] = docs
      .filter((d) => Boolean(d.content?.trim()))
      .map((d) => {
        const volNum = parseVolumeNumber(d.id) ?? 1;
        return {
          id: d.id,
          volumeNumber: volNum,
          title: `Volume ${volNum}`,
          content: d.content,
        };
      })
      .sort((a, b) => a.volumeNumber - b.volumeNumber);

    return {
      id: book.id,
      slug: book.slug,
      name: book.name,
      rarity: typeof data.rarity === "number" ? data.rarity : null,
      icon: imageFromData(data),
      volumeCount: typeof data.volume_count === "number" ? data.volume_count : volumes.length,
      volumes,
      description: typeof data.description === "string" ? data.description : null,
      revision: this.projection.revision,
    };
  }
}
