import type { Entity, Document } from "../projection/types.ts";
import type { TeyvatProjection } from "../projection/types.ts";
import { normalize } from "./entities.ts";

export interface LoreDocumentViewModel {
  id: string;
  entityId: string;
  category: "book" | "artifact" | "weapon" | "monster" | "character" | "gcg" | "food" | "namecard" | "story" | "quote";
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
    stories: number;
    quotes: number;
    foods: number;
    namecards: number;
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
  characterStoryCount: number;
  voicelineCount: number;
  foodFlavorCount: number;
  namecardCount: number;
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

/**
 * Curated alternate lore names for entities whose canonical aliases are absent
 * from the raw game data. Keys are normalized query terms; values are normalized
 * canonical entity names that should match.
 *
 * These cover Archon true-names, epithets, and other well-known lore aliases.
 */
const LORE_NAME_ALIASES: Record<string, string[]> = {
  // Geo Archon
  morax: ["zhongli"],
  "rex lapis": ["zhongli"],
  rexlapis: ["zhongli"],
  // Electro Archon
  baal: ["raiden shogun"],
  makoto: ["raiden shogun"],
  beelzebul: ["raiden shogun"],
  raidenshogun: ["raiden shogun"],
  // Anemo Archon
  barbatos: ["venti"],
  // Cryo Archon
  tsaritsa: ["tsaritsa"],
  // Pyro Archon
  murata: ["murata"],
  // Hydro Archon
  focalors: ["furina"],
  egeria: ["egeria"],
  // Dendro Archon
  rukkhadevata: ["nahida"],
  buer: ["nahida"],
  // Other major lore figures
  guizhong: ["guizhong"],
  "guili assembly": ["guili"],
  osial: ["osial"],
  azhdaha: ["azhdaha"],
  "tartaglia": ["tartaglia", "childe"],
  childe: ["tartaglia", "childe"],
  "the knave": ["arlecchino"],
  "pierro": ["pierro"],
  "capitano": ["capitano"],
  signora: ["signora", "la signora"],
  "la signora": ["signora"],
};

export class TeyvatLoreQueries {
  private readonly projection: TeyvatProjection;
  private readonly byId = new Map<string, Entity>();
  private readonly books = new Map<string, Entity>();
  private readonly docsByEntity = new Map<string, Document[]>();
  private readonly loreDocuments: LoreDocumentViewModel[] = [];
  /** entityId → normalized alias strings (from projection.aliases) */
  private readonly aliasesByEntityId = new Map<string, string[]>();

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

