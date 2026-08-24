import { NextRequest, NextResponse } from "next/server";
import { getTeyvatBannerQueries } from "@/lib/teyvat/persistence/banners";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const offset = parseInt(searchParams.get("offset") ?? "0");
  const pressureLevelParam = searchParams.get("pressureLevel");
  
  const queries = await getTeyvatBannerQueries();
  const { currentPhase, characters } = await queries.pressure();
  const results = characters
    .filter(({ pressureLevel }) => !pressureLevelParam || pressureLevel === pressureLevelParam)
    .slice(offset, offset + limit)
    .map(({ character, currentWait, medianInterval, pressureScore, pressureLevel, confidenceLevel }) => ({
      id: character.slug,
      name: character.name,
      currentWait,
      medianInterval,
      pressureScore,
      pressureLevel,
      confidenceLevel,
    }));

  return NextResponse.json({
    currentPhase: currentPhase ? {
      phaseKey: currentPhase.phaseKey,
      sequenceIndex: currentPhase.sequenceIndex,
    } : null,
    characters: results,
  });
}
