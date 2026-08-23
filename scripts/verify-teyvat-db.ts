import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { sql } from "drizzle-orm";
import { getDatabase } from "../db/client.ts";
import { readArtifact, readArtifactManifest } from "../lib/teyvat/artifact.ts";
import { teyvatEntities, teyvatAliases, teyvatRelations, teyvatDocuments, teyvatDatasetRevisions } from "../db/schema.ts";

const db = getDatabase();
const artifact = readArtifact();
const manifest = readArtifactManifest();

async function scalar(query: ReturnType<typeof sql>) {
  const result = await db.execute(query) as unknown as { rows: Array<Record<string, unknown>> };
  return Number(result.rows[0]?.value ?? 0);
}

const counts = {
  entities: await scalar(sql`select count(*)::int as value from ${teyvatEntities}`),
  aliases: await scalar(sql`select count(*)::int as value from ${teyvatAliases}`),
  relations: await scalar(sql`select count(*)::int as value from ${teyvatRelations}`),
  documents: await scalar(sql`select count(*)::int as value from ${teyvatDocuments}`),
};
const orphans = {
  aliases: await scalar(sql`select count(*)::int as value from ${teyvatAliases} a left join ${teyvatEntities} e on e.id = a.entity_id where e.id is null`),
  relationSubjects: await scalar(sql`select count(*)::int as value from ${teyvatRelations} r left join ${teyvatEntities} e on e.id = r.subject_id where e.id is null`),
  relationObjects: await scalar(sql`select count(*)::int as value from ${teyvatRelations} r left join ${teyvatEntities} e on e.id = r.object_id where e.id is null`),
  documents: await scalar(sql`select count(*)::int as value from ${teyvatDocuments} d left join ${teyvatEntities} e on e.id = d.entity_id where e.id is null`),
};
const duplicates = {
  entities: await scalar(sql`select count(*)::int as value from (select id from ${teyvatEntities} group by id having count(*) > 1) x`),
  aliases: await scalar(sql`select count(*)::int as value from (select id from ${teyvatAliases} group by id having count(*) > 1) x`),
  relations: await scalar(sql`select count(*)::int as value from (select id from ${teyvatRelations} group by id having count(*) > 1) x`),
};
const revisionRows = await db.select().from(teyvatDatasetRevisions).limit(1);
const revision = revisionRows[0];
const syntheticRows = await db.select({ id: teyvatEntities.id }).from(teyvatEntities).where(sql`id in ('genshin:reliquary_set:10001', 'genshin:reliquary_piece:51140')`);
const recipeRows = await db.execute(sql`select count(*)::int as value from ${teyvatRelations} where object_id in ('genshin:food:100001', 'genshin:food:100002', 'genshin:food:101212', 'genshin:food:101230')`) as unknown as { rows: Array<Record<string, unknown>> };
const recipeCount = Number(recipeRows.rows[0]?.value ?? 0);

const expected = { entities: artifact.entities.length, aliases: artifact.aliases.length, relations: artifact.relations.length, documents: artifact.documents.length };
if (JSON.stringify(counts) !== JSON.stringify(expected)) throw new Error(`Count mismatch: ${JSON.stringify({ counts, expected })}`);
if (Object.values(orphans).some((value) => value !== 0)) throw new Error(`Orphan rows found: ${JSON.stringify(orphans)}`);
if (Object.values(duplicates).some((value) => value !== 0)) throw new Error(`Duplicate rows found: ${JSON.stringify(duplicates)}`);
if (!revision || revision.revision !== artifact.revision) throw new Error("Installed revision does not match artifact.");
if (syntheticRows.length !== 2) throw new Error("Synthetic reliquary entities are incomplete.");

console.log(JSON.stringify({ counts, orphans, duplicates, revision: revision.revision, syntheticReliquaryEntities: syntheticRows.length, recipeRows: recipeCount, manifest }, null, 2));
