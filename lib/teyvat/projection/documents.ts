import type { Document, Entity } from "@vxnus/e";
import { projectProvenance } from "./provenance.ts";
import type { CanonicalDocument, TeyvatDocumentMetadata } from "./types.ts";

const PARENT_CATEGORY: Record<string, string> = {
  avatar_story: "avatar",
  avatar_voice: "avatar",
  book_volume: "book",
  gcg_story: "gcg_card",
  relic_story: "reliquary",
};

export function projectDocuments(records: CanonicalDocument[], entities: Map<string, Entity>): { documents: Document[]; metadata: TeyvatDocumentMetadata[] } {
  const documents: Document[] = [];
  const metadata: TeyvatDocumentMetadata[] = [];
  for (const record of [...records].sort((a, b) => a.document_id.localeCompare(b.document_id))) {
    const category = PARENT_CATEGORY[record.category];
    const entityId = category ? entities.get(`${category}:${String(record.parent_id)}`)?.id : undefined;
    if (!entityId) throw new Error(`Document ${record.document_id} has no category-aware parent: ${record.category}:${record.parent_id}`);
    documents.push({ id: `genshin:document:${record.document_id}`, entityId, content: record.content ?? record.story ?? "", provenance: projectProvenance(record) });
    metadata.push({ id: record.document_id, category: record.category, parentSourceId: String(record.parent_id), title: record.title ?? "" });
  }
  return { documents, metadata };
}
