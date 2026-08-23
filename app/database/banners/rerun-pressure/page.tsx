import { resolveImageUrl } from "@/app/api/utils";
import { getTeyvatEPostgresBannerQueries } from "@/lib/teyvat/persistence/e-postgres-banners";
import { Activity, ArrowLeft, ArrowUpRight, Info, RadioTower } from "lucide-react";
import Link from "next/link";
import { CharacterPortrait, SignalGlyph } from "../banner-visuals";
import { PressureCurve } from "../client-charts";

export const metadata = {
  title: "Rerun Pressure | E-Teyvat",
  description: "Statistical banner pressure estimates based on historical rotations.",
};

export const dynamic = "force-dynamic";

function pressureBand(score: number | null) {
  if ((score ?? 0) >= 75) return "critical";
  if ((score ?? 0) >= 50) return "elevated";
  return "stable";
}

export default async function RerunPressurePage() {
  const queries = await getTeyvatEPostgresBannerQueries();
  const { currentPhase, characters: rankedCharacters } = await queries.pressure();
  const characters = rankedCharacters.map(({ character, ...stat }) => ({ ...character, ...stat }));

  const average = characters.length ? Math.round(characters.reduce((sum, character) => sum + (character.pressureScore ?? 0), 0) / characters.length) : 0;
  const highPressure = characters.filter((character) => (character.pressureScore ?? 0) >= 75).length;
  const curve = characters.map((character, index) => ({ rank: index + 1, score: character.pressureScore ?? 0 }));

  return (
    <div className="banner-subpage pressure-page">
      <header className="banner-subpage-hero pressure-hero">
        <Link className="banner-back-link" href="/database/banners"><ArrowLeft size={13} /> Observatory</Link>
        <span className="banner-kicker"><RadioTower size={13} /> Predictive telemetry / model v1</span>
        <h1>Rerun <em>pressure</em></h1>
        <p>Historical urgency, not prophecy. Compare each character&apos;s current absence against their own rotation rhythm.</p>
        <div className="pressure-hero-chart"><PressureCurve data={curve} /></div>
        <div className="pressure-hero-stats">
          <span><small>Network average</small><strong>{average}</strong></span>
          <span><small>High pressure</small><strong>{highPressure}</strong></span>
          <span><small>Reference phase</small><strong>{currentPhase?.sequenceIndex ?? "—"}</strong></span>
        </div>
      </header>

      <aside className="model-notice"><Info size={16} /><p><strong>Signal, not schedule.</strong> Scores model historical rotation patterns only. They are neither official information nor leaks, and intentional pattern breaks are expected.</p></aside>

      <section className="pressure-board">
        <header className="banner-section-heading">
          <div><span>Ranked transmission set</span><h2>Pressure index</h2></div>
          <p>{characters.length} characters · phase {currentPhase?.phaseKey ?? "unknown"}</p>
        </header>
        <div className="pressure-list">
          {characters.map((character, index) => {
            const score = character.pressureScore ?? 0;
            const band = pressureBand(score);
            return (
              <Link className={`pressure-row pressure-${band}`} href={`/characters/${character.slug}/banner-history`} key={character.slug}>
                <span className="pressure-rank">{String(index + 1).padStart(2, "0")}</span>
                <CharacterPortrait
                  slug={character.slug}
                  name={character.name}
                  imageUrl={resolveImageUrl(null, character.canonicalData)}
                  sizes="70px"
                />
                <span className="pressure-identity"><small>{character.pressureLevel?.replaceAll("_", " ") ?? band}</small><strong>{character.name}</strong></span>
                <span className="pressure-wait"><small>Current / median</small><strong>{character.currentWait} <i>/ {character.medianInterval ?? "—"} phases</i></strong></span>
                <span className="pressure-meter"><i><b style={{ width: `${score}%` }} /></i><small>{band}</small></span>
                <span className="pressure-confidence"><small>Confidence</small><strong>{character.confidenceScore ?? "—"}%</strong><em>{character.confidenceLevel ?? "unknown"}</em></span>
                <span className="pressure-score"><SignalGlyph value={score} /><strong>{score}</strong><small>/100</small></span>
                <ArrowUpRight className="pressure-arrow" size={15} />
              </Link>
            );
          })}
        </div>
        {!characters.length && <div className="banner-empty-panel"><Activity size={20} /> No pressure signals are available.</div>}
      </section>
    </div>
  );
}
