"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "../_components/navigation";
import type { LoreDocumentViewModel, LoreOverviewResult, LoreBookDetailViewModel } from "@/lib/teyvat/domain/lore";

interface LoreConsoleProps {
  overview: LoreOverviewResult;
  initialItems: LoreDocumentViewModel[];
}

export function LoreConsole({ overview, initialItems }: LoreConsoleProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [items, setItems] = useState<LoreDocumentViewModel[]>(initialItems);
  const [selectedBook, setSelectedBook] = useState<LoreBookDetailViewModel | null>(null);
  const [activeVolumeIndex, setActiveVolumeIndex] = useState<number>(0);
  const [readingDoc, setReadingDoc] = useState<LoreDocumentViewModel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [, startTransition] = useTransition();

  const handleSearch = async (query: string, category: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (category && category !== "all") params.set("category", category);
      params.set("limit", "30");

      const res = await fetch(`/api/v1/lore/search?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        startTransition(() => {
          setItems(data.items || []);
        });
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    handleSearch(searchQuery, cat);
  };

  const handleOpenBook = async (slug: string) => {
    try {
      const res = await fetch(`/api/v1/lore/books/${slug}`);
      if (res.ok) {
        const bookData = await res.json();
        setSelectedBook(bookData);
        setActiveVolumeIndex(0);
      }
    } catch {
      // fallback
    }
  };

  const categories = [
    { id: "all", label: "All Lore", count: overview.totalDocuments },
    { id: "book", label: "In-Game Books", count: overview.bookVolumeCount },
    { id: "artifact", label: "Artifact Lore", count: overview.artifactStoryCount },
    { id: "weapon", label: "Weapon Legends", count: overview.weaponLoreCount },
    { id: "monster", label: "Bestiary Lore", count: overview.monsterLoreCount },
    { id: "character", label: "Character Profiles", count: overview.characterProfileCount },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Overview Stat Cards */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" aria-label="Lore telemetry">
        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-xl p-4 flex flex-col gap-1">
          <span className="text-xs font-mono text-[var(--text-3)] uppercase tracking-wider">Book Volumes</span>
          <strong className="text-2xl font-bold text-[var(--gold)]">{overview.bookVolumeCount}</strong>
          <span className="text-[11px] text-[var(--text-2)]">{overview.bookCount} distinct titles</span>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-xl p-4 flex flex-col gap-1">
          <span className="text-xs font-mono text-[var(--text-3)] uppercase tracking-wider">Relic Stories</span>
          <strong className="text-2xl font-bold text-[var(--green)]">{overview.artifactStoryCount}</strong>
          <span className="text-[11px] text-[var(--text-2)]">Artifact set lore</span>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-xl p-4 flex flex-col gap-1">
          <span className="text-xs font-mono text-[var(--text-3)] uppercase tracking-wider">Weapon Legends</span>
          <strong className="text-2xl font-bold text-sky-400">{overview.weaponLoreCount}</strong>
          <span className="text-[11px] text-[var(--text-2)]">Weapon histories</span>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-xl p-4 flex flex-col gap-1">
          <span className="text-xs font-mono text-[var(--text-3)] uppercase tracking-wider">Bestiary Lore</span>
          <strong className="text-2xl font-bold text-rose-400">{overview.monsterLoreCount}</strong>
          <span className="text-[11px] text-[var(--text-2)]">Bosses & automatons</span>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-xl p-4 flex flex-col gap-1">
          <span className="text-xs font-mono text-[var(--text-3)] uppercase tracking-wider">Cast Profiles</span>
          <strong className="text-2xl font-bold text-amber-300">{overview.characterProfileCount}</strong>
          <span className="text-[11px] text-[var(--text-2)]">Character chronicles</span>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-xl p-4 flex flex-col gap-1">
          <span className="text-xs font-mono text-[var(--text-3)] uppercase tracking-wider">Revision</span>
          <strong className="text-sm font-mono text-[var(--green-2)] truncate mt-1">
            {overview.revision.slice(0, 8)}
          </strong>
          <span className="text-[10px] font-mono text-[var(--text-3)]">Phase 1 Lore Index</span>
        </div>
      </section>

      {/* AI Reasoning & Retrieval Disclaimer Notice */}
      <section className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 md:p-5 flex items-start gap-3.5">
        <span className="text-xl shrink-0 mt-0.5">⚠️</span>
        <div className="flex flex-col gap-1 text-xs">
          <strong className="text-amber-400 font-mono uppercase tracking-wider text-xs">
            System Notice: Deterministic Entity & Document Search Only (No AI Reasoning)
          </strong>
          <p className="text-[var(--text-2)] leading-relaxed m-0">
            Autonomous generative AI inference, synthesis, and reasoning capabilities are <strong>currently not active</strong>. The Lore Engine operates exclusively as a deterministic lexical search index over canonical in-game book volumes, artifact histories, weapon legends, and monster profiles. Results provide verbatim source evidence for human readers and AI agents.
          </p>
        </div>
      </section>

      {/* Search & Category Filter Controls */}
      <section className="bg-[var(--surface)] border border-[var(--line)] rounded-xl p-5 md:p-6 flex flex-col gap-5 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleSearch(e.target.value, activeCategory);
              }}
              placeholder="Search lore by keyword, ancient god, book title, weapon legend, or historical event..."
              className="w-full bg-[#0a110f] border border-[var(--line-strong)] focus:border-[var(--green)] rounded-lg px-4 py-3 text-sm text-[var(--text)] placeholder-[var(--text-3)] outline-none transition-colors"
            />
            {isLoading && (
              <span className="absolute right-3.5 top-3.5 text-xs font-mono text-[var(--green)] animate-pulse">
                Searching...
              </span>
            )}
          </div>
        </div>

        {/* Categories Tabs */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-[var(--line)] items-center">
          <span className="text-xs font-mono text-[var(--text-3)] uppercase tracking-wider mr-2">Category:</span>
          {categories.map((cat) => (
            <button
              type="button"
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`text-xs font-medium px-3.5 py-1.5 rounded-lg border transition-all flex items-center gap-2 cursor-pointer ${
                activeCategory === cat.id
                  ? "bg-[rgba(98,213,163,0.15)] text-[var(--green)] border-[rgba(98,213,163,0.4)] shadow-sm"
                  : "bg-[var(--surface-2)] text-[var(--text-2)] border-[var(--line)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]"
              }`}
            >
              <span>{cat.label}</span>
              <span className="text-[10px] font-mono opacity-70 bg-black/30 px-1.5 py-0.5 rounded">
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Results Grid */}
      <section className="flex flex-col gap-4" aria-label="Lore documents result">
        <div className="flex items-center justify-between text-xs text-[var(--text-3)] font-mono px-1">
          <span>Showing {items.length} records</span>
          <span>Source: Teyvat Knowledge Projection</span>
        </div>

        {items.length === 0 ? (
          <div className="bg-[var(--surface)] border border-[var(--line)] rounded-xl p-12 text-center flex flex-col items-center justify-center gap-3">
            <span className="text-3xl">📜</span>
            <strong className="text-base text-[var(--text)]">No lore records found</strong>
            <p className="text-xs text-[var(--text-2)] max-w-md m-0">
              Try searching for terms like &quot;Dandelion Sea&quot;, &quot;Gunnhildr&quot;, &quot;Crimson Witch&quot;, &quot;Khaenri&apos;ah&quot;, or &quot;Guili Assembly&quot;.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((doc) => {
              const badgeColors: Record<string, string> = {
                book: "bg-amber-500/10 text-[var(--gold)] border-amber-500/30",
                artifact: "bg-emerald-500/10 text-[var(--green)] border-emerald-500/30",
                weapon: "bg-sky-500/10 text-sky-400 border-sky-500/30",
                monster: "bg-rose-500/10 text-rose-400 border-rose-500/30",
                character: "bg-purple-500/10 text-purple-400 border-purple-500/30",
                gcg: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
              };

              return (
                <article
                  key={doc.id}
                  className="bg-[var(--surface)] border border-[var(--line)] hover:border-[rgba(98,213,163,0.3)] rounded-xl p-5 flex flex-col justify-between gap-4 transition-all hover:translate-y-[-2px] shadow-sm group"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                          badgeColors[doc.category] || "bg-gray-500/10 text-gray-300 border-gray-500/20"
                        }`}
                      >
                        {doc.category}
                      </span>
                      {doc.volumeNumber && (
                        <span className="text-[10px] font-mono text-[var(--text-3)]">
                          Vol. {doc.volumeNumber}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {doc.icon && (
                        <div className="w-9 h-9 rounded-lg bg-[var(--surface-2)] border border-[var(--line)] relative shrink-0 overflow-hidden flex items-center justify-center p-1">
                          <Image
                            src={doc.icon}
                            alt={doc.entityName}
                            width={32}
                            height={32}
                            className="object-contain"
                          />
                        </div>
                      )}
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--text)] group-hover:text-[var(--green)] transition-colors m-0 leading-tight">
                          {doc.title}
                        </h3>
                        <span className="text-xs text-[var(--text-3)]">{doc.entityName}</span>
                      </div>
                    </div>

                    <p className="text-xs text-[var(--text-2)] leading-relaxed m-0 italic line-clamp-4">
                      &quot;{doc.snippet}&quot;
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[var(--line)] gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (doc.category === "book" && doc.entitySlug) {
                          handleOpenBook(doc.entitySlug);
                        } else {
                          setReadingDoc(doc);
                        }
                      }}
                      className="text-xs font-mono text-[var(--green-2)] hover:text-white bg-[var(--surface-2)] hover:bg-[var(--green)]/20 px-3 py-1.5 rounded-md border border-[var(--line)] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Read Text</span>
                      <Icon name="chevron" size={11} />
                    </button>

                    {doc.entitySlug && doc.entityKind && (
                      <Link
                        href={`/database/${doc.entityKind === "avatar" ? "characters" : doc.entityKind === "weapon" ? "weapons" : doc.entityKind === "reliquary" ? "artifacts" : "enemies"}`}
                        className="text-[11px] font-mono text-[var(--text-3)] hover:text-[var(--text)] transition-colors"
                      >
                        View Entity
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Book Anthology Full Reader Modal */}
      {selectedBook && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setSelectedBook(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-[var(--surface)] border border-[var(--line-strong)] rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-[var(--line)] bg-[#090f0d] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {selectedBook.icon && (
                  <div className="w-10 h-10 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] relative shrink-0 p-1 flex items-center justify-center">
                    <Image
                      src={selectedBook.icon}
                      alt={selectedBook.name}
                      width={36}
                      height={36}
                      className="object-contain"
                    />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[var(--gold)] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                      In-Game Chronicle
                    </span>
                    <span className="text-xs font-mono text-[var(--text-3)]">
                      {selectedBook.volumes.length} Volumes
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-[var(--text)] m-0 mt-0.5">
                    {selectedBook.name}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBook(null)}
                className="text-[var(--text-3)] hover:text-white p-2 rounded-lg bg-[var(--surface-2)] transition-colors cursor-pointer"
                aria-label="Close reader"
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            {/* Volume Switcher Tabs */}
            {selectedBook.volumes.length > 1 && (
              <div className="flex overflow-x-auto gap-2 p-3 bg-[#0d1613] border-b border-[var(--line)] scrollbar-none">
                {selectedBook.volumes.map((vol, idx) => (
                  <button
                    type="button"
                    key={vol.id}
                    onClick={() => setActiveVolumeIndex(idx)}
                    className={`text-xs font-mono px-3 py-1.5 rounded-lg shrink-0 transition-all cursor-pointer ${
                      activeVolumeIndex === idx
                        ? "bg-[var(--green)] text-black font-bold shadow-sm"
                        : "bg-[var(--surface-2)] text-[var(--text-2)] hover:bg-[var(--surface-3)]"
                    }`}
                  >
                    Volume {vol.volumeNumber}
                  </button>
                ))}
              </div>
            )}

            {/* Volume Reader Content Body */}
            <div className="p-6 md:p-8 overflow-y-auto flex flex-col gap-4 text-sm leading-relaxed text-[var(--text)] bg-[#0a110f]">
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                <span className="text-xs font-mono text-[var(--gold)] uppercase font-bold tracking-wider">
                  {selectedBook.volumes[activeVolumeIndex]?.title || "Full Chronicle"}
                </span>
                <span className="text-[11px] font-mono text-[var(--text-3)]">
                  Canonical Archive Evidence
                </span>
              </div>

              <div className="whitespace-pre-line text-sm text-[var(--text-2)] leading-relaxed font-sans pt-2">
                {selectedBook.volumes[activeVolumeIndex]?.content
                  ?.replace(/\\n/g, "\n")
                  .replace(/\\"/g, '"') || "No text available for this volume."}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Single Document Modal */}
      {readingDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setReadingDoc(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-[var(--surface)] border border-[var(--line-strong)] rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[var(--line)] bg-[#090f0d] flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono text-[var(--green)] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  {readingDoc.category} Lore
                </span>
                <h2 className="text-lg font-bold text-[var(--text)] m-0 mt-1">
                  {readingDoc.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setReadingDoc(null)}
                className="text-[var(--text-3)] hover:text-white p-2 rounded-lg bg-[var(--surface-2)] transition-colors cursor-pointer"
                aria-label="Close reader"
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto flex flex-col gap-4 text-sm leading-relaxed text-[var(--text-2)] bg-[#0a110f]">
              <div className="whitespace-pre-line text-sm text-[var(--text-2)] leading-relaxed font-sans">
                {readingDoc.content.replace(/\\n/g, "\n").replace(/\\"/g, '"')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
