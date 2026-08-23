import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { getTeyvatEntityQueries, getTeyvatPersistentEntityQueries } from "../lib/teyvat/domain/index.ts";

const memory = await getTeyvatEntityQueries();
const persistent = await getTeyvatPersistentEntityQueries();

function comparable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(comparable);
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(object).sort().map((key) => [key, comparable(object[key])]));
  }
  return value;
}

function assertEqual(label: string, left: unknown, right: unknown) {
  if (JSON.stringify(comparable(left)) !== JSON.stringify(comparable(right))) {
    throw new Error(`${label} mismatch\nInMemory: ${JSON.stringify(left)}\nNeon: ${JSON.stringify(right)}`);
  }
}

assertEqual("character lookup", memory.getEntity("characters", "sigewinne"), await persistent.getEntity("characters", "sigewinne"));
assertEqual("weapon lookup", memory.getEntity("weapons", "splendor-of-tranquil-waters"), await persistent.getEntity("weapons", "splendor-of-tranquil-waters"));
assertEqual("material search", memory.searchEntities({ kind: "materials", query: "Mushroom", limit: 10 }), await persistent.searchEntities({ kind: "materials", query: "Mushroom", limit: 10 }));
assertEqual("food search", memory.searchEntities({ query: "Apple", limit: 10 }), await persistent.searchEntities({ query: "Apple", limit: 10 }));
const firstDomain = memory.listEntities({ kind: "domains", limit: 1 });
assertEqual("domain lookup", firstDomain.items[0], (await persistent.listEntities({ kind: "domains", limit: 1 })).items[0]);
assertEqual("quest fallback name", memory.getEntity("quest", "quest-10001"), await persistent.getEntity("quest", "quest-10001"));
assertEqual("alias resolution", memory.resolveEntity("Sigewinne", "characters"), await persistent.resolveEntity("Sigewinne", "characters"));
assertEqual("missing entity", memory.resolveEntity("not-a-real-entity"), await persistent.resolveEntity("not-a-real-entity"));
assertEqual("category filter", memory.searchEntities({ kind: "weapons", query: "", limit: 20 }), await persistent.searchEntities({ kind: "weapons", query: "", limit: 20 }));
assertEqual("search ordering", memory.searchEntities({ query: "", limit: 50 }), await persistent.searchEntities({ query: "", limit: 50 }));

console.log(JSON.stringify({ status: "PASS", cases: 10, revision: firstDomain.revision }, null, 2));
