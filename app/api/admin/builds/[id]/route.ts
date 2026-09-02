import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { verifyAdminSession } from "../../../../../lib/auth/admin";
import { getDatabase } from "../../../../../db/client";
import { characterBuildRecommendations } from "../../../../../db/schema";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authenticated } = await verifyAdminSession(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Build ID is required" }, { status: 400 });
  }

  try {
    const db = getDatabase();
    const body = await request.json();

    const {
      characterSlug,
      role,
      title,
      isPrimary,
      playstyle,
      weaponRecommendations,
      artifactRecommendations,
      mainStats,
      substatPriority,
      statTargets,
      talentPriority,
      teamRecommendations,
      rotationGuide,
      authorNotes,
      provenance,
      gameVersion,
    } = body;

    const [updated] = await db
      .update(characterBuildRecommendations)
      .set({
        ...(characterSlug ? { characterSlug: characterSlug.toLowerCase().trim() } : {}),
        ...(role !== undefined ? { role } : {}),
        ...(title !== undefined ? { title } : {}),
        ...(isPrimary !== undefined ? { isPrimary: Boolean(isPrimary) } : {}),
        ...(playstyle !== undefined ? { playstyle } : {}),
        ...(weaponRecommendations !== undefined ? { weaponRecommendations } : {}),
        ...(artifactRecommendations !== undefined ? { artifactRecommendations } : {}),
        ...(mainStats !== undefined ? { mainStats } : {}),
        ...(substatPriority !== undefined ? { substatPriority } : {}),
        ...(statTargets !== undefined ? { statTargets } : {}),
        ...(talentPriority !== undefined ? { talentPriority } : {}),
        ...(teamRecommendations !== undefined ? { teamRecommendations } : {}),
        ...(rotationGuide !== undefined ? { rotationGuide } : {}),
        ...(authorNotes !== undefined ? { authorNotes } : {}),
        ...(provenance !== undefined ? { provenance } : {}),
        ...(gameVersion !== undefined ? { gameVersion: String(gameVersion) } : {}),
        updatedAt: new Date(),
      })
      .where(eq(characterBuildRecommendations.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Build not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, build: updated });
  } catch (err) {
    console.error("Build update error:", err);
    return NextResponse.json({ error: "Failed to update build" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authenticated } = await verifyAdminSession(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Build ID is required" }, { status: 400 });
  }

  try {
    const db = getDatabase();
    const [deleted] = await db
      .delete(characterBuildRecommendations)
      .where(eq(characterBuildRecommendations.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Build not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err) {
    console.error("Build delete error:", err);
    return NextResponse.json({ error: "Failed to delete build" }, { status: 500 });
  }
}
