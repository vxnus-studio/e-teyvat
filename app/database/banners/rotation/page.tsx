import { getDatabase } from "@/db/client";
import { bannerPhases, bannerPhaseCharacters, entities } from "@/db/schema";
import { resolveImageUrl } from "@/app/api/utils";
import { desc, eq } from "drizzle-orm";
import { ArrowLeft, ArrowRight, CalendarDays, Orbit } from "lucide-react";
import Link from "next/link";
import { CharacterPortrait } from "../banner-visuals";

export const metadata = {
  title: "Rotation Timeline | E-Teyvat",
  description: "Chronological timeline of Genshin Impact banner phases.",
};

export default async function BannerRotationPage() {
  const db = getDatabase();
  const phases = await db.select().from(bannerPhases).orderBy(desc(bannerPhases.sequenceIndex)).limit(20);
  const phaseIds = new Set(phases.map((phase) => phase.id));
  const charactersByPhase = new Map<number, Array<{
    slug: string;
    name: string;
    rarity: number;
    imageUrl: string | null;
  }>>();

  if (phaseIds.size) {
    const allCharacters = await db.select({
      phaseId: bannerPhaseCharacters.phaseId,
      slug: entities.slug,
      name: entities.name,
      rarity: bannerPhaseCharacters.rarity,
      customImageUrl: entities.customImageUrl,
      canonicalData: entities.canonicalData,
    }).from(bannerPhaseCharacters).innerJoin(entities, eq(bannerPhaseCharacters.characterId, entities.id));

    for (const character of allCharacters) {
      if (!phaseIds.has(character.phaseId)) continue;
      const phaseCharacters = charactersByPhase.get(character.phaseId) ?? [];
      phaseCharacters.push({
        slug: character.slug,
        name: character.name,
        rarity: character.rarity,
        imageUrl: resolveImageUrl(character.customImageUrl, character.canonicalData),
      });
      charactersByPhase.set(character.phaseId, phaseCharacters);
    }
  }

  return (
    <div className="banner-subpage">
      <header className="banner-subpage-hero">
        <Link className="banner-back-link" href="/database/banners"><ArrowLeft size={13} /> Observatory</Link>
        <span className="banner-kicker"><Orbit size={13} /> Archive traversal / 20 latest phases</span>
        <h1>Rotation <em>timeline</em></h1>
        <p>A chronological scan of featured character transmissions, indexed across every recorded version.</p>
        <div className="timeline-legend"><span><i className="active-dot" /> Active</span><span><i className="five-dot" /> 5-star</span><span><i className="four-dot" /> 4-star</span></div>
      </header>

      <section className="phase-timeline">
        {phases.map((phase, index) => {
          const featured = charactersByPhase.get(phase.id) ?? [];
          const fiveStars = featured.filter((character) => character.rarity === 5);
          const fourStars = featured.filter((character) => character.rarity === 4);
          return (
            <article className={`phase-record ${phase.status === "active" ? "is-active" : ""}`} key={phase.id}>
              <div className="timeline-node"><span>{String(index + 1).padStart(2, "0")}</span></div>
              <div className="phase-card">
                <header>
                  <div className="phase-version">
                    <span>SEQ / {String(phase.sequenceIndex).padStart(3, "0")}</span>
                    <h2>Version {phase.version} <em>Phase {phase.phaseNumber}</em></h2>
                  </div>
                  <div className="phase-date">
                    <CalendarDays size={14} />
                    <span>{phase.startDate?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) ?? "Unknown"}<i>→</i>{phase.endDate?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) ?? "Open"}</span>
                  </div>
                  <span className={`phase-status status-${phase.status}`}>{phase.status}</span>
                </header>
                <div className="phase-lineup">
                  <div className="phase-five-stars">
                    {fiveStars.map((character) => (
                      <Link href={`/characters/${character.slug}/banner-history`} key={character.slug}>
                        <CharacterPortrait slug={character.slug} name={character.name} imageUrl={character.imageUrl} sizes="130px" />
                        <span><small>✦ 5-star feature</small><strong>{character.name}</strong></span>
                      </Link>
                    ))}
                    {!fiveStars.length && <span className="phase-no-data">No five-star record</span>}
                  </div>
                  <div className="phase-four-stars">
                    <span className="roster-label">4-star constellation</span>
                    <div>
                      {fourStars.map((character) => (
                        <Link href={`/characters/${character.slug}/banner-history`} key={character.slug}>
                          <CharacterPortrait
                            slug={character.slug}
                            name={character.name}
                            imageUrl={character.imageUrl}
                            sizes="38px"
                          />
                          <span>{character.name}</span>
                          <ArrowRight size={10} />
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
