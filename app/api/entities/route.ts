import { type NextRequest, NextResponse } from "next/server";
import { and, eq, ilike, sql } from "drizzle-orm";
import { getDatabase } from "../../../db/client";
import { entities } from "../../../db/schema";
import { boundedLimit, DEMO_ENTITIES, resolveImageUrl } from "../utils";

export async function GET(request: NextRequest) {
  const databaseUrl = process.env.DATABASE_URL;
  const kind = request.nextUrl.searchParams.get("kind")?.toLowerCase() ?? null;
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limit = boundedLimit(request.nextUrl.searchParams.get("limit"), 24);
  const page = Math.max(1, parseInt(request.nextUrl.searchParams.get("page") || "1", 10));
  const offset = (page - 1) * limit;

  const headers = { "cache-control": "public, max-age=60, s-maxage=300" };

  if (!databaseUrl) {
    const filtered = DEMO_ENTITIES.filter(
      (entity) =>
        (!kind || entity.kind === kind) &&
        (!query || entity.name.toLowerCase().includes(query.toLowerCase())),
    );
    const paginated = filtered.slice(offset, offset + limit);
    return NextResponse.json({ items: paginated, preview: true, total: filtered.length, page, limit }, { headers });
  }

  const database = getDatabase();
  const conditions = [eq(entities.isActive, true)];
  if (kind) conditions.push(eq(entities.kind, kind));
  if (query) conditions.push(ilike(entities.name, `%${query}%`));

  const [{ count }] = await database
    .select({ count: sql`count(*)` })
    .from(entities)
    .where(and(...conditions));

  const rows = await database
    .select({
      id: entities.id,
      kind: entities.kind,
      slug: entities.slug,
      name: entities.name,
      description: entities.description,
      gameVersion: entities.gameVersion,
      customImageUrl: entities.customImageUrl,
      canonicalData: entities.canonicalData,
      updatedAt: entities.updatedAt,
    })
    .from(entities)
    .where(and(...conditions))
    .orderBy(entities.name)
    .limit(limit)
    .offset(offset);

  return NextResponse.json(
    {
      items: rows.map(({ canonicalData, customImageUrl, ...entity }) => {
        const data = (canonicalData || {}) as Record<string, any>;
        return {
          ...entity,
          rarity: data.rarity || data.rankLevel || data.rank || null,
          element: data.element || data.elementType || null,
          image: resolveImageUrl(customImageUrl, canonicalData as any),
        };
      }),
      preview: false,
      total: Number(count),
      page,
      limit,
    },
    { headers }
  );
}
