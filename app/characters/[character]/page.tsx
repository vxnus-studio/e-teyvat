import { resolveImageUrl } from "@/app/api/utils";
import { CharacterPortrait } from "@/app/database/banners/banner-visuals";
import { getDatabase } from "@/db/client";
import { bannerCharacterStatistics, entities } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { ArrowLeft, ArrowRight, CalendarDays, Gem, Orbit, RadioTower, Sparkles, Sword, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

type DataRecord = Record<string, unknown>;
type CostItem = { id?: number; name: string; count: number };
type Talent = { name: string; description?: string; flavorText?: string; attributes?: { labels?: string[]; parameters?: Record<string, number[]> } };
type Constellation = { name: string; description?: string };

function record(value: unknown): DataRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as DataRecord : {};
}

function text(value: unknown, fallback = "—") {
  return typeof value === "string" && value ? value : fallback;
}

function costGroups(value: unknown) {
  return Object.entries(record(value))
    .map(([key, items]) => ({
      key,
      items: Array.isArray(items) ? items.filter((item): item is CostItem =>
        Boolean(item && typeof item === "object" && typeof item.name === "string" && typeof item.count === "number")) : [],
    }))
    .filter((group) => group.items.length);
}

function talentEntries(data: DataRecord, prefix: "combat" | "passive") {
  return Object.entries(data)
    .filter(([key, value]) => key.startsWith(prefix) && value && typeof value === "object")
    .map(([key, value]) => ({ key, ...(value as Talent) }));
}

