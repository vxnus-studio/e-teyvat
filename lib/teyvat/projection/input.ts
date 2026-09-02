import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { CanonicalDocument, CanonicalRecord, CanonicalRelation, ProjectionInput } from "./types.ts";

export function dataRoot(): string {
  if (process.env.GENSHIN_DATA_ROOT) {
    const raw = process.env.GENSHIN_DATA_ROOT;
    return raw.endsWith("normalized") ? resolve(raw) : resolve(raw, "data", "normalized");
  }
  const candidates = [
    join(process.cwd(), "..", "game-data", "gi-data"),
    join(process.cwd(), "..", "gi-data"),
    join(process.cwd(), "..", "genshin-data")
  ];
  for (const candidate of candidates) {
    if (existsSync(join(candidate, "data", "normalized", "entities", "canonical_entities.json"))) {
      return resolve(candidate, "data", "normalized");
    }
  }
  return resolve(join(process.cwd(), "..", "game-data", "gi-data"), "data", "normalized");
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export function loadCanonicalInput(root = dataRoot()): ProjectionInput {
  const entities = readJson<CanonicalRecord[]>(join(root, "entities", "canonical_entities.json"));
  const relations = readJson<CanonicalRelation[]>(join(root, "relations", "canonical_relations.json"));
  const documents = readJson<CanonicalDocument[]>(join(root, "documents", "canonical_documents.json"));
  if (!Array.isArray(entities) || !Array.isArray(relations) || !Array.isArray(documents)) {
    throw new Error(`Invalid normalized dataset at ${root}: expected array files`);
  }
  return { entities, relations, documents };
}
