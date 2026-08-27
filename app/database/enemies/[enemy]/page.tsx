import { getTeyvatPersistentEntityQueries } from "@/lib/teyvat/engine";
import { 
  ArrowLeft, 
  Orbit, 
  Shield, 
  Sparkles, 
  Swords, 
  Zap, 
  Flame, 
  Droplets, 
  Wind, 
  Snowflake, 
  Leaf, 
  Mountain,
  Heart,
  Activity,
  Layers,
  HelpCircle,
  ExternalLink
} from "lucide-react";
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

function formatTipText(desc: string) {
  // Replace <color=#HEX>text</color> with styled colored text
  const parts = [];
  const regex = /<color=(#[A-Fa-f0-9]+)>(.*?)<\/color>/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(desc)) !== null) {
    if (match.index > lastIndex) {
      parts.push(desc.substring(lastIndex, match.index));
    }
    parts.push(
      <span key={match.index} style={{ color: match[1], fontWeight: 600 }}>
        {match[2]}
      </span>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < desc.length) {
    parts.push(desc.substring(lastIndex));
  }

  return parts.length > 0 ? parts : desc;
}

const RARITY_COLORS: Record<number, { border: string; glow: string; text: string; bg: string }> = {
  5: { border: "#d4af37", glow: "rgba(212, 175, 55, 0.2)", text: "#ffd77d", bg: "rgba(212, 175, 55, 0.08)" },
  4: { border: "#a366ff", glow: "rgba(163, 102, 255, 0.2)", text: "#cc9cff", bg: "rgba(163, 102, 255, 0.08)" },
  3: { border: "#4da6ff", glow: "rgba(77, 166, 255, 0.2)", text: "#72d6ff", bg: "rgba(77, 166, 255, 0.08)" },
  2: { border: "#62d5a3", glow: "rgba(98, 213, 163, 0.2)", text: "#9aebc7", bg: "rgba(98, 213, 163, 0.08)" },
  1: { border: "rgba(255, 255, 255, 0.15)", glow: "transparent", text: "#a1b3aa", bg: "rgba(255, 255, 255, 0.03)" },
};

export default async function EnemyDetailPage({
  params,
}: {
  params: Promise<{ enemy: string }>;
}) {
  const { enemy: slug } = await params;
  const entityQueries = await getTeyvatPersistentEntityQueries();
  const detail = await entityQueries.detail("enemies", slug);

  if (!detail) notFound();

  const { item: enemy } = detail;
  const data = enemy.canonicalData;
  const enemyFamily = text(data.type, "Monster");
  const specialName = text(data.special_name, "");
  const title = text(data.title, "");
  const description = enemy.description ?? "";
  const enemyIcon = typeof data.icon === "string" ? data.icon : null;
  const enemyImage = enemy.image || (enemyIcon ? `https://enka.network/ui/${enemyIcon}.png` : null);

  // Entries data (Resistances, Rewards, Stats, Affixes)
  const entriesObj = record(data.entries);
  const entryKeys = Object.keys(entriesObj);
  const primaryEntry = entryKeys.length > 0 ? record(entriesObj[entryKeys[0]]) : null;

  // Monster Category Type (Boss, Elite, Ordinary)
  const rawMonsterType = primaryEntry ? text(primaryEntry.type, "") : "";
  let monsterCategory = "Monster";
  if (rawMonsterType.includes("BOSS")) monsterCategory = "Boss";
  else if (rawMonsterType.includes("ELITE") || rawMonsterType.includes("ENVV")) monsterCategory = "Elite Enemy";
  else if (rawMonsterType.includes("ORDINARY")) monsterCategory = "Common Enemy";

  // Resistances
  const resistance = primaryEntry ? record(primaryEntry.resistance) : null;
  const resistances = [
    { label: "Physical", key: "physicalSubHurt", icon: Shield, color: "#e2b96a", bg: "rgba(226,185,106,0.12)" },
    { label: "Pyro", key: "fireSubHurt", icon: Flame, color: "#ff5a5a", bg: "rgba(255,90,90,0.12)" },
    { label: "Hydro", key: "waterSubHurt", icon: Droplets, color: "#45b6ff", bg: "rgba(69,182,255,0.12)" },
    { label: "Anemo", key: "windSubHurt", icon: Wind, color: "#5ceda1", bg: "rgba(92,237,161,0.12)" },
    { label: "Electro", key: "elecSubHurt", icon: Zap, color: "#c65df5", bg: "rgba(198,93,245,0.12)" },
    { label: "Dendro", key: "grassSubHurt", icon: Leaf, color: "#85cc33", bg: "rgba(133,204,51,0.12)" },
    { label: "Cryo", key: "iceSubHurt", icon: Snowflake, color: "#99ffff", bg: "rgba(153,255,255,0.12)" },
    { label: "Geo", key: "rockSubHurt", icon: Mountain, color: "#ffb13b", bg: "rgba(255,177,59,0.12)" },
  ].map((item) => {
    const rawVal = resistance ? Number(resistance[item.key]) : NaN;
    const value = !Number.isNaN(rawVal) ? Math.round(rawVal * 100) : null;
    return { ...item, value };
  });

  // Rewards / Drops
  const allRewardsMap = new Map<string, { id: string; name: string; icon: string; rank: number; count?: string }>();
  for (const entryVal of Object.values(entriesObj)) {
    const entryData = record(entryVal);
    const rewardData = record(entryData.reward);
    for (const [itemId, itemVal] of Object.entries(rewardData)) {
      const item = record(itemVal);
      const name = text(item.name, "");
      const icon = typeof item.icon === "string" ? item.icon : "";
      const rank = Number(item.rank) || 1;
      const count = typeof item.count === "string" ? item.count : undefined;
      if (name && !allRewardsMap.has(itemId)) {
        allRewardsMap.set(itemId, { id: itemId, name, icon, rank, count });
      }
    }
  }
  const rewardsList = Array.from(allRewardsMap.values()).sort((a, b) => b.rank - a.rank || a.name.localeCompare(b.name));

  // Tips / Tactical Guides
  const tipsObj = record(data.tips);
  const tipsList = Object.entries(tipsObj).map(([tipId, tipVal]) => {
    const t = record(tipVal);
    const desc = text(t.description, "");
    const images = Array.isArray(t.images) ? (t.images as string[]) : [];
    return { id: tipId, description: desc, images };
  }).filter((t) => t.description.length > 0);

  // Affixes / Special abilities
  const affixesList: Array<{ name: string; description: string }> = [];
  if (primaryEntry && Array.isArray(primaryEntry.affix)) {
    for (const af of primaryEntry.affix as DataRecord[]) {
      const name = text(af.name, "");
      const desc = text(af.description, "");
      if (name) affixesList.push({ name, description: desc });
    }
  }

  // Base Stats
  const propsList: Array<{ label: string; value: number | string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [];
  if (primaryEntry && Array.isArray(primaryEntry.prop)) {
    for (const p of primaryEntry.prop as DataRecord[]) {
      const propType = String(p.propType ?? "");
      const initVal = Number(p.initValue);
      if (propType.includes("BASE_HP")) {
        propsList.push({ label: "Base HP Multiplier", value: initVal.toFixed(2), icon: Heart });
      } else if (propType.includes("BASE_ATTACK")) {
        propsList.push({ label: "Base ATK Multiplier", value: initVal.toFixed(2), icon: Swords });
      } else if (propType.includes("BASE_DEFENSE")) {
        propsList.push({ label: "Base DEF Multiplier", value: initVal.toFixed(2), icon: Shield });
      }
    }
  }

  return (
    <div className="character-detail-page">
      {/* Hero Header */}
      <section className="character-detail-hero">
        <Link className="banner-back-link" href="/database/enemies">
          <ArrowLeft size={13} /> Enemy index
        </Link>

        <div className="character-detail-copy">
          <span className="banner-kicker">
            <Orbit size={13} /> Bestiary record / {enemyFamily.toLowerCase()}
          </span>

          <h1>
            {enemy.name}
            {specialName && specialName !== enemy.name ? <em>{specialName}</em> : null}
          </h1>

          {description ? <p>{description}</p> : null}

          <div className="character-tags">
            <span>
              <Shield size={12} />
              {monsterCategory}
            </span>
            <span>
              <Layers size={12} />
              {enemyFamily}
            </span>
            {title && title !== enemy.name && (
              <span>
                <Sparkles size={12} />
                {title}
              </span>
            )}
          </div>
        </div>

        <div className="character-detail-art flex items-center justify-center p-6">
          <span className="history-orbit" />
          {enemyImage ? (
            <div className="w-52 h-52 sm:w-64 sm:h-64 relative flex items-center justify-center">
              <Image
                src={enemyImage}
                alt={enemy.name}
                width={260}
                height={260}
                className="object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)]"
                priority
              />
            </div>
          ) : (
            <Swords size={84} className="text-[var(--accent)]" />
          )}
        </div>

        <div className="history-hero-signal">
          <span><i /> Bestiary archive</span>
          <strong>REVISION {enemy.gameVersion ?? "LIVE"}</strong>
        </div>
      </section>

      {/* 01 / Damage Resistances Matrix */}
      {resistance && (
        <section className="mb-10 mt-8">
          <header className="banner-section-heading mb-4">
            <div>
              <span>01 / Elemental & Physical Defenses</span>
              <h2>Damage Resistances</h2>
            </div>
            <p>Elemental & physical damage multiplier baselines</p>
          </header>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {resistances.map((res) => {
              const IconComp = res.icon;
              const isHighRes = res.value !== null && res.value >= 50;
              const isVulnerable = res.value !== null && res.value < 10;
              const isImmune = res.value !== null && res.value >= 100;

              return (
                <div
                  key={res.label}
                  className="bg-[var(--surface-sunken)] border border-white/5 rounded-xl p-3 flex flex-col items-center gap-2 relative overflow-hidden transition-all hover:border-white/20"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center border border-white/10"
                    style={{ backgroundColor: res.bg, color: res.color }}
                  >
                    <IconComp size={18} />
                  </div>

                  <span className="text-xs font-semibold text-[var(--text-light)]">{res.label}</span>

                  <div className="flex flex-col items-center">
                    <strong
                      className="font-mono text-sm"
                      style={{
                        color: isImmune ? "#ff5a5a" : isHighRes ? "#ffd77d" : isVulnerable ? "var(--green)" : "var(--text-light)",
                      }}
                    >
                      {res.value !== null ? (isImmune ? "IMMUNE" : `${res.value}%`) : "—"}
                    </strong>
                    {isHighRes && !isImmune && (
                      <small className="text-[9px] text-[#ffd77d] uppercase font-mono mt-0.5">High RES</small>
                    )}
                    {isVulnerable && (
                      <small className="text-[9px] text-[var(--green)] uppercase font-mono mt-0.5">Weakness</small>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 02 / Drops & Reward Table */}
      {rewardsList.length > 0 && (
        <section className="mb-10">
          <header className="banner-section-heading mb-4">
            <div>
              <span>02 / Loot & Materials</span>
              <h2>Drop Tables ({rewardsList.length})</h2>
            </div>
            <p>Character ascension materials, talent items, and artifacts rewarded</p>
          </header>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {rewardsList.map((reward) => {
              const rarityStyle = RARITY_COLORS[reward.rank] || RARITY_COLORS[1];
              const rewardIconUrl = reward.icon ? `https://enka.network/ui/${reward.icon}.png` : null;

              return (
                <div
                  key={reward.id}
                  className="bg-[var(--surface-sunken)] border border-white/5 rounded-xl p-3 flex flex-col items-center text-center gap-2 group hover:border-[var(--line-strong)] transition-all"
                  style={{ borderBottom: `3px solid ${rarityStyle.border}` }}
                >
                  <div className="w-14 h-14 rounded-lg bg-[var(--surface-raised)] border border-white/5 relative flex items-center justify-center p-1.5 overflow-hidden">
                    {rewardIconUrl ? (
                      <img
                        src={rewardIconUrl}
                        alt={reward.name}
                        className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300 drop-shadow-md"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <Sparkles size={20} className="text-[var(--text-muted)]" />
                    )}
                  </div>

                  <div className="flex flex-col items-center w-full min-w-0">
                    <span className="text-[10px] font-mono text-[var(--banner-gold)]">
                      {"✦".repeat(Math.min(reward.rank, 5))}
                    </span>
                    <strong className="text-xs font-semibold text-[var(--text-light)] line-clamp-2 mt-0.5" title={reward.name}>
                      {reward.name}
                    </strong>
                    {reward.count && (
                      <small className="text-[10px] text-[var(--text-muted)] font-mono mt-1">
                        Qty: {reward.count}
                      </small>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 03 / Combat Mechanics & Tactical Guides */}
      {(tipsList.length > 0 || affixesList.length > 0) && (
        <section className="mb-10">
          <header className="banner-section-heading mb-4">
            <div>
              <span>03 / Tactical Guide & Mechanics</span>
              <h2>Combat Behavior</h2>
            </div>
            <p>Archive tactical notes, vulnerabilities, and combat patterns</p>
          </header>

          <div className="flex flex-col gap-4">
            {tipsList.map((tip, idx) => (
              <div
                key={tip.id}
                className="bg-[var(--surface-sunken)] border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-start"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-mono font-bold flex items-center justify-center border border-[var(--accent)]/20">
                      {idx + 1}
                    </span>
                    <strong className="text-sm font-semibold text-[var(--text-light)]">Tactical Advisory</strong>
                  </div>
                  <p className="text-sm text-[var(--text-2)] leading-relaxed mt-2">
                    {formatTipText(tip.description)}
                  </p>
                </div>

                {tip.images && tip.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {tip.images.map((imgName) => (
                      <div
                        key={imgName}
                        className="w-44 h-28 relative rounded-lg overflow-hidden border border-white/10 bg-[var(--surface-raised)]"
                      >
                        <img
                          src={`https://enka.network/ui/${imgName}.png`}
                          alt="Combat Tutorial Diagram"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {affixesList.length > 0 && (
              <div className="bg-[var(--surface-sunken)] border border-white/5 rounded-2xl p-6">
                <strong className="text-xs font-mono uppercase text-[var(--accent)] tracking-wider block mb-3">
                  Inherent Affixes & Immunities
                </strong>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {affixesList.map((af, idx) => (
                    <div
                      key={idx}
                      className="bg-[var(--surface-raised)] border border-white/5 rounded-xl p-3.5 flex flex-col gap-1"
                    >
                      <strong className="text-xs font-bold text-[var(--text-light)]">{af.name}</strong>
                      {af.description && (
                        <p className="text-xs text-[var(--text-muted)] leading-normal mt-0.5">{af.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 04 / Base Attributes Profile */}
      {propsList.length > 0 && (
        <section className="mb-12">
          <header className="banner-section-heading mb-4">
            <div>
              <span>04 / Attribute Curves</span>
              <h2>Base Attributes</h2>
            </div>
            <p>Fundamental stat scalings at level base</p>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {propsList.map((prop) => {
              const PropIcon = prop.icon;
              return (
                <div
                  key={prop.label}
                  className="bg-[var(--surface-sunken)] border border-white/5 rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--surface-raised)] text-[var(--accent)] border border-white/5 flex items-center justify-center">
                      <PropIcon size={18} />
                    </div>
                    <div>
                      <span className="text-xs text-[var(--text-muted)] block">{prop.label}</span>
                      <strong className="text-base font-mono text-[var(--text-light)]">{prop.value}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
