import { NextResponse } from "next/server";
import { sql, eq } from "drizzle-orm";
import { getDatabase } from "../../../db/client";
import { entities } from "../../../db/schema";
import { activeRevision } from "../utils";

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
    const [revision, countResult] = await Promise.all([
      activeRevision(database),
      database
        .select({ count: sql<number>`count(*)::int` })
        .from(entities)
        .where(eq(entities.isActive, true)),
    ]);
    return NextResponse.json(
      {
        status: revision ? "ready" : "awaiting_first_sync",
        connected: true,
        revision: revision?.sourceRevision ?? null,
        lastSyncedAt: revision?.completedAt ?? null,
        entityCount: countResult[0]?.count ?? 0,
        relationCount: revision?.relationCount ?? 0,
        unresolvedRelationCount: revision?.unresolvedRelationCount ?? 0,
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
