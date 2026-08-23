import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { getTeyvatFarmingQueries, getTeyvatPersistentFarmingQueries } from "../lib/teyvat/domain/index.ts";
import type { FarmingPlanResult } from "../lib/teyvat/domain/types.ts";

const memory = await getTeyvatFarmingQueries();
const persistent = await getTeyvatPersistentFarmingQueries();

function comparable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(comparable);
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(object)
        .sort()
        .map((key) => [key, comparable(object[key])]),
    );
  }
  return value;
}

function normalizeResult(plan: FarmingPlanResult | null) {
  if (!plan) return null;
  return {
    ...plan,
    materials: [...plan.materials].sort((a, b) => a.id.localeCompare(b.id)),
  };
}

function assertEqual(label: string, left: FarmingPlanResult | null, right: FarmingPlanResult | null) {
  const normLeft = normalizeResult(left);
  const normRight = normalizeResult(right);
  if (JSON.stringify(comparable(normLeft)) !== JSON.stringify(comparable(normRight))) {
    throw new Error(`${label} mismatch\nInMemory: ${JSON.stringify(normLeft, null, 2)}\nNeon: ${JSON.stringify(normRight, null, 2)}`);
  }
}

// Representative test cases:
// 1. Character with ascension + talent materials: Furina
const furinaMemory = memory.getFarmingPlan("furina");
const furinaNeon = await persistent.getFarmingPlan("furina");
assertEqual("character: Furina", furinaMemory, furinaNeon);
if (!furinaNeon || !furinaNeon.materials.some((m) => m.phase === "ascension_cost") || !furinaNeon.materials.some((m) => m.phase === "talent_material")) {
  throw new Error("Furina farming plan missing ascension or talent materials");
}

// 2. Character with alias resolution: Raiden Shogun
assertEqual("character alias: Raiden Shogun", memory.getFarmingPlan("Raiden Shogun"), await persistent.getFarmingPlan("Raiden Shogun"));

// 3. Weapon with ascension materials: Freedom-Sworn / Splendor of Tranquil Waters / Mistsplitter
const mistsplitterMemory = memory.getFarmingPlan("mistsplitter-reforged");
const mistsplitterNeon = await persistent.getFarmingPlan("mistsplitter-reforged");
assertEqual("weapon: Mistsplitter Reforged", mistsplitterMemory, mistsplitterNeon);
if (!mistsplitterNeon || !mistsplitterNeon.materials.some((m) => m.phase === "ascension_material")) {
  throw new Error("Mistsplitter farming plan missing ascension materials");
}

// 4. Food recipe with ingredient requirements: Lakkaberry Madame
const foodMemory = memory.getFarmingPlan("lakkaberry-madame");
const foodNeon = await persistent.getFarmingPlan("lakkaberry-madame");
assertEqual("food recipe: Lakkaberry Madame", foodMemory, foodNeon);
if (!foodNeon || !foodNeon.materials.some((m) => m.phase === "recipe_ingredient")) {
  throw new Error("Food farming plan missing recipe ingredients");
}

// 5. Material with domain drops (e.g. Guide to Light / Philosophies of Transience)
const transienceMatMemory = memory.getFarmingPlan("philosophies-of-transience");
const transienceMatNeon = await persistent.getFarmingPlan("philosophies-of-transience");
assertEqual("material direct: Philosophies of Transience", transienceMatMemory, transienceMatNeon);

// 6. Material with multiple sources / wild drops
const mushroomMemory = memory.getFarmingPlan("mushroom");
const mushroomNeon = await persistent.getFarmingPlan("mushroom");
assertEqual("material direct: Mushroom", mushroomMemory, mushroomNeon);

// 7. Non-existent / invalid target
assertEqual("invalid target", memory.getFarmingPlan("non-existent-entity-12345"), await persistent.getFarmingPlan("non-existent-entity-12345"));

console.log(
  JSON.stringify(
    {
      status: "PASS",
      cases: 7,
      revision: furinaNeon?.revision,
      sample: {
        furinaMaterialsCount: furinaNeon?.materials.length,
        mistsplitterMaterialsCount: mistsplitterNeon?.materials.length,
        foodIngredientsCount: foodNeon?.materials.length,
      },
    },
    null,
    2,
  ),
);
