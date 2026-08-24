import { readArtifact } from "./artifact.ts";
import type { BatchDataset, BatchIngestResult, Entity } from "./projection/types.ts";
import type { TeyvatProjection } from "./projection/types.ts";

class LocalGraphEngine {
  private entities = new Map<string, Entity>();
  async ingestBatch(dataset: BatchDataset): Promise<BatchIngestResult> {
    this.entities = new Map(dataset.entities.map((entity) => [entity.id, entity]));
    return { entitiesInserted: dataset.entities.length, aliasesInserted: dataset.aliases.length, relationsInserted: dataset.relations.length, documentsInserted: dataset.documents.length };
  }
  async query(query: { type: string; id?: string; search?: { query?: string; kind?: string; limit?: number; mode?: string } }) {
    if (query.type === "getEntity") return { entities: query.id && this.entities.has(query.id) ? [this.entities.get(query.id)] : [] };
    const needle = (query.search?.query ?? "").toLowerCase();
    const entities = [...this.entities.values()].filter((entity) => (!query.search?.kind || entity.kind === query.search.kind) && (!needle || entity.name.toLowerCase().includes(needle) || entity.slug.toLowerCase().includes(needle))).slice(0, query.search?.limit ?? 24);
    return { entities };
  }
}

export interface TeyvatBootstrap {
  engine: LocalGraphEngine;
  projection: TeyvatProjection;
  ingest: BatchIngestResult;
}

let cached: Promise<TeyvatBootstrap> | undefined;

export function getTeyvatBootstrap(): Promise<TeyvatBootstrap> {
  cached ??= (async () => {
    const projection = readArtifact();
    const engine = new LocalGraphEngine();
    const ingestStarted = performance.now();
    const ingest = await engine.ingestBatch(projection);
    projection.stats.ingestionMs = performance.now() - ingestStarted;
    return { engine, projection, ingest };
  })();
  return cached;
}

export function resetTeyvatBootstrapForTests(): void {
  cached = undefined;
}
