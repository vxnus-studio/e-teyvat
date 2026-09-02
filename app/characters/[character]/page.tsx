import { getTeyvatBuildQueries, getTeyvatPersistentEntityQueries, getTeyvatLoreQueries } from "@/lib/teyvat/engine";
import { getTeyvatBannerQueries } from "@/lib/teyvat/persistence/banners";
import { getSignatureWeaponSlug } from "@/lib/teyvat/signatures";
import { ArrowRight, CalendarDays, Gem, Info, RadioTower, Sparkles, Sword, Zap } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CharacterLoreSection } from "./character-lore-section";
import {
  EntityHero,
  FactsGrid,
  ProgressionCalculator,
  type AscensionPhase,
  type MaterialItem,
  type TalentLevel,
  type TagItem,
  type FactItem,
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

  // Character Build Recommendations lookup
  const buildQueries = getTeyvatBuildQueries();
  const builds = await buildQueries.getCharacterBuilds(slug);

  // Character Canonical Lore & Voicelines lookup
  const loreQueries = await getTeyvatLoreQueries();
  const characterLore = loreQueries.getCharacterLore(slug);

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

  const tags: TagItem[] = [];
  if (element) tags.push({ label: element, icon: <Zap size={12} /> });
  if (weapon && weapon !== "—") tags.push({ label: weapon, icon: <Sword size={12} /> });
  if (affiliation && affiliation !== "—") tags.push({ label: affiliation, icon: <Gem size={12} /> });

  const facts: FactItem[] = [
    { label: "Affiliation", value: affiliation },
    { label: "Birthday", value: birthday },
    { label: "Constellation", value: constellation },
    { label: "Ascension stat", value: substat },
  ];

  return (
    <div className="character-detail-page">
      <EntityHero
        name={character.name}
        subtitle={title ? title : null}
        eyebrow={`Entity profile / ${element.toLowerCase()}`}
        stars={rarity}
        description={description}
        backHref="/database/characters"
        backLabel="Character index"
        tags={tags}
        image={character.image}
        gameVersion={character.gameVersion}
        signalLabel="Canonical record"
      />

      <FactsGrid facts={facts} />

      {/* Strategy, Equipment & Builds Empty State */}
      <section className="mb-10">
        <header className="banner-section-heading mb-4">
          <div>
            <span>01 / Build Strategy & Theorycrafting</span>
            <h2>Build Recommendations & Synergy</h2>
          </div>
          <p>
            Curated equipment, optimal artifact stats, signature weapon synergy, and team compositions
          </p>
        </header>

        <div className="rounded-2xl border border-white/10 bg-[var(--surface-sunken)] p-8 text-center text-[var(--text-muted)]">
          <Info className="mx-auto mb-3 opacity-60 text-amber-400" size={28} />
          <p className="font-semibold text-white">Data Synchronization in Progress</p>
          <p className="text-xs mt-1 text-[var(--text-muted)] max-w-md mx-auto">
            Currently the data still synced and maintained manually for signature weapons, recommended builds, and team compositions.
          </p>
        </div>
      </section>

      {/* Progression & Materials Section */}
      <section className="mb-10">
        <header className="banner-section-heading mb-4">
          <div>
            <span>02 / Progression Calculator</span>
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
          titlePrefix="Character"
          maxAscensionLevel="90"
        />
      </section>

      {/* Character Lore & Voicelines Section */}
      <CharacterLoreSection lore={characterLore} characterName={character.name} />

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
