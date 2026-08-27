import { NextRequest, NextResponse } from "next/server";
import { getTeyvatBuildQueries } from "@/lib/teyvat/engine";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ character: string }> }
) {
  const { character: slug } = await params;
  const buildQueries = getTeyvatBuildQueries();
  const builds = await buildQueries.getCharacterBuilds(slug);

  return NextResponse.json({
    characterSlug: slug,
    count: builds.length,
    builds,
  });
}
