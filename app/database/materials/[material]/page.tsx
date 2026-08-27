import { getTeyvatPersistentEntityQueries } from "@/lib/teyvat/engine";
import { getTeyvatPersistentFarmingQueries } from "@/lib/teyvat/engine";
import { ArrowLeft, ArrowRight, Calendar, Gem, Layers, MapPin, Orbit, Sparkles, UserCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

type DataRecord = Record<string, unknown>;

function record(value: unknown): DataRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as DataRecord) : {};
}

function text(value: unknown, fallback = "—"): string {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object") {
    const obj = value as { canonical?: unknown; en?: unknown; name?: unknown };
    if (typeof obj.canonical === "string" && obj.canonical) return obj.canonical;
    if (typeof obj.en === "string" && obj.en) return obj.en;
    if (typeof obj.name === "string" && obj.name) return obj.name;
  }
  return fallback;
}

export default async function MaterialDetailPage({
  params,
}: {
  params: Promise<{ material: string }>;
}) {
  const { material: slug } = await params;
  const entityQueries = await getTeyvatPersistentEntityQueries();
  const detail = await entityQueries.detail("materials", slug);

  if (!detail) notFound();

  const { item: material } = detail;
  const data = material.canonicalData;
  const rarity = typeof material.rarity === "number" ? material.rarity : 3;
  const materialType = text(data.type, "Material");
  const description = material.description ?? text(data.description_codex) ?? "";

  // Farming Sources
  const farmingQueries = await getTeyvatPersistentFarmingQueries();
  const plan = await farmingQueries.getFarmingPlan(material.name, "material");
  const materialPlan = plan?.materials?.[0];
  const sources = materialPlan?.sources ?? [];
  const sourceNotes = materialPlan?.sourceNotes ?? [];

  return (
    <div className="character-detail-page">
      <section className="character-detail-hero">
        <Link className="banner-back-link" href="/database/materials">
          <ArrowLeft size={13} /> Material index
        </Link>
        <div className="character-detail-copy">
          <span className="banner-kicker">
            <Orbit size={13} /> Resource inventory / {materialType.toLowerCase()}
          </span>
          <span className="character-stars">{"✦".repeat(rarity)}</span>
          <h1>{material.name}</h1>
          {description ? <p>{description}</p> : null}
          <div className="character-tags">
            <span>
              <Gem size={12} />
              {materialType}
            </span>
            <span>
              <Layers size={12} />
              Rarity {rarity}★
            </span>
          </div>
        </div>

        <div className="character-detail-art flex items-center justify-center p-6">
          <span className="history-orbit" />
          {material.image ? (
            <div className="w-48 h-48 sm:w-60 sm:h-60 relative flex items-center justify-center">
              <Image
                src={material.image}
                alt={material.name}
                width={240}
                height={240}
                className="object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.5)]"
                priority
              />
            </div>
          ) : (
            <Gem size={80} className="text-[var(--accent)]" />
          )}
        </div>

        <div className="history-hero-signal">
          <span><i /> Material ledger</span>
          <strong>REVISION {material.gameVersion ?? "LIVE"}</strong>
        </div>
      </section>

      {/* Sources & Farming Locations */}
      <section className="character-section mb-10">
        <header className="banner-section-heading">
          <div>
            <span>01 / Sourcing & Locations</span>
            <h2>Where to Obtain</h2>
          </div>
          <p>
            {sources.length > 0
              ? `${sources.length} mapped drop sources`
              : "Recorded acquisition sources"}
          </p>
        </header>

        {sources.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {sources.map((source, index) => (
              <div
                key={`${source.name}:${index}`}
                className="flex flex-col gap-2 bg-[var(--surface-sunken)] border border-white/5 rounded-xl p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-white/10 text-xs font-mono uppercase text-[var(--accent)]">
                    {source.type}
                  </span>
                  {source.region && (
                    <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                      <MapPin size={12} /> {source.region}
                    </span>
                  )}
                </div>
                <strong className="text-base text-white">{source.name}</strong>
                {source.availableDays && source.availableDays.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-[var(--gold)] font-mono mt-1">
                    <Calendar size={13} />
                    <span>Days: {source.availableDays.join(", ")}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : sourceNotes.length > 0 ? (
          <div className="flex flex-wrap gap-2.5 pt-2">
            {sourceNotes.map((note, index) => (
              <div
                key={index}
                className="bg-[var(--surface-sunken)] border border-white/5 rounded-xl px-4 py-3 text-sm text-[var(--text-light)] flex items-center gap-2"
              >
                <Sparkles size={14} className="text-[var(--accent)] shrink-0" />
                <span>{note}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[var(--surface-sunken)] border border-white/5 rounded-xl p-6 text-center text-sm text-[var(--text-muted)]">
            Obtained through open world foraging, exploration, or alchemy crafting tables.
          </div>
        )}
      </section>
    </div>
  );
}
