import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
  varchar,
  doublePrecision,
} from "drizzle-orm/pg-core";

export type SyncStatus = "running" | "failed" | "ready";

export const syncRuns = pgTable(
  "sync_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    status: text("status").$type<SyncStatus>().notNull().default("running"),
    source: text("source").notNull().default("genshin-data"),
    sourceRevision: text("source_revision"),
    contentDigest: varchar("content_digest", { length: 64 }),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    entityCount: integer("entity_count").notNull().default(0),
    relationCount: integer("relation_count").notNull().default(0),
    unresolvedRelationCount: integer("unresolved_relation_count")
      .notNull()
      .default(0),
    summary: jsonb("summary").$type<Record<string, unknown>>().notNull().default({}),
    error: text("error"),
  },
  (table) => [
    index("sync_runs_status_started_idx").on(table.status, table.startedAt),
  ],
);

export const entities = pgTable(
  "entities",
  {
    id: serial("id").primaryKey(),
    sourceKey: text("source_key").notNull(),
    kind: text("kind").notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    canonicalData: jsonb("canonical_data")
      .$type<Record<string, unknown>>()
      .notNull(),
    contentHash: varchar("content_hash", { length: 64 }).notNull(),
    gameVersion: text("game_version"),
    sourceUrl: text("source_url"),
    customImageUrl: text("custom_image_url"),
    isActive: boolean("is_active").notNull().default(true),
    lastSeenSyncId: uuid("last_seen_sync_id").references(() => syncRuns.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("entities_source_key_uidx").on(table.sourceKey),
    uniqueIndex("entities_kind_slug_uidx").on(table.kind, table.slug),
    index("entities_kind_active_name_idx").on(
      table.kind,
      table.isActive,
      table.name,
    ),
  ],
);

export const aliases = pgTable(
  "aliases",
  {
    id: serial("id").primaryKey(),
    entityId: integer("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    language: text("language").notNull().default("English"),
    alias: text("alias").notNull(),
    normalizedAlias: text("normalized_alias").notNull(),
  },
  (table) => [
    uniqueIndex("aliases_entity_language_alias_uidx").on(
      table.entityId,
      table.language,
      table.normalizedAlias,
    ),
    index("aliases_normalized_idx").on(table.normalizedAlias),
  ],
);

export const relations = pgTable(
  "relations",
  {
    id: serial("id").primaryKey(),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    predicate: text("predicate").notNull(),
    objectId: integer("object_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    sourcePath: text("source_path").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    lastSeenSyncId: uuid("last_seen_sync_id").references(() => syncRuns.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("relations_identity_uidx").on(
      table.subjectId,
      table.predicate,
      table.objectId,
      table.sourcePath,
    ),
    index("relations_subject_predicate_idx").on(
      table.subjectId,
      table.predicate,
    ),
    index("relations_object_predicate_idx").on(
      table.objectId,
      table.predicate,
    ),
  ],
);

export const knowledgeDocuments = pgTable(
  "knowledge_documents",
  {
    id: serial("id").primaryKey(),
    entityId: integer("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    section: text("section").notNull(),
    content: text("content").notNull(),
    contentHash: varchar("content_hash", { length: 64 }).notNull(),
    embedding: vector("embedding", { dimensions: 768 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("knowledge_documents_entity_section_uidx").on(
      table.entityId,
      table.section,
    ),
    index("knowledge_documents_entity_idx").on(table.entityId),
    index("knowledge_documents_fts_idx").using(
      "gin",
      sql`to_tsvector('english', ${table.content})`,
    ),
  ],
);

export type Entity = typeof entities.$inferSelect;
export type NewEntity = typeof entities.$inferInsert;
export type Relation = typeof relations.$inferSelect;

export const bannerSources = pgTable("banner_sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  repositoryUrl: text("repository_url").notNull(),
  filePath: text("file_path").notNull(),
  commitSha: text("commit_sha").notNull(),
  importedAt: timestamp("imported_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bannerPhases = pgTable("banner_phases", {
  id: serial("id").primaryKey(),
  game: text("game").notNull().default("genshin"),
  version: text("version").notNull(),
  phaseNumber: integer("phase_number").notNull(),
  phaseKey: text("phase_key").notNull().unique(),
  sequenceIndex: integer("sequence_index").notNull().unique(),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  status: text("status").notNull().default("completed"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bannerPhaseCharacters = pgTable(
  "banner_phase_characters",
  {
    id: serial("id").primaryKey(),
    phaseId: integer("phase_id").notNull().references(() => bannerPhases.id, { onDelete: "cascade" }),
    characterId: integer("character_id").references(() => entities.id, { onDelete: "set null" }),
    characterName: text("character_name").notNull(),
    rarity: integer("rarity").notNull(),
    featured: boolean("featured").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("banner_phase_chars_phase_char_uidx").on(table.phaseId, table.characterId),
    uniqueIndex("banner_phase_chars_phase_name_uidx").on(table.phaseId, table.characterName),
  ]
);

export const bannerCharacterStatistics = pgTable("banner_character_statistics", {
  characterId: integer("character_id").primaryKey().references(() => entities.id, { onDelete: "cascade" }),
  appearanceCount: integer("appearance_count").notNull().default(0),
  completedIntervalCount: integer("completed_interval_count").notNull().default(0),
  currentWait: integer("current_wait").notNull().default(0),
  meanInterval: doublePrecision("mean_interval"),
  medianInterval: doublePrecision("median_interval"),
  minimumInterval: integer("minimum_interval"),
  maximumInterval: integer("maximum_interval"),
  modeIntervals: jsonb("mode_intervals").$type<number[]>(),
  intervals: jsonb("intervals").$type<number[]>(),
  appearancePhaseIndices: jsonb("appearance_phase_indices").$type<number[]>(),
  currentWaitPercentile: doublePrecision("current_wait_percentile"),
  pressureScore: integer("pressure_score"),
  pressureLevel: text("pressure_level"),
  confidenceScore: integer("confidence_score"),
  confidenceLevel: text("confidence_level"),
  reasons: jsonb("reasons").$type<Array<{ reasonCode: string; message: string; weight: number }>>(),
  calculatedAt: timestamp("calculated_at", { withTimezone: true }).notNull().defaultNow(),
  modelVersion: text("model_version").notNull().default("rerun-pressure-v1"),
});

/**
 * E-compatible canonical snapshot storage. These tables intentionally use
 * deterministic text IDs and coexist with the legacy integer-ID tables above
 * until the remaining application domains are migrated.
 */
export const teyvatEntities = pgTable(
  "teyvat_entities",
  {
    id: text("id").primaryKey(),
    namespace: text("namespace").notNull(),
    kind: text("kind").notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>().notNull(),
    provenance: jsonb("provenance").$type<Record<string, unknown>>(),
    temporal: jsonb("temporal").$type<Record<string, unknown>>(),
  },
  (table) => [
    index("teyvat_entities_kind_slug_idx").on(table.kind, table.slug),
    index("teyvat_entities_kind_name_idx").on(table.kind, table.name),
  ],
);

export const teyvatAliases = pgTable(
  "teyvat_aliases",
  {
    id: text("id").primaryKey(),
    entityId: text("entity_id")
      .notNull()
      .references(() => teyvatEntities.id, { onDelete: "cascade" }),
    alias: text("alias").notNull(),
    normalizedAlias: text("normalized_alias").notNull(),
  },
  (table) => [
    uniqueIndex("teyvat_aliases_entity_alias_uidx").on(table.entityId, table.normalizedAlias),
    index("teyvat_aliases_normalized_idx").on(table.normalizedAlias),
  ],
);

export const teyvatRelations = pgTable(
  "teyvat_relations",
  {
    id: text("id").primaryKey(),
    subjectId: text("subject_id")
      .notNull()
      .references(() => teyvatEntities.id, { onDelete: "cascade" }),
    predicate: text("predicate").notNull(),
    objectId: text("object_id")
      .notNull()
      .references(() => teyvatEntities.id, { onDelete: "cascade" }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    provenance: jsonb("provenance").$type<Record<string, unknown>>(),
    temporal: jsonb("temporal").$type<Record<string, unknown>>(),
  },
  (table) => [
    index("teyvat_relations_subject_predicate_idx").on(table.subjectId, table.predicate),
    index("teyvat_relations_object_predicate_idx").on(table.objectId, table.predicate),
  ],
);

export const teyvatDocuments = pgTable(
  "teyvat_documents",
  {
    id: text("id").primaryKey(),
    entityId: text("entity_id")
      .notNull()
      .references(() => teyvatEntities.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    sourceId: text("source_id").notNull().default("genshin-data"),
    revision: text("revision").notNull().default(""),
    contentHash: varchar("content_hash", { length: 64 }).notNull().default(""),
    provenance: jsonb("provenance").$type<Record<string, unknown>>(),
    category: text("category").notNull(),
    title: text("title").notNull().default(""),
    parentSourceId: text("parent_source_id").notNull(),
  },
  (table) => [index("teyvat_documents_entity_idx").on(table.entityId)],
);

export const teyvatSources = pgTable("teyvat_sources", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  license: text("license").notNull(),
  uri: text("uri"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
});

export const teyvatChunks = pgTable(
  "teyvat_chunks",
  {
    id: text("id").primaryKey(),
    documentId: text("document_id").notNull().references(() => teyvatDocuments.id, { onDelete: "cascade" }),
    revision: text("revision").notNull(),
    ordinal: integer("ordinal").notNull(),
    content: text("content").notNull(),
    contentHash: varchar("content_hash", { length: 64 }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => [index("teyvat_chunks_document_ordinal_idx").on(table.documentId, table.ordinal), index("teyvat_chunks_revision_idx").on(table.revision)],
);

// Embeddings are deliberately separate from the clean projection: one chunk can
// have multiple model revisions, and lexical retrieval remains independent.
export const teyvatEmbeddings = pgTable(
  "teyvat_embeddings",
  {
    id: text("id").primaryKey(),
    chunkId: text("chunk_id").notNull().references(() => teyvatChunks.id, { onDelete: "cascade" }),
    revision: text("revision").notNull(),
    model: text("model").notNull(),
    provider: text("provider").notNull(),
    dimensions: integer("dimensions").notNull().default(768),
    contentHash: varchar("content_hash", { length: 64 }).notNull(),
    embedding: vector("embedding", { dimensions: 768 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("teyvat_embeddings_chunk_revision_model_uidx").on(table.chunkId, table.revision, table.model),
    index("teyvat_embeddings_revision_model_idx").on(table.revision, table.model),
  ],
);

export const teyvatDatasetRevisions = pgTable("teyvat_dataset_revisions", {
  revision: text("revision").primaryKey(),
  projectionVersion: text("projection_version").notNull(),
  sourceChecksums: jsonb("source_checksums").$type<Record<string, string>>().notNull(),
  entityCount: integer("entity_count").notNull(),
  aliasCount: integer("alias_count").notNull(),
  relationCount: integer("relation_count").notNull(),
  documentCount: integer("document_count").notNull(),
  installedAt: timestamp("installed_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TeyvatEntity = typeof teyvatEntities.$inferSelect;
export type NewTeyvatEntity = typeof teyvatEntities.$inferInsert;
export type TeyvatAlias = typeof teyvatAliases.$inferSelect;
export type TeyvatRelation = typeof teyvatRelations.$inferSelect;
export type NewTeyvatRelation = typeof teyvatRelations.$inferInsert;
export type TeyvatDocument = typeof teyvatDocuments.$inferSelect;
export type NewTeyvatDocument = typeof teyvatDocuments.$inferInsert;
export type NewTeyvatChunk = typeof teyvatChunks.$inferInsert;

export interface BuildWeaponRecommendation {
  weaponSlug: string;
  rank: number;
  tier: "BiS" | "Alternative" | "F2P" | "Situational";
  refinement?: string;
  notes?: string;
}

export interface BuildArtifactSetOption {
  artifactSlug: string;
  pieces: 2 | 4;
}

export interface BuildArtifactRecommendation {
  rank: number;
  sets: BuildArtifactSetOption[];
  notes?: string;
}

export interface BuildMainStats {
  sands: string[];
  goblet: string[];
  circlet: string[];
}

export interface BuildTeammate {
  characterSlug: string;
  role: string;
  alternatives?: string[];
}

export interface BuildTeamRecommendation {
  name: string;
  description?: string;
  members: BuildTeammate[];
}

export interface BuildRotationStep {
  actor: string;
  action: string;
  notes?: string;
}

export interface BuildProvenance {
  source: string;
  url?: string;
  version?: string;
  author?: string;
}

export const characterBuildRecommendations = pgTable(
  "character_build_recommendations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    characterSlug: text("character_slug").notNull(),
    characterId: text("character_id").references(() => teyvatEntities.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    title: text("title"),
    isPrimary: boolean("is_primary").notNull().default(true),
    playstyle: text("playstyle"),
    weaponRecommendations: jsonb("weapon_recommendations")
      .$type<BuildWeaponRecommendation[]>()
      .notNull()
      .default([]),
    artifactRecommendations: jsonb("artifact_recommendations")
      .$type<BuildArtifactRecommendation[]>()
      .notNull()
      .default([]),
    mainStats: jsonb("main_stats")
      .$type<BuildMainStats>()
      .notNull()
      .default({ sands: [], goblet: [], circlet: [] }),
    substatPriority: jsonb("substat_priority")
      .$type<string[]>()
      .notNull()
      .default([]),
    statTargets: jsonb("stat_targets")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    talentPriority: jsonb("talent_priority")
      .$type<string[]>()
      .notNull()
      .default([]),
    teamRecommendations: jsonb("team_recommendations")
      .$type<BuildTeamRecommendation[]>()
      .notNull()
      .default([]),
    rotationGuide: jsonb("rotation_guide")
      .$type<BuildRotationStep[]>()
      .notNull()
      .default([]),
    authorNotes: text("author_notes"),
    provenance: jsonb("provenance")
      .$type<BuildProvenance>()
      .notNull()
      .default({ source: "KeqingMains" }),
    gameVersion: text("game_version").notNull().default("5.4"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("char_build_slug_idx").on(table.characterSlug),
    index("char_build_primary_idx").on(table.characterSlug, table.isPrimary),
  ],
);

export type CharacterBuildRecommendation = typeof characterBuildRecommendations.$inferSelect;
export type NewCharacterBuildRecommendation = typeof characterBuildRecommendations.$inferInsert;

