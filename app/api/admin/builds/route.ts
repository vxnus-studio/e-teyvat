import { type NextRequest, NextResponse } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { verifyAdminSession } from "../../../../lib/auth/admin";
import { getDatabase } from "../../../../db/client";
import { characterBuildRecommendations, teyvatEntities } from "../../../../db/schema";
import { getTeyvatBuildQueries } from "../../../../lib/teyvat/engine";

export async function GET(request: NextRequest) {
  const { authenticated } = await verifyAdminSession(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDatabase();
    const characterSlug = request.nextUrl.searchParams.get("character")?.toLowerCase();

    if (characterSlug) {
      const builds = await getTeyvatBuildQueries().getCharacterBuilds(characterSlug);
      return NextResponse.json({ builds });
    }

    const rawBuilds = await db
      .select()
      .from(characterBuildRecommendations)
      .orderBy(asc(characterBuildRecommendations.characterSlug), desc(characterBuildRecommendations.isPrimary));

    const characters = await db
      .select({
        slug: teyvatEntities.slug,
        name: teyvatEntities.name,
        data: teyvatEntities.data,
      })
      .from(teyvatEntities)
      .where(eq(teyvatEntities.kind, "avatar"));

    const charMap = new Map(characters.map((c) => [c.slug.toLowerCase(), c.name]));

    const mapped = rawBuilds.map((b) => ({
      ...b,
      characterName: charMap.get(b.characterSlug.toLowerCase()) || b.characterSlug,
    }));

    return NextResponse.json({
      builds: mapped,
      total: mapped.length,
    });
  } catch (err) {
    console.error("Builds GET error:", err);
    return NextResponse.json({ error: "Failed to fetch builds" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { authenticated } = await verifyAdminSession(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDatabase();
    const body = await request.json();

    const {
      characterSlug,
      role,
      title,
      isPrimary = true,
      playstyle,
      weaponRecommendations = [],
      artifactRecommendations = [],
      mainStats = { sands: [], goblet: [], circlet: [] },
      substatPriority = [],
      statTargets = {},
      talentPriority = [],
      teamRecommendations = [],
      rotationGuide = [],
      authorNotes,
      provenance = { source: "Admin Console" },
      gameVersion = "5.4",
    } = body;

    if (!characterSlug || !role) {
      return NextResponse.json({ error: "Character slug and role are required" }, { status: 400 });
    }

    const [created] = await db
      .insert(characterBuildRecommendations)
      .values({
        characterSlug: characterSlug.toLowerCase().trim(),
        role: role.trim(),
        title: title?.trim() || null,
        isPrimary: Boolean(isPrimary),
        playstyle: playstyle?.trim() || null,
        weaponRecommendations,
        artifactRecommendations,
        mainStats,
        substatPriority,
        statTargets,
        talentPriority,
        teamRecommendations,
        rotationGuide,
        authorNotes: authorNotes?.trim() || null,
        provenance,
        gameVersion: String(gameVersion),
      })
      .returning();

    return NextResponse.json({ success: true, build: created });
  } catch (err) {
    console.error("Build create error:", err);
    return NextResponse.json({ error: "Failed to create character build" }, { status: 500 });
  }
}
