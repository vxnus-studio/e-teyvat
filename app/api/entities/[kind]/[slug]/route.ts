import { type NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "../../../../../db/client";
import { entities, relations } from "../../../../../db/schema";
import { DEMO_ENTITIES, errorResponse, resolveImageUrl } from "../../../utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kind: string; slug: string }> }
) {
  const databaseUrl = process.env.DATABASE_URL;
  const { kind, slug } = await params;
  const headers = { "cache-control": "public, max-age=60, s-maxage=300" };

  if (!databaseUrl) {
    const item = DEMO_ENTITIES.find(
      (entity) => entity.kind === kind && entity.slug === slug,
    );
    return item
      ? NextResponse.json({ item, relations: [], preview: true }, { headers })
      : errorResponse("Not found.", 404);
  }

  const database = getDatabase();
  const [row] = await database
    .select()
    .from(entities)
    .where(
      and(
        eq(entities.kind, kind),
        eq(entities.slug, slug),
        eq(entities.isActive, true),
      ),
    )
    .limit(1);

  if (!row) return errorResponse("Not found.", 404);

  const { canonicalData, customImageUrl, ...entityData } = row;
  const item = {
    ...entityData,
    canonicalData,
    image: resolveImageUrl(customImageUrl, canonicalData as any),
  };

  const edges = await database
    .select({
      predicate: relations.predicate,
      sourcePath: relations.sourcePath,
      metadata: relations.metadata,
      object: {
        id: entities.id,
        kind: entities.kind,
        slug: entities.slug,
        name: entities.name,
      },
    })
    .from(relations)
    .innerJoin(entities, eq(relations.objectId, entities.id))
    .where(eq(relations.subjectId, item.id))
    .limit(100);

  return NextResponse.json({ item, relations: edges, preview: false }, { headers });
}
