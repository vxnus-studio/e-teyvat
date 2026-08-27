"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle, ExternalLink, HelpCircle, Layers, Sparkles } from "lucide-react";

type Source = {
  type?: string;
  kind?: string;
  name: string;
  slug?: string;
  region?: string;
  availableDays?: string[];
  domainEntrance?: string | null;
};

type Material = {
  id?: string;
  name: string;
  slug?: string;
  quantity?: number | null;
  quantities?: Record<string, number>;
  phase?: string;
  sources: Source[];
  sourceNotes?: string[];
};

type FarmingResponse = {
  target: { id?: string; name: string; kind: string; slug: string };
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
    if (!target.trim()) return;
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
            placeholder="e.g. Furina, Splendor of Tranquil Waters, Lakelight Lily..."
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
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[var(--green)] text-xs font-mono tracking-widest uppercase block">
                Resolved Target ({result.target.kind})
              </span>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {result.target.name}
                {result.target.slug && (
                  <Link
                    href={`/database/${result.target.kind === "avatar" ? "characters" : result.target.kind === "weapon" ? "weapons" : result.target.kind === "material" ? "materials" : "characters"}/${result.target.slug}`}
                    className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors inline-flex items-center"
                    title="Open entity record"
                  >
                    <ExternalLink size={15} />
                  </Link>
                )}
              </h2>
            </div>
            <code className="text-xs text-[var(--text-3)] font-mono bg-black/30 px-2 py-1 rounded max-w-full truncate">
              REVISION {result.revision ? result.revision.slice(0, 16) : "PREVIEW"}…
            </code>
          </header>

          <div className="trace-flow">
            <span className="trace-node target-node font-semibold truncate">{result.target.name}</span>
            <span className="trace-arrow">requires</span>
            <span className="trace-node">{result.materials.length} material records</span>
            <span className="trace-arrow">obtained from</span>
            <span className="trace-node">
              {new Set(result.materials.flatMap((item) => item.sources.map((source) => source.name))).size} sources
            </span>
          </div>

          <div className="material-list">
            {result.materials.map((material, index) => (
              <article key={`${material.name}:${index}`} className="flex flex-col sm:flex-row gap-4 p-4">
                <span className="material-index font-mono font-bold text-sm text-[var(--accent)] shrink-0">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <h3 className="text-base font-bold text-white m-0">
                      {material.name}
                    </h3>
                    {material.quantity !== null && material.quantity !== undefined && (
                      <span className="px-2.5 py-0.5 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)] text-xs font-mono font-bold">
                        Required: ×{material.quantity}
                      </span>
                    )}
                  </div>

                  {material.phase && material.phase !== "direct" && (
                    <p className="text-xs text-[var(--text-muted)] mb-2 font-mono capitalize">
                      Relation predicate: {material.phase.replace(/_/g, " ")}
                    </p>
                  )}

                  {/* Sources List */}
                  <div className="source-list mt-2 flex flex-wrap gap-2">
                    {material.sources.map((source, sIdx) => (
                      <span
                        key={`${source.type}:${source.name}:${sIdx}`}
                        className="inline-flex flex-wrap items-center gap-1.5 bg-[var(--surface-2)] border border-white/5 rounded-lg px-2.5 py-1.5 text-xs"
                      >
                        <strong className="text-[var(--text-light)]">{source.name}</strong>
                        {source.region ? (
                          <span className="text-[var(--text-muted)]">({source.region})</span>
                        ) : null}
                        {source.availableDays && source.availableDays.length > 0 ? (
                          <span className="text-[var(--gold)] font-mono text-[11px]">
                            · {source.availableDays.join(", ")}
                          </span>
                        ) : null}
                      </span>
                    ))}
                    {material.sources.length === 0 && material.sourceNotes && material.sourceNotes.length > 0 ? (
                      <div className="text-xs text-[var(--text-muted)] flex flex-wrap gap-2">
                        {material.sourceNotes.map((note, nIdx) => (
                          <span key={nIdx} className="bg-white/5 px-2 py-1 rounded">
                            {note}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {material.sources.length === 0 && (!material.sourceNotes || material.sourceNotes.length === 0) ? (
                      <span className="text-xs text-[var(--text-3)] italic">
                        No direct drop sources recorded (World exploration / Crafting)
                      </span>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>

          {result.preview ? (
            <p className="preview-notice">
              This trace uses the bundled projection artifact. Live queries are synchronized with Neon.
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
