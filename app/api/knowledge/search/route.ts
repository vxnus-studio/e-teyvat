import { type NextRequest, NextResponse } from "next/server";
import { desc, sql } from "drizzle-orm";
import { getDatabase } from "../../../../db/client";
import { teyvatChunks, teyvatDatasetRevisions, teyvatDocuments, teyvatEntities } from "../../../../db/schema";
import { boundedLimit, DEMO_ENTITIES, errorResponse } from "../../utils";

export async function GET(request: NextRequest) {
  const databaseUrl = process.env.DATABASE_URL;
  const query = request.nextUrl.searchParams.get("q")?.trim();
  const headers = { "cache-control": "public, max-age=60, s-maxage=300" };

  if (!query) return errorResponse("A search query is required.");
  const limit = boundedLimit(request.nextUrl.searchParams.get("limit"), 8);

  if (!databaseUrl) {
    return NextResponse.json(
      {
        items: DEMO_ENTITIES.filter((entity) =>
          `${entity.name} ${entity.description}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        ),
        preview: true,
      },
      { headers }
    );
  }

  try {
    const database = getDatabase();
    const [rev] = await database.select().from(teyvatDatasetRevisions).orderBy(desc(teyvatDatasetRevisions.installedAt)).limit(1);
    const activeRevision = rev?.revision;

    const result = await database.execute<{
      entity_id: string;
      kind: string;
      slug: string;
      name: string;
      section: string;
      content: string;
      rank: number;
    }>(sql`
      select
        e.id as entity_id,
        e.kind,
        e.slug,
        e.name,
        d.title as section,
        c.content,
        ts_rank(
          to_tsvector('english', c.content),
          websearch_to_tsquery('english', ${query})
        ) as rank
      from ${teyvatChunks} c
      join ${teyvatDocuments} d on d.id = c.document_id
      join ${teyvatEntities} e on e.id = d.entity_id
      where
        ${activeRevision ? sql`c.revision = ${activeRevision} and` : sql``}
        to_tsvector('english', c.content) @@ websearch_to_tsquery('english', ${query})
      order by rank desc, d.id asc
      limit ${limit}
    `);

    const rows = (result as unknown as { rows: unknown[] }).rows ?? (result as unknown as unknown[]);
    return NextResponse.json({ items: rows, preview: false }, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed";
    return errorResponse(message, 500);
  }
}
