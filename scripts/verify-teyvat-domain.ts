import { getTeyvatEntityQueries } from "../lib/teyvat/engine.ts";

const queries = await getTeyvatEntityQueries();
const firstDomain = queries.listEntities({ kind: "domains", limit: 1 }).items[0];
const checks = {
  character: queries.getEntity("characters", "sigewinne"),
  weapon: queries.getEntity("weapons", "splendor-of-tranquil-waters"),
  material: queries.searchEntities({ kind: "materials", query: "Mushroom", limit: 1 }),
  food: queries.searchEntities({ kind: "food", query: "Apple", limit: 1 }),
  domain: firstDomain ? queries.getEntity("domains", firstDomain.slug) : null,
  questFallback: queries.getEntity("quest", "quest-10001"),
  alias: queries.resolveEntity("Sigewinne", "characters"),
  missing: queries.getEntity("characters", "does-not-exist"),
  filtered: queries.searchEntities({ kind: "characters", limit: 5 }),
};
if (!checks.character || checks.character.category !== "avatar") throw new Error("Character lookup failed");
if (!checks.weapon || checks.weapon.category !== "weapon") throw new Error("Weapon lookup failed");
if (!checks.domain || checks.domain.category !== "domain") throw new Error("Domain lookup failed");
if (checks.material.total < 1 || checks.food.total < 1) throw new Error("Material/food search failed");
if (!checks.questFallback || !checks.questFallback.name) throw new Error("Quest fallback lookup failed");
if (!checks.alias || checks.alias.id !== checks.character.id) throw new Error("Alias resolution failed");
if (checks.missing !== null) throw new Error("Missing entity should resolve to null");
if (checks.filtered.items.length !== 5) throw new Error("Search result count failed");
console.log(JSON.stringify({ revision: checks.character.revision, character: checks.character.name, weapon: checks.weapon.name, material: checks.material.items[0]?.name, food: checks.food.items[0]?.name, questFallback: checks.questFallback.name, alias: checks.alias.name, missing: checks.missing, filteredCount: checks.filtered.items.length }, null, 2));
