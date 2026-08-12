"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Flame, Droplets, Wind, Zap, Snowflake, Leaf, Mountain, Star, HelpCircle } from "lucide-react";

type EntityPreview = {
  id: number;
  kind: string;
  slug: string;
  name: string;
  description: string | null;
  gameVersion: string | null;
  image: string | null;
  rarity: number | null;
  element: string | null;
};

type EntityResponse = {
  items: EntityPreview[];
  preview: boolean;
  total: number;
  page: number;
  limit: number;
};

const kindLabels: Record<string, string> = {
  characters: "Character",
  weapons: "Weapon",
  materials: "Material",
  domains: "Domain",
  artifacts: "Artifact",
  enemies: "Enemy",
  geographies: "Region",
};

function EntityImage({ entity }: { entity: EntityPreview }) {
  const [error, setError] = useState(false);
  
  if (!entity.image || error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[var(--surface-sunken)]">
        <span className="text-4xl font-bold text-[var(--accent)] opacity-20">{entity.name.slice(0, 2).toUpperCase()}</span>
      </div>
    );
  }
  
  return (
    <img 
      src={entity.image} 
      alt={entity.name} 
      onError={() => setError(true)}
      className={`w-full h-full p-2 transition-transform duration-500 group-hover:scale-110 drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)] ${entity.kind === "characters" ? "object-contain object-bottom p-0" : "object-contain"}`}
    />
  );
}

