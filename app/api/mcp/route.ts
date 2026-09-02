/**
 * Public MCP (Model Context Protocol) server endpoint.
 *
 * Exposes the Teyvat Knowledge Base as a set of MCP tools that AI agents can
 * call directly. Implements the 2026-07-28 MCP specification via mcp-handler
 * with transparent fallback to stateless Streamable HTTP for 2025-era clients.
 *
 * Endpoint: GET/POST /api/mcp
 *
 * Tool inventory:
 *   find_entity                   – Search/resolve entities by name, kind, or alias
 *   get_entity                    – Retrieve a single entity with outgoing relations
 *   get_farming_sources           – Farming pathways, material costs & domain schedules
 *   search_lore                   – Full-text search across 12,900+ narrative documents
 *   get_lore_book                 – Retrieve the full anthology text for a book
 *   get_character_lore            – Retrieve full story chapters & voicelines for a character
 *   search_knowledge              – Full-text search over character dialogue & build guides
 *   get_banner_rerun_pressure     – Banner rerun pressure rankings
 *   get_character_banner_history  – Historical banner appearances for a character
 *   get_character_rerun_analysis  – Statistical rerun distribution & pressure analysis
 */

import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { getTeyvatPersistentEntityQueries, getTeyvatLoreQueries } from "@/lib/teyvat/engine";
import { getTeyvatPersistentFarmingQueries } from "@/lib/teyvat/domain/index";
import { getTeyvatBannerQueries } from "@/lib/teyvat/persistence/banners";
import { getDatabase } from "@/db/client";
import { teyvatChunks, teyvatDatasetRevisions, teyvatDocuments, teyvatEntities } from "@/db/schema";
import { desc, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Clamp a user-supplied limit to [1, max]. */
function clamp(value: number | null | undefined, max: number, fallback: number): number {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? Math.max(1, Math.min(max, n)) : fallback;
}

/** Wrap a result as an MCP text content block. */
function jsonContent(value: unknown): { content: Array<{ type: "text"; text: string }> } {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

/** Return a user-friendly error response for MCP tools. */
function errorContent(message: string): { content: Array<{ type: "text"; text: string }> } {
  return { content: [{ type: "text" as const, text: `Error: ${message}` }] };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

const handler = createMcpHandler((server) => {
  // -------------------------------------------------------------------------
  // find_entity
  // -------------------------------------------------------------------------
  server.registerTool(
    "find_entity",
    {
      title: "Find Entity",
      description:
        "Search and resolve canonical Genshin Impact entities (characters, weapons, artifacts, materials, domains, enemies, etc.) by name, partial name, or alias. Returns a paginated list of matching records.",
      inputSchema: z.object({
        q: z
          .string()
          .optional()
          .describe("Name or partial name to search for (case-insensitive substring match)."),
        kind: z
          .string()
          .optional()
          .describe(
            "Entity category filter. Valid values: characters, weapons, artifacts, materials, domains, enemies, foods, achievements, regions.",
          ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .default(24)
          .describe("Maximum number of results to return (1-50, default 24)."),
        page: z
          .number()
          .int()
          .min(1)
          .optional()
          .default(1)
          .describe("Pagination page number (default 1)."),
      }),
    },
    async ({ q, kind, limit, page }) => {
      try {
        const queries = await getTeyvatPersistentEntityQueries();
        const result = await queries.searchEntities({
          query: q ?? "",
          kind: kind?.toLowerCase(),
          limit: clamp(limit, 50, 24),
          page: Math.max(1, page ?? 1),
        });
        return jsonContent(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Entity search failed.";
        return errorContent(message);
      }
    },
  );

  // -------------------------------------------------------------------------
  // get_entity
  // -------------------------------------------------------------------------
  server.registerTool(
    "get_entity",
    {
      title: "Get Entity",
      description:
        "Retrieve a single canonical entity by kind and slug, including its full canonical data and up to 100 outgoing graph relations (requires, rewards, drops, ascension costs, talent materials, etc.).",
      inputSchema: z.object({
        kind: z
          .string()
          .describe(
            "Entity category (e.g. characters, weapons, artifacts, materials, domains, enemies).",
          ),
        slug: z
          .string()
          .describe(
            "URL-friendly entity identifier (e.g. furina, splendor-of-tranquil-waters).",
          ),
      }),
    },
    async ({ kind, slug }) => {
      try {
        const queries = await getTeyvatPersistentEntityQueries();
        const result = await queries.detail(kind.toLowerCase(), slug);
        if (!result) return errorContent(`Entity '${kind}/${slug}' not found.`);
        return jsonContent(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to retrieve entity.";
        return errorContent(message);
      }
    },
  );

  // -------------------------------------------------------------------------
  // get_farming_sources
  // -------------------------------------------------------------------------
  server.registerTool(
    "get_farming_sources",
    {
      title: "Get Farming Sources",
      description:
        "Resolve farming pathways for a Genshin Impact character, weapon, artifact, or material. Returns structured material requirements, source domains (with weekday availability), enemy drops, and quantities needed for full ascension and talent upgrade.",
      inputSchema: z.object({
        target: z
          .string()
          .describe(
            "Name, partial name, or slug of the character/weapon/artifact to look up (e.g. Furina, Splendor of Tranquil Waters).",
          ),
        kind: z
          .string()
          .optional()
          .describe("Optional entity kind hint to disambiguate (e.g. characters, weapons)."),
      }),
    },
    async ({ target, kind }) => {
      try {
        const farmingQueries = await getTeyvatPersistentFarmingQueries();
        const result = await farmingQueries.getFarmingPlan(target, kind);
        if (!result) return errorContent(`No farming data found for '${target}'.`);
        return jsonContent(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Farming lookup failed.";
        return errorContent(message);
      }
    },
  );

  // -------------------------------------------------------------------------
  // search_lore
  // -------------------------------------------------------------------------
  server.registerTool(
    "search_lore",
    {
      title: "Search Lore",
      description:
        "Full-text search across Genshin Impact's narrative archive (12,960+ documents): 1,151 full book volumes, 942 character story chapters, 8,524 spoken voiceline transcripts, 299 artifact relic histories, 270 weapon legends, 576 bestiary profiles, and culinary records. Supports divine alias resolution (e.g. Morax -> Zhongli, Barbatos -> Venti) and query-aware snippet windowing.",
      inputSchema: z.object({
        q: z
          .string()
          .optional()
          .describe("Search query (supports true-names/aliases like Morax, Rex Lapis, or phrases like Crimson Moon)."),
        category: z
          .enum(["book", "story", "quote", "artifact", "weapon", "monster", "character", "food", "namecard", "all"])
          .optional()
          .default("all")
          .describe("Document category filter. Defaults to 'all'."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .default(20)
          .describe("Maximum results to return (1-50, default 20)."),
        page: z
          .number()
          .int()
          .min(1)
          .optional()
          .default(1)
          .describe("Pagination page number (default 1)."),
      }),
    },
    async ({ q, category, limit, page }) => {
      try {
        const loreQueries = await getTeyvatLoreQueries();
        const result = loreQueries.search({
          query: q,
          category: category === "all" ? undefined : category,
          limit: clamp(limit, 50, 20),
          page: Math.max(1, page ?? 1),
        });
        return jsonContent(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Lore search failed.";
        return errorContent(message);
      }
    },
  );

  // -------------------------------------------------------------------------
  // get_lore_book
  // -------------------------------------------------------------------------
  server.registerTool(
    "get_lore_book",
    {
      title: "Get Lore Book",
      description:
        "Retrieve the complete multi-volume novel text for an in-game book chronicle (e.g. perinheri, teyvat-travel-guide, the-pale-princess-and-the-six-pygmies). Use search_lore to discover book slugs.",
      inputSchema: z.object({
        slug: z
          .string()
          .describe(
            "URL-friendly book identifier (e.g. perinheri, teyvat-travel-guide, the-pale-princess-and-the-six-pygmies).",
          ),
      }),
    },
    async ({ slug }) => {
      try {
        const loreQueries = await getTeyvatLoreQueries();
        const book = loreQueries.getBook(slug);
        if (!book) return errorContent(`Book '${slug}' not found.`);
        return jsonContent(book);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to retrieve book.";
        return errorContent(message);
      }
    },
  );

  // -------------------------------------------------------------------------
  // get_character_lore
  // -------------------------------------------------------------------------
  server.registerTool(
    "get_character_lore",
    {
      title: "Get Character Lore",
      description:
        "Retrieve complete canonical story chapters (Character Details, Story 1-5, Vision, Quests) and all spoken voiceline transcripts for a playable Genshin Impact character.",
      inputSchema: z.object({
        character: z
          .string()
          .describe(
            "Character slug or identifier (e.g. zhongli, furina, raiden-shogun, ayaka, nahida, arlecchino).",
          ),
      }),
    },
    async ({ character }) => {
      try {
        const loreQueries = await getTeyvatLoreQueries();
        const lore = loreQueries.getCharacterLore(character);
        if (!lore) return errorContent(`Character lore for '${character}' not found.`);
        return jsonContent(lore);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to retrieve character lore.";
        return errorContent(message);
      }
    },
  );

  // -------------------------------------------------------------------------
  // search_knowledge
  // -------------------------------------------------------------------------
  server.registerTool(
    "search_knowledge",
    {
      title: "Search Knowledge",
      description:
        "Full-text rank search over chunked character dialogue and community build guides. Uses PostgreSQL English web-search syntax and ranks results by relevance.",
      inputSchema: z.object({
        q: z
          .string()
          .describe(
            "Full-text search query (PostgreSQL websearch syntax, e.g. Furina EM build Neuvillette team).",
          ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .default(8)
          .describe("Maximum number of results (1-50, default 8)."),
      }),
    },
    async ({ q, limit }) => {
      try {
        const database = getDatabase();
        const [rev] = await database
          .select()
          .from(teyvatDatasetRevisions)
          .orderBy(desc(teyvatDatasetRevisions.installedAt))
          .limit(1);
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
              websearch_to_tsquery('english', ${q})
            ) as rank
          from ${teyvatChunks} c
          join ${teyvatDocuments} d on d.id = c.document_id
          join ${teyvatEntities} e on e.id = d.entity_id
          where
            ${activeRevision ? sql`c.revision = ${activeRevision} and` : sql``}
            to_tsvector('english', c.content) @@ websearch_to_tsquery('english', ${q})
          order by rank desc, d.id asc
          limit ${clamp(limit, 50, 8)}
        `);

        const rows =
          (result as unknown as { rows: unknown[] }).rows ??
          (result as unknown as unknown[]);
        return jsonContent({ items: rows, preview: false });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Knowledge search failed.";
        return errorContent(message);
      }
    },
  );

  // -------------------------------------------------------------------------
  // get_banner_rerun_pressure
  // -------------------------------------------------------------------------
  server.registerTool(
    "get_banner_rerun_pressure",
    {
      title: "Get Banner Rerun Pressure",
      description:
        "Return ranked character banner rerun pressure scores. Higher scores indicate characters statistically overdue for a rerun based on historical patterns. Useful for predicting upcoming banners.",
      inputSchema: z.object({
        pressureLevel: z
          .enum(["critical", "high", "medium", "low"])
          .optional()
          .describe("Filter by pressure level. Omit to return all characters."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .default(50)
          .describe("Maximum number of characters to return (1-50, default 50)."),
        offset: z
          .number()
          .int()
          .min(0)
          .optional()
          .default(0)
          .describe("Pagination offset (default 0)."),
      }),
    },
    async ({ pressureLevel, limit, offset }) => {
      try {
        const queries = await getTeyvatBannerQueries();
        const { currentPhase, characters } = await queries.pressure();
        const off = offset ?? 0;
        const results = characters
          .filter(({ pressureLevel: level }) => !pressureLevel || level === pressureLevel)
          .slice(off, off + clamp(limit, 50, 50))
          .map(
            ({
              character,
              currentWait,
              medianInterval,
              pressureScore,
              pressureLevel: level,
              confidenceLevel,
            }) => ({
              id: character.slug,
              name: character.name,
              currentWait,
              medianInterval,
              pressureScore,
              pressureLevel: level,
              confidenceLevel,
            }),
          );

        return jsonContent({
          currentPhase: currentPhase
            ? { phaseKey: currentPhase.phaseKey, sequenceIndex: currentPhase.sequenceIndex }
            : null,
          characters: results,
          disclaimer:
            "Statistical estimates based on historical banner rotations. Not official information or a leak.",
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to retrieve rerun pressure data.";
        return errorContent(message);
      }
    },
  );

  // -------------------------------------------------------------------------
  // get_character_banner_history
  // -------------------------------------------------------------------------
  server.registerTool(
    "get_character_banner_history",
    {
      title: "Get Character Banner History",
      description:
        "Retrieve the complete historical banner appearance timeline for a Genshin Impact character: every banner phase they appeared in, with version numbers and dates.",
      inputSchema: z.object({
        character: z
          .string()
          .describe("Character name or URL slug (e.g. furina, hu-tao, raiden-shogun)."),
      }),
    },
    async ({ character }) => {
      try {
        const queries = await getTeyvatBannerQueries();
        const { character: charEntity, appearances, statistics: stats } =
          await queries.character(character);

        if (!charEntity) return errorContent(`Character '${character}' not found.`);

        return jsonContent({
          character: {
            id: charEntity.slug,
            name: charEntity.name,
            rarity: appearances[0]?.rarity ?? null,
          },
          appearances: appearances.map((app) => ({
            phaseKey: app.phaseKey,
            version: app.version,
            phaseNumber: app.phaseNumber,
            sequenceIndex: app.sequenceIndex,
            startDate: app.startDate?.toISOString().split("T")[0] ?? null,
            endDate: app.endDate?.toISOString().split("T")[0] ?? null,
          })),
          intervals: stats?.intervals ?? [],
          currentWait: stats?.currentWait ?? 0,
          source: { name: "Samsara" },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to retrieve banner history.";
        return errorContent(message);
      }
    },
  );

  // -------------------------------------------------------------------------
  // get_character_rerun_analysis
  // -------------------------------------------------------------------------
  server.registerTool(
    "get_character_rerun_analysis",
    {
      title: "Get Character Rerun Analysis",
      description:
        "Return statistical rerun distribution and pressure analysis for a character: appearance count, median interval, pressure score (0-100), confidence level, and a human-readable summary.",
      inputSchema: z.object({
        character: z
          .string()
          .describe("Character name or URL slug (e.g. furina, hu-tao, raiden-shogun)."),
      }),
    },
    async ({ character }) => {
      try {
        const queries = await getTeyvatBannerQueries();
        const { character: charEntity, statistics: stats } =
          await queries.character(character);

        if (!charEntity) return errorContent(`Character '${character}' not found.`);
        if (!stats)
          return errorContent(`No banner statistics available for '${charEntity.name}'.`);

        return jsonContent({
          character: { id: charEntity.slug, name: charEntity.name },
          statistics: {
            appearanceCount: stats.appearanceCount,
            completedIntervalCount: stats.completedIntervalCount,
            intervals: stats.intervals,
            currentWait: stats.currentWait,
            meanInterval: stats.meanInterval ? Number(stats.meanInterval.toFixed(2)) : null,
            medianInterval: stats.medianInterval,
            minimumInterval: stats.minimumInterval,
            maximumInterval: stats.maximumInterval,
            modeIntervals: stats.modeIntervals,
            currentWaitPercentile: stats.currentWaitPercentile
              ? Math.round(stats.currentWaitPercentile)
              : null,
          },
          analysis: {
            pressureScore: stats.pressureScore,
            pressureLevel: stats.pressureLevel,
            confidenceScore: stats.confidenceScore,
            confidenceLevel: stats.confidenceLevel,
            summary:
              stats.pressureScore && stats.pressureScore > 70
                ? `${charEntity.name} has entered their typical historical rerun window.`
                : `${charEntity.name} is likely not due for a rerun immediately based on historical patterns.`,
            reasons: stats.reasons?.map((reason) => reason.message) ?? [],
          },
          disclaimer:
            "Statistical estimate based on historical banner rotations. Not official information or a leak.",
          modelVersion: stats.modelVersion,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to retrieve rerun analysis.";
        return errorContent(message);
      }
    },
  );
});

export { handler as GET, handler as POST };
