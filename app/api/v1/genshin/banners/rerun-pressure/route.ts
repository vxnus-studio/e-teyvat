import { NextRequest, NextResponse } from "next/server";
import { eq, desc, isNotNull, and } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import {
  entities,
  bannerCharacterStatistics,
  bannerPhases
} from "@/db/schema";

export async function GET(req: NextRequest) {
  const db = getDatabase();
  const searchParams = req.nextUrl.searchParams;
  
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const offset = parseInt(searchParams.get("offset") ?? "0");
  const pressureLevelParam = searchParams.get("pressureLevel");
  
  // Find current phase sequence index for context
  const currentPhase = await db.query.bannerPhases.findFirst({
    where: eq(bannerPhases.status, "active"),
    orderBy: (phases, { desc }) => [desc(phases.sequenceIndex)],
  }) || await db.query.bannerPhases.findFirst({
    where: eq(bannerPhases.status, "completed"),
    orderBy: (phases, { desc }) => [desc(phases.sequenceIndex)],
  });

  const conditions = [isNotNull(bannerCharacterStatistics.pressureScore)];
  if (pressureLevelParam) {
    conditions.push(eq(bannerCharacterStatistics.pressureLevel, pressureLevelParam));
  }

  const results = await db
    .select({
      id: entities.slug,
      name: entities.name,
      currentWait: bannerCharacterStatistics.currentWait,
      medianInterval: bannerCharacterStatistics.medianInterval,
      pressureScore: bannerCharacterStatistics.pressureScore,
      pressureLevel: bannerCharacterStatistics.pressureLevel,
      confidenceLevel: bannerCharacterStatistics.confidenceLevel,
    })
    .from(bannerCharacterStatistics)
    .innerJoin(entities, eq(bannerCharacterStatistics.characterId, entities.id))
    .where(and(...conditions))
    .orderBy(desc(bannerCharacterStatistics.pressureScore))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({
    currentPhase: currentPhase ? {
      phaseKey: currentPhase.phaseKey,
      sequenceIndex: currentPhase.sequenceIndex,
    } : null,
    characters: results,
  });
}
