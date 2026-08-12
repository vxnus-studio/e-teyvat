import Image from "next/image";
import Link from "next/link";
import { Icon, type IconName } from "./_components/navigation";

const rotations = [
  { type: "Weapon materials", title: "All series available", note: "Sunday selection", icon: "sword" as IconName, color: "gold", drops: ["D", "A", "B"] },
  { type: "Talent books", title: "All teachings available", note: "Sunday selection", icon: "users" as IconName, color: "cyan", drops: ["F", "I", "O"] },
  { type: "Weekly bosses", title: "3 discounted claims", note: "Resets Monday", icon: "enemy" as IconName, color: "violet", drops: ["W", "30", "3×"] },
];

const characterPreview = [
  { name: "Nahida", element: "Dendro", role: "Support", image: "/characters/nahida.png" },
  { name: "Furina", element: "Hydro", role: "Support", image: "/characters/furina.png" },
  { name: "Arlecchino", element: "Pyro", role: "DPS", image: "/characters/arlecchino.png" },
];

export default function Home() {
  return (
    <>
      <section className="page-heading">
        <div><h1>Home</h1><p>Daily game data at a glance.</p></div>
        <div className="server-time"><Icon name="clock" size={15} /><span>Server reset in</span><strong>07:42:18</strong></div>
      </section>

      <section className="rotation-section" id="rotation" aria-labelledby="rotation-title">
        <div className="section-header">
          <div><span className="section-icon"><Icon name="calendar" /></span><div><h2 id="rotation-title">Today&apos;s Rotation</h2><p>Sunday · All material domains are open</p></div></div>
          <Link href="/database/domains/">All domains <Icon name="chevron" size={14} /></Link>
        </div>
        <div className="rotation-grid">
          {rotations.map((item) => (
            <Link className={`rotation-card ${item.color}`} href="/database/domains/" key={item.type}>
              <span className="rotation-icon"><Icon name={item.icon} /></span>
              <div><span>{item.type}</span><strong>{item.title}</strong><small>{item.note}</small></div>
              <div className="drop-stack">{item.drops.map((drop) => <i key={drop}>{drop}</i>)}</div>
              <Icon name="chevron" size={14} />
            </Link>
          ))}
        </div>
      </section>

      <section className="banner-grid" id="banners" aria-label="Current banners">
        <Link className="banner-image-card" href="/knowledge/">
          <div className="banner-placeholder character-placeholder">
            <span className="placeholder-icon"><Icon name="users" size={24} /></span>
            <span className="placeholder-copy">
              <strong>Ask across character data</strong>
              <small>Exact facts with graph evidence</small>
            </span>
          </div>
          <div className="banner-caption">
            <div><span>AI retrieval</span><strong>Trace entities and relations</strong></div>
            <Icon name="chevron" size={16} />
          </div>
        </Link>

        <Link className="banner-image-card" href="/explore/">
          <div className="banner-placeholder weapon-placeholder">
            <span className="placeholder-icon"><Icon name="sword" size={24} /></span>
            <span className="placeholder-copy">
              <strong>Search every entity</strong>
              <small>Characters, weapons, materials, domains</small>
            </span>
          </div>
          <div className="banner-caption">
            <div><span>Knowledge explorer</span><strong>Browse the normalized archive</strong></div>
            <Icon name="chevron" size={16} />
          </div>
        </Link>
      </section>

      <section className="character-database" id="characters" aria-labelledby="characters-title">
        <div className="database-copy">
          <span className="section-eyebrow">Character Database</span>
          <h2 id="characters-title">Find builds for every character</h2>
          <p>Talents, materials, weapons, artifacts, teams, and rotations in one place.</p>
          <div className="database-filters"><span>102 characters</span><span>7 elements</span><span>All regions</span></div>
          <Link className="primary-action" href="/database/characters/">Browse characters <Icon name="chevron" size={15} /></Link>
        </div>
        <div className="database-portraits">
          {characterPreview.map((character, index) => (
            <div className={`database-character character-${index + 1}`} key={character.name}>
              <Image src={character.image} alt={`${character.name} portrait`} fill sizes="(max-width: 640px) 42vw, 230px" />
              <span><strong>{character.name}</strong><small>{character.element} · {character.role}</small></span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
