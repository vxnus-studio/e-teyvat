import { eq, inArray, sql } from "drizzle-orm";
import { getDatabase } from "../db/client.ts";
import {
  bannerSources,
  bannerPhases,
  bannerPhaseCharacters,
  bannerCharacterStatistics,
  entities,
} from "../db/schema.ts";
import { parseBannersYaml } from "../lib/banners/parser.ts";
import { calculateCharacterStatistics } from "../lib/banners/statistics.ts";
import { calculatePressureAndConfidence } from "../lib/banners/pressure-model.ts";

const SOURCE_REPO = "benlei/samsara-web";
const SOURCE_FILE_PATH = "public/data/banners.yaml";
const SOURCE_RAW_URL = `https://raw.githubusercontent.com/${SOURCE_REPO}/main/${SOURCE_FILE_PATH}`;
const SOURCE_API_COMMITS = `https://api.github.com/repos/${SOURCE_REPO}/commits?path=${SOURCE_FILE_PATH}&per_page=1`;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "e-Teyvat-Sync/1.0",
      "Accept": "application/vnd.github.v3+json",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to run the banner sync.");
  }

  const database = getDatabase();

  console.log("Fetching upstream banner data...");
  const commits = await fetchJson<Array<{ sha: string }>>(SOURCE_API_COMMITS);
  const latestCommitSha = commits[0]?.sha ?? "unknown";

  const yamlResponse = await fetch(SOURCE_RAW_URL);
  if (!yamlResponse.ok) {
    throw new Error(`Failed to fetch YAML: ${yamlResponse.statusText}`);
  }
  const yamlContent = await yamlResponse.text();

  console.log("Parsing YAML...");
  const { phases, appearances } = parseBannersYaml(yamlContent);
  
  if (phases.length === 0) {
    console.warn("No phases found in the source file.");
    return;
  }

  // Find latest sequence index
  const latestSequenceIndex = Math.max(...phases.map(p => p.sequenceIndex));

  console.log("Matching characters against canonical entities...");
  const canonicalChars = await database
    .select({
      id: entities.id,
      name: entities.name,
      slug: entities.slug,
    })
    .from(entities)
    .where(eq(entities.kind, "characters"));

  const charMap = new Map<string, number>();
  for (const c of canonicalChars) {
    // Basic normalization for matching
    const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
    charMap.set(normalize(c.name), c.id);
  }

  console.log("Upserting banner source record...");
  await database.insert(bannerSources).values({
    name: "Samsara",
    repositoryUrl: `https://github.com/${SOURCE_REPO}`,
    filePath: SOURCE_FILE_PATH,
    commitSha: latestCommitSha,
  });

  console.log(`Upserting ${phases.length} phases...`);
  // 1. Upsert Phases
  for (const phase of phases) {
    await database.insert(bannerPhases)
        .values({
          game: "genshin",
          version: phase.version,
          phaseNumber: phase.phaseNumber,
          phaseKey: phase.phaseKey,
          sequenceIndex: phase.sequenceIndex,
          startDate: phase.startDate,
          endDate: phase.endDate,
          status: phase.endDate > new Date() ? (phase.startDate > new Date() ? "upcoming" : "active") : "completed",
        })
        .onConflictDoUpdate({
          target: [bannerPhases.phaseKey],
          set: {
            sequenceIndex: sql`excluded.sequence_index`,
            startDate: sql`excluded.start_date`,
            endDate: sql`excluded.end_date`,
            status: sql`excluded.status`,
            updatedAt: new Date(),
          }
        });
    }

    // Load created phases to get phase IDs for foreign keys
  const dbPhases = await database.select({ id: bannerPhases.id, phaseKey: bannerPhases.phaseKey }).from(bannerPhases);
  const phaseIdMap = new Map(dbPhases.map(p => [p.phaseKey, p.id]));

  console.log(`Upserting ${appearances.length} character appearances...`);
  let matchedCount = 0;
  
  // Clear existing appearances to avoid stale data (optional, but robust)
  await database.delete(bannerPhaseCharacters);

    const appearanceInserts = appearances.map(app => {
      const normalizedName = app.characterName.toLowerCase().replace(/[^a-z0-9]/g, "");
      const characterId = charMap.get(normalizedName) ?? null;
      if (characterId) matchedCount++;

      return {
        phaseId: phaseIdMap.get(app.phaseKey)!,
        characterId,
        characterName: app.characterName,
        rarity: app.rarity,
        featured: true,
      };
    });

    // Chunk inserts
  const chunkSize = 100;
  for (let i = 0; i < appearanceInserts.length; i += chunkSize) {
    await database.insert(bannerPhaseCharacters)
      .values(appearanceInserts.slice(i, i + chunkSize))
      .onConflictDoNothing(); // Unique index protects duplicates
  }

  console.log("Recalculating statistics...");
  // Fetch all appearances with characterId to calculate stats
  const allDbApps = await database
    .select({
        characterId: bannerPhaseCharacters.characterId,
        sequenceIndex: bannerPhases.sequenceIndex,
        rarity: bannerPhaseCharacters.rarity,
      })
      .from(bannerPhaseCharacters)
      .leftJoin(bannerPhases, eq(bannerPhaseCharacters.phaseId, bannerPhases.id));

    const characterAppearances = new Map<number, { indices: number[], rarity: number }>();
    for (const row of allDbApps) {
      if (row.characterId !== null && row.sequenceIndex !== null) {
        if (!characterAppearances.has(row.characterId)) {
          characterAppearances.set(row.characterId, { indices: [], rarity: row.rarity! });
        }
        characterAppearances.get(row.characterId)!.indices.push(row.sequenceIndex);
      }
    }

    const allCharStats = [];
    for (const [charId, data] of characterAppearances.entries()) {
      const stats = calculateCharacterStatistics(charId, data.indices, latestSequenceIndex);
      allCharStats.push({ ...stats, rarity: data.rarity });
    }

    // Separate four-stars for pressure model
    const fourStars = allCharStats.filter(s => s.rarity === 4);
    const pressureResults = calculatePressureAndConfidence(fourStars);

    const pressureMap = new Map(pressureResults.map(p => [p.characterId, p]));

    const statsInserts = allCharStats.map(stat => {
      const p = pressureMap.get(stat.characterId);
      return {
        characterId: stat.characterId,
        appearanceCount: stat.appearanceCount,
        completedIntervalCount: stat.completedIntervalCount,
        currentWait: stat.currentWait,
        meanInterval: stat.meanInterval,
        medianInterval: stat.medianInterval,
        minimumInterval: stat.minimumInterval,
        maximumInterval: stat.maximumInterval,
        modeIntervals: stat.modeIntervals,
        intervals: stat.intervals,
        appearancePhaseIndices: stat.appearancePhaseIndices,
        currentWaitPercentile: stat.currentWaitPercentile,
        pressureScore: p?.pressureScore ?? null,
        pressureLevel: p?.pressureLevel ?? null,
        confidenceScore: p?.confidenceScore ?? null,
        confidenceLevel: p?.confidenceLevel ?? null,
        reasons: p?.reasons ?? [],
        calculatedAt: new Date(),
      };
    });

    // Chunk stats inserts
  for (let i = 0; i < statsInserts.length; i += chunkSize) {
    await database.insert(bannerCharacterStatistics)
      .values(statsInserts.slice(i, i + chunkSize))
      .onConflictDoUpdate({
        target: [bannerCharacterStatistics.characterId],
        set: {
          appearanceCount: sql`excluded.appearance_count`,
          completedIntervalCount: sql`excluded.completed_interval_count`,
          currentWait: sql`excluded.current_wait`,
          meanInterval: sql`excluded.mean_interval`,
          medianInterval: sql`excluded.median_interval`,
          minimumInterval: sql`excluded.minimum_interval`,
          maximumInterval: sql`excluded.maximum_interval`,
          modeIntervals: sql`excluded.mode_intervals`,
          intervals: sql`excluded.intervals`,
          appearancePhaseIndices: sql`excluded.appearance_phase_indices`,
          currentWaitPercentile: sql`excluded.current_wait_percentile`,
          pressureScore: sql`excluded.pressure_score`,
          pressureLevel: sql`excluded.pressure_level`,
          confidenceScore: sql`excluded.confidence_score`,
          confidenceLevel: sql`excluded.confidence_level`,
          reasons: sql`excluded.reasons`,
          calculatedAt: new Date(),
        }
      });
  }

  console.log(`\nBanner synchronization completed.
Source commit: ${latestCommitSha}
Phases imported: ${phases.length}
Character appearances imported: ${appearances.length}
Characters matched: ${matchedCount}
Unmatched characters: ${appearances.length - matchedCount}
Statistics recalculated: ${statsInserts.length}
`);
}

main().catch(console.error);
