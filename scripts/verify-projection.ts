import { statSync } from "node:fs";
import { getTeyvatBootstrap } from "../lib/teyvat/engine.ts";
import { loadCanonicalInput } from "../lib/teyvat/projection/input.ts";
import { projectTeyvat } from "../lib/teyvat/projection/index.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const input = loadCanonicalInput();
const heapBefore = process.memoryUsage().heapUsed;
const first = projectTeyvat(input);
const heapAfterProjection = process.memoryUsage().heapUsed;
const second = projectTeyvat(input);
const firstSerialized = JSON.stringify({ ...first, stats: undefined });
const secondSerialized = JSON.stringify({ ...second, stats: undefined });
assert(first.revision === second.revision, "Projection revision is not deterministic");
assert(firstSerialized === secondSerialized, "Projection serialized output is not deterministic");
assert(first.stats.inputEntities === 8334, `Unexpected input entity count: ${first.stats.inputEntities}`);
assert(first.stats.inputRelations === 14244, `Unexpected input relation count: ${first.stats.inputRelations}`);
assert(first.stats.inputDocuments === 11610, `Unexpected input document count: ${first.stats.inputDocuments}`);
assert(first.stats.recipeRemaps === 31, `Unexpected recipe remap count: ${first.stats.recipeRemaps}`);
assert(first.stats.syntheticReliquaryEntities === 362, `Unexpected reliquary synthetic entity count: ${first.stats.syntheticReliquaryEntities}`);
assert(first.stats.nameFallbacks === 1723, `Unexpected name fallback count: ${first.stats.nameFallbacks}`);

const bootstrapStarted = performance.now();
const boot = await getTeyvatBootstrap();
const bootstrapMs = performance.now() - bootstrapStarted;
const artifactBytes = Buffer.byteLength(JSON.stringify({ entities: first.entities, aliases: first.aliases, relations: first.relations, documents: first.documents }));
first.stats.artifactBytes = artifactBytes;
first.stats.heapBeforeBytes = heapBefore;
first.stats.heapAfterProjectionBytes = heapAfterProjection;
first.stats.heapAfterIngestionBytes = process.memoryUsage().heapUsed;
assert(boot.ingest.entitiesInserted === first.entities.length, "Engine entity count mismatch");
assert(boot.ingest.relationsInserted === first.relations.length, "Engine relation count mismatch");
assert(boot.ingest.documentsInserted === first.documents.length, "Engine document count mismatch");
for (const id of ["genshin:avatar:10000095", "genshin:weapon:11301", "genshin:material:100011", "genshin:food:100001", "genshin:quest:10001", "genshin:reliquary:10001", "genshin:reliquary_set:10001", "genshin:reliquary_piece:51140"]) {
  const result = await boot.engine.query({ type: "getEntity", id });
  assert(result.entities?.length === 1, `Representative entity missing from engine: ${id}`);
}
const recipeResult = await boot.engine.query({ type: "search", search: { query: "Apple", kind: "food", limit: 1, mode: "lexical" } });
assert(recipeResult.entities?.length === 1, "Representative food search failed");
assert(first.relations.some((relation) => relation.predicate === "recipe_ingredient" && relation.objectId === "genshin:food:100001"), "Recipe cross-category projection missing");
assert(first.relations.some((relation) => relation.predicate === "set_member" && relation.subjectId === "genshin:reliquary_set:10001" && relation.objectId === "genshin:reliquary_piece:51140"), "Reliquary SET_MEMBER projection missing");
assert(first.documents.some((document) => document.entityId === "genshin:book:100181"), "Category-aware book document projection missing");
const avatar = first.entities.find((entity) => entity.id === "genshin:avatar:10000095");
assert(avatar?.provenance?.provider === "PROJECT_AMBER", "Entity provenance projection missing");
assert(avatar?.temporal?.validFrom === "1.0", "Entity temporal projection missing");
assert(statSync(process.cwd()).isDirectory(), "Working directory is unavailable");

console.log(JSON.stringify({
  eVersion: "@vxnus/e@0.2.0",
  input: { entities: input.entities.length, relations: input.relations.length, documents: input.documents.length },
  projected: { entities: first.entities.length, aliases: first.aliases.length, relations: first.relations.length, documents: first.documents.length },
  special: { syntheticReliquaryEntities: first.stats.syntheticReliquaryEntities, recipeRemaps: first.stats.recipeRemaps, nameFallbacks: first.stats.nameFallbacks },
  revision: first.revision,
  deterministic: true,
  engine: boot.ingest,
  performance: { projectionMs: first.stats.projectionMs, validationMs: first.stats.validationMs, bootstrapMs, ingestionMs: first.stats.ingestionMs, artifactBytes, heapBefore, heapAfterProjection, heapAfterIngestion: process.memoryUsage().heapUsed },
}, null, 2));
