import { getTeyvatBootstrap } from "../bootstrap.ts";
import { TeyvatEntityQueries } from "./entities.ts";
import { TeyvatFarmingQueries } from "./farming.ts";
import { TeyvatPersistentEntityQueries } from "../persistence/entities.ts";
import { TeyvatPersistentFarmingQueries } from "../persistence/farming.ts";

let cached: Promise<TeyvatEntityQueries> | undefined;
let persistentCached: Promise<TeyvatPersistentEntityQueries> | undefined;
let farmingCached: Promise<TeyvatFarmingQueries> | undefined;
let persistentFarmingCached: Promise<TeyvatPersistentFarmingQueries> | undefined;

export function getTeyvatEntityQueries(): Promise<TeyvatEntityQueries> {
  cached ??= getTeyvatBootstrap().then(({ projection }) => new TeyvatEntityQueries(projection));
  return cached;
}

export function resetTeyvatEntityQueriesForTests(): void {
  cached = undefined;
}

export function getTeyvatPersistentEntityQueries(): Promise<TeyvatPersistentEntityQueries> {
  persistentCached ??= Promise.resolve(new TeyvatPersistentEntityQueries());
  return persistentCached;
}

export function resetTeyvatPersistentEntityQueriesForTests(): void {
  persistentCached = undefined;
}

export function getTeyvatFarmingQueries(): Promise<TeyvatFarmingQueries> {
  farmingCached ??= getTeyvatBootstrap().then(({ projection }) => new TeyvatFarmingQueries(projection));
  return farmingCached;
}

export function resetTeyvatFarmingQueriesForTests(): void {
  farmingCached = undefined;
}

export function getTeyvatPersistentFarmingQueries(): Promise<TeyvatPersistentFarmingQueries> {
  persistentFarmingCached ??= Promise.resolve(new TeyvatPersistentFarmingQueries());
  return persistentFarmingCached;
}

export function resetTeyvatPersistentFarmingQueriesForTests(): void {
  persistentFarmingCached = undefined;
}

export { TeyvatEntityQueries } from "./entities.ts";
export { TeyvatFarmingQueries } from "./farming.ts";
export { TeyvatPersistentEntityQueries } from "../persistence/entities.ts";
export { TeyvatPersistentFarmingQueries } from "../persistence/farming.ts";
export type * from "./types.ts";

