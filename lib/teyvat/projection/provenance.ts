import type { Provenance, TemporalSemantics } from "./types.ts";
import type { CanonicalSource, CanonicalRecord, CanonicalDocument } from "./types.ts";

function sourceOf(record: CanonicalRecord | CanonicalDocument): CanonicalSource | undefined {
  return record.source ?? undefined;
}

export function projectProvenance(record: CanonicalRecord | CanonicalDocument): Provenance | undefined {
  const source = sourceOf(record);
  if (!source?.provider) return undefined;
  return {
    provider: source.provider,
    source: source.raw_file,
    sourceId: source.endpoint,
    sourceRevision: source.source_version,
    locator: source.endpoint,
    contentHash: source.raw_sha256,
    observedAt: source.captured_at,
    extractedVia: source.resolution,
    confidence: source.resolution?.startsWith("EXACT") ? "canon" : "unverified",
  };
}

export function projectTemporal(record: CanonicalRecord): TemporalSemantics | undefined {
  const temporal = record.temporal;
  if (!temporal) return undefined;
  const result: TemporalSemantics = {
    validFrom: typeof temporal.valid_from === "string" ? temporal.valid_from : undefined,
    validUntil: typeof temporal.valid_until === "string" ? temporal.valid_until : undefined,
  };
  return Object.values(result).some(Boolean) ? result : undefined;
}
