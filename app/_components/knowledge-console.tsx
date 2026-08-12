"use client";

import { FormEvent, useState } from "react";

type Source = {
  type?: string;
  kind?: string;
  name: string;
  region?: string;
  availableDays?: string[];
  domainEntrance?: string | null;
};

type Material = {
  id?: number;
  name: string;
  quantity?: unknown;
  quantities?: Record<string, number>;
  phase?: string;
  sources: Source[];
  sourceNotes?: unknown[];
};

type FarmingResponse = {
  target: { name: string; kind: string; slug: string };
  materials: Material[];
  revision: string | null;
  preview: boolean;
  error?: string;
};

export function KnowledgeConsole() {
  const [target, setTarget] = useState("Splendor of Tranquil Waters");
  const [result, setResult] = useState<FarmingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/farming?${new URLSearchParams({ target: target.trim() })}`,
      );
      const payload = (await response.json()) as FarmingResponse;
      if (!response.ok) throw new Error(payload.error ?? "Graph traversal failed.");
      setResult(payload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Graph traversal failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="knowledge-console">
      <form className="knowledge-question" onSubmit={submit}>
        <span>Try a multi-hop question</span>
        <label>
          <span>Where do I find materials for</span>
          <input
            onChange={(event) => setTarget(event.target.value)}
            value={target}
          />
          <span>?</span>
        </label>
        <button disabled={loading} type="submit">
          {loading ? "Tracing relations…" : "Trace the graph"}
        </button>
      </form>

      {error ? <p className="data-error">{error}</p> : null}
      {result ? (
        <section className="trace-result" aria-live="polite">
          <header>
            <div>
              <span>Resolved target</span>
              <h2>{result.target.name}</h2>
            </div>
            <code>{result.revision ?? "preview-data"}</code>
          </header>
          <div className="trace-flow">
            <span className="trace-node target-node">{result.target.name}</span>
            <span className="trace-arrow">requires</span>
            <span className="trace-node">{result.materials.length} material records</span>
            <span className="trace-arrow">obtained from</span>
            <span className="trace-node">
              {new Set(result.materials.flatMap((item) => item.sources.map((source) => source.name))).size} sources
            </span>
          </div>
          <div className="material-list">
            {result.materials.map((material, index) => (
              <article key={`${material.name}:${index}`}>
                <span className="material-index">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{material.name}</h3>
                  {material.quantity ? <p>Required quantity: {String(material.quantity)}</p> : null}
                  {material.quantities ? (
                    <p>
                      {Object.entries(material.quantities)
                        .map(([name, amount]) => `${name} ×${amount}`)
                        .join(" · ")}
                    </p>
                  ) : null}
                  <div className="source-list">
                    {material.sources.map((source) => (
                      <span key={`${source.type}:${source.name}`}>
                        <strong>{source.name}</strong>
                        {source.region ? ` · ${source.region}` : ""}
                        {source.availableDays?.length
                          ? ` · ${source.availableDays.join(", ")}`
                          : ""}
                      </span>
                    ))}
                    {material.sources.length === 0 && material.sourceNotes?.length ? (
                      <span>{material.sourceNotes.map(String).join(" · ")}</span>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
          {result.preview ? (
            <p className="preview-notice">
              This trace uses the bundled preview. After Neon is connected and the first
              sync completes, the same UI will traverse live database relations.
            </p>
          ) : null}
        </section>
      ) : (
        <div className="trace-placeholder">
          <span>01</span>
          <p>
            Resolve a target, traverse its required materials, then follow domain and
            enemy-source relations.
          </p>
        </div>
      )}
    </div>
  );
}

