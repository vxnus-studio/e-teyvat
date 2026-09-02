export interface Provenance { provider?: string; source?: string; sourceId?: string; sourceRevision?: string; locator?: string; contentHash?: string; observedAt?: string; extractedVia?: string; confidence?: string; [key: string]: unknown; }
export interface TemporalSemantics { validFrom?: string; validUntil?: string; [key: string]: unknown; }
export interface Entity { id: string; namespace: string; kind: string; slug: string; name: string; data: Record<string, unknown>; provenance?: Provenance; temporal?: TemporalSemantics; }
export interface Alias { id: string; entityId: string; alias: string; }
export interface Relation { id: string; subjectId: string; predicate: string; objectId: string; metadata?: Record<string, unknown>; provenance?: Provenance; temporal?: TemporalSemantics; }
export interface Document { id: string; entityId: string; content: string; metadata?: Record<string, unknown>; provenance?: Provenance; }
export interface BatchDataset { entities: Entity[]; aliases: Alias[]; relations: Relation[]; documents: Document[]; }
export interface BatchIngestResult { entitiesInserted: number; aliasesInserted: number; relationsInserted: number; documentsInserted: number; }

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export interface CanonicalSource {
  provider?: string;
  raw_file?: string;
  raw_sha256?: string;
  source_version?: string;
  endpoint?: string;
  captured_at?: string;
  resolution?: string;
  [key: string]: unknown;
}

export interface CanonicalRecord {
  category: string;
  id: string | number;
  name?: { en?: string | null; [key: string]: unknown } | string | null;
  title?: { en?: string | null; [key: string]: unknown } | string | null;
  route?: string | null;
  source?: CanonicalSource | null;
  temporal?: Record<string, unknown> | null;
  suit?: Record<string, { id?: string | number; name?: string; [key: string]: unknown }> | null;
  [key: string]: unknown;
}

export interface CanonicalRelation {
  properties?: Record<string, unknown> | null;
  relation_type: string;
  source_category: string;
  source_id: string | number;
  target_category: string;
  target_id: string | number;
  [key: string]: unknown;
}

export interface CanonicalDocument {
  category: string;
  content?: string | null;
  story?: string | null;
  document_id: string;
  parent_id: string | number;
  title?: string | null;
  source?: CanonicalSource | null;
  [key: string]: unknown;
}

export interface TeyvatDocumentMetadata {
  id: string;
  category: string;
  parentSourceId: string;
  title: string;
}

export interface TeyvatProjection extends BatchDataset {
  entities: Entity[];
  aliases: Alias[];
  relations: Relation[];
  documents: Document[];
  documentMetadata: TeyvatDocumentMetadata[];
  revision: string;
  stats: ProjectionStats;
}

export interface ProjectionStats {
  inputEntities: number;
  inputRelations: number;
  inputDocuments: number;
  projectedEntities: number;
  projectedAliases: number;
  projectedRelations: number;
  projectedDocuments: number;
  syntheticReliquaryEntities: number;
  recipeRemaps: number;
  nameFallbacks: number;
  projectionMs: number;
  validationMs?: number;
  ingestionMs?: number;
  artifactBytes?: number;
  heapBeforeBytes?: number;
  heapAfterProjectionBytes?: number;
  heapAfterIngestionBytes?: number;
}

export interface ProjectionInput {
  entities: CanonicalRecord[];
  relations: CanonicalRelation[];
  documents: CanonicalDocument[];
}

export type ProjectedMetadata = JsonObject;
export type ProjectedProvenance = Provenance;
export type ProjectedTemporal = TemporalSemantics;
