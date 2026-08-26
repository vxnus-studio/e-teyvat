import { CharacterPortrait } from "@/app/database/banners/banner-visuals";
import { getTeyvatPersistentEntityQueries } from "@/lib/teyvat/engine";
import { getTeyvatBannerQueries } from "@/lib/teyvat/persistence/banners";
import { ArrowLeft, ArrowRight, CalendarDays, Gem, Orbit, RadioTower, Sword, Zap } from "lucide-react";
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

  const ascensionRelations = relations.filter((r) => r.predicate === "ascension_cost");
  const talentRelations = relations.filter((r) => r.predicate === "talent_material");

  const uniqueAscensionMaterials = Array.from(
    new Map(ascensionRelations.map((r) => [r.object.id, r.object])).values(),
  );

  const uniqueTalentMaterials = Array.from(
    new Map(talentRelations.map((r) => [r.object.id, r.object])).values(),
  );

  const rarity = typeof character.rarity === "number" ? character.rarity : 4;
  const title = text(fetter.title) !== "—" ? text(fetter.title) : "";
  const affiliation = text(fetter.native) !== "—" ? text(fetter.native) : text(data.region);
  const constellation = text(fetter.constellation) !== "—" ? text(fetter.constellation) : "—";
  const birthday = formatBirthday(data.birthday);
  const substat = formatStat(data.special_prop);
  const element = character.element ?? text(data.element);
  const weapon = text(data.weapon_type);
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

      {uniqueAscensionMaterials.length > 0 && (
        <section className="character-section">
          <header className="banner-section-heading">
            <div>
              <span>01 / Progression</span>
              <h2>Ascension Materials</h2>
            </div>
            <p>{uniqueAscensionMaterials.length} required material families</p>
          </header>
          <div className="flex flex-wrap gap-4 pt-2">
            {uniqueAscensionMaterials.map((material) => (
              <Link
                href={`/database/materials?q=${encodeURIComponent(material.name)}`}
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
                  <strong className="text-sm block text-[var(--text-light)] group-hover:text-[var(--accent)]">{material.name}</strong>
                  <small className="text-xs text-[var(--text-muted)] capitalize">{material.kind}</small>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {uniqueTalentMaterials.length > 0 && (
        <section className="character-section">
          <header className="banner-section-heading">
            <div>
              <span>02 / Combat System</span>
              <h2>Talent Materials</h2>
            </div>
            <p>{uniqueTalentMaterials.length} required skill materials</p>
          </header>
          <div className="flex flex-wrap gap-4 pt-2">
            {uniqueTalentMaterials.map((material) => (
              <Link
                href={`/database/materials?q=${encodeURIComponent(material.name)}`}
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
                  <strong className="text-sm block text-[var(--text-light)] group-hover:text-[var(--accent)]">{material.name}</strong>
                  <small className="text-xs text-[var(--text-muted)] capitalize">{material.kind}</small>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

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
