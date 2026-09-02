import { NextResponse } from "next/server";
import { count, desc } from "drizzle-orm";
import { getDatabase } from "../../../db/client";
import { teyvatDatasetRevisions, teyvatEntities } from "../../../db/schema";
import { getTeyvatBannerQueries } from "../../../lib/teyvat/persistence/banners";

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return NextResponse.json(
      {
        status: "setup_required",
        connected: false,
        message: "Add DATABASE_URL to activate the live Neon knowledge graph.",
        revision: null,
      },
      {
        headers: {
          "cache-control": "public, max-age=60, s-maxage=300",
        },
      }
    );
  }

  try {
    const database = getDatabase();
    const [revisionRows, countResult, bannerOverview] = await Promise.all([
      database
        .select()
        .from(teyvatDatasetRevisions)
        .orderBy(desc(teyvatDatasetRevisions.installedAt))
        .limit(1),
      database
        .select({ count: count() })
        .from(teyvatEntities),
      getTeyvatBannerQueries()
        .then((q) => q.overview())
        .catch(() => null),
    ]);

    const revision = revisionRows[0];
    const entityCount = countResult[0]?.count ? Number(countResult[0].count) : (revision?.entityCount ?? 0);
    const currentPhase = bannerOverview?.currentPhase;
    const versionLabel = currentPhase ? `v${currentPhase.phaseKey}` : "v7.0.2";
    const phaseLabel = currentPhase ? `Version ${currentPhase.version} P${currentPhase.phaseNumber}` : null;
    const rev = revision?.revision ?? null;
    const shortRevision = rev ? rev.slice(0, 7) : null;

    return NextResponse.json(
      {
        status: revision ? "ready" : "awaiting_first_sync",
        connected: true,
        revision: rev,
        shortRevision,
        gameVersion: versionLabel,
        phaseLabel,
        lastSyncedAt: revision?.installedAt ?? null,
        entityCount,
        relationCount: revision?.relationCount ?? 0,
        unresolvedRelationCount: 0,
      },
      {
        headers: {
          "cache-control": "public, max-age=60, s-maxage=300",
        },
      }
    );
  } catch {
    return NextResponse.json(
      {
        status: "database_unavailable",
        connected: false,
        message: "The knowledge database could not be reached.",
      },
      {
        status: 503,
        headers: {
          "cache-control": "public, max-age=60, s-maxage=300",
        },
      }
    );
  }
}
