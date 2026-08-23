import { InMemoryEngine } from "@vxnus/e";
import type { BatchIngestResult } from "@vxnus/e";
import { readArtifact } from "./artifact.ts";
import type { TeyvatProjection } from "./projection/types.ts";

export interface TeyvatBootstrap {
  engine: InMemoryEngine;
  projection: TeyvatProjection;
  ingest: BatchIngestResult;
}

let cached: Promise<TeyvatBootstrap> | undefined;

export function getTeyvatBootstrap(): Promise<TeyvatBootstrap> {
  cached ??= (async () => {
    const projection = readArtifact();
    const engine = new InMemoryEngine();
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
