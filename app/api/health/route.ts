import { NextResponse } from "next/server";
import { count, desc } from "drizzle-orm";
import { getDatabase } from "../../../db/client";
import { teyvatDatasetRevisions, teyvatEntities } from "../../../db/schema";

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
    const [revisionRows, countResult] = await Promise.all([
      database
        .select()
        .from(teyvatDatasetRevisions)
        .orderBy(desc(teyvatDatasetRevisions.installedAt))
        .limit(1),
      database
        .select({ count: count() })
        .from(teyvatEntities),
    ]);

    const revision = revisionRows[0];
    const entityCount = countResult[0]?.count ? Number(countResult[0].count) : (revision?.entityCount ?? 0);

    return NextResponse.json(
      {
        status: revision ? "ready" : "awaiting_first_sync",
        connected: true,
        revision: revision?.revision ?? null,
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
