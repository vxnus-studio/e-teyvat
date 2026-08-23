import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { ARTIFACT_PATH, MANIFEST_PATH, readArtifact, readArtifactManifest } from "../lib/teyvat/artifact.ts";
import { InMemoryEngine } from "@vxnus/e";

function sha256(value: Buffer): string { return createHash("sha256").update(value).digest("hex"); }
const artifactBytes = readFileSync(ARTIFACT_PATH);
const manifest = readArtifactManifest(MANIFEST_PATH);
const heapBefore = process.memoryUsage().heapUsed;
const loadStarted = performance.now();
const projection = readArtifact(ARTIFACT_PATH);
const loadMs = performance.now() - loadStarted;
if (sha256(artifactBytes) !== manifest.artifactSha256) throw new Error("Artifact checksum does not match manifest");
if (projection.revision !== manifest.revision) throw new Error("Artifact revision does not match manifest");
if (projection.entities.length !== manifest.counts.entities || projection.aliases.length !== manifest.counts.aliases || projection.relations.length !== manifest.counts.relations || projection.documents.length !== manifest.counts.documents) throw new Error("Artifact counts do not match manifest");
const heapAfterArtifactLoad = process.memoryUsage().heapUsed;
const engine = new InMemoryEngine();
const ingestStarted = performance.now();
const ingest = await engine.ingestBatch(projection);
const ingestMs = performance.now() - ingestStarted;
const heapAfterIngestion = process.memoryUsage().heapUsed;
console.log(JSON.stringify({ artifact: ARTIFACT_PATH, manifest: MANIFEST_PATH, revision: projection.revision, counts: manifest.counts, loadMs, ingestMs, ingest, heapBefore, heapAfterArtifactLoad, heapAfterIngestion, rss: process.memoryUsage().rss, artifactBytes: artifactBytes.byteLength }, null, 2));
