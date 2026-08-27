"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Layers, Sparkles, Sword } from "lucide-react";

export interface MaterialItem {
  id: string;
  slug: string;
  name: string;
  kind: string;
  image?: string | null;
  count: number;
}

export interface AscensionPhase {
  phase: number;
  levelRange: string;
  mora: number;
  materials: MaterialItem[];
}

export interface TalentLevel {
  level: number;
  levelText: string;
  materials: MaterialItem[];
}

interface ProgressionCalculatorProps {
  ascensionPhases: AscensionPhase[];
  totalAscensionMaterials: MaterialItem[];
  talentLevels?: TalentLevel[];
  totalTalentMaterials?: MaterialItem[];
  titlePrefix?: string;
}

export function ProgressionCalculator({
  ascensionPhases,
  totalAscensionMaterials,
  talentLevels = [],
  totalTalentMaterials = [],
  titlePrefix = "Character",
}: ProgressionCalculatorProps) {
  const hasTalents = talentLevels.length > 0 && totalTalentMaterials.length > 0;
  const [activeTab, setActiveTab] = useState<"ascension" | "talents">("ascension");
  const [selectedAscPhase, setSelectedAscPhase] = useState<number | "all">("all");
  const [selectedTalentLevel, setSelectedTalentLevel] = useState<number | "all">("all");

  const displayedAscMaterials =
    selectedAscPhase === "all"
      ? totalAscensionMaterials
      : ascensionPhases.find((p) => p.phase === selectedAscPhase)?.materials ?? [];

  const displayedTalentMaterials =
    selectedTalentLevel === "all"
      ? totalTalentMaterials
      : talentLevels.find((t) => t.level === selectedTalentLevel)?.materials ?? [];

  return (
    <div className="bg-[var(--surface-sunken)] border border-white/10 rounded-2xl p-5 md:p-6 mb-8 shadow-xl">
      {/* Tabs Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4 mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("ascension")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "ascension"
                ? "bg-[var(--accent)] text-black shadow-md"
                : "bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-white"
            }`}
          >
            <Layers size={15} /> {titlePrefix} Ascension (Lvl 1 → 90)
          </button>
          {hasTalents && (
            <button
              onClick={() => setActiveTab("talents")}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "talents"
                  ? "bg-[var(--accent)] text-black shadow-md"
                  : "bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-white"
              }`}
            >
              <Sword size={15} /> Talent Progression (Lvl 1 → 10)
            </button>
          )}
        </div>

        <div className="text-xs text-[var(--text-muted)] flex items-center gap-1 font-mono">
          <Sparkles size={13} className="text-[var(--accent)]" /> Exact Farming Target
        </div>
      </div>

      {activeTab === "ascension" || !hasTalents ? (
        <div>
          {/* Phase Selector Pills */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mr-1">
              Select Phase:
            </span>
            <button
              onClick={() => setSelectedAscPhase("all")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                selectedAscPhase === "all"
                  ? "bg-white/20 text-white font-bold ring-1 ring-white/30"
                  : "bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-white"
              }`}
            >
              Total (Lvl 1 → 90)
            </button>
            {ascensionPhases.map((phase) => (
              <button
                key={phase.phase}
                onClick={() => setSelectedAscPhase(phase.phase)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  selectedAscPhase === phase.phase
                    ? "bg-[var(--accent)] text-black font-bold shadow-sm"
                    : "bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-white"
                }`}
              >
                Phase {phase.phase} ({phase.levelRange})
              </button>
            ))}
          </div>

          {/* Material Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {displayedAscMaterials.map((mat) => (
              <Link
                href={`/database/materials/${mat.slug}`}
                key={mat.id}
                className="flex items-center justify-between gap-3 bg-[var(--surface)] hover:bg-[var(--surface-raised)] border border-white/5 hover:border-[var(--accent)] rounded-xl p-3.5 transition-all group hover:scale-[1.02]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-lg bg-black/40 relative overflow-hidden flex items-center justify-center p-1 border border-white/5 shrink-0">
                    {mat.image ? (
                      <Image
                        src={mat.image}
                        alt={mat.name}
                        width={40}
                        height={40}
                        className="object-contain drop-shadow"
                      />
                    ) : (
                      <span className="font-bold text-xs text-[var(--accent)]">
                        {mat.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="truncate">
                    <strong className="text-sm block text-[var(--text-light)] group-hover:text-[var(--accent)] truncate">
                      {mat.name}
                    </strong>
                    <small className="text-xs text-[var(--text-muted)] capitalize">
                      {mat.kind}
                    </small>
                  </div>
                </div>

                <div className="text-right shrink-0 pl-2">
                  <span className="text-xs text-[var(--text-muted)] block">Required</span>
                  <strong className="text-base font-extrabold text-[var(--accent)] font-mono">
                    ×{mat.count}
                  </strong>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div>
          {/* Talent Level Selector */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mr-1">
              Select Talent Rank:
            </span>
            <button
              onClick={() => setSelectedTalentLevel("all")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                selectedTalentLevel === "all"
                  ? "bg-white/20 text-white font-bold ring-1 ring-white/30"
                  : "bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-white"
              }`}
            >
              Total Single Skill (Lvl 1 → 10)
            </button>
            {talentLevels.map((lvl) => (
              <button
                key={lvl.level}
                onClick={() => setSelectedTalentLevel(lvl.level)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  selectedTalentLevel === lvl.level
                    ? "bg-[var(--accent)] text-black font-bold shadow-sm"
                    : "bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-white"
                }`}
              >
                {lvl.levelText}
              </button>
            ))}
          </div>

          {/* Material Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {displayedTalentMaterials.map((mat) => (
              <Link
                href={`/database/materials/${mat.slug}`}
                key={mat.id}
                className="flex items-center justify-between gap-3 bg-[var(--surface)] hover:bg-[var(--surface-raised)] border border-white/5 hover:border-[var(--accent)] rounded-xl p-3.5 transition-all group hover:scale-[1.02]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-lg bg-black/40 relative overflow-hidden flex items-center justify-center p-1 border border-white/5 shrink-0">
                    {mat.image ? (
                      <Image
                        src={mat.image}
                        alt={mat.name}
                        width={40}
                        height={40}
                        className="object-contain drop-shadow"
                      />
                    ) : (
                      <span className="font-bold text-xs text-[var(--accent)]">
                        {mat.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="truncate">
                    <strong className="text-sm block text-[var(--text-light)] group-hover:text-[var(--accent)] truncate">
                      {mat.name}
                    </strong>
                    <small className="text-xs text-[var(--text-muted)] capitalize">
                      {mat.kind}
                    </small>
                  </div>
                </div>

                <div className="text-right shrink-0 pl-2">
                  <span className="text-xs text-[var(--text-muted)] block">Required</span>
                  <strong className="text-base font-extrabold text-[var(--accent)] font-mono">
                    ×{mat.count}
                  </strong>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
