import { DatabaseShell } from "../_components/database-shell";
import { getTeyvatLoreQueries } from "@/lib/teyvat/engine";
import { LoreConsole } from "./lore-console";

export const metadata = {
  title: "Lore Engine | E-Teyvat",
  description: "Explore canonical Genshin Impact in-game books, artifact chronicles, weapon histories, and monster legends.",
};

export default async function LorePage() {
  const loreQueries = await getTeyvatLoreQueries();
  const overview = loreQueries.overview();
  const initialSearch = loreQueries.search({ limit: 30 });

  return (
    <DatabaseShell
      eyebrow="Narrative & Lore Archive"
      title="The Lore Engine"
      description="Machine-readable archive and reader for 1,239 in-game book volumes, 299 artifact set histories, weapon legends, and bestiary records grounded in canonical evidence."
    >
      <LoreConsole overview={overview} initialItems={initialSearch.items} />
    </DatabaseShell>
  );
}
