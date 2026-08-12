import { createHash, randomUUID } from "node:crypto";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { getDatabase } from "../db/client.ts";
import {
  aliases,
  entities,
  knowledgeDocuments,
  relations,
  syncRuns,
} from "../db/schema.ts";

type JsonRecord = Record<string, unknown>;

type ImportedEntity = {
  sourceKey: string;
  kind: string;
  slug: string;
  name: string;
  description: string | null;
  canonicalData: JsonRecord;
  contentHash: string;
  gameVersion: string | null;
  sourceUrl: string;
  aliases: string[];
};

type RelationCandidate = {
  subjectKey: string;
  predicate: string;
  objectName: string;
  expectedKinds?: string[];
  sourcePath: string;
  metadata: JsonRecord;
};

type ResolvedRelation = {
  subjectId: number;
  predicate: string;
  objectId: number;
  sourcePath: string;
  metadata: JsonRecord;
};

const DEFAULT_FOLDERS = [
  "characters",
  "constellations",
  "talents",
  "weapons",
  "materials",
  "weaponmaterialtypes",
  "talentmaterialtypes",
  "artifacts",
  "domains",
  "enemies",
  "crafts",
  "foods",
  "geographies",
  "elements",
];

const API_BASE =
  process.env.GENSHIN_API_BASE_URL ??
  "https://genshin-db-api.vercel.app/api/v5";
const CONCURRENCY = Math.max(
  1,
  Math.min(6, Number(process.env.GENSHIN_SYNC_CONCURRENCY ?? 3)),
);
const RETRIES = 4;

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as JsonRecord)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stableValue(nested)]),
    );
  }

  return value;
}

function stableJson(value: unknown) {
  return JSON.stringify(stableValue(value));
}