export function EntityExplorer({
  kind,
  compact = false,
}: {
  kind?: string;
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [result, setResult] = useState<EntityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  function searchParams(search: string, pageNum: number = 1) {
    const params = new URLSearchParams({ 
      limit: compact ? "12" : "24",
      page: pageNum.toString()
    });
    if (kind) params.set("kind", kind);
    if (search) params.set("q", search);
    return params;
  }

  async function load(search: string, pageNum: number = 1) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/entities?${searchParams(search, pageNum)}`);
      if (!response.ok) throw new Error("The knowledge API is unavailable.");
      setResult((await response.json()) as EntityResponse);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ 
      limit: compact ? "12" : "24",
      page: page.toString() 
    });
    if (kind) params.set("kind", kind);
    if (submittedQuery) params.set("q", submittedQuery);

    setLoading(true);
    fetch(`/api/entities?${params}`)
      .then((response) => {
        if (!response.ok) throw new Error("The knowledge API is unavailable.");
        return response.json() as Promise<EntityResponse>;
      })
      .then((payload) => {
        if (active) setResult(payload);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Search failed.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [compact, kind, page, submittedQuery]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedQuery(query);
    setPage(1); // Reset to page 1 on new search
  }

  return (
    <section className="entity-explorer" aria-busy={loading}>
      <form className="entity-search" onSubmit={submit}>
        <label>
          <span className="sr-only">
            Search {kind ? kindLabels[kind] ?? kind : "all entities"}
          </span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              kind ? `Search ${kind}…` : "Search characters, weapons, domains…"
            }
            type="search"
            value={query}
          />
        </label>
        <button type="submit">Search graph</button>
      </form>

      <div className="entity-result-meta">
        <span>
          {loading
            ? "Querying knowledge graph…"
            : `${result?.total ?? 0} ${kind ?? "entities"} shown`}
        </span>
        {result?.preview ? (
          <span className="preview-pill">Preview data · connect Neon for full results</span>
        ) : null}
      </div>

      {error ? <p className="data-error">{error}</p> : null}
      {!loading && !error && result?.items.length === 0 ? (
        <div className="empty-knowledge">
          <strong>No matching records</strong>
          <span>
            {submittedQuery
              ? `Nothing matched “${submittedQuery}”.`
              : "Run the first sync after connecting Neon."}
          </span>
        </div>
      ) : null}

      <div className="entity-grid mt-6 gap-6">
        {result?.items.map((entity) => {
          let rarityColor = "rgba(255, 255, 255, 0.1)"; // Default border
          let rarityGlow = "transparent";
          if (entity.rarity === 5) {
            rarityColor = "#d4af37";
            rarityGlow = "rgba(212, 175, 55, 0.4)";
          } else if (entity.rarity === 4) {
            rarityColor = "#a366ff";
            rarityGlow = "rgba(163, 102, 255, 0.4)";
          } else if (entity.rarity === 3) {
            rarityColor = "#4da6ff";
            rarityGlow = "rgba(77, 166, 255, 0.4)";
          }

          const getElementIcon = (element: string | null) => {
            if (!element) return null;
            const el = element.toLowerCase();
            const props = { size: 16, strokeWidth: 2.5, className: "text-white drop-shadow-md" };
            
            if (el.includes("pyro")) return <Flame {...props} color="#ff5a5a" />;
            if (el.includes("hydro")) return <Droplets {...props} color="#45b6ff" />;
            if (el.includes("anemo")) return <Wind {...props} color="#5ceda1" />;
            if (el.includes("electro")) return <Zap {...props} color="#c65df5" />;
            if (el.includes("cryo")) return <Snowflake {...props} color="#99ffff" />;
            if (el.includes("dendro")) return <Leaf {...props} color="#85cc33" />;
            if (el.includes("geo")) return <Mountain {...props} color="#ffb13b" />;
            return <HelpCircle {...props} />;
          };

          const ElementIcon = getElementIcon(entity.element);

          if (entity.kind === "characters") {
            return (
              <Link
                href={`/characters/${entity.slug}`}
                className="group relative flex flex-col rounded-xl overflow-hidden aspect-square bg-[var(--surface-sunken)] border border-white/5 transition-all duration-300 hover:-translate-y-2 col-span-1" 
                key={`${entity.kind}:${entity.id}`}
                style={{ 
                  boxShadow: `0 4px 20px -2px rgba(0,0,0,0.5), 0 0 15px ${rarityGlow}`,
                  borderBottom: `4px solid ${rarityColor}` 
                }}
              >
                <div className="absolute inset-0 z-0 bg-[var(--surface)] transition-transform duration-500 ease-out group-hover:scale-110 flex items-end justify-center">
                  {entity.image ? (
                    <img 
                      src={entity.image} 
                      alt={entity.name} 
                      className="w-full h-full object-contain object-bottom"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} 
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full font-mono text-xl text-[var(--green-2)]">
                      {entity.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                
                {/* Fade in shadow from bottom to top */}
                <div className="absolute inset-0 z-10 bg-gradient-to-t from-black via-black/40 to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-300" />
                
                {/* Element Badge */}
                {ElementIcon && (
                  <div className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-md border border-white/20 shadow-lg group-hover:bg-black/60 transition-colors" title={entity.element!}>
                    {ElementIcon}
                  </div>
                )}
                
                <div className="relative z-20 mt-auto p-4 flex flex-col justify-end h-full pointer-events-none">
                  <h2 className="text-white font-extrabold text-center text-base sm:text-lg leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wide">
                    {entity.name}
                  </h2>
                  <div className="w-8 h-0.5 bg-white/30 mx-auto mt-2 rounded-full group-hover:w-12 transition-all duration-300" style={{ backgroundColor: rarityColor }} />
                </div>
              </Link>
            );
          }

          return (
            <article 
              className="group flex flex-col rounded-xl overflow-hidden bg-[var(--surface-sunken)] border border-white/5 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] cursor-pointer h-64 sm:h-72" 
              key={`${entity.kind}:${entity.id}`}
              style={{ borderBottom: `4px solid ${rarityColor}` }}
            >
              {/* Image Area (Top ~75%) */}
              <div className="relative flex-1 bg-[var(--surface)] overflow-hidden flex items-center justify-center p-2">
                {/* Subtle Glow based on rarity */}
                <div 
                  className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity duration-500"
                  style={{ background: `radial-gradient(circle at center, ${rarityColor} 0%, transparent 70%)` }}
                />
                
                <div className="relative w-full h-full transition-transform duration-500 ease-out group-hover:scale-110 flex items-center justify-center z-10">
                  <EntityImage entity={entity} />
                </div>
                
                {/* Top-Right Element/Type Badge */}
                {ElementIcon && (
                  <div className="absolute top-2 right-2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-md border border-white/10 shadow-sm" title={entity.element!}>
                    {ElementIcon}
                  </div>
                )}

                {/* Top-Left Category Pill */}
                <div className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/5 text-xs text-white/80 font-bold uppercase tracking-widest shadow-sm">
                  {kindLabels[entity.kind] ?? entity.kind}
                </div>
              </div>
              
              {/* Text Area (Bottom ~25%) */}
              <div className="relative z-20 bg-gradient-to-b from-[var(--surface-sunken)] to-[var(--surface-raised)] border-t border-white/5 p-3 flex flex-col justify-center h-[76px] sm:h-[84px] shrink-0">
                {/* Rarity Stars */}
                {entity.rarity && (
                  <div className="flex gap-0.5 mb-1 opacity-90 justify-center">
                    {Array.from({ length: Math.min(entity.rarity, 5) }).map((_, i) => (
                      <Star key={i} size={10} fill="#ffc83d" color="#ffc83d" className="drop-shadow-sm" />
                    ))}
                  </div>
                )}
                
                {/* Name (Clamped to 2 lines) */}
                <h2 
                  className="text-white font-bold text-center text-xs sm:text-sm leading-snug line-clamp-2 drop-shadow-sm"
                  title={entity.name}
                >
                  {entity.name}
                </h2>
              </div>
            </article>
          );
        })}
      </div>

      {result && result.total > result.limit && (
        <div className="flex items-center justify-center gap-4 mt-8 pt-4 border-t border-[var(--border)]">
          <button 
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="px-4 py-2 bg-[var(--surface-raised)] border border-[var(--border)] rounded text-sm text-[var(--text-light)] disabled:opacity-50 hover:bg-[var(--surface-sunken)] transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-[var(--text-muted)]">
            Page {result.page} of {Math.ceil(result.total / result.limit)}
          </span>
          <button 
            disabled={page >= Math.ceil(result.total / result.limit)}
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 bg-[var(--surface-raised)] border border-[var(--border)] rounded text-sm text-[var(--text-light)] disabled:opacity-50 hover:bg-[var(--surface-sunken)] transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}
