import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { sql } from "drizzle-orm";
import { getDatabase } from "../db/client.ts";
import { teyvatChunks, teyvatDatasetRevisions, teyvatEmbeddings } from "../db/schema.ts";
import { contentHash, embeddingConfig, embedTexts, vectorLiteral } from "../lib/teyvat/embeddings.ts";

const batchSize = Math.max(1, Math.min(Number(process.env.TEYVAT_EMBEDDING_BATCH_SIZE || 32), 128));
const provider = embeddingConfig();
if (!provider) throw new Error("Set TEYVAT_EMBEDDING_ENDPOINT, TEYVAT_EMBEDDING_MODEL, and TEYVAT_EMBEDDING_API_KEY before embedding.");
const database = getDatabase();
const [revision] = await database.select().from(teyvatDatasetRevisions).orderBy(sql`${teyvatDatasetRevisions.installedAt} desc`).limit(1);
if (!revision) throw new Error("No Teyvat dataset revision is installed.");
const chunks = await database.select({ id: teyvatChunks.id, content: teyvatChunks.content, contentHash: teyvatChunks.contentHash }).from(teyvatChunks).where(sql`${teyvatChunks.revision} = ${revision.revision}`);
const existing = await database.select({ chunkId: teyvatEmbeddings.chunkId, contentHash: teyvatEmbeddings.contentHash, model: teyvatEmbeddings.model }).from(teyvatEmbeddings).where(sql`${teyvatEmbeddings.revision} = ${revision.revision} and ${teyvatEmbeddings.model} = ${provider.model}`);
const existingByChunk = new Map(existing.map((row) => [row.chunkId, row]));
const pending = chunks.filter((chunk) => existingByChunk.get(chunk.id)?.contentHash !== (chunk.contentHash || contentHash(chunk.content)));
let generated = 0;
for (let offset = 0; offset < pending.length; offset += batchSize) {
  const batch = pending.slice(offset, offset + batchSize);
  const vectors = await embedTexts(batch.map((chunk) => chunk.content));
  for (let index = 0; index < batch.length; index += 1) {
    const chunk = batch[index];
    const vector = vectors[index];
    await database.execute(sql`insert into ${teyvatEmbeddings} (id, chunk_id, revision, model, provider, dimensions, content_hash, embedding) values (${`${revision.revision}:${provider.model}:${chunk.id}`}, ${chunk.id}, ${revision.revision}, ${provider.model}, ${provider.provider}, ${vector.length}, ${chunk.contentHash || contentHash(chunk.content)}, ${vectorLiteral(vector)}::vector) on conflict (chunk_id, revision, model) do update set provider = excluded.provider, dimensions = excluded.dimensions, content_hash = excluded.content_hash, embedding = excluded.embedding, created_at = now()`);
    generated += 1;
  }
  console.log(JSON.stringify({ processed: Math.min(offset + batch.length, pending.length), total: pending.length }));
}
console.log(JSON.stringify({ revision: revision.revision, model: provider.model, chunks: chunks.length, generated, skipped: chunks.length - pending.length }, null, 2));
