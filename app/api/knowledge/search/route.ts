import { type NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDatabase } from "../../../../db/client";
import { entities, knowledgeDocuments } from "../../../../db/schema";
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

  const database = getDatabase();
  const result = await database.execute<{
    entity_id: number;
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
      d.section,
      d.content,
      ts_rank(
        to_tsvector('english', d.content),
        websearch_to_tsquery('english', ${query})
      ) as rank
    from ${knowledgeDocuments} d
    join ${entities} e on e.id = d.entity_id
    where
      e.is_active = true
      and to_tsvector('english', d.content)
        @@ websearch_to_tsquery('english', ${query})
    order by rank desc
    limit ${limit}
  `);

  return NextResponse.json({ items: result.rows, preview: false }, { headers });
}
