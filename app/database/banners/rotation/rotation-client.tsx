"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, CalendarDays, ChevronDown, Filter, Orbit, Search, Sparkles, Sword } from "lucide-react";
import { CharacterPortrait } from "../banner-visuals";

export interface TimelineCharacter {
  slug: string;
  name: string;
  rarity: number;
  imageUrl: string | null;
}

export interface TimelineWeapon {
  slug: string;
  name: string;
  rarity: number;
  imageUrl: string | null;
}

export interface TimelinePhase {
  id: string;
  phaseKey: string;
  version: string;
  phaseNumber: number;
  sequenceIndex: number;
  startDate: string | null;
  endDate: string | null;
  status: "active" | "upcoming" | "completed";
  characters: TimelineCharacter[];
  weapons?: TimelineWeapon[];
}

const ERAS = [
  { id: "all", label: "All Phases", filter: () => true },
  { id: "7.x", label: "7.x (Snezhnaya)", filter: (p: TimelinePhase) => p.version.startsWith("7.") },
  { id: "luna", label: "Luna Era (6.x)", filter: (p: TimelinePhase) => p.version.startsWith("Luna") },
  { id: "5.x", label: "5.x (Natlan)", filter: (p: TimelinePhase) => p.version.startsWith("5.") },
  { id: "4.x", label: "4.x (Fontaine)", filter: (p: TimelinePhase) => p.version.startsWith("4.") },
  { id: "3.x", label: "3.x (Sumeru)", filter: (p: TimelinePhase) => p.version.startsWith("3.") },
  { id: "2.x", label: "2.x (Inazuma)", filter: (p: TimelinePhase) => p.version.startsWith("2.") },
  { id: "1.x", label: "1.x (Mondstadt/Liyue)", filter: (p: TimelinePhase) => p.version.startsWith("1.") },
] as const;

