import { createHash } from "node:crypto";

export const EMBEDDING_DIMENSIONS = 768;

export function embeddingConfig() {
  const endpoint = process.env.TEYVAT_EMBEDDING_ENDPOINT?.trim();
  const model = process.env.TEYVAT_EMBEDDING_MODEL?.trim();
  const apiKey = process.env.TEYVAT_EMBEDDING_API_KEY?.trim();
  if (!endpoint || !model || !apiKey) return undefined;
  return { endpoint: endpoint.replace(/\/+$/, ""), model, apiKey, provider: process.env.TEYVAT_EMBEDDING_PROVIDER?.trim() || "openai-compatible" };
}

export function contentHash(content: string) {
  return createHash("sha256").update(content).digest("hex");
}

export function vectorLiteral(vector: number[]) {
  if (vector.length !== EMBEDDING_DIMENSIONS || vector.some((value) => !Number.isFinite(value))) throw new Error(`embedding must contain ${EMBEDDING_DIMENSIONS} finite numbers`);
  return `[${vector.join(",")}]`;
}

export async function embedTexts(input: string[]): Promise<number[][]> {
  const config = embeddingConfig();
  if (!config) throw new Error("embedding provider is not configured");
  const response = await fetch(`${config.endpoint}/embeddings`, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({ model: config.model, input: input.length === 1 ? input[0] : input }),
  });
  if (!response.ok) throw new Error(`embedding provider returned HTTP ${response.status}`);
  const payload = await response.json() as { data?: Array<{ index?: number; embedding?: unknown }> };
  if (!Array.isArray(payload.data) || payload.data.length !== input.length) throw new Error("embedding provider returned an invalid batch");
  return payload.data.sort((a, b) => (a.index ?? 0) - (b.index ?? 0)).map((item) => {
    if (!Array.isArray(item.embedding)) throw new Error("embedding provider returned a missing vector");
    return item.embedding.map(Number);
  });
}
