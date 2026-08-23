import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ARTIFACT_DIR, ARTIFACT_PATH, MANIFEST_PATH } from "../lib/teyvat/artifact.ts";
import { loadCanonicalInput, dataRoot } from "../lib/teyvat/projection/input.ts";
import { PROJECTION_VERSION, stableStringify } from "../lib/teyvat/projection/identity.ts";
import { projectTeyvat, projectionRevision } from "../lib/teyvat/projection/index.ts";
import { validateProjection } from "../lib/teyvat/projection/validate.ts";

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

const root = dataRoot();
const input = loadCanonicalInput(root);
const projection = projectTeyvat(input);
const artifact = {
  ...projection,
  // Runtime measurements are intentionally excluded from the generated artifact.
  stats: {
    ...projection.stats,
    projectionMs: 0,
    validationMs: 0,
    ingestionMs: undefined,
    artifactBytes: undefined,
    heapBeforeBytes: undefined,
    heapAfterProjectionBytes: undefined,
    heapAfterIngestionBytes: undefined,
  },
};
artifact.revision = projectionRevision(artifact);
validateProjection(artifact);
const serialized = stableStringify(artifact);
const artifactBuffer = Buffer.from(serialized, "utf8");
const entityBytes = readFileSync(join(root, "entities", "canonical_entities.json"));
const relationBytes = readFileSync(join(root, "relations", "canonical_relations.json"));
const documentBytes = readFileSync(join(root, "documents", "canonical_documents.json"));
const manifest = {
  projectionVersion: PROJECTION_VERSION,
  revision: artifact.revision,
  source: {
    entitiesSha256: sha256(entityBytes),
    relationsSha256: sha256(relationBytes),
    documentsSha256: sha256(documentBytes),
    combinedSha256: sha256(Buffer.concat([entityBytes, relationBytes, documentBytes])),
  },
  counts: {
    entities: artifact.entities.length,
    aliases: artifact.aliases.length,
    relations: artifact.relations.length,
    documents: artifact.documents.length,
  },
  artifactSha256: sha256(artifactBuffer),
  artifactBytes: artifactBuffer.byteLength,
  generatedAt: new Date().toISOString(),
};
mkdirSync(ARTIFACT_DIR, { recursive: true });
writeFileSync(ARTIFACT_PATH, artifactBuffer);
writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
const written = readFileSync(ARTIFACT_PATH);
if (sha256(written) !== manifest.artifactSha256) throw new Error("Generated artifact checksum verification failed");
console.log(JSON.stringify({ artifact: ARTIFACT_PATH, manifest: MANIFEST_PATH, revision: artifact.revision, counts: manifest.counts, bytes: manifest.artifactBytes, sourceRoot: root }, null, 2));
