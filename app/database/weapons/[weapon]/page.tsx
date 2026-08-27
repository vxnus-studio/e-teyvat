import { getTeyvatPersistentEntityQueries } from "@/lib/teyvat/engine";
import { ArrowLeft, ArrowRight, Layers, Orbit, Sparkles, Sword, Zap } from "lucide-react";
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

function toTitleCase(str: string): string {
  if (!str || str === "—") return "—";
  return str
    .replace(/[_-]/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function formatStat(value: unknown): string {
  const str = text(value, "");
  if (!str) return "—";
  return str.replace(/^FIGHT_PROP_/, "").replaceAll("_", " ");
}

function cleanAffixDescription(desc: string): string {
  return desc.replace(/<color=#[A-Fa-f0-9]+>/g, "").replace(/<\/color>/g, "");
}

export default async function WeaponDetailPage({
  params,
}: {
  params: Promise<{ weapon: string }>;
}) {
  const { weapon: slug } = await params;
  const entityQueries = await getTeyvatPersistentEntityQueries();
  const detail = await entityQueries.detail("weapons", slug);

  if (!detail) notFound();

  const { item: weapon, relations } = detail;
  const data = weapon.canonicalData;
  const rarity = typeof weapon.rarity === "number" ? weapon.rarity : 4;
  const weaponType = toTitleCase(text(data.type));
  const description = weapon.description ?? "";

  // Base Stats calculation
  const upgrade = record(data.upgrade);
  const props = Array.isArray(upgrade.prop) ? (upgrade.prop as DataRecord[]) : [];
  const baseAtkProp = props.find((p) => String(p.propType).includes("ATTACK"));
  const subStatProp = props.find((p) => !String(p.propType).includes("ATTACK"));

  const baseAtk = baseAtkProp?.initValue ? Math.round(Number(baseAtkProp.initValue)) : "—";
  const subStatType = subStatProp ? formatStat(subStatProp.propType) : "—";
  const subStatValue = subStatProp?.initValue
    ? String(subStatProp.propType).includes("PERCENT") ||
      String(subStatProp.propType).includes("CRITICAL") ||
      String(subStatProp.propType).includes("HURT")
      ? `${(Number(subStatProp.initValue) * 100).toFixed(1)}%`
      : Math.round(Number(subStatProp.initValue))
    : "—";

  // Passive / Affix details
  const affixes = record(data.affix);
  const firstAffixKey = Object.keys(affixes)[0];
  const affixData = firstAffixKey ? record(affixes[firstAffixKey]) : null;
  const passiveName = affixData ? text(affixData.name) : null;
  const passiveUpgrades = affixData && typeof affixData.upgrade === "object" ? record(affixData.upgrade) : null;

  // Ascension Material Relations
  const ascensionRelations = relations.filter((r) => r.predicate === "ascension_material");
  const uniqueMaterials = Array.from(
    new Map(ascensionRelations.map((r) => [r.object.id, r.object])).values(),
  );

  return (
    <div className="character-detail-page">
      <section className="character-detail-hero">
        <Link className="banner-back-link" href="/database/weapons">
          <ArrowLeft size={13} /> Weapon index
        </Link>
        <div className="character-detail-copy">
          <span className="banner-kicker">
            <Orbit size={13} /> Equipment record / {weaponType.toLowerCase()}
          </span>
          <span className="character-stars">{"✦".repeat(rarity)}</span>
          <h1>{weapon.name}</h1>
          {description ? <p>{description}</p> : null}
          <div className="character-tags">
            <span>
              <Sword size={12} />
              {weaponType}
            </span>
            <span>
              <Zap size={12} />
              Base ATK {baseAtk}
            </span>
            {subStatType !== "—" && (
              <span>
                <Sparkles size={12} />
                {subStatType} {subStatValue}
              </span>
            )}
          </div>
        </div>

        <div className="character-detail-art flex items-center justify-center p-6">
          <span className="history-orbit" />
          {weapon.image ? (
            <div className="w-56 h-56 sm:w-72 sm:h-72 relative flex items-center justify-center">
              <Image
                src={weapon.image}
                alt={weapon.name}
                width={280}
                height={280}
                className="object-contain drop-shadow-[0_15px_35px_rgba(0,0,0,0.6)]"
                priority
              />
            </div>
          ) : (
            <Sword size={96} className="text-[var(--accent)]" />
          )}
        </div>

        <div className="history-hero-signal">
          <span><i /> Weapon archive</span>
          <strong>REVISION {weapon.gameVersion ?? "LIVE"}</strong>
        </div>
      </section>

      {/* Main Base Stats & Secondary Stats Grid */}
      <section className="character-facts">
        <article>
          <small>Type</small>
          <strong>{weaponType}</strong>
        </article>
        <article>
          <small>Base ATK (Lvl 1)</small>
          <strong>{baseAtk}</strong>
        </article>
        <article>
          <small>Secondary Stat</small>
          <strong>{subStatType}</strong>
        </article>
        <article>
          <small>Secondary Value</small>
          <strong>{subStatValue}</strong>
        </article>
      </section>

      {/* Passive Ability (Refinements 1-5) */}
      {passiveName && passiveUpgrades && (
        <section className="mb-8">
          <header className="banner-section-heading mb-4">
            <div>
              <span>01 / Passive Ability</span>
              <h2>{passiveName}</h2>
            </div>
            <p>Refinement scaling R1 → R5</p>
          </header>

          <div className="grid grid-cols-1 gap-3">
            {Object.entries(passiveUpgrades).map(([rank, desc]) => (
              <div
                key={rank}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 bg-[var(--surface-sunken)] border border-white/5 rounded-xl p-4"
              >
                <span className="px-3 py-1 rounded-md bg-[var(--accent)]/10 text-[var(--accent)] font-mono font-bold text-xs shrink-0">
                  Refinement {Number(rank) + 1}
                </span>
                <p className="text-sm text-[var(--text-light)] m-0 leading-relaxed">
                  {cleanAffixDescription(String(desc))}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Ascension Materials */}
      {uniqueMaterials.length > 0 && (
        <section className="character-section mb-10">
          <header className="banner-section-heading">
            <div>
              <span>02 / Progression</span>
              <h2>Ascension Materials</h2>
            </div>
            <p>{uniqueMaterials.length} required upgrade resources</p>
          </header>
          <div className="flex flex-wrap gap-4 pt-2">
            {uniqueMaterials.map((material) => (
              <Link
                href={`/database/materials/${material.slug}`}
                key={material.id}
                className="flex items-center gap-3 bg-[var(--surface-sunken)] border border-white/5 hover:border-[var(--accent)] rounded-xl p-3 px-4 transition-all hover:scale-[1.02] group"
              >
                <div className="w-10 h-10 rounded-lg bg-[var(--surface-raised)] relative overflow-hidden flex items-center justify-center p-1 border border-white/5 shrink-0">
                  {material.image ? (
                    <Image
                      src={material.image}
                      alt={material.name}
                      width={36}
                      height={36}
                      className="object-contain"
                    />
                  ) : (
                    <span className="font-bold text-xs text-[var(--accent)]">
                      {material.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <strong className="text-sm block text-[var(--text-light)] group-hover:text-[var(--accent)]">
                    {material.name}
                  </strong>
                  <small className="text-xs text-[var(--text-muted)] capitalize">
                    {material.kind}
                  </small>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