function hash(value: unknown) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchJson<T>(path: string): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}/${path}`;
  let lastError: unknown;

  for (let attempt = 0; attempt < RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          accept: "application/json",
          "user-agent": "E-Teyvat-Knowledge-Sync/1.0",
        },
        signal: AbortSignal.timeout(45_000),
      });

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText} for ${url}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
      if (attempt < RETRIES - 1) {
        await sleep(750 * 2 ** attempt);
      }
    }
  }

  throw lastError;
}

async function mapConcurrent<T, R>(
  values: T[],
  operation: (value: T, index: number) => Promise<R>,
) {
  const results = new Array<R>(values.length);
  let cursor = 0;

  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await operation(values[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, values.length) }, () => worker()),
  );
  return results;
}

function asRecords(value: unknown): JsonRecord[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is JsonRecord => Boolean(item) && typeof item === "object",
    );
  }

  if (value && typeof value === "object") {
    return [value as JsonRecord];
  }

  return [];
}

async function fetchFolder(folder: string) {
  const bulkParams = new URLSearchParams({
    query: "names",
    matchCategories: "true",
    verboseCategories: "true",
    resultLanguage: "English",
  });

  try {
    const bulk = await fetchJson<unknown>(`${folder}?${bulkParams}`);
    const records = asRecords(bulk);
    if (records.length > 0) return records;
  } catch (error) {
    console.warn(`[${folder}] bulk retrieval failed; using item requests.`, error);
  }

  const namesParams = new URLSearchParams({
    query: "names",
    matchCategories: "true",
    resultLanguage: "English",
  });
  const names = await fetchJson<unknown>(`${folder}?${namesParams}`);
  if (!Array.isArray(names)) {
    throw new Error(`[${folder}] expected a list of names.`);
  }

  const validNames = names.filter((name): name is string => typeof name === "string");
  const records = await mapConcurrent(validNames, async (name) => {
    const params = new URLSearchParams({
      query: name,
      resultLanguage: "English",
    });
    const result = await fetchJson<unknown>(`${folder}?${params}`);
    const [record] = asRecords(result);
    if (!record) throw new Error(`[${folder}] no record returned for ${name}.`);
    return record;
  });

  return records;
}

function collectAliases(record: JsonRecord) {
  const values: string[] = [];
  const possibleKeys = [
    "dupealias",
    "alias",
    "aliases",
    "altname",
    "altnames",
    "names",
  ];

  for (const key of possibleKeys) {
    const value = record[key];
    if (typeof value === "string") values.push(value);
    if (Array.isArray(value)) {
      values.push(...value.filter((item): item is string => typeof item === "string"));
    }
  }

  return unique(values);
}

function importEntity(folder: string, record: JsonRecord): ImportedEntity | null {
  const name =
    stringValue(record.name) ??
    stringValue(record.title) ??
    stringValue(record.id);
  if (!name) return null;

  const slug = slugify(name) || normalize(name);
  const canonicalData = stableValue(record) as JsonRecord;

  return {
    sourceKey: `${folder}:${slug}`,
    kind: folder,
    slug,
    name,
    description:
      stringValue(record.description) ??
      stringValue(record.effect) ??
      stringValue(record.story),
    canonicalData,
    contentHash: hash(canonicalData),
    gameVersion: stringValue(record.version),
    sourceUrl: `${API_BASE}/${folder}?${new URLSearchParams({
      query: name,
      resultLanguage: "English",
    })}`,
    aliases: collectAliases(record),
  };
}

function walkNamedObjects(
  value: unknown,
  path: string,
  visitor: (name: string, item: JsonRecord, path: string) => void,
) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      walkNamedObjects(item, `${path}[${index}]`, visitor),
    );
    return;
  }

  if (!value || typeof value !== "object") return;

  const record = value as JsonRecord;
  const name = stringValue(record.name) ?? stringValue(record.item);
  if (name) visitor(name, record, path);

  for (const [key, nested] of Object.entries(record)) {
    if (key !== "images" && key !== "url") {
      walkNamedObjects(nested, `${path}.${key}`, visitor);
    }
  }
}

function quantityMetadata(record: JsonRecord) {
  const quantity =
    record.count ?? record.quantity ?? record.amount ?? record.value ?? null;
  return quantity === null ? {} : { quantity };
}

function extractRelations(entity: ImportedEntity): RelationCandidate[] {
  const data = entity.canonicalData;
  const candidates: RelationCandidate[] = [];

  function add(
    predicate: string,
    objectName: string,
    sourcePath: string,
    metadata: JsonRecord = {},
    expectedKinds?: string[],
  ) {
    if (!objectName || normalize(objectName) === normalize(entity.name)) return;
    candidates.push({
      subjectKey: entity.sourceKey,
      predicate,
      objectName,
      expectedKinds,
      sourcePath,
      metadata,
    });
  }

  if (data.costs) {
    walkNamedObjects(data.costs, "costs", (name, item, path) => {
      add("requires", name, path, quantityMetadata(item), ["materials"]);
    });
  }

  if (entity.kind === "domains" && data.rewardpreview) {
    walkNamedObjects(data.rewardpreview, "rewardpreview", (name, item, path) => {
      add(
        "rewards",
        name,
        path,
        {
          ...quantityMetadata(item),
          daysOfWeek: data.daysofweek ?? [],
          domainEntrance: data.domainentrance ?? entity.name,
        },
        ["materials", "artifacts"],
      );
    });
  }

  if (entity.kind === "domains" && Array.isArray(data.monsterlist)) {
    data.monsterlist.forEach((name, index) => {
      if (typeof name === "string") {
        add("contains_enemy", name, `monsterlist[${index}]`, {}, ["enemies"]);
      }
    });
  }

  const directFields: Record<
    string,
    { predicate: string; kinds?: string[] }
  > = {
    element: { predicate: "has_element", kinds: ["elements"] },
    region: { predicate: "located_in", kinds: ["geographies"] },
    weaponmaterialtype: {
      predicate: "uses_material_family",
      kinds: ["weaponmaterialtypes", "materials"],
    },
    talentmaterialtype: {
      predicate: "uses_talent_material_family",
      kinds: ["talentmaterialtypes", "materials"],
    },
    domain: { predicate: "obtained_from", kinds: ["domains"] },
    domainentrance: { predicate: "part_of_domain", kinds: ["domains"] },
  };

  for (const [field, mapping] of Object.entries(directFields)) {
    const value = data[field];
    if (typeof value === "string") {
      add(mapping.predicate, value, field, {}, mapping.kinds);
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === "string") {
          add(mapping.predicate, item, `${field}[${index}]`, {}, mapping.kinds);
        }
      });
    }
  }

  for (const field of ["ingredients", "recipe"]) {
    if (data[field]) {
      walkNamedObjects(data[field], field, (name, item, path) => {
        add("crafted_from", name, path, quantityMetadata(item), ["materials"]);
      });
    }
  }

  return candidates;
}

function documentContent(entity: ImportedEntity) {
  const data = entity.canonicalData;
  const sections = [
    `${entity.name} is a Genshin Impact ${entity.kind.replaceAll("_", " ")} entity.`,
    stringValue(data.description),
    stringValue(data.effect),
    stringValue(data.story),
    stringValue(data.source),
    stringValue(data.howtoobtain),
    stringValue(data.region) ? `Region: ${String(data.region)}.` : null,
    stringValue(data.element) ? `Element: ${String(data.element)}.` : null,
    stringValue(data.weapontype)
      ? `Weapon type: ${String(data.weapontype)}.`
      : null,
  ].filter((value): value is string => Boolean(value));

  return sections.join("\n\n").slice(0, 16_000);
}

function chunk<T>(values: T[], size: number) {
  const groups: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    groups.push(values.slice(index, index + size));
  }
  return groups;
}

function resolveCandidate(
  candidate: RelationCandidate,
  subjectId: number,
  matches: Array<{ id: number; kind: string }> | undefined,
) {
  if (!matches?.length) return null;

  const preferred =
    matches.find(
      (match) =>
        !candidate.expectedKinds ||
        candidate.expectedKinds.includes(match.kind),
    ) ?? matches[0];

  if (preferred.id === subjectId) return null;

  return {
    subjectId,
    predicate: candidate.predicate,
    objectId: preferred.id,
    sourcePath: candidate.sourcePath,
    metadata: candidate.metadata,
  } satisfies ResolvedRelation;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to run the Genshin sync.");
  }

  const database = getDatabase();
  const syncId = randomUUID();
  const requestedFolders = unique(
    (process.env.GENSHIN_SYNC_FOLDERS?.split(",") ?? DEFAULT_FOLDERS)
      .map((folder) => folder.trim().toLowerCase())
      .filter(Boolean),
  );

  await database.insert(syncRuns).values({ id: syncId, status: "running" });

  try {
    const config = await fetchJson<{ folders?: string[] }>("config");
    const available = new Set(
      (config.folders ?? []).map((folder) => folder.toLowerCase()),
    );
    const folders = requestedFolders.filter((folder) => available.has(folder));
    const missingFolders = requestedFolders.filter(
      (folder) => !available.has(folder),
    );

    if (folders.length === 0) {
      throw new Error("The upstream API returned no requested folders.");
    }

    console.log(`Syncing ${folders.length} folders from ${API_BASE}.`);
    let imported: ImportedEntity[] = [];
    const folderCounts: Record<string, number> = {};

    for (const folder of folders) {
      const records = await fetchFolder(folder);
      const folderEntities = records
        .map((record) => importEntity(folder, record))
        .filter((entity): entity is ImportedEntity => Boolean(entity));
      folderCounts[folder] = folderEntities.length;
      imported.push(...folderEntities);
      console.log(`[${folder}] ${folderEntities.length} entities`);
      await sleep(200);
    }

    const importedMap = new Map<string, ImportedEntity>();
    for (const entity of imported) importedMap.set(entity.sourceKey, entity);
    imported = Array.from(importedMap.values());

    if (imported.length < 100) {
      throw new Error(
        `Refusing to promote an unexpectedly small import (${imported.length} entities).`,
      );
    }

    const sourceKeys = imported.map((entity) => entity.sourceKey);
    for (const group of chunk(imported, 100)) {
      await database
        .insert(entities)
        .values(
          group.map((entity) => ({
            sourceKey: entity.sourceKey,
            kind: entity.kind,
            slug: entity.slug,
            name: entity.name,
            description: entity.description,
            canonicalData: entity.canonicalData,
            contentHash: entity.contentHash,
            gameVersion: entity.gameVersion,
            sourceUrl: entity.sourceUrl,
            isActive: true,
            lastSeenSyncId: syncId,
            updatedAt: new Date(),
          })),
        )
        .onConflictDoUpdate({
          target: entities.sourceKey,
          set: {
            kind: sql`excluded.kind`,
            slug: sql`excluded.slug`,
            name: sql`excluded.name`,
            description: sql`excluded.description`,
            canonicalData: sql`excluded.canonical_data`,
            contentHash: sql`excluded.content_hash`,
            gameVersion: sql`excluded.game_version`,
            sourceUrl: sql`excluded.source_url`,
            isActive: true,
            lastSeenSyncId: syncId,
            updatedAt: new Date(),
          },
        });
    }

    await database
      .update(entities)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          inArray(entities.kind, folders),
          notInArray(entities.sourceKey, sourceKeys),
        ),
      );

    const stored = await database
      .select({
        id: entities.id,
        sourceKey: entities.sourceKey,
        kind: entities.kind,
        name: entities.name,
      })
      .from(entities)
      .where(eq(entities.isActive, true));

    const idBySourceKey = new Map(stored.map((entity) => [entity.sourceKey, entity.id]));
    const matchesByName = new Map<string, Array<{ id: number; kind: string }>>();
    for (const entity of stored) {
      const key = normalize(entity.name);
      const matches = matchesByName.get(key) ?? [];
      matches.push({ id: entity.id, kind: entity.kind });
      matchesByName.set(key, matches);
    }

    const candidates = imported.flatMap(extractRelations);
    const resolved: ResolvedRelation[] = [];
    const unresolved: RelationCandidate[] = [];

    for (const candidate of candidates) {
      const subjectId = idBySourceKey.get(candidate.subjectKey);
      if (!subjectId) {
        unresolved.push(candidate);
        continue;
      }

      const relation = resolveCandidate(
        candidate,
        subjectId,
        matchesByName.get(normalize(candidate.objectName)),
      );
      if (relation) resolved.push(relation);
      else unresolved.push(candidate);
    }

    const relationIdentity = new Set<string>();
    const deduplicatedRelations = resolved.filter((relation) => {
      const key = [
        relation.subjectId,
        relation.predicate,
        relation.objectId,
        relation.sourcePath,
      ].join(":");
      if (relationIdentity.has(key)) return false;
      relationIdentity.add(key);
      return true;
    });

    await database.delete(relations);
    for (const group of chunk(deduplicatedRelations, 500)) {
      await database.insert(relations).values(
        group.map((relation) => ({
          ...relation,
          lastSeenSyncId: syncId,
        })),
      );
    }

    await database.delete(aliases);
    const aliasRows = imported.flatMap((entity) => {
      const entityId = idBySourceKey.get(entity.sourceKey);
      if (!entityId) return [];
      return unique([entity.name, ...entity.aliases]).map((alias) => ({
        entityId,
        language: "English",
        alias,
        normalizedAlias: normalize(alias),
      }));
    });
    for (const group of chunk(aliasRows, 500)) {
      await database.insert(aliases).values(group).onConflictDoNothing();
    }

    for (const group of chunk(imported, 100)) {
      const rows = group.flatMap((entity) => {
        const entityId = idBySourceKey.get(entity.sourceKey);
        if (!entityId) return [];
        const content = documentContent(entity);
        if (!content) return [];
        return {
          entityId,
          section: "overview",
          content,
          contentHash: hash(content),
          metadata: {
            kind: entity.kind,
            sourceKey: entity.sourceKey,
            sourceUrl: entity.sourceUrl,
          },
          updatedAt: new Date(),
        };
      });

      if (rows.length) {
        await database
          .insert(knowledgeDocuments)
          .values(rows)
          .onConflictDoUpdate({
            target: [
              knowledgeDocuments.entityId,
              knowledgeDocuments.section,
            ],
            set: {
              content: sql`excluded.content`,
              contentHash: sql`excluded.content_hash`,
              metadata: sql`excluded.metadata`,
              embedding: sql`case when ${knowledgeDocuments.contentHash} = excluded.content_hash then ${knowledgeDocuments.embedding} else null end`,
              updatedAt: new Date(),
            },
          });
      }
    }

    const contentDigest = hash(
      imported
        .map((entity) => `${entity.sourceKey}:${entity.contentHash}`)
        .sort(),
    );
    const unresolvedPreview = unresolved.slice(0, 50).map((relation) => ({
      subjectKey: relation.subjectKey,
      predicate: relation.predicate,
      objectName: relation.objectName,
      sourcePath: relation.sourcePath,
    }));

    await database
      .update(syncRuns)
      .set({
        status: "ready",
        completedAt: new Date(),
        contentDigest,
        sourceRevision: contentDigest.slice(0, 12),
        entityCount: imported.length,
        relationCount: deduplicatedRelations.length,
        unresolvedRelationCount: unresolved.length,
        summary: {
          folders: folderCounts,
          missingFolders,
          unresolvedPreview,
        },
      })
      .where(eq(syncRuns.id, syncId));

    console.log(
      `Sync ready: ${imported.length} entities, ${deduplicatedRelations.length} relations, ${unresolved.length} unresolved.`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    await database
      .update(syncRuns)
      .set({ status: "failed", completedAt: new Date(), error: message })
      .where(eq(syncRuns.id, syncId));
    throw error;
  }
}

await main();
