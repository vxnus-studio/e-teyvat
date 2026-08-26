import { resolveImageUrl } from "@/app/api/utils";
import { getTeyvatBannerQueries } from "@/lib/teyvat/persistence/banners";
import { RotationClient, TimelinePhase } from "./rotation-client";

export const metadata = {
  title: "Rotation Timeline | E-Teyvat",
  description: "Chronological timeline of Genshin Impact banner phases from Version 1.0 to 7.0.",
};

export const dynamic = "force-dynamic";

export default async function BannerRotationPage() {
  const queries = await getTeyvatBannerQueries();
  const { phases: allPhases, appearances } = await queries.overview();

  const charactersByPhase = new Map<
    string,
    Array<{
      slug: string;
      name: string;
      rarity: number;
      imageUrl: string | null;
    }>
  >();

  for (const character of appearances) {
    const phaseCharacters = charactersByPhase.get(character.phaseId) ?? [];
    phaseCharacters.push({
      slug: character.slug,
      name: character.name,
      rarity: character.rarity,
      imageUrl: resolveImageUrl(null, character.canonicalData),
    });
    charactersByPhase.set(character.phaseId, phaseCharacters);
  }

  // Sort descending chronologically (newest 7.0 down to 1.0)
  const phasesChronologicalDesc: TimelinePhase[] = [...allPhases].reverse().map((phase) => ({
    id: phase.id,
    phaseKey: phase.phaseKey,
    version: phase.version,
    phaseNumber: phase.phaseNumber,
    sequenceIndex: phase.sequenceIndex,
    startDate: phase.startDate ? phase.startDate.toISOString() : null,
    endDate: phase.endDate ? phase.endDate.toISOString() : null,
    status: phase.status,
    characters: charactersByPhase.get(phase.id) ?? [],
  }));

  return <RotationClient allPhases={phasesChronologicalDesc} />;
}
