import { config } from "dotenv";
config({ path: ".env.local" });
import { performance } from "node:perf_hooks";
import { TeyvatEPostgresEntityQueries } from "../lib/teyvat/persistence/e-postgres-entities.ts";
import { TeyvatEPostgresFarmingQueries } from "../lib/teyvat/persistence/e-postgres-farming.ts";
import { TeyvatPersistentEntityQueries } from "../lib/teyvat/persistence/entities.ts";
import { TeyvatPersistentFarmingQueries } from "../lib/teyvat/persistence/farming.ts";

const iterations = Math.max(3, Number(process.env.TEYVAT_BENCHMARK_ITERATIONS ?? 10));
const eEntities = new TeyvatEPostgresEntityQueries();
const eFarming = new TeyvatEPostgresFarmingQueries();
const baselineEntities = new TeyvatPersistentEntityQueries();
const baselineFarming = new TeyvatPersistentFarmingQueries();

type Operation = () => Promise<unknown>;
type Measurement = { samplesMs: number[]; errors: string[] };

async function measure(operation: Operation): Promise<Measurement> {
  for (let index = 0; index < 2; index++) await operation();
  const samplesMs: number[] = [];
  const errors: string[] = [];
  for (let index = 0; index < iterations; index++) {
    const started = performance.now();
    try { await operation(); } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
    samplesMs.push(performance.now() - started);
  }
  return { samplesMs, errors };
}

function summary(measurement: Measurement) {
  const sorted = [...measurement.samplesMs].sort((a, b) => a - b);
  const percentile = (value: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * value))] ?? 0;
  return { p50Ms: percentile(0.5), p95Ms: percentile(0.95), maxMs: sorted.at(-1) ?? 0, errors: measurement.errors.length };
}

const operations: Record<string, { e: Operation; baseline: Operation }> = {
  entityLookup: {
    e: () => eEntities.getEntity("characters", "sigewinne"),
    baseline: () => baselineEntities.getEntity("characters", "sigewinne"),
  },
  entitySearch: {
    e: () => eEntities.searchEntities({ kind: "materials", query: "Mushroom", limit: 10 }),
    baseline: () => baselineEntities.searchEntities({ kind: "materials", query: "Mushroom", limit: 10 }),
  },
  entityDetail: {
    e: () => eEntities.detail("characters", "sigewinne"),
    baseline: () => baselineEntities.detail("characters", "sigewinne"),
  },
  aliasResolve: {
    e: () => eEntities.resolveEntity("Sigewinne", "characters"),
    baseline: () => baselineEntities.resolveEntity("Sigewinne", "characters"),
  },
  farmingPlan: {
    e: () => eFarming.getFarmingPlan("Furina"),
    baseline: () => baselineFarming.getFarmingPlan("Furina"),
  },
};

try {
  const results: Record<string, { e: ReturnType<typeof summary>; baseline: ReturnType<typeof summary> }> = {};
  for (const [name, operation] of Object.entries(operations)) {
    results[name] = { e: summary(await measure(operation.e)), baseline: summary(await measure(operation.baseline)) };
  }
  console.log(JSON.stringify({ status: "PASS", iterations, backend: "e-postgres", results }, null, 2));
} finally {
  await eEntities.close?.();
  await eFarming.close();
}
