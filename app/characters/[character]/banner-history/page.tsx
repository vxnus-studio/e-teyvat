import { resolveImageUrl } from "@/app/api/utils";
import { CharacterPortrait, SignalGlyph } from "@/app/database/banners/banner-visuals";
import { getDatabase } from "@/db/client";
import { bannerCharacterStatistics, bannerPhaseCharacters, bannerPhases, entities } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { Activity, ArrowLeft, CalendarDays, Clock3, Info, Orbit, RadioTower } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function CharacterBannerHistoryPage({
  params,
}: {
  params: Promise<{ character: string }>;
}) {
  const db = getDatabase();
  const { character: characterSlug } = await params;
  const character = await db.query.entities.findFirst({
    where: eq(entities.slug, characterSlug),
  });

  if (!character) notFound();

  const [appearances, stats] = await Promise.all([
    db.select({
      phaseKey: bannerPhases.phaseKey,
      version: bannerPhases.version,
      phaseNumber: bannerPhases.phaseNumber,
      sequenceIndex: bannerPhases.sequenceIndex,
      startDate: bannerPhases.startDate,
      endDate: bannerPhases.endDate,
      status: bannerPhases.status,
      rarity: bannerPhaseCharacters.rarity,
    })
      .from(bannerPhaseCharacters)
      .innerJoin(bannerPhases, eq(bannerPhaseCharacters.phaseId, bannerPhases.id))
      .where(eq(bannerPhaseCharacters.characterId, character.id))
      .orderBy(asc(bannerPhases.sequenceIndex)),
    db.query.bannerCharacterStatistics.findFirst({
      where: eq(bannerCharacterStatistics.characterId, character.id),
    }),
  ]);

  const imageUrl = resolveImageUrl(character.customImageUrl, character.canonicalData);
  const latestAppearance = appearances.at(-1);
  const pressureScore = stats?.pressureScore ?? 0;
  const intervals = stats?.intervals ?? [];

  return (
    <div className="character-history-page">
      <section className="character-history-hero">
        <Link className="banner-back-link" href="/database/banners/rerun-pressure">
          <ArrowLeft size={13} /> Pressure index
        </Link>
        <div className="history-hero-copy">
          <span className="banner-kicker"><Orbit size={13} /> Character signal / historical record</span>
          <div className="history-rarity">{"✦".repeat(appearances[0]?.rarity ?? 4)}</div>
          <h1>{character.name}<em>banner history</em></h1>
          <p>Every recorded appearance, completed interval, and current rerun-pressure signal in one telemetry view.</p>
          <div className="history-last-seen">
            <CalendarDays size={14} />
            <span>Last recorded transmission</span>
            <strong>{latestAppearance ? `Version ${latestAppearance.version} · Phase ${latestAppearance.phaseNumber}` : "No appearance recorded"}</strong>
          </div>
        </div>
        <div className="history-portrait">
          <span className="history-orbit" aria-hidden="true" />
          <CharacterPortrait
            slug={character.slug}
            name={character.name}
            imageUrl={imageUrl}
            sizes="(max-width: 700px) 72vw, 390px"
          />
        </div>
        <div className="history-hero-signal">
          <span><i /> Archive synchronized</span>
          <strong>{appearances.length} APPEARANCES</strong>
        </div>
      </section>

      <section className="history-metrics" aria-label="Banner statistics">
        <article>
          <Clock3 size={17} />
          <span><small>Current wait</small><strong>{stats?.currentWait ?? "—"} <i>phases</i></strong></span>
        </article>
        <article>
          <Activity size={17} />
          <span><small>Median interval</small><strong>{stats?.medianInterval ?? "—"} <i>phases</i></strong></span>
        </article>
        <article>
          <RadioTower size={17} />
          <span><small>Pressure signal</small><strong className="capitalize">{stats?.pressureLevel?.replaceAll("_", " ") ?? "Unavailable"}</strong></span>
        </article>
        <article className="history-score-card">
          <SignalGlyph value={pressureScore} />
          <span><small>Model score</small><strong>{stats?.pressureScore ?? "—"}<i>/100</i></strong></span>
        </article>
      </section>

      <aside className="model-notice history-notice">
        <Info size={16} />
        <p><strong>Historical signal, not schedule.</strong> This analysis is neither official information nor a leak. Rotation patterns can be broken intentionally.</p>
        <span>{stats?.confidenceScore ?? "—"}% confidence · {stats?.confidenceLevel ?? "unknown"}</span>
      </aside>

      <section className="history-data-grid">
        <article className="history-interval-panel">
          <header className="banner-section-heading">
            <div><span>01 / Rhythm</span><h2>Interval telemetry</h2></div>
            <p>{intervals.length} completed intervals</p>
          </header>
          <div className="interval-visual">
            {intervals.length ? intervals.map((interval, index) => (
              <div className="interval-bar" key={`${interval}-${index}`}>
                <span style={{ height: `${Math.max(16, Math.min(100, interval * 10))}%` }} />
                <strong>{interval}</strong>
                <small>P{index + 1}</small>
              </div>
            )) : <p>No completed intervals are available yet.</p>}
          </div>
          <div className="interval-range">
            <span><small>Minimum</small><strong>{stats?.minimumInterval ?? "—"}</strong></span>
            <span><small>Mean</small><strong>{stats?.meanInterval?.toFixed(1) ?? "—"}</strong></span>
            <span><small>Maximum</small><strong>{stats?.maximumInterval ?? "—"}</strong></span>
          </div>
        </article>

        <article className="history-reasons-panel">
          <header className="banner-section-heading">
            <div><span>02 / Model trace</span><h2>Why this score</h2></div>
          </header>
          <div className="history-reasons">
            {stats?.reasons?.length ? stats.reasons.map((reason, index) => (
              <div key={`${reason.reasonCode}-${index}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{reason.message}</p>
                <strong>{reason.weight ? `${Math.round(reason.weight * 100)}%` : "context"}</strong>
              </div>
            )) : <p className="history-empty">No model reasons are available for this character.</p>}
          </div>
        </article>
      </section>

      <section className="history-timeline-section">
        <header className="banner-section-heading">
          <div><span>03 / Archive</span><h2>Appearance timeline</h2></div>
          <p>Oldest → newest</p>
        </header>
        <div className="character-appearance-rail">
          {appearances.map((appearance, index) => (
            <article key={appearance.phaseKey}>
              <span className="appearance-node">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <small>SEQ / {String(appearance.sequenceIndex).padStart(3, "0")}</small>
                <h3>Version {appearance.version}</h3>
                <strong>Phase {appearance.phaseNumber}</strong>
                <p>{appearance.startDate?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) ?? "Unknown"}<i>→</i>{appearance.endDate?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) ?? "Open"}</p>
                <code>{appearance.phaseKey}</code>
              </div>
            </article>
          ))}
          {!appearances.length && <div className="history-empty">No banner appearances found for this character.</div>}
        </div>
      </section>
    </div>
  );
}
