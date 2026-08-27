import { CharacterPortrait } from "@/app/database/banners/banner-visuals";
import { getTeyvatPersistentEntityQueries } from "@/lib/teyvat/engine";
import { getTeyvatBannerQueries } from "@/lib/teyvat/persistence/banners";
import { getSignatureWeaponSlug } from "@/lib/teyvat/signatures";
import { ArrowLeft, ArrowRight, CalendarDays, Gem, Orbit, RadioTower, Sparkles, Sword, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ProgressionCalculator,
  type AscensionPhase,
  type MaterialItem,
  type TalentLevel,
} from "./progression-calculator";

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

function formatBirthday(value: unknown): string {
  if (Array.isArray(value) && value.length === 2) {
    const [month, day] = value;
    const date = new Date(2020, Number(month) - 1, Number(day));
    if (!Number.isNaN(date.valueOf())) {
      return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
    }
    return `${month}/${day}`;
  }
  return text(value);
}

function formatStat(value: unknown): string {
  const str = text(value, "");
  if (!str) return "—";
  return str.replace(/^FIGHT_PROP_/, "").replaceAll("_", " ");
}

export default async function CharacterDetailPage({ params }: { params: Promise<{ character: string }> }) {
  const { character: slug } = await params;
  const entityQueries = await getTeyvatPersistentEntityQueries();
  const detail = await entityQueries.detail("characters", slug);

  if (!detail) notFound();

  const { item: character, relations } = detail;
  const data = character.canonicalData;
  const fetter = record(data.fetter);
  const voices = record(fetter.cv ?? data.cv);

  const bannerQueries = await getTeyvatBannerQueries();
  const { statistics: stats } = await bannerQueries.character(slug);

  // Signature Weapon lookup
  const signatureSlug = getSignatureWeaponSlug(slug);
  const signatureWeapon = signatureSlug ? await entityQueries.getEntity("weapons", signatureSlug) : null;

  // Process ascension relations and levels
  const ascensionRelations = relations.filter((r) => r.predicate === "ascension_cost");
  const talentRelations = relations.filter((r) => r.predicate === "talent_material");

  // Ascension Phases (Phase 1 to 6)
  const phaseLevelRanges: Record<number, string> = {
    1: "Lvl 20 → 40",
    2: "Lvl 40 → 50",
    3: "Lvl 50 → 60",
    4: "Lvl 60 → 70",
    5: "Lvl 70 → 80",
    6: "Lvl 80 → 90",
  };

  const ascPhaseMap = new Map<number, MaterialItem[]>();
  const ascTotalMap = new Map<string, MaterialItem>();

  for (const rel of ascensionRelations) {
    const rawLevel = Number(rel.metadata?.canonical && typeof rel.metadata.canonical === "object" ? (rel.metadata.canonical as Record<string, unknown>).promote_level : 1) || 1;
    // promote_level in data is 2..7 or 1..6
    const phaseNum = rawLevel >= 2 ? rawLevel - 1 : rawLevel;
    const count = Number(rel.metadata?.canonical && typeof rel.metadata.canonical === "object" ? (rel.metadata.canonical as Record<string, unknown>).count : 1) || 1;

    const item: MaterialItem = {
      id: rel.object.id,
      slug: rel.object.slug,
      name: rel.object.name,
      kind: rel.object.kind,
      image: rel.object.image,
      count,
    };

    const existingPhase = ascPhaseMap.get(phaseNum) ?? [];
    existingPhase.push(item);
    ascPhaseMap.set(phaseNum, existingPhase);

    const existingTotal = ascTotalMap.get(rel.object.id);
    if (existingTotal) {
      existingTotal.count += count;
    } else {
      ascTotalMap.set(rel.object.id, { ...item, count });
    }
  }

  const ascensionPhases: AscensionPhase[] = Array.from(ascPhaseMap.entries())
    .map(([phase, materials]) => ({
      phase,
      levelRange: phaseLevelRanges[phase] ?? `Phase ${phase}`,
      mora: [20000, 40000, 60000, 80000, 100000, 120000][phase - 1] ?? 0,
      materials,
    }))
    .sort((a, b) => a.phase - b.phase);

  const totalAscensionMaterials: MaterialItem[] = Array.from(ascTotalMap.values()).sort(
    (a, b) => b.count - a.count,
  );

  // Talent Levels (Level 2 to 10)
  const talentLevelMap = new Map<number, MaterialItem[]>();
  const talentTotalMap = new Map<string, MaterialItem>();

  for (const rel of talentRelations) {
    const level = Number(rel.metadata?.canonical && typeof rel.metadata.canonical === "object" ? (rel.metadata.canonical as Record<string, unknown>).level : 2) || 2;
    const count = Number(rel.metadata?.canonical && typeof rel.metadata.canonical === "object" ? (rel.metadata.canonical as Record<string, unknown>).count : 1) || 1;

    const item: MaterialItem = {
      id: rel.object.id,
      slug: rel.object.slug,
      name: rel.object.name,
      kind: rel.object.kind,
      image: rel.object.image,
      count,
    };

    const existingLevel = talentLevelMap.get(level) ?? [];
    existingLevel.push(item);
    talentLevelMap.set(level, existingLevel);

    const existingTotal = talentTotalMap.get(rel.object.id);
    if (existingTotal) {
      existingTotal.count += count;
    } else {
      talentTotalMap.set(rel.object.id, { ...item, count });
    }
  }

  const talentLevels: TalentLevel[] = Array.from(talentLevelMap.entries())
    .map(([level, materials]) => ({
      level,
      levelText: `Level ${level - 1} → ${level}`,
      materials,
    }))
    .sort((a, b) => a.level - b.level);

  const totalTalentMaterials: MaterialItem[] = Array.from(talentTotalMap.values()).sort(
    (a, b) => b.count - a.count,
  );

  const rarity = typeof character.rarity === "number" ? character.rarity : 4;
  const title = text(fetter.title) !== "—" ? text(fetter.title) : "";
  const affiliation = text(fetter.native) !== "—" ? text(fetter.native) : text(data.region);
  const constellation = text(fetter.constellation) !== "—" ? text(fetter.constellation) : "—";
  const birthday = formatBirthday(data.birthday);
  const substat = formatStat(data.special_prop);
  const element = character.element ?? text(data.element);
  const rawWeapon = text(data.weapon_type);
  const weapon = toTitleCase(rawWeapon);
  const description = character.description ?? text(fetter.detail) ?? "";

  return (
    <div className="character-detail-page">
      <section className="character-detail-hero">
        <Link className="banner-back-link" href="/database/characters">
          <ArrowLeft size={13} /> Character index
        </Link>
        <div className="character-detail-copy">
          <span className="banner-kicker">
            <Orbit size={13} /> Entity profile / {element.toLowerCase()}
          </span>
          <span className="character-stars">{"✦".repeat(rarity)}</span>
          <h1>
            {character.name}
            {title ? <em>{title}</em> : null}
          </h1>
          {description ? <p>{description}</p> : null}
          <div className="character-tags">
            {element ? (
              <span>
                <Zap size={12} />
                {element}
              </span>
            ) : null}
            {weapon && weapon !== "—" ? (
              <span>
                <Sword size={12} />
                {weapon}
              </span>
            ) : null}
            {affiliation && affiliation !== "—" ? (
              <span>
                <Gem size={12} />
                {affiliation}
              </span>
            ) : null}
          </div>
        </div>
        <div className="character-detail-art">
          <span className="history-orbit" />
          <CharacterPortrait
            slug={character.slug}
            name={character.name}
            imageUrl={character.image}
            sizes="(max-width: 700px) 76vw, 430px"
          />
        </div>
        <div className="history-hero-signal">
          <span><i /> Canonical record</span>
          <strong>REVISION {character.gameVersion ?? "LIVE"}</strong>
        </div>
      </section>

      <section className="character-facts">
        {[
          ["Affiliation", affiliation],
          ["Birthday", birthday],
          ["Constellation", constellation],
          ["Ascension stat", substat],
        ].map(([label, value]) => (
          <article key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      {/* Signature Weapon Highlight */}
      {signatureWeapon && (
        <section className="mb-8">
          <header className="banner-section-heading mb-4">
            <div>
              <span className="text-[var(--accent)] font-mono text-xs uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles size={13} /> Equipment Synergy
              </span>
              <h2 className="text-xl font-extrabold text-white">Signature Weapon</h2>
            </div>
            <p>Featured weapon pairing in Epitome Invocation wishes</p>
          </header>

          <Link
            href={`/database/weapons/${signatureWeapon.slug}`}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-gradient-to-r from-[var(--surface-sunken)] to-[var(--surface)] border border-white/10 hover:border-[var(--accent)] rounded-2xl p-5 md:p-6 transition-all hover:scale-[1.01] group shadow-lg"
          >
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-black/50 relative overflow-hidden flex items-center justify-center p-2 border border-white/10 shrink-0 group-hover:border-[var(--accent)] transition-colors">
                {signatureWeapon.image ? (
                  <Image
                    src={signatureWeapon.image}
                    alt={signatureWeapon.name}
                    width={70}
                    height={70}
                    className="object-contain drop-shadow-md group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <Sword size={28} className="text-[var(--accent)]" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-amber-400 font-bold text-xs tracking-widest">
                    {"✦".repeat(signatureWeapon.rarity ?? 5)}
                  </span>
                  <span className="text-xs uppercase px-2 py-0.5 rounded bg-white/10 text-[var(--text-muted)] font-mono">
                    {toTitleCase(text(signatureWeapon.canonicalData.type))}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-[var(--accent)] transition-colors">
                  {signatureWeapon.name}
                </h3>
                {signatureWeapon.description && (
                  <p className="text-xs sm:text-sm text-[var(--text-muted)] line-clamp-2 mt-1 max-w-2xl">
                    {signatureWeapon.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--accent)] sm:self-center shrink-0">
              <span>View weapon details</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </section>
      )}

      {/* Progression & Materials Section */}
      <section className="mb-10">
        <header className="banner-section-heading mb-4">
          <div>
            <span>01 / Progression Calculator</span>
            <h2>Progression Materials</h2>
          </div>
          <p>
            {totalAscensionMaterials.length + totalTalentMaterials.length} farming resources with exact step-by-step quotas
          </p>
        </header>

        <ProgressionCalculator
          ascensionPhases={ascensionPhases}
          totalAscensionMaterials={totalAscensionMaterials}
          talentLevels={talentLevels}
          totalTalentMaterials={totalTalentMaterials}
        />
      </section>

      <section className="character-bottom-grid">
        <article>
          <span className="banner-kicker">
            <RadioTower size={13} /> Wish intelligence
          </span>
          <h2>Banner signal</h2>
          <div>
            <span>
              <small>Appearances</small>
              <strong>{stats?.appearanceCount ?? "—"}</strong>
            </span>
            <span>
              <small>Current wait</small>
              <strong>{stats?.currentWait ?? "—"}</strong>
            </span>
            <span>
              <small>Pressure</small>
              <strong>{stats?.pressureScore ?? "—"}</strong>
            </span>
          </div>
          <Link href={`/characters/${character.slug}/banner-history`}>
            Open complete history <ArrowRight size={13} />
          </Link>
        </article>
        <article>
          <span className="banner-kicker">
            <CalendarDays size={13} /> Voice archive
          </span>
          <h2>Cast</h2>
          <div className="voice-list">
            {Object.entries(voices).map(([language, actor]) => (
              <span key={language}>
                <small>{language}</small>
                <strong>{String(actor)}</strong>
              </span>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
