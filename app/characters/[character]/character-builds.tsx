"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  ExternalLink,
  Info,
  Layers,
  Repeat,
  Sparkles,
  Sword,
  Users,
  Zap,
} from "lucide-react";
import type { HydratedCharacterBuild } from "@/lib/teyvat/persistence/builds";

function getTierBadgeClass(tier: string) {
  switch (tier) {
    case "BiS":
      return "bg-amber-500/20 text-amber-300 border-amber-500/40";
    case "Alternative":
      return "bg-sky-500/20 text-sky-300 border-sky-500/40";
    case "F2P":
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    default:
      return "bg-purple-500/20 text-purple-300 border-purple-500/40";
  }
}

export function CharacterBuildsSection({
  builds,
  characterName,
}: {
  builds: HydratedCharacterBuild[];
  characterName: string;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!builds || builds.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[var(--surface-sunken)] p-8 text-center text-[var(--text-muted)]">
        <Info className="mx-auto mb-3 opacity-60" size={28} />
        <p className="font-semibold text-white">No build recommendations published yet for {characterName}.</p>
        <p className="text-xs mt-1 text-[var(--text-muted)]">
          Build guides are curated according to theorycrafting standards and verified against authoritative game entities.
        </p>
      </div>
    );
  }

  const currentBuild = builds[selectedIndex] || builds[0];

  return (
    <div className="space-y-6">
      {/* Role Selection Tabs (when multiple builds exist) */}
      {builds.length > 1 && (
        <div className="flex flex-wrap gap-2 p-1.5 bg-[var(--surface-sunken)] border border-white/10 rounded-2xl">
          {builds.map((b, idx) => (
            <button
              key={b.id}
              onClick={() => setSelectedIndex(idx)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                selectedIndex === idx
                  ? "bg-[var(--accent)] text-black shadow-md font-bold"
                  : "text-[var(--text-muted)] hover:text-white hover:bg-white/5"
              }`}
            >
              <Sparkles size={14} />
              <span>{b.role}</span>
              {b.isPrimary && (
                <span
                  className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-mono ${
                    selectedIndex === idx ? "bg-black/20 text-black" : "bg-white/10 text-amber-400"
                  }`}
                >
                  Primary
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Build Overview Header Card */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[var(--surface-sunken)] via-[var(--surface)] to-black/60 p-6 md:p-7 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[var(--accent)] flex items-center gap-1">
                <Award size={13} /> {currentBuild.role}
              </span>
              <span className="text-xs text-[var(--text-muted)]">•</span>
              <span className="text-xs text-[var(--text-muted)] font-mono">v{currentBuild.gameVersion}</span>
            </div>
            <h3 className="text-2xl font-black text-white">{currentBuild.title || `${characterName} Strategy Guide`}</h3>
          </div>

          {currentBuild.provenance && (
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] bg-black/40 border border-white/10 px-3.5 py-2 rounded-xl shrink-0 self-start md:self-auto">
              <span>Source:</span>
              <strong className="text-white font-medium">{currentBuild.provenance.source}</strong>
              {currentBuild.provenance.url && (
                <a
                  href={currentBuild.provenance.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                >
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          )}
        </div>

        {currentBuild.playstyle && (
          <p className="text-sm text-[var(--text-muted)] leading-relaxed mt-4">
            {currentBuild.playstyle}
          </p>
        )}
      </div>

      {/* Grid Layout: Equipment (Weapons & Artifacts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weapons Ranking */}
        <div className="rounded-2xl border border-white/10 bg-[var(--surface)] p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h4 className="font-bold text-white flex items-center gap-2 text-base">
              <Sword size={18} className="text-amber-400" />
              Recommended Weapons
            </h4>
            <span className="text-xs text-[var(--text-muted)] font-mono">Ranked by synergy</span>
          </div>

          <div className="space-y-3">
            {currentBuild.weapons.map((w) => (
              <div
                key={w.weaponSlug}
                className="group flex items-start gap-4 p-3.5 rounded-xl bg-black/30 border border-white/5 hover:border-[var(--accent)]/40 transition-all"
              >
                {/* Rank number */}
                <div className="w-6 text-center font-mono font-black text-sm text-[var(--text-muted)] pt-1">
                  #{w.rank}
                </div>

                {/* Weapon icon */}
                <div className="w-14 h-14 rounded-lg bg-black/60 border border-white/10 relative overflow-hidden flex items-center justify-center p-1.5 shrink-0 group-hover:border-[var(--accent)] transition-colors">
                  {w.entity?.image ? (
                    <Image
                      src={w.entity.image}
                      alt={w.entity.name}
                      width={50}
                      height={50}
                      className="object-contain drop-shadow"
                    />
                  ) : (
                    <Sword size={22} className="text-[var(--text-muted)]" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getTierBadgeClass(w.tier)}`}>
                      {w.tier}
                    </span>
                    {w.refinement && (
                      <span className="text-[11px] font-mono text-[var(--text-muted)] bg-white/5 px-1.5 py-0.5 rounded">
                        {w.refinement}
                      </span>
                    )}
                    {w.entity?.rarity && (
                      <span className="text-amber-400 text-xs font-mono">
                        {"✦".repeat(w.entity.rarity)}
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/database/weapons/${w.weaponSlug}`}
                    className="font-bold text-sm text-white group-hover:text-[var(--accent)] transition-colors flex items-center gap-1.5"
                  >
                    <span>{w.entity?.name || w.weaponSlug}</span>
                    <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>

                  {w.notes && (
                    <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2 leading-relaxed">
                      {w.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Artifacts & Stat Priorities */}
        <div className="rounded-2xl border border-white/10 bg-[var(--surface)] p-6 space-y-5 shadow-lg flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h4 className="font-bold text-white flex items-center gap-2 text-base">
                <Layers size={18} className="text-purple-400" />
                Artifact Sets
              </h4>
              <span className="text-xs text-[var(--text-muted)] font-mono">Best-in-Slot</span>
            </div>

            <div className="space-y-3">
              {currentBuild.artifacts.map((a) => (
                <div
                  key={a.rank}
                  className="p-3.5 rounded-xl bg-black/30 border border-white/5 hover:border-purple-500/30 transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Rank #{a.rank}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {a.sets.map((s) => (
                      <Link
                        key={s.artifactSlug}
                        href={`/database/artifacts/${s.artifactSlug}`}
                        className="group flex items-center gap-2.5 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 rounded-xl transition-all"
                      >
                        <div className="w-9 h-9 rounded-lg bg-black/60 relative overflow-hidden flex items-center justify-center p-1 border border-white/10 shrink-0">
                          {s.entity?.image ? (
                            <Image
                              src={s.entity.image}
                              alt={s.entity.name}
                              width={32}
                              height={32}
                              className="object-contain"
                            />
                          ) : (
                            <Layers size={16} className="text-purple-400" />
                          )}
                        </div>
                        <div>
                          <span className="text-xs font-mono font-bold text-purple-300 mr-1.5">
                            {s.pieces}pc
                          </span>
                          <span className="text-xs font-bold text-white group-hover:text-[var(--accent)] transition-colors">
                            {s.entity?.name || s.artifactSlug}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {a.notes && (
                    <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
                      {a.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Main Stats Summary */}
          <div className="border-t border-white/10 pt-4 space-y-3">
            <h5 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider font-mono">
              Recommended Main Stats
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                <span className="text-[11px] text-[var(--text-muted)] font-mono block mb-1">⏳ Sands</span>
                <div className="text-xs font-bold text-white space-y-0.5">
                  {currentBuild.mainStats.sands.map((s) => (
                    <div key={s}>{s}</div>
                  ))}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                <span className="text-[11px] text-[var(--text-muted)] font-mono block mb-1">🍷 Goblet</span>
                <div className="text-xs font-bold text-white space-y-0.5">
                  {currentBuild.mainStats.goblet.map((g) => (
                    <div key={g}>{g}</div>
                  ))}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                <span className="text-[11px] text-[var(--text-muted)] font-mono block mb-1">👑 Circlet</span>
                <div className="text-xs font-bold text-white space-y-0.5">
                  {currentBuild.mainStats.circlet.map((c) => (
                    <div key={c}>{c}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Substat Priorities & Stat Targets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Substats */}
        <div className="rounded-2xl border border-white/10 bg-[var(--surface)] p-6 space-y-4 shadow-lg">
          <h4 className="font-bold text-white flex items-center gap-2 text-base">
            <Sparkles size={18} className="text-teal-400" />
            Substat Priority
          </h4>
          <ol className="space-y-2">
            {currentBuild.substatPriority.map((stat, idx) => (
              <li
                key={stat}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-black/30 border border-white/5 text-xs text-white"
              >
                <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 font-mono font-bold flex items-center justify-center text-[10px] shrink-0 border border-teal-500/30">
                  {idx + 1}
                </span>
                <span className="font-medium">{stat}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Target Benchmarks & Talent Priority */}
        <div className="rounded-2xl border border-white/10 bg-[var(--surface)] p-6 space-y-5 shadow-lg">
          {/* Target Benchmarks */}
          {Object.keys(currentBuild.statTargets).length > 0 && (
            <div className="space-y-3">
              <h4 className="font-bold text-white flex items-center gap-2 text-base">
                <Zap size={18} className="text-amber-400" />
                Stat Benchmarks
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {Object.entries(currentBuild.statTargets).map(([key, val]) => (
                  <div key={key} className="p-3 rounded-xl bg-black/30 border border-white/5">
                    <span className="text-[11px] font-mono text-[var(--text-muted)] block mb-0.5">{key}</span>
                    <strong className="text-xs font-bold text-white block">{val}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Talent Priority */}
          <div className="space-y-3">
            <h4 className="font-bold text-white flex items-center gap-2 text-base">
              <BookOpen size={18} className="text-sky-400" />
              Talent Upgrade Priority
            </h4>
            <div className="space-y-2">
              {currentBuild.talentPriority.map((talent, idx) => (
                <div
                  key={talent}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-black/30 border border-white/5 text-xs text-white"
                >
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 font-mono font-bold flex items-center justify-center text-[10px] shrink-0 border border-sky-500/30">
                    {idx + 1}
                  </span>
                  <span className="font-medium">{talent}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Team Compositions */}
      {currentBuild.teams.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-[var(--surface)] p-6 space-y-5 shadow-lg">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h4 className="font-bold text-white flex items-center gap-2 text-base">
              <Users size={18} className="text-cyan-400" />
              Recommended Team Compositions
            </h4>
            <span className="text-xs text-[var(--text-muted)] font-mono">Synergy lineups</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {currentBuild.teams.map((team) => (
              <div
                key={team.name}
                className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4"
              >
                <div>
                  <h5 className="font-bold text-base text-white">{team.name}</h5>
                  {team.description && (
                    <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                      {team.description}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {team.members.map((member) => (
                    <div
                      key={member.characterSlug}
                      className="flex flex-col items-center text-center p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 transition-all group"
                    >
                      <Link
                        href={`/characters/${member.characterSlug}`}
                        className="w-14 h-14 rounded-full bg-black/60 relative overflow-hidden border border-white/10 group-hover:border-[var(--accent)] transition-colors mb-2"
                      >
                        {member.entity?.image ? (
                          <Image
                            src={member.entity.image}
                            alt={member.entity.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center text-xs font-bold font-mono">
                            {member.characterSlug.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </Link>

                      <Link
                        href={`/characters/${member.characterSlug}`}
                        className="text-xs font-bold text-white group-hover:text-[var(--accent)] transition-colors line-clamp-1"
                      >
                        {member.entity?.name || member.characterSlug}
                      </Link>

                      <span className="text-[10px] text-[var(--text-muted)] mt-0.5 line-clamp-1">
                        {member.role}
                      </span>

                      {member.alternatives && member.alternatives.length > 0 && (
                        <span className="text-[9px] text-sky-300/80 font-mono mt-1">
                          Alt: {member.alternatives.join(", ")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Combat Rotations */}
      {currentBuild.rotationGuide.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-[var(--surface)] p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h4 className="font-bold text-white flex items-center gap-2 text-base">
              <Repeat size={18} className="text-emerald-400" />
              Skill Rotation Sequence
            </h4>
            <span className="text-xs text-[var(--text-muted)] font-mono">Optimal buff alignment</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {currentBuild.rotationGuide.map((step, idx) => (
              <div
                key={idx}
                className="relative p-4 rounded-xl bg-black/40 border border-white/5 flex flex-col justify-between space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded border border-[var(--accent)]/30">
                    Step {idx + 1}
                  </span>
                  <span className="text-xs font-bold text-white">{step.actor}</span>
                </div>

                <div className="text-xs font-bold text-emerald-300 font-mono">
                  {step.action}
                </div>

                {step.notes && (
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                    {step.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Author / Theorycrafting Notes */}
      {currentBuild.authorNotes && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200/90 leading-relaxed flex items-start gap-3">
          <Info size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-amber-300 block mb-0.5">Theorycrafting Note:</strong>
            {currentBuild.authorNotes}
          </div>
        </div>
      )}
    </div>
  );
}
