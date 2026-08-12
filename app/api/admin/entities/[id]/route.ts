import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDatabase } from "../../../../../db/client";
import { entities } from "../../../../../db/schema";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = request.cookies.get("eteyvat_admin_session")?.value;
  if (!session || session !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const entityId = parseInt(id, 10);
  
  if (isNaN(entityId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const { customImageUrl } = await request.json();
    const database = getDatabase();

    await database
      .update(entities)
      .set({ customImageUrl, updatedAt: new Date() })
      .where(eq(entities.id, entityId));

    return NextResponse.json({ success: true, customImageUrl });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update entity" }, { status: 500 });
  }
}
