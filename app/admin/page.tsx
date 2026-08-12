"use client";

import { useState, useEffect, useRef } from "react";

type Entity = {
  id: number;
  kind: string;
  slug: string;
  name: string;
  image: string | null;
};

export default function AdminDashboard() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [missingFilter, setMissingFilter] = useState(false);
  
  // A mapping of entity IDs that failed to load their images
  const [brokenImages, setBrokenImages] = useState<Record<number, boolean>>({});

  const searchEntities = async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/entities?limit=100&q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setEntities(data.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchEntities(query);
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleImageError = (id: number) => {
    setBrokenImages(prev => ({ ...prev, [id]: true }));
  };

  const handleUploadClick = (id: number) => {
    setUploadingId(id);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || uploadingId === null) return;

    const entity = entities.find(ent => ent.id === uploadingId);
    if (!entity) return;

    try {
      // 1. Upload to Cloudflare R2
      const res = await fetch(`/api/upload?kind=${entity.kind}&slug=${entity.slug}&filename=${encodeURIComponent(file.name)}`, {
        method: "POST",
        body: file,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      // 2. Update Entity in DB
      const updateRes = await fetch(`/api/admin/entities/${uploadingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customImageUrl: data.url }),
      });

      if (!updateRes.ok) throw new Error("Failed to update database");

      // 3. Update local state
      const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || "https://cdn.eteyvat.krzgn.xyz";
      const fullUrl = `${cdnUrl}/${data.url}`;
      setEntities(prev => prev.map(ent => 
        ent.id === uploadingId ? { ...ent, image: fullUrl } : ent
      ));
      
      // Clear broken state for this item if it existed
      setBrokenImages(prev => ({ ...prev, [uploadingId]: false }));

    } catch (error) {
      alert("Upload failed. Please check your Vercel Blob configuration.");
      console.error(error);
    } finally {
      setUploadingId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const displayedEntities = missingFilter 
    ? entities.filter(e => !e.image || brokenImages[e.id])
    : entities;

  return (
    <div className="flex flex-col gap-6 pt-4 pb-12 w-full max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="h1-title text-[var(--accent)]">Asset Manager</h1>
          <p className="text-[var(--text-muted)] mt-1">Search and replace images for database entities.</p>
        </div>
        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/admin/login";
          }}
          className="text-sm bg-[var(--surface-raised)] border border-[var(--border)] hover:bg-[var(--surface-sunken)] text-[var(--text-light)] py-2 px-4 rounded transition-colors"
        >
          Logout
        </button>
      </div>

      <div className="flex gap-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search entities (e.g. Wayob)..."
          className="flex-1 bg-[var(--surface-sunken)] border border-[var(--border)] rounded px-4 py-2 text-[var(--text-light)] focus:border-[var(--accent)] outline-none transition-colors"
        />
        <button
          onClick={() => setMissingFilter(!missingFilter)}
          className={`px-4 py-2 rounded font-medium transition-colors border ${
            missingFilter 
              ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--surface)]' 
              : 'bg-[var(--surface-raised)] border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-sunken)]'
          }`}
        >
          {missingFilter ? "Show All" : "Show Missing Only"}
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/png, image/jpeg, image/webp"
        onChange={handleFileChange}
      />

      {loading ? (
        <div className="text-gray-400 text-center py-12">Loading...</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {displayedEntities.map((entity) => {
            const isBroken = !entity.image || brokenImages[entity.id];
            return (
              <div key={entity.id} className="bg-[var(--surface-sunken)] border border-[var(--border)] rounded-xl overflow-hidden flex flex-col group relative">
                <div className="aspect-square bg-[var(--surface)] flex items-center justify-center p-4 relative">
                  {isBroken ? (
                    <div className="w-16 h-16 rounded-lg bg-[var(--surface-raised)] flex items-center justify-center border border-[var(--border)] shadow-inner">
                      <span className="text-xl font-bold text-[var(--accent)] opacity-50">
                        {entity.name.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                  ) : (
                    <img
                      src={entity.image!}
                      alt={entity.name}
                      className="w-full h-full object-contain"
                      onError={() => handleImageError(entity.id)}
                    />
                  )}
                  
                  {isBroken && (
                    <div className="absolute top-2 right-2 bg-amber-500/10 text-amber-500 text-xs font-bold px-2 py-1 rounded border border-amber-500/20">
                      Missing
                    </div>
                  )}
                </div>
                
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-bold text-[var(--accent)] mb-1 uppercase tracking-wider">
                      {entity.kind}
                    </div>
                    <div className="text-sm text-[var(--text-light)] line-clamp-2" title={entity.name}>
                      {entity.name}
                    </div>
                  </div>
                  <button
                    onClick={() => handleUploadClick(entity.id)}
                    disabled={uploadingId === entity.id}
                    className="mt-3 w-full bg-[var(--surface-raised)] hover:bg-[var(--accent)] hover:text-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text-muted)] text-xs py-1.5 rounded transition-colors disabled:opacity-50"
                  >
                    {uploadingId === entity.id ? "Uploading..." : "Upload Image"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {displayedEntities.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          No entities found matching your criteria.
        </div>
      )}
    </div>
  );
}
