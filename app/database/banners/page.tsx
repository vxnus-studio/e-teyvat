import { resolveImageUrl } from "@/app/api/utils";
import { getTeyvatBannerQueries } from "@/lib/teyvat/persistence/banners";
import { Activity, ArrowRight, CalendarRange, ChartNoAxesCombined, Clock3, Orbit, Sparkles, Sword } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CharacterPortrait } from "./banner-visuals";
import { WaitDistributionChart } from "./client-charts";

export const metadata = {
  title: "Wish Observatory | E-Teyvat",
  description: "Live Genshin Impact banner rotation, weapon banner transmissions, and rerun intelligence.",
};

export const dynamic = "force-dynamic";

export default async function BannersPage() {
  const queries = await getTeyvatBannerQueries();
  const { currentPhase, appearances, weaponAppearances, statistics } = await queries.overview();
  const featuredChars = currentPhase ? appearances.filter((character) => character.phaseId === currentPhase.id) : [];
  const featuredWeapons = currentPhase ? weaponAppearances.filter((weapon) => weapon.phaseId === currentPhase.id) : [];

  const waitCounts = new Map<number, number>();
  for (const stat of statistics.filter((stat) => stat.pressureScore !== null)) {
    waitCounts.set(stat.currentWait, (waitCounts.get(stat.currentWait) ?? 0) + 1);
  }
  const distributionData = Array.from(waitCounts, ([wait, count]) => ({ wait, count })).sort((a, b) => a.wait - b.wait);
  
  const fiveStars = featuredChars.filter((character) => character.rarity === 5);
  const fourStars = featuredChars.filter((character) => character.rarity === 4);
  const fiveStarWeapons = featuredWeapons.filter((w) => w.rarity === 5);
  const fourStarWeapons = featuredWeapons.filter((w) => w.rarity === 4);
  const maxWait = statistics.length ? Math.max(...statistics.map((stat) => stat.currentWait)) : 0;

  return (
    <div className="banner-observatory">
      <section className="banner-hero">
        <div className="banner-hero-copy">
          <span className="banner-kicker">
            <Orbit size={13} /> Wish intelligence / live archive
          </span>
          <h1>
            Banner
            <br />
            <em>Observatory</em>
          </h1>
          <p>
            Track the current signal, inspect character and weapon banner rotations, and read the statistical pressure building across Teyvat&apos;s wish history.
          </p>
          <div className="banner-hero-actions">
            <Link href="/database/banners/rotation">
              Explore timeline <ArrowRight size={14} />
            </Link>
            <Link href="/database/banners/rerun-pressure">View pressure index</Link>
          </div>
        </div>
        <div className="banner-orbit-visual" aria-hidden="true">
          <span className="orbit-ring ring-one" />
          <span className="orbit-ring ring-two" />
          <span className="orbit-core">
            <Sparkles size={28} />
          </span>
          <span className="orbit-label orbit-label-one">
            PHASE {currentPhase?.sequenceIndex ?? "—"}
          </span>
          <span className="orbit-label orbit-label-two">{statistics.length} SIGNALS</span>
          <span className="orbit-label orbit-label-three">SYNCED</span>
        </div>
        <div className="banner-telemetry">
          <span>
            <i /> Archive online
          </span>
          <strong>
            {currentPhase
              ? `V${currentPhase.version} · P${currentPhase.phaseNumber}`
              : "NO ACTIVE PHASE"}
          </strong>
        </div>
      </section>

      <section className="banner-metric-grid" aria-label="Banner metrics">
        <article>
          <CalendarRange size={18} />
          <div>
            <span>Current sequence</span>
            <strong>{currentPhase?.sequenceIndex ?? "—"}</strong>
          </div>
          <small>Global phase index</small>
        </article>
        <article>
          <Activity size={18} />
          <div>
            <span>Tracked signals</span>
            <strong>{statistics.length}</strong>
          </div>
          <small>Pressure-ready units</small>
        </article>
        <article>
          <Clock3 size={18} />
          <div>
            <span>Longest wait</span>
            <strong>{maxWait}</strong>
          </div>
          <small>Completed phases</small>
        </article>
      </section>

      {/* Event Wish Section */}
      <section className="current-wish-panel">
        <header className="banner-section-heading">
          <div>
            <span>01 / Character Signal</span>
            <h2>Character Event Wishes</h2>
          </div>
          <p>
            {currentPhase
              ? `${currentPhase.status} · Version ${currentPhase.version} / Phase ${currentPhase.phaseNumber}`
              : "Awaiting the next archive sync"}
          </p>
        </header>
        {currentPhase ? (
          <div className="featured-wish-grid">
            <div className="five-star-stage">
              <div className="stage-grid" />
              <span className="rarity-mark">✦ 5-star featured transmission</span>
              <div className="featured-portraits">
                {fiveStars.map((character, index) => (
                  <Link
                    className={`featured-portrait portrait-${index + 1}`}
                    href={`/characters/${character.slug}/banner-history`}
                    key={character.slug}
                  >
                    <CharacterPortrait
                      slug={character.slug}
                      name={character.name}
                      imageUrl={resolveImageUrl(null, character.canonicalData)}
                      sizes="(max-width: 760px) 45vw, 260px"
                    />
                    <span>
                      <small>Event wish</small>
                      <strong>{character.name}</strong>
                    </span>
                  </Link>
                ))}
                {!fiveStars.length && (
                  <p className="banner-empty">No featured five-star records in this phase.</p>
                )}
              </div>
            </div>
            <aside className="four-star-roster">
              <span className="roster-label">Support frequency</span>
              <h3>Featured 4-stars</h3>
              <p>Linked directly to each unit&apos;s appearance history.</p>
              <div>
                {fourStars.map((character, index) => (
                  <Link
                    href={`/characters/${character.slug}/banner-history`}
                    key={character.slug}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{character.name}</strong>
                    <ArrowRight size={13} />
                  </Link>
                ))}
              </div>
            </aside>
          </div>
        ) : (
          <div className="banner-empty-panel">
            No active or upcoming banner is present in the archive.
          </div>
        )}
      </section>

      {/* Weapon Banner Transmission Section */}
      {featuredWeapons.length > 0 && (
        <section className="current-wish-panel">
          <header className="banner-section-heading">
            <div>
              <span>02 / Epitome Invocation</span>
              <h2>Weapon Event Wishes</h2>
            </div>
            <p>
              {currentPhase
                ? `Version ${currentPhase.version} / Phase ${currentPhase.phaseNumber} weapon transmissions`
                : "Active weapon rates"}
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 5-Star Weapons Stage */}
            <div className="lg:col-span-8 bg-[var(--surface-sunken)] border border-white/5 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="text-amber-400 font-bold text-xs tracking-widest uppercase flex items-center gap-1.5 font-mono">
                  <Sparkles size={14} /> 5-Star Featured Weapons
                </span>
                <span className="text-xs text-[var(--text-muted)] font-mono">Epitome Invocation</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-2">
                {fiveStarWeapons.map((weapon) => (
                  <Link
                    href={`/database/weapons/${weapon.slug}`}
                    key={weapon.id}
                    className="flex items-center gap-4 bg-[var(--surface)] hover:bg-[var(--surface-raised)] border border-amber-500/20 hover:border-amber-400/60 rounded-xl p-4 transition-all group hover:scale-[1.02]"
                  >
                    <div className="w-16 h-16 rounded-lg bg-black/40 relative overflow-hidden flex items-center justify-center p-2 border border-white/5 shrink-0">
                      {resolveImageUrl(null, weapon.canonicalData) ? (
                        <Image
                          src={resolveImageUrl(null, weapon.canonicalData)!}
                          alt={weapon.name}
                          width={56}
                          height={56}
                          className="object-contain drop-shadow group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <Sword size={24} className="text-amber-400" />
                      )}
                    </div>
                    <div>
                      <span className="text-amber-400 text-xs font-bold tracking-wider">✦✦✦✦✦</span>
                      <strong className="text-base block text-white group-hover:text-[var(--accent)] transition-colors">
                        {weapon.name}
                      </strong>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* 4-Star Weapons List */}
            <div className="lg:col-span-4 bg-[var(--surface-sunken)] border border-white/5 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <span className="text-purple-400 font-bold text-xs tracking-widest uppercase block mb-1 font-mono">
                  4-Star Weapons
                </span>
                <p className="text-xs text-[var(--text-muted)] mb-4">Rate-up armaments</p>
                <div className="flex flex-col gap-2">
                  {fourStarWeapons.map((weapon) => (
                    <Link
                      href={`/database/weapons/${weapon.slug}`}
                      key={weapon.id}
                      className="flex items-center justify-between p-2.5 px-3 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-raised)] border border-white/5 hover:border-purple-400/40 text-sm text-[var(--text-light)] hover:text-white transition-all group"
                    >
                      <strong className="group-hover:text-purple-300 transition-colors font-medium">
                        {weapon.name}
                      </strong>
                      <ArrowRight size={13} className="text-[var(--text-muted)] group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="banner-analysis-grid">
        <article className="banner-chart-card">
          <header>
            <div>
              <span>03 / Distribution</span>
              <h2>Wait-state spectrum</h2>
            </div>
            <ChartNoAxesCombined size={20} />
          </header>
          <p>How many tracked four-stars occupy each wait interval.</p>
          <div className="banner-chart-wrap">
            <WaitDistributionChart data={distributionData} />
          </div>
          <div className="chart-axis-note">
            <span>Recent rotation</span>
            <span>Phases waiting →</span>
            <span>Deep archive</span>
          </div>
        </article>
        <div className="banner-route-stack">
          <Link href="/database/banners/rotation">
            <span className="route-index">A / 01</span>
            <CalendarRange size={22} />
            <div>
              <small>Chronological archive</small>
              <h3>Rotation timeline</h3>
              <p>Traverse the latest phase records, character rate-ups, and weapon banners.</p>
            </div>
            <ArrowRight size={17} />
          </Link>
          <Link href="/database/banners/rerun-pressure">
            <span className="route-index">A / 02</span>
            <Activity size={22} />
            <div>
              <small>Predictive telemetry</small>
              <h3>Rerun pressure</h3>
              <p>Compare wait intervals, model confidence, and historical urgency.</p>
            </div>
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </div>
  );
}
