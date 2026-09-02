"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  Search,
  Plus,
  Trash2,
  Edit,
  Shield,
  RefreshCw,
  X,
  ExternalLink,
} from "lucide-react";

type BuildRecord = {
  id: string;
  characterSlug: string;
  characterName?: string;
  role: string;
  title: string | null;
  isPrimary: boolean;
  playstyle: string | null;
  gameVersion: string;
  weaponRecommendations: any[];
  artifactRecommendations: any[];
  mainStats: { sands: string[]; goblet: string[]; circlet: string[] };
  substatPriority: string[];
  teamRecommendations: any[];
  authorNotes: string | null;
  provenance: { source: string; author?: string; url?: string };
  createdAt: string;
};

export default function BuildRecommendationsAdminPage() {
  const [builds, setBuilds] = useState<BuildRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formState, setFormState] = useState<{
    id?: string;
    characterSlug: string;
    role: string;
    title: string;
    isPrimary: boolean;
    playstyle: string;
    gameVersion: string;
    sands: string;
    goblet: string;
    circlet: string;
    substats: string;
    talentPriority: string;
    authorNotes: string;
    source: string;
  }>({
    characterSlug: "",
    role: "Main DPS",
    title: "",
    isPrimary: true,
    playstyle: "On-field elemental hypercarry",
    gameVersion: "5.4",
    sands: "ATK% / Energy Recharge",
    goblet: "Elemental DMG Bonus",
    circlet: "CRIT Rate / CRIT DMG",
    substats: "CRIT Rate, CRIT DMG, ATK%, Energy Recharge",
    talentPriority: "Elemental Burst > Elemental Skill > Normal Attack",
    authorNotes: "Standard rotation focuses on maintaining burst uptime and elemental application.",
    source: "KeqingMains / Archon Theorycraft",
  });

  const fetchBuilds = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/builds");
      if (res.ok) {
        const data = await res.json();
        setBuilds(data.builds || []);
      }
    } catch (e) {
      console.error("Failed to load builds", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuilds();
  }, []);

  const handleOpenCreate = () => {
    setFormState({
      characterSlug: "",
      role: "Main DPS",
      title: "",
      isPrimary: true,
      playstyle: "",
      gameVersion: "5.4",
      sands: "ATK% / Energy Recharge",
      goblet: "Elemental DMG Bonus",
      circlet: "CRIT Rate / CRIT DMG",
      substats: "CRIT Rate, CRIT DMG, ATK%, ER%",
      talentPriority: "Elemental Burst > Elemental Skill > Normal Attack",
      authorNotes: "",
      source: "KeqingMains",
    });
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (b: BuildRecord) => {
    setFormState({
      id: b.id,
      characterSlug: b.characterSlug,
      role: b.role,
      title: b.title || "",
      isPrimary: b.isPrimary,
      playstyle: b.playstyle || "",
      gameVersion: b.gameVersion || "5.4",
      sands: b.mainStats?.sands?.join(" / ") || "",
      goblet: b.mainStats?.goblet?.join(" / ") || "",
      circlet: b.mainStats?.circlet?.join(" / ") || "",
      substats: b.substatPriority?.join(", ") || "",
      talentPriority: (b as any).talentPriority?.join(" > ") || "",
      authorNotes: b.authorNotes || "",
      source: b.provenance?.source || "KeqingMains",
    });
    setIsEditorOpen(true);
  };

  const handleSaveBuild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.characterSlug.trim()) {
      alert("Character slug is required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        characterSlug: formState.characterSlug.toLowerCase().trim(),
        role: formState.role.trim(),
        title: formState.title.trim() || `${formState.characterSlug} Strategy Guide`,
        isPrimary: formState.isPrimary,
        playstyle: formState.playstyle.trim() || null,
        gameVersion: formState.gameVersion.trim() || "5.4",
        mainStats: {
          sands: formState.sands.split("/").map((s) => s.trim()).filter(Boolean),
          goblet: formState.goblet.split("/").map((s) => s.trim()).filter(Boolean),
          circlet: formState.circlet.split("/").map((s) => s.trim()).filter(Boolean),
        },
        substatPriority: formState.substats.split(",").map((s) => s.trim()).filter(Boolean),
        talentPriority: formState.talentPriority.split(">").map((s) => s.trim()).filter(Boolean),
        authorNotes: formState.authorNotes.trim() || null,
        provenance: { source: formState.source.trim() || "KeqingMains" },
      };

      let res;
      if (formState.id) {
        res = await fetch(`/api/admin/builds/${formState.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/admin/builds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        setIsEditorOpen(false);
        fetchBuilds();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save build");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving build");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBuild = async (id: string) => {
    if (!confirm("Are you sure you want to delete this build recommendation?")) return;
    try {
      const res = await fetch(`/api/admin/builds/${id}`, { method: "DELETE" });
      if (res.ok) {
        setBuilds((prev) => prev.filter((b) => b.id !== id));
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete build");
    }
  };

  const filteredBuilds = builds.filter((b) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      b.characterSlug.toLowerCase().includes(q) ||
      (b.characterName && b.characterName.toLowerCase().includes(q)) ||
      b.role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--surface-sunken)] p-6 rounded-2xl border border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[var(--accent)] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Theorycraft & Guides
            </span>
          </div>
          <h1 className="text-2xl font-black text-white">Character Build Recommendations</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Manage comprehensive strategy guides, artifact stat targets, talent priorities, and team synergy rotations stored in Neon.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchBuilds}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-xs font-semibold text-[var(--text-light)] hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[var(--accent)]" : ""}`} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-black text-xs font-bold transition-all shadow-lg shadow-[rgba(98,213,163,0.2)]"
          >
            <Plus className="w-4 h-4" />
            Create Build Guide
          </button>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by character name or role (e.g. Mavuika, Main DPS, Hyperbloom Driver)..."
            className="w-full bg-[var(--surface-sunken)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
      </div>

      {/* Builds List */}
      {loading ? (
        <div className="text-center py-20 bg-[var(--surface-sunken)] rounded-2xl border border-[var(--border)]">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[var(--accent)] mb-3 opacity-80" />
          <div className="text-sm font-medium text-white">Loading build recommendations from Neon DB...</div>
        </div>
      ) : filteredBuilds.length === 0 ? (
        <div className="text-center py-16 bg-[var(--surface-sunken)] rounded-2xl border border-[var(--border)] text-[var(--text-muted)]">
          <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="font-semibold text-white">No build recommendations found.</p>
          <p className="text-xs mt-1">Click &quot;Create Build Guide&quot; above to publish a new character strategy.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBuilds.map((b) => (
            <div
              key={b.id}
              className="p-5 rounded-2xl bg-[var(--surface-sunken)] border border-[var(--border)] hover:border-[rgba(98,213,163,0.3)] flex flex-col justify-between gap-4 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-bold uppercase text-[var(--accent)]">{b.role}</span>
                      {b.isPrimary && (
                        <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Primary
                        </span>
                      )}
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">v{b.gameVersion}</span>
                    </div>
                    <h3 className="text-base font-bold text-white mt-1 capitalize">
                      {b.characterName || b.characterSlug}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(b)}
                      title="Edit Build"
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-raised)] transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteBuild(b.id)}
                      title="Delete Build"
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[var(--text-muted)] line-clamp-2">
                  {b.title || b.playstyle || "Standard strategy build guide"}
                </p>

                <div className="mt-4 pt-3 border-t border-[var(--border)] space-y-1 text-xs">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[var(--text-muted)]">Sands:</span>
                    <span className="text-white font-medium truncate max-w-[180px]">
                      {b.mainStats?.sands?.join(" / ") || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[var(--text-muted)]">Goblet:</span>
                    <span className="text-white font-medium truncate max-w-[180px]">
                      {b.mainStats?.goblet?.join(" / ") || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[var(--text-muted)]">Circlet:</span>
                    <span className="text-white font-medium truncate max-w-[180px]">
                      {b.mainStats?.circlet?.join(" / ") || "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                <span>Source: {b.provenance?.source || "KeqingMains"}</span>
                <a
                  href={`/characters/${b.characterSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[var(--accent)] hover:underline"
                >
                  View on Site <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-[var(--accent)] uppercase font-bold">Build Configuration</div>
                <h3 className="text-lg font-black text-white mt-0.5">
                  {formState.id ? `Edit Guide for ${formState.characterSlug}` : "Create Character Build Guide"}
                </h3>
              </div>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-raised)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBuild} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                    Character Slug (e.g. raiden-shogun, mavuika)
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.characterSlug}
                    onChange={(e) => setFormState({ ...formState, characterSlug: e.target.value })}
                    className="w-full bg-[var(--surface-sunken)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[var(--accent)] font-mono"
                    placeholder="mavuika"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                    Role Category (e.g. Main DPS, Off-field Sub-DPS)
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.role}
                    onChange={(e) => setFormState({ ...formState, role: e.target.value })}
                    className="w-full bg-[var(--surface-sunken)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[var(--accent)]"
                    placeholder="Main DPS"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Guide Title</label>
                  <input
                    type="text"
                    value={formState.title}
                    onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                    className="w-full bg-[var(--surface-sunken)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[var(--accent)]"
                    placeholder="Mavuika Pyro Carry Build Guide"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Game Version</label>
                  <input
                    type="text"
                    value={formState.gameVersion}
                    onChange={(e) => setFormState({ ...formState, gameVersion: e.target.value })}
                    className="w-full bg-[var(--surface-sunken)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[var(--accent)] font-mono"
                    placeholder="5.4"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isPrimary"
                  checked={formState.isPrimary}
                  onChange={(e) => setFormState({ ...formState, isPrimary: e.target.checked })}
                  className="rounded border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--accent)] focus:ring-[var(--accent)]"
                />
                <label htmlFor="isPrimary" className="text-xs text-white cursor-pointer select-none">
                  Set as Primary / Default Build for this Character
                </label>
              </div>

              <div className="p-4 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border)] space-y-3">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-[var(--accent)]" /> Artifact Main Stats (Slash Separated)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-[var(--text-muted)] mb-1">Sands</label>
                    <input
                      type="text"
                      value={formState.sands}
                      onChange={(e) => setFormState({ ...formState, sands: e.target.value })}
                      className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-white"
                      placeholder="ATK% / ER%"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--text-muted)] mb-1">Goblet</label>
                    <input
                      type="text"
                      value={formState.goblet}
                      onChange={(e) => setFormState({ ...formState, goblet: e.target.value })}
                      className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-white"
                      placeholder="Pyro DMG Bonus"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--text-muted)] mb-1">Circlet</label>
                    <input
                      type="text"
                      value={formState.circlet}
                      onChange={(e) => setFormState({ ...formState, circlet: e.target.value })}
                      className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-white"
                      placeholder="CRIT Rate / CRIT DMG"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                  Substat Priority (Comma Separated)
                </label>
                <input
                  type="text"
                  value={formState.substats}
                  onChange={(e) => setFormState({ ...formState, substats: e.target.value })}
                  className="w-full bg-[var(--surface-sunken)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-white"
                  placeholder="CRIT Rate, CRIT DMG, ATK%, Energy Recharge"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                  Talent Priority (e.g. Burst &gt; Skill &gt; NA)
                </label>
                <input
                  type="text"
                  value={formState.talentPriority}
                  onChange={(e) => setFormState({ ...formState, talentPriority: e.target.value })}
                  className="w-full bg-[var(--surface-sunken)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-white"
                  placeholder="Elemental Burst > Elemental Skill > Normal Attack"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Author / Rotation Notes</label>
                <textarea
                  rows={3}
                  value={formState.authorNotes}
                  onChange={(e) => setFormState({ ...formState, authorNotes: e.target.value })}
                  className="w-full bg-[var(--surface-sunken)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-white resize-none"
                  placeholder="Notes on combo execution, ER breakpoints, and energy generation..."
                />
              </div>

              <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-sunken)] -mx-6 -mb-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-black text-xs font-bold transition-all disabled:opacity-50"
                >
                  {saving ? "Saving to Neon..." : "Save Build Guide"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
