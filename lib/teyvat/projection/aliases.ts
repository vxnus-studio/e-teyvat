import type { Alias, Entity } from "@vxnus/e";
import { hashId } from "./identity.ts";
import { structuredAliases } from "./names.ts";
import type { CanonicalRecord } from "./types.ts";

export function projectAliases(records: CanonicalRecord[], entities: Map<string, Entity>): Alias[] {
  const aliases: Alias[] = [];
  for (const record of [...records].sort((a, b) => `${a.category}:${a.id}`.localeCompare(`${b.category}:${b.id}`))) {
    const entity = entities.get(`${record.category}:${String(record.id)}`);
    if (!entity) continue;
    for (const alias of structuredAliases(record, entity.name).sort()) {
      aliases.push({ id: hashId("genshin:alias", `${entity.id}\0${alias}`), entityId: entity.id, alias });
    }
  }
  return aliases.sort((a, b) => a.id.localeCompare(b.id));
}
