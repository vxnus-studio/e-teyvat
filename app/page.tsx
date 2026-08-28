import Image from "next/image";
import Link from "next/link";
import { Icon } from "./_components/navigation";
import { HomeRotation } from "./_components/home-rotation";
import { getTeyvatPersistentEntityQueries } from "@/lib/teyvat/engine";

const characterPreview = [
  { name: "Nahida", element: "Dendro", role: "Support", image: "/characters/nahida.png" },
  { name: "Furina", element: "Hydro", role: "Support", image: "/characters/furina.png" },
  { name: "Arlecchino", element: "Pyro", role: "DPS", image: "/characters/arlecchino.png" },
];

export default async function Home() {
  let characterCount = 134;

  try {
    const entityQueries = await getTeyvatPersistentEntityQueries();
    const charactersResult = await entityQueries.listEntities({ kind: "characters", limit: 1 });
    if (charactersResult.total > 0) {
      characterCount = charactersResult.total;
    }
  } catch (err) {
    console.error("Failed to query character count from DB:", err);
  }

  return (
    <>
      <HomeRotation />

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
          <div className="database-filters">
            <span>{characterCount} characters</span>
            <span>7 elements</span>
            <span>All regions</span>
          </div>
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
