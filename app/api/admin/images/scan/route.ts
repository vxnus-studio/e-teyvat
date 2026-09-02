import { type NextRequest, NextResponse } from "next/server";
import { and, eq, not, inArray, asc } from "drizzle-orm";
import { verifyAdminSession } from "../../../../../lib/auth/admin";
import { getDatabase } from "../../../../../db/client";
import { teyvatEntities } from "../../../../../db/schema";

export async function GET(request: NextRequest) {
  const { authenticated } = await verifyAdminSession(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDatabase();
    const kindFilter = request.nextUrl.searchParams.get("kind")?.toLowerCase();

    const conditions = [
      not(inArray(teyvatEntities.kind, ["reliquary_set", "reliquary_piece"])),
      ...(kindFilter ? [eq(teyvatEntities.kind, kindFilter)] : []),
    ];

    const entities = await db
      .select({
        id: teyvatEntities.id,
        kind: teyvatEntities.kind,
        slug: teyvatEntities.slug,
        name: teyvatEntities.name,
        data: teyvatEntities.data,
      })
      .from(teyvatEntities)
      .where(and(...conditions))
      .orderBy(asc(teyvatEntities.kind), asc(teyvatEntities.name));

    function resolveImage(data: Record<string, unknown> | null): { url: string | null; isCustom: boolean; source: "cdn" | "enka" | "none" } {
      if (!data) return { url: null, isCustom: false, source: "none" };
      const custom = data.custom_image_url || data.customImageUrl;
      if (typeof custom === "string" && custom.trim()) {
        const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || "https://cdn.e-teyvat.vxnus.xyz";
        const url = custom.startsWith("http") ? custom : `${cdnUrl}/${custom}`;
        return { url, isCustom: true, source: "cdn" };
      }
      const icon = data.icon;
      if (typeof icon === "string" && icon.trim()) {
        const url = icon.startsWith("http") ? icon : `https://enka.network/ui/${icon}.png`;
        return { url, isCustom: false, source: "enka" };
      }
      const images = data.images && typeof data.images === "object" && !Array.isArray(data.images) ? data.images as Record<string, unknown> : null;
      const filename = images && Object.values(images).find((value) => typeof value === "string" && value.length > 0);
      if (typeof filename === "string") {
        return { url: `https://enka.network/ui/${filename}.png`, isCustom: false, source: "enka" };
      }
      return { url: null, isCustom: false, source: "none" };
    }

    const items = entities.map((e) => {
      const data = (e.data || {}) as Record<string, unknown>;
      const imgInfo = resolveImage(data);
      return {
        id: e.id,
        kind: e.kind,
        slug: e.slug,
        name: e.name,
        image: imgInfo.url,
        isCustom: imgInfo.isCustom,
        source: imgInfo.source,
        hasImage: imgInfo.url !== null,
        rarity: data.rarity || data.rankLevel || 4,
      };
    });

    const summary = {
      total: items.length,
      withImage: items.filter((i) => i.hasImage).length,
      missingImage: items.filter((i) => !i.hasImage).length,
      customCdnCount: items.filter((i) => i.isCustom).length,
      enkaCount: items.filter((i) => i.source === "enka").length,
    };

    return NextResponse.json({
      summary,
      items,
    });
  } catch (err) {
    console.error("Image scan error:", err);
    return NextResponse.json({ error: "Failed to scan entity images" }, { status: 500 });
  }
}
