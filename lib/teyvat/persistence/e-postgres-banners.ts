import { and, eq, sql } from "drizzle-orm";
import { getDatabase, type Database } from "../../../db/client.ts";
import { teyvatEntities } from "../../../db/schema.ts";
import { calculateCharacterStatistics, type CharacterIntervalData } from "../../banners/statistics.ts";
import { calculatePressureAndConfidence, type PressureResult } from "../../banners/pressure-model.ts";

type JsonObject = Record<string, unknown>;

export type EBannerPhase = {
  id: string;
  phaseKey: string;
  version: string;
  phaseNumber: number;
  sequenceIndex: number;
  startDate: Date | null;
  endDate: Date | null;
  status: "completed" | "active" | "upcoming";
};

export type EBannerCharacter = {
  id: string;
  slug: string;
  name: string;
  rarity: number;
  canonicalData: JsonObject;
};

export type EBannerAppearance = EBannerCharacter & { phaseId: string; phaseKey: string; version: string; phaseNumber: number; sequenceIndex: number; startDate: Date | null; endDate: Date | null; status: EBannerPhase["status"] };
export type EBannerStatistics = Omit<CharacterIntervalData, "characterId"> & {
  characterId: string;
  pressureScore: number | null;
  pressureLevel: string | null;
  confidenceScore: number | null;
  confidenceLevel: string | null;
  reasons: PressureResult["reasons"];
  modelVersion: string;
};

type AppearanceRow = {
  subject_id: string;
  subject_slug: string;
  subject_name: string;
  subject_data: JsonObject;
  phase_id: string;
  phase_data: JsonObject;
  metadata: JsonObject;
};

