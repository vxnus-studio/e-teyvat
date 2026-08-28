import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDatabase } from "../../../../../db/client";
import { teyvatEntities } from "../../../../../db/schema";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = request.cookies.get("e_teyvat_admin_session")?.value;
  if (!session || session !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const entityId = decodeURIComponent(id || "").trim();
  
  if (!entityId) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const { customImageUrl } = await request.json();
    const database = getDatabase();

    const [existing] = await database
      .select()
      .from(teyvatEntities)
      .where(eq(teyvatEntities.id, entityId))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 });
    }

    const updatedData = {
      ...(existing.data as Record<string, unknown>),
      custom_image_url: customImageUrl,
      customImageUrl,
    };

    await database
      .update(teyvatEntities)
      .set({ data: updatedData })
      .where(eq(teyvatEntities.id, entityId));

    return NextResponse.json({ success: true, customImageUrl });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update entity" }, { status: 500 });
  }
}
