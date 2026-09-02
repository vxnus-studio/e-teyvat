"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  UploadCloud,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Image as ImageIcon,
} from "lucide-react";

type EntityItem = {
  id: string;
  kind: string;
  slug: string;
  name: string;
  image: string | null;
  isCustom: boolean;
  source: "cdn" | "enka" | "none";
  hasImage: boolean;
  rarity: number;
};

type SummaryStats = {
  total: number;
  withImage: number;
  missingImage: number;
  customCdnCount: number;
  enkaCount: number;
};

export default function BrokenImagesPage() {
  const [items, setItems] = useState<EntityItem[]>([]);
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "missing" | "broken" | "custom">("all");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchScan = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/images/scan");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setSummary(data.summary || null);
      }
    } catch (e) {
      console.error("Failed to load entity scan", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScan();
  }, []);

  const handleImageError = (id: string) => {
    setBrokenImages((prev) => ({ ...prev, [id]: true }));
  };

  const handleUploadClick = (id: string) => {
    setUploadingId(id);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingId) return;

    const entity = items.find((ent) => ent.id === uploadingId);
    if (!entity) return;

    try {
      // 1. Upload to Cloudflare R2
      const res = await fetch(
        `/api/upload?kind=${entity.kind}&slug=${entity.slug}&filename=${encodeURIComponent(file.name)}`,
        {
          method: "POST",
          body: file,
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "R2 Upload failed");

      // 2. Update Database Record
      const updateRes = await fetch(`/api/admin/entities/${encodeURIComponent(uploadingId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customImageUrl: data.url }),
      });
      if (!updateRes.ok) throw new Error("Failed to update database entity");

      const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || "https://cdn.e-teyvat.vxnus.xyz";
      const fullUrl = `${cdnUrl}/${data.url}`;

      // 3. Update local state
      setItems((prev) =>
        prev.map((ent) =>
          ent.id === uploadingId
            ? { ...ent, image: fullUrl, isCustom: true, source: "cdn", hasImage: true }
            : ent
        )
      );

      setBrokenImages((prev) => ({ ...prev, [uploadingId]: false }));
      if (summary) {
        setSummary({
          ...summary,
          customCdnCount: summary.customCdnCount + 1,
          missingImage: Math.max(0, summary.missingImage - 1),
        });
      }
    } catch (err) {
      alert("Image upload failed. Please verify Cloudflare R2 settings.");
      console.error(err);
    } finally {
      setUploadingId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filteredItems = items.filter((item) => {
    if (query) {
      const q = query.toLowerCase();
      const match = item.name.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (kindFilter !== "all" && item.kind !== kindFilter) {
      return false;
    }

    const isBroken = brokenImages[item.id] || !item.image;
    if (statusFilter === "missing") return !item.hasImage;
    if (statusFilter === "broken") return isBroken;
    if (statusFilter === "custom") return item.isCustom;

    return true;
  });

  const brokenCount = Object.values(brokenImages).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--surface-sunken)] p-6 rounded-2xl border border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[var(--accent)] flex items-center gap-1">
              <ImageIcon className="w-3.5 h-3.5" /> Media Audit
            </span>
          </div>
          <h1 className="text-2xl font-black text-white">Broken Image & Asset Detection</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Scan authoritative entities across characters, weapons, artifacts and materials. Replace broken enka icons with high-res R2 AVIF assets.
          </p>
        </div>
        <button
          onClick={fetchScan}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-xs font-semibold text-[var(--text-light)] hover:bg-[var(--surface)] hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[var(--accent)]" : ""}`} />
          Refresh Scan
        </button>
      </div>

      {/* Metrics Banner */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border)]">
            <div className="text-[11px] font-mono uppercase text-[var(--text-muted)]">Total Entities</div>
            <div className="text-2xl font-black text-white mt-1">{summary.total}</div>
          </div>
          <div className="p-4 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border)]">
            <div className="text-[11px] font-mono uppercase text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Custom CDN Assets
            </div>
            <div className="text-2xl font-black text-emerald-300 mt-1">{summary.customCdnCount}</div>
          </div>
          <div className="p-4 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border)]">
            <div className="text-[11px] font-mono uppercase text-sky-400">Enka Network Icons</div>
            <div className="text-2xl font-black text-sky-300 mt-1">{summary.enkaCount}</div>
          </div>
          <div className="p-4 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border)]">
            <div className="text-[11px] font-mono uppercase text-rose-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Missing / Broken
            </div>
            <div className="text-2xl font-black text-rose-300 mt-1">{summary.missingImage + brokenCount}</div>
          </div>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by entity name or slug (e.g., Mavuika, Wolf's Gravestone)..."
            className="w-full bg-[var(--surface-sunken)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>

        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value)}
          className="bg-[var(--surface-sunken)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[var(--accent)] transition-colors"
        >
          <option value="all">All Entity Categories</option>
          <option value="avatar">Characters (Avatar)</option>
          <option value="weapon">Weapons</option>
          <option value="reliquary">Artifacts</option>
          <option value="material">Materials</option>
          <option value="monster">Enemies</option>
          <option value="domain">Domains</option>
        </select>

        <div className="flex bg-[var(--surface-sunken)] border border-[var(--border)] p-1 rounded-xl gap-1">
          {(
            [
              { id: "all", label: "All" },
              { id: "missing", label: "Missing" },
              { id: "broken", label: "Broken Detected" },
              { id: "custom", label: "CDN Uploaded" },
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

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/png, image/jpeg, image/webp, image/avif"
        onChange={handleFileChange}
      />

      {loading ? (
        <div className="text-center py-20 bg-[var(--surface-sunken)] rounded-2xl border border-[var(--border)]">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[var(--accent)] mb-3 opacity-80" />
          <div className="text-sm font-medium text-white">Scanning entity catalog & CDN status...</div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-[var(--surface-sunken)] rounded-2xl border border-[var(--border)] text-[var(--text-muted)]">
          <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="font-semibold text-white">No entities found matching criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
          {filteredItems.map((item) => {
            const isBroken = !item.image || brokenImages[item.id];
            return (
              <div
                key={item.id}
                className="bg-[var(--surface-sunken)] border border-[var(--border)] hover:border-[rgba(98,213,163,0.3)] rounded-xl overflow-hidden flex flex-col group transition-all"
              >
                <div className="aspect-square bg-[var(--surface)] flex items-center justify-center p-3 relative overflow-hidden">
                  {isBroken ? (
                    <div className="w-14 h-14 rounded-xl bg-[var(--surface-raised)] border border-dashed border-rose-500/40 flex flex-col items-center justify-center text-center p-1">
                      <AlertTriangle className="w-5 h-5 text-rose-400 mb-0.5" />
                      <span className="text-[9px] font-mono text-rose-300 font-bold uppercase">Missing</span>
                    </div>
                  ) : (
                    <img
                      src={item.image!}
                      alt={item.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                      onError={() => handleImageError(item.id)}
                      loading="lazy"
                    />
                  )}

                  <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                    {item.isCustom && (
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                        R2 CDN
                      </span>
                    )}
                    {isBroken && (
                      <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                        Broken
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 flex-1 flex flex-col justify-between gap-2 border-t border-[var(--border)]">
                  <div>
                    <div className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider font-mono">
                      {item.kind}
                    </div>
                    <div className="text-xs font-bold text-white line-clamp-1 mt-0.5" title={item.name}>
                      {item.name}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] font-mono truncate" title={item.slug}>
                      {item.slug}
                    </div>
                  </div>

                  <button
                    onClick={() => handleUploadClick(item.id)}
                    disabled={uploadingId === item.id}
                    className="w-full flex items-center justify-center gap-1.5 bg-[var(--surface-raised)] hover:bg-[var(--accent)] hover:text-black border border-[var(--border)] text-[var(--text-light)] text-[11px] font-semibold py-1.5 rounded-lg transition-all disabled:opacity-50"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    {uploadingId === item.id ? "Uploading..." : "Upload R2"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