export default async function CharacterDetailPage({ params }: { params: Promise<{ character: string }> }) {
  const db = getDatabase();
  const { character: slug } = await params;
  const character = await db.query.entities.findFirst({
    where: and(eq(entities.kind, "characters"), eq(entities.slug, slug), eq(entities.isActive, true)),
  });
  if (!character) notFound();

  const related = await db.select().from(entities)
    .where(and(inArray(entities.kind, ["talents", "constellations"]), eq(entities.slug, slug), eq(entities.isActive, true)));
  const talentEntity = related.find((entity) => entity.kind === "talents");
  const constellationEntity = related.find((entity) => entity.kind === "constellations");
  const stats = await db.query.bannerCharacterStatistics.findFirst({
    where: eq(bannerCharacterStatistics.characterId, character.id),
  });

  const data = character.canonicalData;
  const talentData = talentEntity?.canonicalData ?? {};
  const constellationData = constellationEntity?.canonicalData ?? {};
  const ascensions = costGroups(data.costs);
  const talentCosts = costGroups(talentData.costs);
  const combatTalents = talentEntries(talentData, "combat");
  const passives = talentEntries(talentData, "passive");
  const constellations = Array.from({ length: 6 }, (_, index) => {
    const key = `c${index + 1}`;
    return { key, ...(record(constellationData[key]) as Constellation) };
  }).filter((item) => item.name);
  const talentImages = record(talentData.images);
  const constellationImages = record(constellationData.images);
  const materialNames = [...new Set([...ascensions, ...talentCosts].flatMap((group) => group.items.map((item) => item.name)))];
  const materials = materialNames.length ? await db.select().from(entities)
    .where(and(eq(entities.kind, "materials"), inArray(entities.name, materialNames), eq(entities.isActive, true))) : [];
  const materialMap = new Map(materials.map((material) => [material.name, {
    slug: material.slug,
    image: resolveImageUrl(material.customImageUrl, material.canonicalData),
  }]));
  const imageUrl = resolveImageUrl(character.customImageUrl, data);
  const rarity = typeof data.rarity === "number" ? data.rarity : 4;
  const voices = record(data.cv);

  return (
    <div className="character-detail-page">
      <section className="character-detail-hero">
        <Link className="banner-back-link" href="/database/characters"><ArrowLeft size={13} /> Character index</Link>
        <div className="character-detail-copy">
          <span className="banner-kicker"><Orbit size={13} /> Entity profile / {text(data.elementText).toLowerCase()}</span>
          <span className="character-stars">{"✦".repeat(rarity)}</span>
          <h1>{character.name}<em>{text(data.title)}</em></h1>
          <p>{character.description}</p>
          <div className="character-tags">
            <span><Zap size={12} />{text(data.elementText)}</span>
            <span><Sword size={12} />{text(data.weaponText)}</span>
            <span><Gem size={12} />{text(data.region)}</span>
          </div>
        </div>
        <div className="character-detail-art">
          <span className="history-orbit" />
          <CharacterPortrait slug={character.slug} name={character.name} imageUrl={imageUrl} sizes="(max-width: 700px) 76vw, 430px" />
        </div>
        <div className="history-hero-signal"><span><i /> Canonical record</span><strong>VERSION {text(data.version)}</strong></div>
      </section>

      <section className="character-facts">
        {[
          ["Affiliation", text(data.affiliation)],
          ["Birthday", text(data.birthday)],
          ["Constellation", text(data.constellation)],
          ["Ascension stat", text(data.substatText)],
        ].map(([label, value]) => <article key={label}><small>{label}</small><strong>{value}</strong></article>)}
      </section>

      <section className="character-section">
        <header className="banner-section-heading"><div><span>01 / Progression</span><h2>Ascension matrix</h2></div><p>Six progression gates</p></header>
        <div className="ascension-rail">
          {ascensions.map((group, index) => (
            <article key={group.key}>
              <header><span>ASC {index + 1}</span><strong>Phase {index + 1}</strong></header>
              <div>{group.items.map((item) => {
                const material = materialMap.get(item.name);
                return <Link href={material ? `/database/materials/?q=${encodeURIComponent(item.name)}` : "#"} key={`${group.key}-${item.name}`}>
                  <span>{material?.image ? <Image src={material.image} alt="" fill sizes="38px" /> : item.name.slice(0, 2)}</span>
                  <div><strong>{item.name}</strong><small>× {item.count.toLocaleString()}</small></div>
                </Link>;
              })}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="character-section">
        <header className="banner-section-heading"><div><span>02 / Combat system</span><h2>Talents</h2></div><p>{combatTalents.length} active · {passives.length} passive</p></header>
        <div className="combat-talent-grid">
          {combatTalents.map((talent, index) => {
            const filename = talentImages[`filename_${talent.key}`];
            return <article key={talent.key}>
              <header>
                <span>{typeof filename === "string" ? <Image src={`https://enka.network/ui/${filename}.png`} alt="" fill sizes="54px" /> : <Sparkles size={20} />}</span>
                <div><small>Combat talent {index + 1}</small><h3>{talent.name}</h3></div>
              </header>
              <p>{talent.description}</p>
              {talent.flavorText && <blockquote>{talent.flavorText}</blockquote>}
              <div className="talent-scaling">
                {talent.attributes?.labels?.slice(-4).map((label) => <span key={label}>{label.split("|")[0]}</span>)}
              </div>
            </article>;
          })}
        </div>
        <div className="passive-grid">
          {passives.map((talent, index) => {
            const filename = talentImages[`filename_${talent.key}`];
            return <article key={talent.key}>
              <span>{typeof filename === "string" ? <Image src={`https://enka.network/ui/${filename}.png`} alt="" fill sizes="42px" /> : <Sparkles size={18} />}</span>
              <div><small>Passive {index + 1}</small><h3>{talent.name}</h3><p>{talent.description}</p></div>
            </article>;
          })}
        </div>
      </section>

      <section className="character-section">
        <header className="banner-section-heading"><div><span>03 / Stellar sequence</span><h2>Constellations</h2></div><p>{text(data.constellation)}</p></header>
        <div className="constellation-grid">
          {constellations.map((constellation, index) => {
            const filename = constellationImages[`filename_c${index + 1}`];
            return <article key={constellation.key}>
              <span>{typeof filename === "string" ? <Image src={`https://enka.network/ui/${filename}.png`} alt="" fill sizes="48px" /> : `C${index + 1}`}</span>
              <div><small>Constellation {index + 1}</small><h3>{constellation.name}</h3><p>{constellation.description}</p></div>
            </article>;
          })}
        </div>
      </section>

      <section className="character-bottom-grid">
        <article>
          <span className="banner-kicker"><RadioTower size={13} /> Wish intelligence</span>
          <h2>Banner signal</h2>
          <div><span><small>Appearances</small><strong>{stats?.appearanceCount ?? "—"}</strong></span><span><small>Current wait</small><strong>{stats?.currentWait ?? "—"}</strong></span><span><small>Pressure</small><strong>{stats?.pressureScore ?? "—"}</strong></span></div>
          <Link href={`/characters/${character.slug}/banner-history`}>Open complete history <ArrowRight size={13} /></Link>
        </article>
        <article>
          <span className="banner-kicker"><CalendarDays size={13} /> Voice archive</span>
          <h2>Cast</h2>
          <div className="voice-list">{Object.entries(voices).map(([language, actor]) => <span key={language}><small>{language}</small><strong>{String(actor)}</strong></span>)}</div>
        </article>
      </section>
    </div>
  );
}