function extractRows<T>(result: unknown): T[] {
  if (!result) return [];
  if (Array.isArray(result)) return result as T[];
  if (typeof result === "object" && "rows" in result && Array.isArray((result as { rows: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

function numberValue(value: unknown, fallback = 0): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function dateValue(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function phaseFromRow(row: { id: string; data: JsonObject }): EBannerPhase {
  const data = row.data;
  const startDate = dateValue(data.start_date);
  const endDate = dateValue(data.end_date);
  const now = Date.now();
  const status = startDate && startDate.valueOf() > now
    ? "upcoming"
    : endDate && endDate.valueOf() > now
      ? "active"
      : "completed";
  return {
    id: row.id,
    phaseKey: stringValue(data.phase_key),
    version: stringValue(data.version),
    phaseNumber: numberValue(data.phase_number),
    sequenceIndex: numberValue(data.sequence_index),
    startDate,
    endDate,
    status,
  };
}

function characterFromRow(row: AppearanceRow): EBannerCharacter {
  const canonical = row.metadata.canonical && typeof row.metadata.canonical === "object"
    ? row.metadata.canonical as JsonObject
    : {};
  return {
    id: row.subject_id,
    slug: row.subject_slug,
    name: row.subject_name,
    rarity: numberValue(canonical.rarity ?? row.subject_data.rarity, 4),
    canonicalData: row.subject_data,
  };
}

export class TeyvatBannerQueries {
  private readonly db: Database;

  constructor(connectionString = process.env.DATABASE_URL) {
    this.db = getDatabase(connectionString);
  }

  async close(): Promise<void> {}

  private async phases(): Promise<EBannerPhase[]> {
    const result = await this.db.execute(sql`SELECT id, data FROM teyvat_entities WHERE kind = 'banner_phase' ORDER BY (data->>'start_date') ASC, (data->>'sequence_index')::int ASC, id ASC`);
    const rows = extractRows<{ id: string; data: JsonObject }>(result);
    const parsed = rows.map(phaseFromRow);
    return parsed.sort((a, b) => {
      if (a.startDate && b.startDate) return a.startDate.getTime() - b.startDate.getTime();
      return a.sequenceIndex - b.sequenceIndex;
    });
  }

  private async appearanceRows(): Promise<AppearanceRow[]> {
    const result = await this.db.execute(sql`SELECT r.subject_id, subject.slug AS subject_slug, subject.name AS subject_name, subject.data AS subject_data, r.object_id AS phase_id, phase.data AS phase_data, r.metadata FROM teyvat_relations r JOIN teyvat_entities subject ON subject.id = r.subject_id JOIN teyvat_entities phase ON phase.id = r.object_id WHERE r.predicate = 'appeared_in' AND subject.kind = 'avatar' AND phase.kind = 'banner_phase' ORDER BY (phase.data->>'start_date') ASC, (phase.data->>'sequence_index')::int ASC, subject.name ASC`);
    return extractRows<AppearanceRow>(result);
  }

  private async dataset() {
    const [phases, rows] = await Promise.all([this.phases(), this.appearanceRows()]);
    const phaseMap = new Map(phases.map((phase) => [phase.id, phase]));
    const appearances = rows.flatMap((row) => {
      const phase = phaseMap.get(row.phase_id) ?? phaseFromRow({ id: row.phase_id, data: row.phase_data });
      const character = characterFromRow(row);
      return [{ ...character, phaseId: phase.id, phaseKey: phase.phaseKey, version: phase.version, phaseNumber: phase.phaseNumber, sequenceIndex: phase.sequenceIndex, startDate: phase.startDate, endDate: phase.endDate, status: phase.status }];
    });
    return { phases, appearances };
  }

  private statistics(appearances: EBannerAppearance[], latestSequenceIndex: number): EBannerStatistics[] {
    const ids = [...new Set(appearances.map((appearance) => appearance.id))].sort();
    const numericIds = new Map(ids.map((id, index) => [id, index + 1]));
    const byCharacter = new Map<string, number[]>();
    for (const appearance of appearances) byCharacter.set(appearance.id, [...(byCharacter.get(appearance.id) ?? []), appearance.sequenceIndex]);
    const intervalData = ids.map((id) => calculateCharacterStatistics(numericIds.get(id)!, byCharacter.get(id) ?? [], latestSequenceIndex));
    const pressure = calculatePressureAndConfidence(intervalData.filter((data) => {
      const id = ids[data.characterId - 1];
      return appearances.find((appearance) => appearance.id === id)?.rarity === 4;
    }));
    const pressureByNumber = new Map(pressure.map((item) => [item.characterId, item]));
    return intervalData.map((data) => {
      const id = ids[data.characterId - 1];
      const result = pressureByNumber.get(data.characterId);
      return { ...data, pressureScore: result?.pressureScore ?? null, pressureLevel: result?.pressureLevel ?? null, confidenceScore: result?.confidenceScore ?? null, confidenceLevel: result?.confidenceLevel ?? null, reasons: result?.reasons ?? [], characterId: id, modelVersion: "rerun-pressure-v1" };
    });
  }

  async overview() {
    const { phases, appearances } = await this.dataset();
    const currentPhase = phases.find((phase) => phase.status === "active")
      ?? phases.find((phase) => phase.status === "upcoming")
      ?? phases.at(-1)
      ?? null;
    const latestSequenceIndex = currentPhase?.sequenceIndex ?? phases.at(-1)?.sequenceIndex ?? 0;
    const statistics = this.statistics(appearances, latestSequenceIndex);
    const statsById = new Map(statistics.map((stat) => [stat.characterId, stat]));
    return { phases, appearances, statistics, statsById, currentPhase };
  }

  async pressure() {
    const data = await this.overview();
    const characters = [...data.statsById.values()]
      .filter((stat) => stat.pressureScore !== null)
      .map((stat) => ({ ...stat, character: data.appearances.find((appearance) => appearance.id === stat.characterId)! }))
      .sort((a, b) => (b.pressureScore ?? 0) - (a.pressureScore ?? 0));
    return { ...data, characters };
  }

  async character(slug: string) {
    const data = await this.overview();
    const appearances = data.appearances.filter((appearance) => appearance.slug === slug).sort((a, b) => a.sequenceIndex - b.sequenceIndex);
    let character: EBannerCharacter | EBannerAppearance | null = appearances[0] ?? null;
    if (!character) {
      const [charRow] = await this.db.select().from(teyvatEntities).where(and(eq(teyvatEntities.kind, "avatar"), eq(teyvatEntities.slug, slug))).limit(1);
      if (charRow) {
        character = {
          id: charRow.id,
          slug: charRow.slug,
          name: charRow.name,
          rarity: numberValue(charRow.data?.rarity, 4),
          canonicalData: charRow.data as JsonObject,
        };
      }
    }
    const statistics = character ? data.statsById.get(character.id) ?? null : null;
    return { ...data, character, appearances, statistics };
  }
}

let cached: Promise<TeyvatBannerQueries> | undefined;

export function getTeyvatBannerQueries(): Promise<TeyvatBannerQueries> {
  cached ??= Promise.resolve(new TeyvatBannerQueries());
  return cached;
}

export function resetTeyvatBannerQueriesForTests(): void {
  cached = undefined;
}
