import type { Provenance, Relation } from "@vxnus/e";

export interface EntityQueryOptions {
  kind?: string;
  query?: string;
  limit?: number;
  page?: number;
}

export interface TeyvatEntityViewModel {
  id: string;
  canonicalId: string;
  category: string;
  kind: string;
  slug: string;
  name: string;
  description: string | null;
  gameVersion: string | null;
  image: string | null;
  rarity: number | null;
  element: string | null;
  canonicalData: Record<string, unknown>;
  aliases: string[];
  provenance?: Provenance;
  revision: string;
}

export interface TeyvatRelationViewModel {
  id: string;
  predicate: string;
  sourcePath: string;
  metadata: Record<string, unknown>;
  object: Pick<TeyvatEntityViewModel, "id" | "canonicalId" | "category" | "kind" | "slug" | "name">;
}

export interface EntitySearchResult {
  items: TeyvatEntityViewModel[];
  total: number;
  page: number;
  limit: number;
  revision: string;
}

export interface EntityDetailResult {
  item: TeyvatEntityViewModel;
  relations: TeyvatRelationViewModel[];
  revision: string;
}

export interface FarmingSourceViewModel {
  type: "domain" | "enemy";
  name: string;
  kind: string;
  slug: string;
  region?: string | null;
  availableDays: string[];
  domainEntrance?: string | null;
}

export interface FarmingMaterialViewModel {
  id: string;
  name: string;
  quantity: number | null;
  phase: string;
  sources: FarmingSourceViewModel[];
  sourceNotes: string[];
}

export interface FarmingTargetViewModel {
  id: string;
  kind: string;
  slug: string;
  name: string;
}

export interface FarmingPlanResult {
  target: FarmingTargetViewModel;
  materials: FarmingMaterialViewModel[];
  revision: string | null;
  preview: boolean;
}

export type EngineRelation = Relation;

