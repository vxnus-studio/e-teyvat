"use client";

import { useState, useEffect } from "react";
import {
  Sword,
  Search,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Link as LinkIcon,
  X,
} from "lucide-react";

type WeaponItem = {
  id: string;
  slug: string;
  name: string;
  image: string | null;
  rarity: number;
  type: string;
};

type CharacterItem = {
  id: string;
  slug: string;
  name: string;
  image: string | null;
  rarity: number;
  element: string;
  weaponType: string;
  signatureWeapon: {
    slug: string;
    name: string;
    image: string | null;
    rarity: number;
  } | null;
};

export default function SignatureWeaponMatcherPage() {
  const [characters, setCharacters] = useState<CharacterItem[]>([]);
  const [weapons, setWeapons] = useState<WeaponItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [elementFilter, setElementFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "matched" | "unmatched">("all");
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterItem | null>(null);
  const [weaponQuery, setWeaponQuery] = useState("");
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, matched: 0 });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/signatures");
      if (res.ok) {
        const data = await res.json();
        setCharacters(data.characters || []);
        setWeapons(data.weapons || []);
        setStats({ total: data.totalCount || 0, matched: data.matchedCount || 0 });
      }
    } catch (e) {
      console.error("Failed to load signatures", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSetSignature = async (charSlug: string, weaponSlug: string | null) => {
    setSavingSlug(charSlug);
    try {
      const res = await fetch("/api/admin/signatures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterSlug: charSlug, weaponSlug }),
      });

      if (res.ok) {
        const weaponObj = weaponSlug
          ? weapons.find((w) => w.slug.toLowerCase() === weaponSlug.toLowerCase()) || null
          : null;

        setCharacters((prev) =>
          prev.map((c) =>
            c.slug.toLowerCase() === charSlug.toLowerCase()
              ? {
                  ...c,
                  signatureWeapon: weaponObj
                    ? {
                        slug: weaponObj.slug,
                        name: weaponObj.name,
                        image: weaponObj.image,
                        rarity: weaponObj.rarity,
                      }
                    : weaponSlug
                    ? { slug: weaponSlug, name: weaponSlug, image: null, rarity: 5 }
                    : null,
                }
              : c
          )
        );

        setStats((prev) => ({
          ...prev,
          matched: weaponSlug ? prev.matched + 1 : Math.max(0, prev.matched - 1),
        }));

        if (selectedCharacter?.slug === charSlug) {
          setSelectedCharacter(null);
        }
      } else {
        alert("Failed to update signature weapon link.");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving signature weapon.");
    } finally {
      setSavingSlug(null);
    }
  };

  const filteredCharacters = characters.filter((char) => {
    if (query) {
      const q = query.toLowerCase();
      if (!char.name.toLowerCase().includes(q) && !char.slug.toLowerCase().includes(q)) {
        return false;
      }
    }

    if (elementFilter !== "all" && char.element.toLowerCase() !== elementFilter.toLowerCase()) {
      return false;
    }

    const hasSignature = char.signatureWeapon !== null;
    if (statusFilter === "matched" && !hasSignature) return false;
    if (statusFilter === "unmatched" && hasSignature) return false;

    return true;
  });

  const candidateWeapons = weapons.filter((w) => {
    if (weaponQuery) {
      const q = weaponQuery.toLowerCase();
      return w.name.toLowerCase().includes(q) || w.slug.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--surface-sunken)] p-6 rounded-2xl border border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[var(--accent)] flex items-center gap-1">
              <Sword className="w-3.5 h-3.5" /> Character Armory
            </span>
          </div>
          <h1 className="text-2xl font-black text-white">Signature Weapon Matcher</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Map characters to their Best-in-Slot (BiS) signature weapons for build calculation, lore synthesis, and weapon recommendation banners.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-xs font-semibold text-[var(--text-light)] hover:bg-[var(--surface)] hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[var(--accent)]" : ""}`} />
          Refresh Registry
        </button>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border)]">
          <div className="text-[11px] font-mono uppercase text-[var(--text-muted)]">Total Playable Avatars</div>
          <div className="text-2xl font-black text-white mt-1">{stats.total}</div>
        </div>
        <div className="p-4 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border)]">
          <div className="text-[11px] font-mono uppercase text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Matched Signatures
          </div>
          <div className="text-2xl font-black text-emerald-300 mt-1">{stats.matched}</div>
        </div>
        <div className="p-4 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border)] col-span-2 sm:col-span-1">
          <div className="text-[11px] font-mono uppercase text-amber-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Missing Signatures
          </div>
          <div className="text-2xl font-black text-amber-300 mt-1">{Math.max(0, stats.total - stats.matched)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search character name or slug (e.g. Raiden Shogun, Hu Tao)..."
            className="w-full bg-[var(--surface-sunken)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>

        <select
          value={elementFilter}
          onChange={(e) => setElementFilter(e.target.value)}
          className="bg-[var(--surface-sunken)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[var(--accent)] transition-colors"
        >
          <option value="all">All Elements</option>
          <option value="pyro">Pyro</option>
          <option value="hydro">Hydro</option>
          <option value="anemo">Anemo</option>
          <option value="electro">Electro</option>
          <option value="dendro">Dendro</option>
          <option value="cryo">Cryo</option>
          <option value="geo">Geo</option>
        </select>

        <div className="flex bg-[var(--surface-sunken)] border border-[var(--border)] p-1 rounded-xl gap-1">
          {(
            [
              { id: "all", label: "All" },
              { id: "matched", label: "Matched BiS" },
              { id: "unmatched", label: "Unassigned" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === tab.id
                  ? "bg-[var(--accent)] text-black font-bold shadow-sm"
                  : "text-[var(--text-muted)] hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Characters */}
      {loading ? (
        <div className="text-center py-20 bg-[var(--surface-sunken)] rounded-2xl border border-[var(--border)]">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[var(--accent)] mb-3 opacity-80" />
          <div className="text-sm font-medium text-white">Loading character database and weapon linkages...</div>
        </div>
      ) : filteredCharacters.length === 0 ? (
        <div className="text-center py-16 bg-[var(--surface-sunken)] rounded-2xl border border-[var(--border)] text-[var(--text-muted)]">
          <Sword className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="font-semibold text-white">No characters found matching search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCharacters.map((char) => {
            const hasSig = char.signatureWeapon !== null;
            const isSaving = savingSlug === char.slug;

            return (
              <div
                key={char.id}
                className="p-4 rounded-2xl bg-[var(--surface-sunken)] border border-[var(--border)] hover:border-[rgba(98,213,163,0.3)] flex flex-col justify-between gap-4 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-[var(--surface)] border border-[var(--border)] p-1 shrink-0 overflow-hidden relative">
                      {char.image ? (
                        <img src={char.image} alt={char.name} className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-xs text-[var(--accent)]">
                          {char.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate leading-tight">{char.name}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--accent)]">
                          {char.element}
                        </span>
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">{char.slug}</span>
                      </div>
                    </div>
                  </div>

                  {hasSig ? (
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded shrink-0 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Matched
                    </span>
                  ) : (
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded shrink-0 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Missing
                    </span>
                  )}
                </div>

                {/* Linked Weapon Preview */}
                <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between gap-3">
                  {hasSig ? (
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] p-1 shrink-0">
                        {char.signatureWeapon?.image ? (
                          <img
                            src={char.signatureWeapon.image}
                            alt={char.signatureWeapon.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <Sword className="w-4 h-4 m-auto text-amber-400 mt-1.5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" /> BiS Signature
                        </div>
                        <div className="text-xs font-bold text-white truncate" title={char.signatureWeapon?.name}>
                          {char.signatureWeapon?.name}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-[var(--text-muted)] italic flex items-center gap-2">
                      <Sword className="w-4 h-4 opacity-40" />
                      No signature weapon matched yet
                    </div>
                  )}

                  {hasSig && (
                    <button
                      onClick={() => handleSetSignature(char.slug, null)}
                      disabled={isSaving}
                      title="Unlink weapon"
                      className="text-xs text-[var(--text-muted)] hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-950/30 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => {
                    setSelectedCharacter(char);
                    setWeaponQuery("");
                  }}
                  disabled={isSaving}
                  className="w-full flex items-center justify-center gap-1.5 bg-[var(--surface-raised)] hover:bg-[var(--accent)] hover:text-black border border-[var(--border)] text-[var(--text-light)] text-xs font-semibold py-2 rounded-xl transition-all disabled:opacity-50"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  {hasSig ? "Change Signature Weapon" : "Assign Signature Weapon"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for Weapon Picker */}
      {selectedCharacter && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-[var(--accent)] uppercase font-bold">Select Signature Weapon</div>
                <h3 className="text-lg font-black text-white mt-0.5">
                  Match BiS Weapon for {selectedCharacter.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCharacter(null)}
                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-raised)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-[var(--border)] bg-[var(--surface-sunken)]">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={weaponQuery}
                  onChange={(e) => setWeaponQuery(e.target.value)}
                  placeholder="Search weapon by name or slug..."
                  autoFocus
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            <div className="p-4 overflow-y-auto max-h-[50vh] grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {candidateWeapons.map((wp) => {
                const isCurrent = selectedCharacter.signatureWeapon?.slug.toLowerCase() === wp.slug.toLowerCase();
                return (
                  <button
                    key={wp.id}
                    onClick={() => handleSetSignature(selectedCharacter.slug, wp.slug)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      isCurrent
                        ? "bg-amber-500/10 border-amber-500/40 text-white"
                        : "bg-[var(--surface-sunken)] border-[var(--border)] hover:border-[var(--accent)] text-[var(--text-light)] hover:bg-[var(--surface-raised)]"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-[var(--surface)] border border-[var(--border)] p-1 shrink-0">
                        {wp.image ? (
                          <img src={wp.image} alt={wp.name} className="w-full h-full object-contain" />
                        ) : (
                          <Sword className="w-4 h-4 m-auto text-[var(--accent)] mt-2" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{wp.name}</div>
                        <div className="text-[10px] text-[var(--text-muted)] font-mono">{wp.type} • ★{wp.rarity}</div>
                      </div>
                    </div>
                    {isCurrent && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-sunken)] flex justify-end gap-2">
              <button
                onClick={() => setSelectedCharacter(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
