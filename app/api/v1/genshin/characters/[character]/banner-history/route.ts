import { NextRequest, NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import {
  entities,
  bannerPhaseCharacters,
  bannerPhases,
  bannerSources,
  bannerCharacterStatistics
} from "@/db/schema";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ character: string }> }
) {
  const db = getDatabase();
  const { character: slug } = await params;

  const charEntity = await db.query.entities.findFirst({
    where: eq(entities.slug, slug),
  });

  if (!charEntity) {
    return NextResponse.json({ error: "Character not found" }, { status: 404 });
  }

  const appearances = await db
    .select({
      phaseKey: bannerPhases.phaseKey,
      version: bannerPhases.version,
      phaseNumber: bannerPhases.phaseNumber,
      sequenceIndex: bannerPhases.sequenceIndex,
      startDate: bannerPhases.startDate,
      endDate: bannerPhases.endDate,
    })
    .from(bannerPhaseCharacters)
    .innerJoin(bannerPhases, eq(bannerPhaseCharacters.phaseId, bannerPhases.id))
    .where(eq(bannerPhaseCharacters.characterId, charEntity.id))
    .orderBy(asc(bannerPhases.sequenceIndex));

  const stats = await db.query.bannerCharacterStatistics.findFirst({
    where: eq(bannerCharacterStatistics.characterId, charEntity.id),
  });

  const source = await db.query.bannerSources.findFirst({
    orderBy: (sources, { desc }) => [desc(sources.importedAt)],
  });

  return NextResponse.json({
    character: {
      id: charEntity.slug,
      name: charEntity.name,
      rarity: appearances.length > 0 ? (await db.query.bannerPhaseCharacters.findFirst({
        where: eq(bannerPhaseCharacters.characterId, charEntity.id)
      }))?.rarity : null,
    },
    appearances: appearances.map(app => ({
      phaseKey: app.phaseKey,
      version: app.version,
      phaseNumber: app.phaseNumber,
      sequenceIndex: app.sequenceIndex,
      startDate: app.startDate?.toISOString().split('T')[0] ?? null,
      endDate: app.endDate?.toISOString().split('T')[0] ?? null,
    })),
    intervals: stats?.intervals ?? [],
    currentWait: stats?.currentWait ?? 0,
    source: source ? {
      name: source.name,
      commitSha: source.commitSha,
      importedAt: source.importedAt,
    } : null,
  });
}