export function RotationClient({ allPhases }: { allPhases: TimelinePhase[] }) {
  const [selectedEra, setSelectedEra] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [displayCount, setDisplayCount] = useState<number>(20);

  const eraFiltered = useMemo(() => {
    const era = ERAS.find((e) => e.id === selectedEra) ?? ERAS[0];
    return allPhases.filter(era.filter);
  }, [allPhases, selectedEra]);

  const finalFiltered = useMemo(() => {
    if (!searchQuery.trim()) return eraFiltered;
    const q = searchQuery.toLowerCase().trim();
    return eraFiltered.filter((phase) => {
      const matchVersion = phase.version.toLowerCase().includes(q) || phase.phaseKey.toLowerCase().includes(q);
      const matchChar = phase.characters.some((c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q));
      const matchWeapon = phase.weapons?.some((w) => w.name.toLowerCase().includes(q) || w.slug.toLowerCase().includes(q));
      return matchVersion || matchChar || matchWeapon;
    });
  }, [eraFiltered, searchQuery]);

  const displayedPhases = useMemo(() => {
    return finalFiltered.slice(0, displayCount);
  }, [finalFiltered, displayCount]);

  const hasMore = displayedPhases.length < finalFiltered.length;

  const handleEraChange = (eraId: string) => {
    setSelectedEra(eraId);
    setDisplayCount(20);
  };

  const formatDate = (d: string | null, fallback: string) => {
    if (!d) return fallback;
    const date = new Date(d);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="banner-rotation-view">
      {/* Header Banner */}
      <section className="rotation-hero">
        <Link className="banner-back-link" href="/database/banners">
          <ArrowLeft size={13} /> Return to observatory
        </Link>
        <span className="banner-kicker">
          <Orbit size={13} /> Complete Timeline Archive
        </span>
        <h1>Banner Rotation History</h1>
        <p>
          Explore historical character and weapon event wish transmissions across all Genshin Impact versions.
        </p>
      </section>

      {/* Filter and Search Bar */}
      <div className="timeline-filter-toolbar bg-[var(--surface)] border border-white/10 rounded-2xl p-4 mb-8 flex flex-col gap-4 shadow-md">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)]">
            <Filter size={14} className="text-[var(--accent)]" />
            <span>Filter by game version / continent:</span>
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="search"
              placeholder="Search character, weapon or version..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setDisplayCount(20);
              }}
              className="w-full bg-[var(--surface-sunken)] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-[var(--text-light)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>

        {/* Era Tabs */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {ERAS.map((era) => {
            const isSelected = selectedEra === era.id;
            const count = era.id === "all" ? allPhases.length : allPhases.filter(era.filter).length;
            return (
              <button
                key={era.id}
                onClick={() => handleEraChange(era.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-[var(--accent)] text-[var(--surface-sunken)] font-semibold shadow-[0_0_12px_rgba(98,213,163,0.3)]"
                    : "bg-[var(--surface-sunken)] text-[var(--text-muted)] hover:text-[var(--text-light)] hover:border-white/20 border border-white/5"
                }`}
              >
                <span>{era.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? "bg-black/20 text-[var(--surface-sunken)] font-bold" : "bg-white/5 text-[var(--text-muted)]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Phase Timeline Feed */}
      <section className="phase-timeline">
        {displayedPhases.map((phase) => {
          const fiveStars = phase.characters.filter((character) => character.rarity === 5);
          const fourStars = phase.characters.filter((character) => character.rarity === 4);
          const fiveStarWeapons = phase.weapons?.filter((w) => w.rarity === 5) ?? [];
          const fourStarWeapons = phase.weapons?.filter((w) => w.rarity === 4) ?? [];

          return (
            <article className={`phase-record ${phase.status === "active" ? "is-active" : ""}`} key={phase.id}>
              <div className="timeline-node">
                <span>{String(phase.sequenceIndex).padStart(2, "0")}</span>
              </div>
              <div className="phase-card">
                <header>
                  <div className="phase-version">
                    <span>SEQ / {String(phase.sequenceIndex).padStart(3, "0")}</span>
                    <h2>
                      Version {phase.version} <em>Phase {phase.phaseNumber}</em>
                    </h2>
                  </div>
                  <div className="phase-date">
                    <CalendarDays size={14} />
                    <span>
                      {formatDate(phase.startDate, "Unknown")}
                      <i>→</i>
                      {formatDate(phase.endDate, "Open")}
                    </span>
                  </div>
                  <span className={`phase-status status-${phase.status}`}>{phase.status}</span>
                </header>

                <div className="phase-lineup">
                  {/* Five-Star Characters */}
                  <div className="phase-five-stars">
                    {fiveStars.map((character) => (
                      <Link href={`/characters/${character.slug}/banner-history`} key={character.slug}>
                        <CharacterPortrait
                          slug={character.slug}
                          name={character.name}
                          imageUrl={character.imageUrl}
                          sizes="130px"
                        />
                        <span>
                          <small>✦ 5-star feature</small>
                          <strong>{character.name}</strong>
                        </span>
                      </Link>
                    ))}
                    {!fiveStars.length && <span className="phase-no-data">No five-star record</span>}
                  </div>

                  {/* Four-Star Characters */}
                  <div className="phase-four-stars">
                    <span className="roster-label">4-star characters</span>
                    <div>
                      {fourStars.map((character) => (
                        <Link href={`/characters/${character.slug}/banner-history`} key={character.slug}>
                          <CharacterPortrait
                            slug={character.slug}
                            name={character.name}
                            imageUrl={character.imageUrl}
                            sizes="38px"
                          />
                          <span>{character.name}</span>
                          <ArrowRight size={10} />
                        </Link>
                      ))}
                      {!fourStars.length && <span className="text-xs text-[var(--text-muted)]">Standard 4-stars</span>}
                    </div>
                  </div>
                </div>

                {/* Weapons in this Phase */}
                {fiveStarWeapons.length > 0 && (
                  <div className="border-t border-white/5 pt-3 mt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Sword size={12} className="text-amber-400" />
                      <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                        Epitome Invocation Weapons
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {fiveStarWeapons.map((weapon) => (
                        <Link
                          href={`/database/weapons/${weapon.slug}`}
                          key={weapon.slug}
                          className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 hover:border-amber-400 rounded-lg px-2.5 py-1 text-xs text-amber-200 transition-all hover:scale-105"
                        >
                          <span className="text-amber-400 text-[10px]">✦✦✦✦✦</span>
                          <strong className="font-semibold">{weapon.name}</strong>
                        </Link>
                      ))}
                      {fourStarWeapons.map((weapon) => (
                        <Link
                          href={`/database/weapons/${weapon.slug}`}
                          key={weapon.slug}
                          className="inline-flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 hover:border-purple-400 rounded-lg px-2 py-1 text-xs text-purple-200 transition-all"
                        >
                          <span className="text-purple-300 text-[10px]">✦✦✦✦</span>
                          <span>{weapon.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </article>
          );
        })}

        {displayedPhases.length === 0 && (
          <div className="p-12 text-center text-sm text-[var(--text-muted)] bg-[var(--surface-raised)] border border-white/5 rounded-xl">
            No banner phases found matching the selected criteria.
          </div>
        )}
      </section>

      {/* Load More & Pagination Controls */}
      {hasMore && (
        <div className="flex flex-col items-center justify-center gap-3 my-8 pt-4">
          <p className="text-xs text-[var(--text-muted)] font-mono">
            Showing <strong className="text-[var(--text-light)]">{displayedPhases.length}</strong> of{" "}
            <strong className="text-[var(--text-light)]">{finalFiltered.length}</strong> phases
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDisplayCount((prev) => Math.min(prev + 20, finalFiltered.length))}
              className="px-6 py-2.5 rounded-xl bg-[var(--surface-raised)] border border-white/10 hover:border-[var(--accent)] text-xs font-semibold text-[var(--text-light)] hover:text-[var(--accent)] transition-all flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <ChevronDown size={14} />
              <span>Load Next 20 Earlier Phases</span>
            </button>
            <button
              onClick={() => setDisplayCount(finalFiltered.length)}
              className="px-4 py-2.5 rounded-xl bg-[var(--surface-sunken)] border border-white/5 hover:border-white/20 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-light)] transition-all cursor-pointer"
            >
              Show All {finalFiltered.length}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
