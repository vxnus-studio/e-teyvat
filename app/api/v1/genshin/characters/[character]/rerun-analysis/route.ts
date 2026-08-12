import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import {
  entities,
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

  const stats = await db.query.bannerCharacterStatistics.findFirst({
    where: eq(bannerCharacterStatistics.characterId, charEntity.id),
  });

  if (!stats) {
    return NextResponse.json({ error: "No statistics available for this character." }, { status: 404 });
  }

  return NextResponse.json({
    character: {
      id: charEntity.slug,
      name: charEntity.name,
    },
    statistics: {
      appearanceCount: stats.appearanceCount,
      completedIntervalCount: stats.completedIntervalCount,
      intervals: stats.intervals,
      currentWait: stats.currentWait,
      meanInterval: stats.meanInterval ? Number(stats.meanInterval.toFixed(2)) : null,
      medianInterval: stats.medianInterval,
      minimumInterval: stats.minimumInterval,
      maximumInterval: stats.maximumInterval,
      modeIntervals: stats.modeIntervals,
      currentWaitPercentile: stats.currentWaitPercentile ? Math.round(stats.currentWaitPercentile) : null,
    },
    analysis: {
      pressureScore: stats.pressureScore,
      pressureLevel: stats.pressureLevel,
      confidenceScore: stats.confidenceScore,
      confidenceLevel: stats.confidenceLevel,
      summary: stats.pressureScore && stats.pressureScore > 70 
        ? `${charEntity.name} has entered their typical historical rerun window.` 
        : `${charEntity.name} is likely not due for a rerun immediately based on historical patterns.`,
      reasons: stats.reasons?.map((r: any) => r.message) ?? [],
    },
    disclaimer: "This is a statistical estimate based on historical banner rotations. It is not official information or a leak.",
    modelVersion: stats.modelVersion,
  });
}
