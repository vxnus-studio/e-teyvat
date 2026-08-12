import { type NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { getDatabase } from "../../../db/client";
import { entities, relations } from "../../../db/schema";
import { activeRevision, CanonicalData, DEMO_FARMING, errorResponse, resolveEntity } from "../utils";

export async function GET(request: NextRequest) {
  const databaseUrl = process.env.DATABASE_URL;
  const target = request.nextUrl.searchParams.get("target")?.trim();
  const headers = { "cache-control": "public, max-age=60, s-maxage=300" };

  if (!target) return errorResponse("A target is required.");
  if (!databaseUrl) return NextResponse.json(DEMO_FARMING, { headers });

  const database = getDatabase();
  const targetEntity = await resolveEntity(database, target);
  if (!targetEntity) return errorResponse("Target entity not found.", 404);

  const requirementEdges = await database
    .select({
      relationId: relations.id,
      metadata: relations.metadata,
      sourcePath: relations.sourcePath,
      material: entities,
    })
    .from(relations)
    .innerJoin(entities, eq(relations.objectId, entities.id))
    .where(
      and(
        eq(relations.subjectId, targetEntity.id),
        inArray(relations.predicate, ["requires", "uses_material_family"]),
      ),
    );

  const materialIds = requirementEdges.map((edge) => edge.material.id);
  const sourceEdges = materialIds.length
    ? await database
        .select({
          predicate: relations.predicate,
          metadata: relations.metadata,
          materialId: relations.objectId,
          source: entities,
        })
        .from(relations)
        .innerJoin(entities, eq(relations.subjectId, entities.id))
        .where(
          and(
            inArray(relations.objectId, materialIds),
            inArray(relations.predicate, ["rewards", "drops"]),
          ),
        )
    : [];

  const revision = await activeRevision(database);
  
  return NextResponse.json(
    {
      target: {
        id: targetEntity.id,
        kind: targetEntity.kind,
        slug: targetEntity.slug,
        name: targetEntity.name,
      },
      materials: requirementEdges.map((edge) => {
        const data = edge.material.canonicalData as CanonicalData;
        const rawSources = data.sources ?? data.source ?? data.howtoobtain ?? [];
        return {
          id: edge.material.id,
          name: edge.material.name,
          quantity: (edge.metadata as any).quantity ?? null,
          phase: edge.sourcePath,
          sources: sourceEdges
            .filter((source) => source.materialId === edge.material.id)
            .map((source) => ({
              type: source.source.kind === "domains" ? "domain" : "enemy",
              name: source.source.name,
              kind: source.source.kind,
              slug: source.source.slug,
              availableDays: (source.metadata as any).daysOfWeek ?? [],
              domainEntrance: (source.metadata as any).domainEntrance ?? null,
            })),
          sourceNotes: Array.isArray(rawSources) ? rawSources : [rawSources],
        };
      }),
      revision: revision?.sourceRevision ?? null,
      preview: false,
    },
    { headers }
  );
}
