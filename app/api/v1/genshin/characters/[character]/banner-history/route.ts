import { NextRequest, NextResponse } from "next/server";
import { getTeyvatBannerQueries } from "@/lib/teyvat/persistence/banners";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ character: string }> }
) {
  const { character: slug } = await params;
  const queries = await getTeyvatBannerQueries();
  const { character: charEntity, appearances, statistics: stats } = await queries.character(slug);

  if (!charEntity) {
    return NextResponse.json({ error: "Character not found" }, { status: 404 });
  }

  return NextResponse.json({
    character: {
      id: charEntity.slug,
      name: charEntity.name,
      rarity: appearances[0]?.rarity ?? null,
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
    source: { name: "Samsara", commitSha: null, importedAt: null },
  });
}
