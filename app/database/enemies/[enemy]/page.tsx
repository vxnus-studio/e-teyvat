import { getTeyvatPersistentEntityQueries } from "@/lib/teyvat/engine";
import { ArrowLeft, ArrowRight, BookOpen, Layers, Orbit, Shield, Sparkles, Swords, Zap } from "lucide-react";
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

export default async function EnemyDetailPage({
  params,
}: {
  params: Promise<{ enemy: string }>;
}) {
  const { enemy: slug } = await params;
  const entityQueries = await getTeyvatPersistentEntityQueries();
  const detail = await entityQueries.detail("enemies", slug);

  if (!detail) notFound();

  const { item: enemy } = detail;
  const data = enemy.canonicalData;
  const enemyType = text(data.type, "Monster");
  const specialName = text(data.special_name, "");
  const title = text(data.title, "");
  const description = enemy.description ?? "";

  // Tips / Mechanics
  const tips = record(data.tips);
  const firstTipKey = Object.keys(tips)[0];
  const tipData = firstTipKey ? record(tips[firstTipKey]) : null;
  const combatTip = tipData ? text(tipData.description) : null;

  return (
    <div className="character-detail-page">
      <section className="character-detail-hero">
        <Link className="banner-back-link" href="/database/enemies">
          <ArrowLeft size={13} /> Enemy index
        </Link>
        <div className="character-detail-copy">
          <span className="banner-kicker">
            <Orbit size={13} /> Bestiary record / {enemyType.toLowerCase()}
          </span>
          <h1>
            {enemy.name}
            {specialName && specialName !== enemy.name ? <em>{specialName}</em> : null}
          </h1>
          {description ? <p>{description}</p> : null}
          <div className="character-tags">
            <span>
              <Shield size={12} />
              {enemyType}
            </span>
            {title && title !== enemy.name && (
              <span>
                <Sparkles size={12} />
                {title}
              </span>
            )}
          </div>
        </div>

        <div className="character-detail-art flex items-center justify-center p-6">
          <span className="history-orbit" />
          {enemy.image ? (
            <div className="w-52 h-52 sm:w-64 sm:h-64 relative flex items-center justify-center">
              <Image
                src={enemy.image}
                alt={enemy.name}
                width={260}
                height={260}
                className="object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)]"
                priority
              />
            </div>
          ) : (
            <Swords size={84} className="text-[var(--accent)]" />
          )}
        </div>

        <div className="history-hero-signal">
          <span><i /> Bestiary archive</span>
          <strong>REVISION {enemy.gameVersion ?? "LIVE"}</strong>
        </div>
      </section>

      {/* Combat Mechanics & Tactical Guide */}
      {combatTip && (
        <section className="mb-10">
          <header className="banner-section-heading mb-4">
            <div>
              <span>01 / Tactical Guide</span>
              <h2>Combat Mechanics</h2>
            </div>
            <p>Archive notes on attack behaviors and counter strategies</p>
          </header>

          <div className="bg-[var(--surface-sunken)] border border-white/5 rounded-2xl p-6 leading-relaxed text-[var(--text-light)] text-sm">
            {combatTip}
          </div>
        </section>
      )}
    </div>
  );
}
