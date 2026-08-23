import type { CanonicalRecord } from "./types.ts";

function localized(value: CanonicalRecord["name"] | CanonicalRecord["title"]): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object" && typeof value.en === "string" && value.en.trim()) return value.en.trim();
  return undefined;
}

export function projectName(record: CanonicalRecord): { name: string; usedFallback: boolean } {
  const candidates = [localized(record.name), localized(record.title), typeof record.route === "string" ? record.route.trim() : undefined];
  const selected = candidates.find((value): value is string => Boolean(value));
  if (selected) return { name: selected, usedFallback: false };
  return { name: `${record.category}:${String(record.id)}`, usedFallback: true };
}

export function structuredAliases(record: CanonicalRecord, name: string): string[] {
  const values = [localized(record.name), localized(record.title), typeof record.route === "string" ? record.route.trim() : undefined, name];
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}
