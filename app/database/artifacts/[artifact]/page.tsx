import { getTeyvatPersistentEntityQueries } from "@/lib/teyvat/engine";
import { ArrowLeft, ArrowRight, Layers, Orbit, Sparkles, ShieldCheck } from "lucide-react";
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

const PIECE_NAMES: Record<string, string> = {
  EQUIP_BRACER: "Flower of Life",
  EQUIP_NECKLACE: "Plume of Death",
  EQUIP_SHOES: "Sands of Eon",
  EQUIP_RING: "Goblet of Eonothem",
  EQUIP_DRESS: "Circlet of Logos",
};

export default async function ArtifactDetailPage({
  params,
}: {
  params: Promise<{ artifact: string }>;
}) {
  const { artifact: slug } = await params;
  const entityQueries = await getTeyvatPersistentEntityQueries();
  const detail = await entityQueries.detail("artifacts", slug);

  if (!detail) notFound();

  const { item: artifact } = detail;
  const data = artifact.canonicalData;
  const rarity = typeof artifact.rarity === "number" ? artifact.rarity : 5;

  // Set Bonuses
  const affixes = record(data.affix_list);
  const bonuses: Array<{ count: string; effect: string }> = [];
  const entries = Object.entries(affixes);
  if (entries.length >= 1) {
    bonuses.push({ count: "2-Piece Set", effect: text(entries[0][1]) });
  }
  if (entries.length >= 2) {
    bonuses.push({ count: "4-Piece Set", effect: text(entries[1][1]) });
  }

  // Suit Pieces
  const suit = record(data.suit);
  const pieces = Object.entries(suit).map(([slot, pData]) => {
    const piece = record(pData);
    return {
      slot,
      slotName: PIECE_NAMES[slot] ?? slot,
      name: text(piece.name),
      icon: piece.icon ? `https://enka.network/ui/${piece.icon}.png` : null,
      description: text(piece.description),
    };
  });

  return (
    <div className="character-detail-page">
      <section className="character-detail-hero">
        <Link className="banner-back-link" href="/database/artifacts">
          <ArrowLeft size={13} /> Artifact index
        </Link>
        <div className="character-detail-copy">
          <span className="banner-kicker">
            <Orbit size={13} /> Reliquary record / equipment set
          </span>
          <span className="character-stars">{"✦".repeat(rarity)}</span>
          <h1>{artifact.name}</h1>
          <div className="character-tags">
            <span>
              <Layers size={12} />
              {pieces.length} Equipment Slots
            </span>
            <span>
              <Sparkles size={12} />
              Rarity Up to {rarity}★
            </span>
          </div>
        </div>

        <div className="character-detail-art flex items-center justify-center p-6">
          <span className="history-orbit" />
          {artifact.image ? (
            <div className="w-52 h-52 sm:w-64 sm:h-64 relative flex items-center justify-center">
              <Image
                src={artifact.image}
                alt={artifact.name}
                width={260}
                height={260}
                className="object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)]"
                priority
              />
            </div>
          ) : (
            <ShieldCheck size={84} className="text-[var(--accent)]" />
          )}
        </div>

        <div className="history-hero-signal">
          <span><i /> Reliquary archive</span>
          <strong>REVISION {artifact.gameVersion ?? "LIVE"}</strong>
        </div>
      </section>

      {/* Set Bonuses */}
      {bonuses.length > 0 && (
        <section className="mb-10">
          <header className="banner-section-heading mb-4">
            <div>
              <span>01 / Set Effects</span>
              <h2>Set Bonuses</h2>
            </div>
            <p>Combat stat increases and set passives</p>
          </header>

          <div className="grid grid-cols-1 gap-3.5">
            {bonuses.map((bonus, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 bg-[var(--surface-sunken)] border border-white/5 rounded-xl p-5"
              >
                <span className="px-3.5 py-1 rounded-md bg-[var(--accent)]/10 text-[var(--accent)] font-mono font-bold text-xs shrink-0">
                  {bonus.count}
                </span>
                <p className="text-sm text-[var(--text-light)] m-0 leading-relaxed">
                  {bonus.effect}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pieces in Set */}
      {pieces.length > 0 && (
        <section className="mb-10">
          <header className="banner-section-heading mb-4">
            <div>
              <span>02 / Reliquary Pieces</span>
              <h2>Set Pieces</h2>
            </div>
            <p>{pieces.length} individual slot relics</p>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pieces.map((piece) => (
              <div
                key={piece.slot}
                className="bg-[var(--surface-sunken)] border border-white/5 rounded-xl p-4 flex gap-4 items-start"
              >
                <div className="w-14 h-14 rounded-lg bg-[var(--surface-raised)] relative overflow-hidden flex items-center justify-center p-1 border border-white/5 shrink-0">
                  {piece.icon ? (
                    <Image
                      src={piece.icon}
                      alt={piece.name}
                      width={50}
                      height={50}
                      className="object-contain"
                    />
                  ) : (
                    <span className="font-bold text-xs text-[var(--accent)]">
                      {piece.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-xs text-[var(--accent)] font-mono uppercase block mb-1">
                    {piece.slotName}
                  </span>
                  <strong className="text-sm text-white block mb-1">{piece.name}</strong>
                  {piece.description && (
                    <p className="text-xs text-[var(--text-muted)] line-clamp-3 m-0">
                      {piece.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