    // Index aliases by entityId for fast alias-based search
    for (const alias of projection.aliases) {
      const list = this.aliasesByEntityId.get(alias.entityId) ?? [];
      list.push(normalize(alias.alias));
      this.aliasesByEntityId.set(alias.entityId, list);
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
      } else if (doc.id.startsWith("genshin:document:doc_story")) {
        category = "story";
        const metaTitle = (doc.metadata as Record<string, unknown> | undefined)?.title;
        title = typeof metaTitle === "string" && metaTitle.trim()
          ? `${parent?.name ?? "Character"} — ${metaTitle}`
          : `${parent?.name ?? "Character"} — Story Chapter`;
      } else if (doc.id.startsWith("genshin:document:doc_quote")) {
        category = "quote";
        const metaTitle = (doc.metadata as Record<string, unknown> | undefined)?.title;
        title = typeof metaTitle === "string" && metaTitle.trim()
          ? `${parent?.name ?? "Character"} — Voiceline: ${metaTitle}`
          : `${parent?.name ?? "Character"} — Voiceline`;
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

      // Index culinary records & food flavor lore
      if (entity.kind === "food") {
        const data = entity.data as Record<string, unknown>;
        const desc = extractText(data.description);
        if (desc && desc.trim().length > 5) {
          this.loreDocuments.push({
            id: `lore:food:${entity.slug}`,
            entityId: entity.id,
            category: "food",
            title: `${entity.name} — Culinary Lore`,
            entityName: entity.name,
            entitySlug: entity.slug,
            entityKind: "food",
            content: desc,
            snippet: desc.slice(0, 240).replace(/\\n/g, " ").trim() + (desc.length > 240 ? "..." : ""),
            rarity: typeof data.rarity === "number" ? data.rarity : null,
            icon: imageFromData(data),
          });
        }
      }

      // Index namecard lore & flavor text
      if (entity.kind === "namecard") {
        const data = entity.data as Record<string, unknown>;
        const desc = extractText(data.description);
        const cleaned = desc ? desc.replace(/^Namecard style\.\s*/i, "").trim() : null;
        if (cleaned && cleaned.length > 5) {
          this.loreDocuments.push({
            id: `lore:namecard:${entity.slug}`,
            entityId: entity.id,
            category: "namecard",
            title: `${entity.name} — Namecard Chronicle`,
            entityName: entity.name,
            entitySlug: entity.slug,
            entityKind: "namecard",
            content: cleaned,
            snippet: cleaned.slice(0, 240).replace(/\\n/g, " ").trim() + (cleaned.length > 240 ? "..." : ""),
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
    const characterStories = this.loreDocuments.filter((d) => d.category === "story").length;
    const voicelines = this.loreDocuments.filter((d) => d.category === "quote").length;
    const foodFlavors = this.loreDocuments.filter((d) => d.category === "food").length;
    const namecardLore = this.loreDocuments.filter((d) => d.category === "namecard").length;

    return {
      bookCount: Array.from(new Set(this.projection.entities.filter((e) => e.kind === "book").map((e) => e.id))).length,
      bookVolumeCount: bookVolumes,
      artifactStoryCount: artifactStories,
      weaponLoreCount: weaponStories,
      monsterLoreCount: monsterStories,
      characterProfileCount: characterProfiles,
      characterStoryCount: characterStories,
      voicelineCount: voicelines,
      foodFlavorCount: foodFlavors,
      namecardCount: namecardLore,
      totalDocuments: this.loreDocuments.length,
      revision: this.projection.revision,
    };
  }

  private scoreDoc(
    doc: LoreDocumentViewModel,
    normalizedQuery: string,
    rawQuery: string,
    loreMappedNames: string[],
    normalizedLoreMapped: string[]
  ): number {
    let score = 0;
    const normalizedEntityName = normalize(doc.entityName);
    const normalizedTitle = normalize(doc.title);
    const lowerContent = doc.content.toLowerCase();
    const lowerRaw = rawQuery.toLowerCase();

    // Exact entity name match (highest relevance)
    if (normalizedEntityName === normalizedQuery) {
      score += 120;
    } else if (normalizedEntityName.startsWith(normalizedQuery)) {
      score += 80;
    } else if (normalizedEntityName.includes(normalizedQuery)) {
      score += 60;
    }

    // Curated lore alias match (e.g., searching "Morax" for Zhongli)
    if (normalizedLoreMapped.length > 0 && normalizedLoreMapped.some((m) => normalizedEntityName.includes(m))) {
      score += 100;
    }

    // Projection alias match
    const entityAliases = this.aliasesByEntityId.get(doc.entityId) ?? [];
    if (entityAliases.some((a) => a === normalizedQuery)) {
      score += 90;
    } else if (entityAliases.some((a) => a.includes(normalizedQuery))) {
      score += 50;
    }

    // Exact or prefix title match
    if (normalizedTitle === normalizedQuery) {
      score += 70;
    } else if (normalizedTitle.includes(normalizedQuery) || doc.title.toLowerCase().includes(lowerRaw)) {
      score += 40;
    }

    // Content match frequency (capped at 5 occurrences)
    if (lowerRaw.length >= 2 && lowerContent.includes(lowerRaw)) {
      const matchCount = Math.min((lowerContent.split(lowerRaw).length - 1), 5);
      score += matchCount * 10;
    }

    // Prefer primary canonical texts (books, stories, artifacts)
    if (doc.category === "story" || doc.category === "book" || doc.category === "artifact") {
      score += 5;
    }

    return score;
  }

  private buildSnippet(content: string, rawQuery: string, length = 240): string {
    if (!rawQuery) {
      return content.slice(0, length).replace(/\\n/g, " ").trim() + (content.length > length ? "..." : "");
    }
    const idx = content.toLowerCase().indexOf(rawQuery.toLowerCase());
    if (idx === -1) {
      return content.slice(0, length).replace(/\\n/g, " ").trim() + (content.length > length ? "..." : "");
    }
    const start = Math.max(0, idx - 60);
    const end = Math.min(content.length, start + length);
    const snippet = content.slice(start, end).replace(/\\n/g, " ").trim();
    return (start > 0 ? "..." : "") + snippet + (end < content.length ? "..." : "");
  }

  search(options: { query?: string; category?: string; limit?: number; page?: number } = {}): LoreSearchResult {
    const rawQuery = options.query?.trim() ?? "";
    const normalizedQuery = normalize(rawQuery);
    const category = options.category && options.category !== "all" ? options.category.toLowerCase() : null;

    let filtered = this.loreDocuments;

    if (rawQuery) {
      // Resolve curated lore-name aliases (e.g. "Morax" → ["zhongli"])
      const loreMappedNames = LORE_NAME_ALIASES[rawQuery.toLowerCase()] ?? LORE_NAME_ALIASES[normalizedQuery] ?? [];
      const normalizedLoreMapped = loreMappedNames.map((m) => normalize(m));

      filtered = filtered.filter((doc) => {
        const normalizedEntityName = normalize(doc.entityName);
        const titleMatch = normalize(doc.title).includes(normalizedQuery) || doc.title.toLowerCase().includes(rawQuery.toLowerCase());
        const entityMatch = normalizedEntityName.includes(normalizedQuery);
        const contentMatch = doc.content.toLowerCase().includes(rawQuery.toLowerCase());
        // Match against projection aliases for this entity
        const entityAliases = this.aliasesByEntityId.get(doc.entityId) ?? [];
        const aliasMatch = entityAliases.some((a) => a.includes(normalizedQuery));
        // Match via curated lore-name map (e.g. searching "Morax" expands to "zhongli")
        const loreMappedMatch = normalizedLoreMapped.length > 0 && normalizedLoreMapped.some((mapped) => normalizedEntityName.includes(mapped));
        return titleMatch || entityMatch || contentMatch || aliasMatch || loreMappedMatch;
      });

      // Rank documents by relevance score descending
      filtered = filtered
        .map((doc) => ({
          doc,
          score: this.scoreDoc(doc, normalizedQuery, rawQuery, loreMappedNames, normalizedLoreMapped),
        }))
        .sort((a, b) => b.score - a.score)
        .map(({ doc }) => doc);
    }

    const counts = {
      all: filtered.length,
      books: filtered.filter((d) => d.category === "book").length,
      artifacts: filtered.filter((d) => d.category === "artifact").length,
      weapons: filtered.filter((d) => d.category === "weapon").length,
      monsters: filtered.filter((d) => d.category === "monster").length,
      characters: filtered.filter((d) => d.category === "character").length,
      stories: filtered.filter((d) => d.category === "story").length,
      quotes: filtered.filter((d) => d.category === "quote").length,
      foods: filtered.filter((d) => d.category === "food").length,
      namecards: filtered.filter((d) => d.category === "namecard").length,
    };

    if (category) {
      filtered = filtered.filter((d) => d.category === category);
    }

    const limit = Math.max(1, Math.min(50, options.limit ?? 20));
    const page = Math.max(1, options.page ?? 1);
    const startIndex = (page - 1) * limit;
    const slice = filtered.slice(startIndex, startIndex + limit);

    const items = slice.map((doc) => ({
      ...doc,
      snippet: this.buildSnippet(doc.content, rawQuery),
    }));

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
