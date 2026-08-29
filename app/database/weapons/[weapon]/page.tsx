import { getTeyvatPersistentEntityQueries } from "@/lib/teyvat/engine";
import { ArrowLeft, ArrowRight, Layers, Orbit, Sparkles, Sword, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ProgressionCalculator,
  type AscensionPhase,
  type MaterialItem,
} from "@vxnus/ui-game";

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

const WEAPON_PHASE_RANGES: Record<number, string> = {
  1: "Lvl 20 → 40",
  2: "Lvl 40 → 50",
  3: "Lvl 50 → 60",
  4: "Lvl 60 → 70",
  5: "Lvl 70 → 80",
  6: "Lvl 80 → 90",
};

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

  // Build Ascension Phase Progression
  const materialsByEntityId = new Map(
    relations
      .filter((r) => r.predicate === "ascension_material")
      .map((r) => [r.object.canonicalId.split(":").at(-1)!, r.object]),
  );

  const promotes = Array.isArray(upgrade.promote) ? (upgrade.promote as DataRecord[]) : [];
  const ascPhaseMap = new Map<number, MaterialItem[]>();
  const ascTotalMap = new Map<string, MaterialItem>();

  for (const p of promotes) {
    const promoteLevel = Number(p.promoteLevel);
    if (!promoteLevel || promoteLevel <= 0) continue;

    const costItems = record(p.costItems);
    const phaseMaterials: MaterialItem[] = [];

    for (const [matId, countVal] of Object.entries(costItems)) {
      const count = Number(countVal) || 0;
      const objectInfo = materialsByEntityId.get(matId);

      const item: MaterialItem = {
        id: objectInfo?.id ?? `mat-${matId}`,
        slug: objectInfo?.slug ?? matId,
        name: objectInfo?.name ?? `Material ${matId}`,
        kind: objectInfo?.kind ?? "material",
        image: objectInfo?.image ?? null,
        count,
      };

      phaseMaterials.push(item);

      const existingTotal = ascTotalMap.get(item.id);
      if (existingTotal) {
        existingTotal.count += count;
      } else {
        ascTotalMap.set(item.id, { ...item, count });
      }
    }

    if (phaseMaterials.length > 0) {
      ascPhaseMap.set(promoteLevel, phaseMaterials);
    }
  }

  const ascensionPhases: AscensionPhase[] = Array.from(ascPhaseMap.entries())
    .map(([phase, materials]) => ({
      phase,
      levelRange: WEAPON_PHASE_RANGES[phase] ?? `Phase ${phase}`,
      mora: Number(promotes.find((p) => Number(p.promoteLevel) === phase)?.coinCost) || 0,
      materials,
    }))
    .sort((a, b) => a.phase - b.phase);

  const totalAscensionMaterials: MaterialItem[] = Array.from(ascTotalMap.values()).sort(
    (a, b) => b.count - a.count,
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

      {/* Weapon Ascension Progression Calculator */}
      {totalAscensionMaterials.length > 0 && (
        <section className="mb-10">
          <header className="banner-section-heading mb-4">
            <div>
              <span>02 / Progression Calculator</span>
              <h2>Ascension Materials</h2>
            </div>
            <p>
              {totalAscensionMaterials.length} required upgrade resources with exact step-by-step quotas
            </p>
          </header>

          <ProgressionCalculator
            ascensionPhases={ascensionPhases}
            totalAscensionMaterials={totalAscensionMaterials}
            titlePrefix="Weapon"
          />
        </section>
      )}
    </div>
  );
}
