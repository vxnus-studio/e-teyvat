import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { BatchDataset } from "./projection/types.ts";
import { stableStringify } from "./projection/identity.ts";
import { projectionRevision } from "./projection/index.ts";
import type { TeyvatProjection } from "./projection/types.ts";
import { validateProjection } from "./projection/validate.ts";

export const ARTIFACT_DIR = join(process.cwd(), "data", "teyvat");
export const ARTIFACT_PATH = join(ARTIFACT_DIR, "projection.json");
export const MANIFEST_PATH = join(ARTIFACT_DIR, "manifest.json");

export interface TeyvatArtifactManifest {
  projectionVersion: string;
  revision: string;
  source: {
    entitiesSha256: string;
    relationsSha256: string;
    documentsSha256: string;
    combinedSha256: string;
  };
  counts: {
    entities: number;
    aliases: number;
    relations: number;
    documents: number;
  };
  artifactSha256: string;
  artifactBytes: number;
  generatedAt: string;
}

export function artifactDataset(projection: TeyvatProjection): TeyvatProjection {
  return projection;
}

export function readArtifact(path = ARTIFACT_PATH): TeyvatProjection {
  const projection = JSON.parse(readFileSync(path, "utf8")) as TeyvatProjection;
  validateProjection(projection);
  if (projection.revision !== projectionRevision(projection)) {
    throw new Error(`Artifact revision mismatch: ${projection.revision}`);
  }
  return projection;
}

export function readArtifactManifest(path = MANIFEST_PATH): TeyvatArtifactManifest {
  return JSON.parse(readFileSync(path, "utf8")) as TeyvatArtifactManifest;
}

export function artifactSha256(dataset: BatchDataset & { documentMetadata?: unknown; revision?: string; stats?: unknown }): string {
  return createHash("sha256").update(stableStringify(dataset)).digest("hex");
}
