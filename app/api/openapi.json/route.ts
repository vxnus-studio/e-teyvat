import { NextResponse } from "next/server";

export async function GET() {
  const openApiSpec = {
    openapi: "3.1.0",
    info: {
      title: "E-Teyvat Knowledge Base API",
      version: "1.0.0",
      description:
        "Open structured knowledge base and deterministic Ground-Truth Retrieval API for Genshin Impact entities, weapons, materials, farming pathways, daily rotation schedules, character build guides, banner rotations, and lore archives. Designed for RAG pipelines and external AI Agents (Claude, Gemini, GPT): client agents retrieve verbatim canonical evidence from these endpoints to execute semantic reasoning, timeline deduction, and synthesis with exact source citations.",
      contact: {
        name: "VXNUS Labs",
        url: "https://vxnus.xyz",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: "https://e-teyvat.vxnus.xyz",
        description: "Production Server",
      },
      {
        url: "http://localhost:3000",
        description: "Local Development Server",
      },
    ],
    tags: [
      { name: "Core & Health", description: "System status and dataset revision telemetry" },
      { name: "Entities", description: "Canonical entity catalog and graph relationship traversal" },
      { name: "Farming", description: "Ascension costs, material schedules, daily domain rotations, and drop locations" },
      { name: "Builds", description: "Curated character build guides, weapon & artifact rankings, stat priorities, and team synergies" },
      { name: "Banners", description: "Banner intelligence, rotation history, and statistical rerun pressure" },
      { name: "Knowledge & AI", description: "Full-text rank search and narrative lore retrieval" },
      { name: "MCP", description: "Model Context Protocol tools endpoint for AI agents" },
    ],
    paths: {
      "/api/health": {
        get: {
          tags: ["Core & Health"],
          summary: "System Health & Revision Telemetry",
          description: "Returns health status, active dataset revision, entity/relation counts, and current game version telemetry.",
          operationId: "getHealth",
          responses: {
            "200": {
              description: "System is healthy and database revision telemetry returned",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string", example: "ready" },
                      connected: { type: "boolean", example: true },
                      revision: { type: ["string", "null"], example: "81c86d97c771" },
                      shortRevision: { type: ["string", "null"], example: "81c86d9" },
                      gameVersion: { type: "string", example: "v7.0.1" },
                      phaseLabel: { type: ["string", "null"], example: "Version 7.0 P1" },
                      lastSyncedAt: { type: ["string", "null"], format: "date-time", example: "2026-07-26T03:17:00.000Z" },
                      entityCount: { type: "integer", example: 4200 },
                      relationCount: { type: "integer", example: 8900 },
                      unresolvedRelationCount: { type: "integer", example: 0 },
                    },
                    required: ["status", "connected"],
                  },
                },
              },
            },
            "503": {
              description: "Database connection failed",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/e/verify": {
        post: {
          tags: ["Core & Health"],
          summary: "E Knowledge Provider Verification",
          description: "Handshake verification endpoint for E knowledge provider registration and publisher authorization.",
          operationId: "verifyProvider",
          responses: {
            "200": {
              description: "Provider registration verified",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      valid: { type: "boolean", example: true },
                      provider: { type: "string", example: "@vxnus/e-teyvat" },
                      publisher: { type: "string", example: "vxnus" },
                    },
                    required: ["valid", "provider", "publisher"],
                  },
                },
              },
            },
            "503": {
              description: "Knowledge provider unavailable",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/openapi.json": {
        get: {
          tags: ["Core & Health"],
          summary: "OpenAPI Specification",
          description: "Returns the OpenAPI 3.1.0 specification for the E-Teyvat Knowledge Base API.",
          operationId: "getOpenApiSpec",
          responses: {
            "200": {
              description: "OpenAPI 3.1.0 document in JSON format",
              content: {
                "application/json": {
                  schema: { type: "object" },
                },
              },
            },
          },
        },
      },
      "/api/mcp": {
        get: {
          tags: ["MCP"],
          summary: "MCP Server Transport (Streamable HTTP / SSE)",
          description: "Connect to the Model Context Protocol server endpoint for streaming tools inspection and execution.",
          operationId: "mcpGet",
          responses: {
            "200": {
              description: "MCP connection established",
            },
          },
        },
        post: {
          tags: ["MCP"],
          summary: "MCP JSON-RPC Endpoint",
          description: "Execute Model Context Protocol JSON-RPC requests for tools invocation (find_entity, get_entity, get_farming_sources, search_lore, get_lore_book, get_character_lore, search_knowledge, get_banner_rerun_pressure, get_character_banner_history, get_character_rerun_analysis).",
          operationId: "mcpPost",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { type: "object" },
              },
            },
          },
          responses: {
            "200": {
              description: "JSON-RPC response payload",
              content: {
                "application/json": {
                  schema: { type: "object" },
                },
              },
            },
          },
        },
      },
      "/api/v1/entities": {
        get: {
          tags: ["Entities"],
          summary: "List and search entities",
          description: "Search canonical entities across all categories (characters, weapons, artifacts, enemies, materials, domains, foods, achievements, regions) with pagination and full-text keyword matching.",
          operationId: "searchEntities",
          parameters: [
            {
              name: "q",
              in: "query",
              required: false,
              description: "Case-insensitive entity name or keyword substring.",
              schema: { type: "string" },
            },
            {
              name: "kind",
              in: "query",
              required: false,
              description: "Exact category folder filter (e.g. characters, weapons, artifacts, enemies, materials, domains).",
              schema: { type: "string", enum: ["characters", "weapons", "artifacts", "enemies", "materials", "domains", "foods", "achievements", "regions"] },
            },
            {
              name: "limit",
              in: "query",
              required: false,
              description: "Maximum records to return (1 to 50, default 24).",
              schema: { type: "integer", default: 24, minimum: 1, maximum: 50 },
            },
            {
              name: "page",
              in: "query",
              required: false,
              description: "Pagination page number (default 1).",
              schema: { type: "integer", default: 1, minimum: 1 },
            },
          ],
          responses: {
            "200": {
              description: "List of matching entities",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      items: {
                        type: "array",
                        items: { $ref: "#/components/schemas/EntitySummary" },
                      },
                      total: { type: "integer", example: 1 },
                      page: { type: "integer", example: 1 },
                      limit: { type: "integer", example: 24 },
                      preview: { type: "boolean", example: false },
                    },
                    required: ["items", "preview"],
                  },
                },
              },
            },
          },
        },
      },
      "/api/v1/entities/{kind}/{slug}": {
        get: {
          tags: ["Entities"],
          summary: "Get entity detail & relations",
          description: "Retrieve a single canonical entity along with its typed graph relations (requirements, drops, domain sources, builds, elements).",
          operationId: "getEntityDetail",
          parameters: [
            {
              name: "kind",
              in: "path",
              required: true,
              description: "Entity kind folder (e.g. characters, weapons, artifacts, materials, domains, enemies).",
              schema: { type: "string" },
            },
            {
              name: "slug",
              in: "path",
              required: true,
              description: "Entity identifier slug (e.g. furina, splendor-of-tranquil-waters).",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Entity details and outgoing graph relations",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      entity: { $ref: "#/components/schemas/EntityDetail" },
                      relations: {
                        type: "array",
                        items: { $ref: "#/components/schemas/EntityRelation" },
                      },
                      preview: { type: "boolean", example: false },
                    },
                    required: ["entity", "relations"],
                  },
                },
              },
            },
            "404": {
              description: "Entity not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/v1/farming": {
        get: {
          tags: ["Farming"],
          summary: "Retrieve farming plan and material sources",
          description: "Retrieves complete ascension farming pathways, material costs, domain schedules, and enemy drop locations for any character, weapon, or material.",
          operationId: "getFarmingPlan",
          parameters: [
            {
              name: "target",
              in: "query",
              required: true,
              description: "Target entity name, slug, or alias (e.g. Furina, Splendor of Tranquil Waters).",
              schema: { type: "string" },
            },
            {
              name: "kind",
              in: "query",
              required: false,
              description: "Optional entity kind disambiguation (e.g. characters, weapons, materials).",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Structured farming plan with material sources and domain schedule",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/FarmingPlan" },
                },
              },
            },
            "400": {
              description: "Missing target parameter",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "404": {
              description: "Target entity not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/farming/daily": {
        get: {
          tags: ["Farming"],
          summary: "Daily talent book & weapon ascension material rotation schedule",
          description: "Returns the daily domain rotation schedule (0 = Sunday through 6 = Saturday) mapping characters to their farmable talent books and weapons to their ascension materials.",
          operationId: "getDailyFarmingSchedule",
          responses: {
            "200": {
              description: "7-day rotation schedule mapping characters and weapons to farmable materials",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      days: {
                        type: "object",
                        description: "Map of day index (0-6) to scheduled characters and weapons",
                        additionalProperties: {
                          type: "object",
                          properties: {
                            dayName: { type: "string", example: "Monday" },
                            chars: {
                              type: "array",
                              items: {
                                type: "object",
                                properties: {
                                  name: { type: "string", example: "Furina" },
                                  slug: { type: "string", example: "furina" },
                                  element: { type: "string", enum: ["Pyro", "Hydro", "Anemo", "Electro", "Dendro", "Cryo", "Geo"], example: "Hydro" },
                                  rarity: { type: "integer", example: 5 },
                                  talentBook: { type: "string", example: "Justice" },
                                  nation: { type: "string", example: "Fontaine" },
                                },
                                required: ["name", "slug", "element", "rarity", "talentBook", "nation"],
                              },
                            },
                            weapons: {
                              type: "array",
                              items: {
                                type: "object",
                                properties: {
                                  name: { type: "string", example: "Splendor of Tranquil Waters" },
                                  slug: { type: "string", example: "splendor-of-tranquil-waters" },
                                  type: { type: "string", enum: ["Sword", "Claymore", "Polearm", "Bow", "Catalyst"], example: "Sword" },
                                  rarity: { type: "integer", example: 5 },
                                  material: { type: "string", example: "Dross of Pure Sacred Dewdrop" },
                                  nation: { type: "string", example: "Fontaine" },
                                },
                                required: ["name", "slug", "type", "rarity", "material"],
                              },
                            },
                          },
                          required: ["dayName", "chars", "weapons"],
                        },
                      },
                      revision: { type: "string", example: "81c86d97c771" },
                    },
                    required: ["days", "revision"],
                  },
                },
              },
            },
            "500": {
              description: "Internal Server Error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/v1/characters/{character}/builds": {
        get: {
          tags: ["Builds"],
          summary: "Get curated character build recommendations",
          description: "Returns comprehensive, verified build recommendations for a character, including ranked weapons, artifact sets, main stat/substat priorities, stat targets, talent upgrade priorities, recommended team compositions with hydrated teammate entities, rotation guides, and author notes.",
          operationId: "getCharacterBuilds",
          parameters: [
            {
              name: "character",
              in: "path",
              required: true,
              description: "Character slug (e.g. furina, raiden-shogun, nahida, neuvillette).",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "List of hydrated build recommendations",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      characterSlug: { type: "string", example: "furina" },
                      count: { type: "integer", example: 1 },
                      builds: {
                        type: "array",
                        items: { $ref: "#/components/schemas/CharacterBuild" },
                      },
                    },
                    required: ["characterSlug", "count", "builds"],
                  },
                },
              },
            },
          },
        },
      },
      "/api/v1/banners/rerun-pressure": {
        get: {
          tags: ["Banners"],
          summary: "List banner rerun pressure rankings",
          description: "Returns statistical banner pressure scores and urgency rankings for characters based on historical rerun intervals and current absence duration.",
          operationId: "getBannerRerunPressure",
          parameters: [
            {
              name: "limit",
              in: "query",
              required: false,
              description: "Max characters to return (default 50).",
              schema: { type: "integer", default: 50 },
            },
            {
              name: "offset",
              in: "query",
              required: false,
              description: "Offset for pagination (default 0).",
              schema: { type: "integer", default: 0 },
            },
            {
              name: "pressureLevel",
              in: "query",
              required: false,
              description: "Filter by pressure band.",
              schema: { type: "string", enum: ["critical", "elevated", "normal", "recent"] },
            },
          ],
          responses: {
            "200": {
              description: "Rerun pressure telemetry and character rankings",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      currentPhase: {
                        type: ["object", "null"],
                        properties: {
                          phaseKey: { type: "string", example: "7.0.1" },
                          sequenceIndex: { type: "integer", example: 84 },
                        },
                      },
                      characters: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string", example: "shenhe" },
                            name: { type: "string", example: "Shenhe" },
                            currentWait: { type: "integer", example: 22 },
                            medianInterval: { type: ["number", "null"], example: 14 },
                            pressureScore: { type: ["number", "null"], example: 92 },
                            pressureLevel: { type: ["string", "null"], example: "critical" },
                            confidenceLevel: { type: ["string", "null"], example: "high" },
                          },
                          required: ["id", "name", "currentWait"],
                        },
                      },
                    },
                    required: ["characters"],
                  },
                },
              },
            },
          },
        },
      },
      "/api/v1/characters/{character}/banner-history": {
        get: {
          tags: ["Banners"],
          summary: "Get character banner history",
          description: "Returns complete historical banner appearances, versions, start/end dates, and appearance interval history for a specific character.",
          operationId: "getCharacterBannerHistory",
          parameters: [
            {
              name: "character",
              in: "path",
              required: true,
              description: "Character slug (e.g. nahida, zhongli, raiden-shogun).",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Historical appearance timeline and interval data",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      character: {
                        type: "object",
                        properties: {
                          id: { type: "string", example: "nahida" },
                          name: { type: "string", example: "Nahida" },
                          rarity: { type: ["integer", "null"], example: 5 },
                        },
                        required: ["id", "name"],
                      },
                      appearances: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            phaseKey: { type: "string", example: "3.2.1" },
                            version: { type: "string", example: "3.2" },
                            phaseNumber: { type: "integer", example: 1 },
                            sequenceIndex: { type: "integer", example: 38 },
                            startDate: { type: ["string", "null"], format: "date", example: "2022-11-02" },
                            endDate: { type: ["string", "null"], format: "date", example: "2022-11-18" },
                          },
                        },
                      },
                      intervals: {
                        type: "array",
                        items: { type: "integer" },
                        example: [10, 14],
                      },
                      currentWait: { type: "integer", example: 6 },
                      source: {
                        type: "object",
                        properties: {
                          name: { type: "string", example: "Samsara" },
                          commitSha: { type: ["string", "null"] },
                          importedAt: { type: ["string", "null"] },
                        },
                      },
                    },
                    required: ["character", "appearances", "intervals", "currentWait"],
                  },
                },
              },
            },
            "404": {
              description: "Character not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/v1/characters/{character}/rerun-analysis": {
        get: {
          tags: ["Banners"],
          summary: "Get character rerun statistical telemetry & analysis",
          description: "Provides granular statistical distribution metrics, mean/median intervals, percentile benchmarks, and automated forecast analysis notes.",
          operationId: "getCharacterRerunAnalysis",
          parameters: [
            {
              name: "character",
              in: "path",
              required: true,
              description: "Character slug (e.g. furina, arlecchino).",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Granular statistical distribution metrics and forecast summary",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      character: {
                        type: "object",
                        properties: {
                          id: { type: "string", example: "furina" },
                          name: { type: "string", example: "Furina" },
                        },
                        required: ["id", "name"],
                      },
                      statistics: {
                        type: "object",
                        properties: {
                          appearanceCount: { type: "integer", example: 3 },
                          completedIntervalCount: { type: "integer", example: 2 },
                          intervals: { type: "array", items: { type: "integer" }, example: [9, 11] },
                          currentWait: { type: "integer", example: 5 },
                          meanInterval: { type: ["number", "null"], example: 10 },
                          medianInterval: { type: ["number", "null"], example: 10 },
                          minimumInterval: { type: ["number", "null"], example: 9 },
                          maximumInterval: { type: ["number", "null"], example: 11 },
                          modeIntervals: { type: ["array", "null"], items: { type: "integer" }, example: [9, 11] },
                          currentWaitPercentile: { type: ["integer", "null"], example: 45 },
                        },
                      },
                      analysis: {
                        type: "object",
                        properties: {
                          pressureScore: { type: ["number", "null"], example: 48 },
                          pressureLevel: { type: ["string", "null"], example: "normal" },
                          confidenceScore: { type: ["number", "null"], example: 82 },
                          confidenceLevel: { type: ["string", "null"], example: "high" },
                          summary: { type: "string", example: "Furina is likely not due for a rerun immediately based on historical patterns." },
                          reasons: { type: "array", items: { type: "string" } },
                        },
                      },
                      disclaimer: { type: "string" },
                      modelVersion: { type: "string", example: "v1.2" },
                    },
                    required: ["character", "statistics", "analysis", "disclaimer"],
                  },
                },
              },
            },
            "404": {
              description: "Character or statistics not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/v1/knowledge/search": {
        get: {
          tags: ["Knowledge & AI"],
          summary: "Full-text knowledge rank search",
          description: "Execute PostgreSQL full-text rank queries over chunked lore, build guides, and structured entity documents with ts_rank scoring.",
          operationId: "searchKnowledge",
          parameters: [
            {
              name: "q",
              in: "query",
              required: true,
              description: "Search query text supporting English web-search syntax.",
              schema: { type: "string" },
            },
            {
              name: "limit",
              in: "query",
              required: false,
              description: "Max results to return (1 to 50, default 8).",
              schema: { type: "integer", default: 8, minimum: 1, maximum: 50 },
            },
          ],
          responses: {
            "200": {
              description: "Ranked knowledge document chunks",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      items: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            entity_id: { type: "string", example: "characters/furina" },
                            kind: { type: "string", example: "characters" },
                            slug: { type: "string", example: "furina" },
                            name: { type: "string", example: "Furina" },
                            section: { type: "string", example: "Character Story 5" },
                            content: { type: "string" },
                            rank: { type: "number", example: 0.892 },
                          },
                        },
                      },
                      preview: { type: "boolean", example: false },
                    },
                    required: ["items", "preview"],
                  },
                },
              },
            },
            "400": {
              description: "Query parameter is required",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/v1/lore/overview": {
        get: {
          tags: ["Knowledge & AI"],
          summary: "Lore archive collection metrics & overview",
          description: "Returns aggregated document counts across the entire Teyvat narrative archive (in-game books, volume counts, artifact relic stories, weapon legends, bestiary profiles, character stories, voicelines, culinary records, and namecard chronicles).",
          operationId: "getLoreOverview",
          responses: {
            "200": {
              description: "Lore archive document telemetry and category counts",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      bookCount: { type: "integer", example: 120 },
                      bookVolumeCount: { type: "integer", example: 1151 },
                      artifactStoryCount: { type: "integer", example: 299 },
                      weaponLoreCount: { type: "integer", example: 270 },
                      monsterLoreCount: { type: "integer", example: 576 },
                      characterProfileCount: { type: "integer", example: 98 },
                      characterStoryCount: { type: "integer", example: 942 },
                      voicelineCount: { type: "integer", example: 8524 },
                      foodFlavorCount: { type: "integer", example: 380 },
                      namecardCount: { type: "integer", example: 410 },
                      totalDocuments: { type: "integer", example: 12960 },
                      revision: { type: "string", example: "81c86d97c771" },
                    },
                    required: ["bookCount", "bookVolumeCount", "artifactStoryCount", "weaponLoreCount", "monsterLoreCount", "totalDocuments", "revision"],
                  },
                },
              },
            },
            "500": {
              description: "Internal server error retrieving lore overview",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/v1/lore/search": {
        get: {
          tags: ["Knowledge & AI"],
          summary: "Lore Engine Narrative Search",
          description: "Deterministic lexical search over 12,960+ in-game narrative documents (books, character stories, voiceline transcripts, artifact histories, weapon legends, monster bestiary, culinary records) with divine alias resolution (e.g. Morax -> Zhongli, Barbatos -> Venti) and snippet windowing. Returns verbatim canonical source texts for external AI agents to perform semantic reasoning, timeline deduction, and grounded synthesis.",
          operationId: "searchLore",
          parameters: [
            {
              name: "q",
              in: "query",
              required: false,
              description: "Keyword or alias search across lore title, entity, and volume text.",
              schema: { type: "string" },
            },
            {
              name: "category",
              in: "query",
              required: false,
              description: "Category filter.",
              schema: { type: "string", enum: ["all", "book", "story", "quote", "artifact", "weapon", "monster", "character", "food", "namecard"] },
            },
            {
              name: "limit",
              in: "query",
              required: false,
              description: "Maximum results to return (1 to 50, default 20).",
              schema: { type: "integer", default: 20, minimum: 1, maximum: 50 },
            },
            {
              name: "page",
              in: "query",
              required: false,
              description: "Pagination page number (default 1).",
              schema: { type: "integer", default: 1, minimum: 1 },
            },
          ],
          responses: {
            "200": {
              description: "Search results with category facets and metadata",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      items: {
                        type: "array",
                        items: { $ref: "#/components/schemas/LoreDocument" },
                      },
                      total: { type: "integer", example: 42 },
                      page: { type: "integer", example: 1 },
                      limit: { type: "integer", example: 20 },
                      categories: {
                        type: "object",
                        properties: {
                          all: { type: "integer" },
                          books: { type: "integer" },
                          artifacts: { type: "integer" },
                          weapons: { type: "integer" },
                          monsters: { type: "integer" },
                          characters: { type: "integer" },
                          stories: { type: "integer" },
                          quotes: { type: "integer" },
                          foods: { type: "integer" },
                          namecards: { type: "integer" },
                        },
                      },
                      revision: { type: "string" },
                      preview: { type: "boolean", example: false },
                    },
                    required: ["items", "total", "page", "limit", "categories", "revision", "preview"],
                  },
                },
              },
            },
          },
        },
      },
      "/api/v1/lore/books": {
        get: {
          tags: ["Knowledge & AI"],
          summary: "List In-Game Book Chronicles",
          description: "List and browse all in-game book chronicles with total volume counts and preview snippets.",
          operationId: "listLoreBooks",
          parameters: [
            {
              name: "q",
              in: "query",
              required: false,
              description: "Filter by book title substring.",
              schema: { type: "string" },
            },
            {
              name: "limit",
              in: "query",
              required: false,
              description: "Records limit (default 24).",
              schema: { type: "integer", default: 24, minimum: 1, maximum: 50 },
            },
            {
              name: "page",
              in: "query",
              required: false,
              description: "Page number (default 1).",
              schema: { type: "integer", default: 1, minimum: 1 },
            },
          ],
          responses: {
            "200": {
              description: "List of in-game book chronicles",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      items: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string", example: "genshin:book:the-fox-in-the-dandelion-sea" },
                            slug: { type: "string", example: "the-fox-in-the-dandelion-sea" },
                            name: { type: "string", example: "The Fox in the Dandelion Sea" },
                            rarity: { type: ["integer", "null"], example: 4 },
                            icon: { type: ["string", "null"] },
                            volumeCount: { type: "integer", example: 11 },
                            sampleSnippet: { type: "string" },
                          },
                          required: ["id", "slug", "name", "volumeCount", "sampleSnippet"],
                        },
                      },
                      total: { type: "integer", example: 120 },
                      page: { type: "integer", example: 1 },
                      limit: { type: "integer", example: 24 },
                      revision: { type: "string" },
                    },
                    required: ["items", "total", "page", "limit", "revision"],
                  },
                },
              },
            },
          },
        },
      },
      "/api/v1/lore/books/{slug}": {
        get: {
          tags: ["Knowledge & AI"],
          summary: "Get Full In-Game Book Anthology",
          description: "Retrieve the complete anthology text and individual volume chapters for a specific in-game book chronicle.",
          operationId: "getLoreBookDetail",
          parameters: [
            {
              name: "slug",
              in: "path",
              required: true,
              description: "Book slug identifier (e.g. perinheri, the-fox-in-the-dandelion-sea, teyvat-travel-guide).",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Complete book details and volume chapters",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/LoreBookDetail" },
                },
              },
            },
            "404": {
              description: "Book not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            error: { type: "string", example: "Target entity not found." },
          },
          required: ["error"],
        },
        EntitySummary: {
          type: "object",
          properties: {
            id: { type: "string", example: "characters/nahida" },
            kind: { type: "string", example: "characters" },
            slug: { type: "string", example: "nahida" },
            name: { type: "string", example: "Nahida" },
            image: { type: ["string", "null"], example: "https://cdn.e-teyvat.vxnus.xyz/characters/nahida.png" },
            description: { type: ["string", "null"], example: "A caged bird secluded within the Sanctuary of Surasthana..." },
          },
          required: ["id", "kind", "slug", "name"],
        },
        EntityDetail: {
          type: "object",
          properties: {
            id: { type: "string", example: "weapons/splendor-of-tranquil-waters" },
            kind: { type: "string", example: "weapons" },
            slug: { type: "string", example: "splendor-of-tranquil-waters" },
            name: { type: "string", example: "Splendor of Tranquil Waters" },
            rarity: { type: ["integer", "null"], example: 5 },
            weaponType: { type: ["string", "null"], example: "Sword" },
            description: { type: ["string", "null"] },
            canonicalData: { type: "object" },
          },
          required: ["id", "kind", "slug", "name"],
        },
        EntityRelation: {
          type: "object",
          properties: {
            relationType: { type: "string", example: "requires" },
            targetKind: { type: "string", example: "materials" },
            targetSlug: { type: "string", example: "dross-of-pure-sacred-dewdrop" },
            targetName: { type: "string", example: "Dross of Pure Sacred Dewdrop" },
            metadata: { type: ["object", "null"] },
          },
          required: ["relationType", "targetKind", "targetSlug"],
        },
        FarmingSource: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["domain", "enemy"], example: "domain" },
            name: { type: "string", example: "Echoes of the Deep Tides" },
            kind: { type: "string", example: "domains" },
            slug: { type: "string", example: "echoes-of-the-deep-tides" },
            region: { type: ["string", "null"], example: "Fontaine" },
            availableDays: {
              type: "array",
              items: { type: "string" },
              example: ["Tuesday", "Friday", "Sunday"],
            },
            domainEntrance: { type: ["string", "null"] },
          },
          required: ["type", "name", "kind", "slug", "availableDays"],
        },
        FarmingMaterial: {
          type: "object",
          properties: {
            id: { type: "string", example: "genshin:material:pure-sacred-dewdrop" },
            name: { type: "string", example: "Dross of Pure Sacred Dewdrop" },
            quantity: { type: ["integer", "null"], example: 5 },
            phase: { type: "string", example: "ascension_material" },
            sources: {
              type: "array",
              items: { $ref: "#/components/schemas/FarmingSource" },
            },
            sourceNotes: {
              type: "array",
              items: { type: "string" },
              example: ["Domain of Forgery: Submerged Valley"],
            },
          },
          required: ["id", "name", "phase", "sources", "sourceNotes"],
        },
        FarmingPlan: {
          type: "object",
          properties: {
            target: {
              type: "object",
              properties: {
                id: { type: "string", example: "genshin:weapon:splendor-of-tranquil-waters" },
                kind: { type: "string", example: "weapons" },
                slug: { type: "string", example: "splendor-of-tranquil-waters" },
                name: { type: "string", example: "Splendor of Tranquil Waters" },
              },
              required: ["id", "kind", "slug", "name"],
            },
            materials: {
              type: "array",
              items: { $ref: "#/components/schemas/FarmingMaterial" },
            },
            revision: { type: ["string", "null"], example: "81c86d97c771" },
            preview: { type: "boolean", example: false },
          },
          required: ["target", "materials", "preview"],
        },
        CharacterBuildWeapon: {
          type: "object",
          properties: {
            weaponSlug: { type: "string", example: "splendor-of-tranquil-waters" },
            refinement: { type: "integer", example: 1 },
            tier: { type: "string", example: "BiS" },
            notes: { type: "string", example: "Signature 5-star weapon." },
            entity: {
              type: ["object", "null"],
              properties: {
                id: { type: "string" },
                slug: { type: "string" },
                name: { type: "string" },
                image: { type: ["string", "null"] },
                rarity: { type: ["integer", "null"] },
                type: { type: "string" },
                substat: { type: "string" },
                description: { type: "string" },
              },
            },
          },
          required: ["weaponSlug", "tier"],
        },
        CharacterBuildArtifact: {
          type: "object",
          properties: {
            rank: { type: "integer", example: 1 },
            notes: { type: "string" },
            sets: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  artifactSlug: { type: "string", example: "golden-troupe" },
                  pieces: { type: "integer", enum: [2, 4], example: 4 },
                  entity: {
                    type: ["object", "null"],
                    properties: {
                      id: { type: "string" },
                      slug: { type: "string" },
                      name: { type: "string" },
                      image: { type: ["string", "null"] },
                      rarity: { type: ["integer", "null"] },
                      bonus2pc: { type: ["string", "null"] },
                      bonus4pc: { type: ["string", "null"] },
                    },
                  },
                },
                required: ["artifactSlug", "pieces"],
              },
            },
          },
          required: ["rank", "sets"],
        },
        CharacterBuildTeam: {
          type: "object",
          properties: {
            name: { type: "string", example: "Fontaine Double Hydro" },
            description: { type: "string" },
            members: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  characterSlug: { type: "string", example: "neuvillette" },
                  role: { type: "string", example: "On-Field Main DPS" },
                  alternatives: { type: "array", items: { type: "string" } },
                  entity: {
                    type: ["object", "null"],
                    properties: {
                      id: { type: "string" },
                      slug: { type: "string" },
                      name: { type: "string" },
                      image: { type: ["string", "null"] },
                      rarity: { type: ["integer", "null"] },
                      element: { type: ["string", "null"] },
                    },
                  },
                },
                required: ["characterSlug", "role"],
              },
            },
          },
          required: ["name", "members"],
        },
        CharacterBuild: {
          type: "object",
          properties: {
            id: { type: "string", example: "build_furina_dps" },
            characterSlug: { type: "string", example: "furina" },
            role: { type: "string", example: "Off-Field Sub-DPS & Buffer" },
            title: { type: ["string", "null"], example: "Standard Sub-DPS & Hydro Buffer" },
            isPrimary: { type: "boolean", example: true },
            playstyle: { type: ["string", "null"] },
            weapons: {
              type: "array",
              items: { $ref: "#/components/schemas/CharacterBuildWeapon" },
            },
            artifacts: {
              type: "array",
              items: { $ref: "#/components/schemas/CharacterBuildArtifact" },
            },
            mainStats: {
              type: "object",
              properties: {
                sands: { type: "array", items: { type: "string" }, example: ["HP%", "Energy Recharge"] },
                goblet: { type: "array", items: { type: "string" }, example: ["Hydro DMG Bonus", "HP%"] },
                circlet: { type: "array", items: { type: "string" }, example: ["CRIT Rate", "CRIT DMG"] },
              },
              required: ["sands", "goblet", "circlet"],
            },
            substatPriority: {
              type: "array",
              items: { type: "string" },
              example: ["Energy Recharge", "CRIT Rate", "CRIT DMG", "HP%"],
            },
            statTargets: {
              type: "object",
              additionalProperties: { type: "string" },
              example: { "Energy Recharge": "160-180%", "HP": "35,000+" },
            },
            talentPriority: {
              type: "array",
              items: { type: "string" },
              example: ["Elemental Burst", "Elemental Skill", "Normal Attack"],
            },
            teams: {
              type: "array",
              items: { $ref: "#/components/schemas/CharacterBuildTeam" },
            },
            rotationGuide: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  step: { type: "integer", example: 1 },
                  character: { type: "string", example: "Furina" },
                  action: { type: "string", example: "Cast Skill (E) -> Burst (Q)" },
                  notes: { type: "string" },
                },
                required: ["step", "character", "action"],
              },
            },
            authorNotes: { type: ["string", "null"] },
            provenance: {
              type: "object",
              properties: {
                source: { type: "string", example: "KeqingMains" },
                url: { type: "string" },
                author: { type: "string" },
              },
            },
            gameVersion: { type: "string", example: "5.4" },
          },
          required: [
            "id",
            "characterSlug",
            "role",
            "isPrimary",
            "weapons",
            "artifacts",
            "mainStats",
            "substatPriority",
            "talentPriority",
            "teams",
            "rotationGuide",
            "provenance",
            "gameVersion",
          ],
        },
        LoreDocument: {
          type: "object",
          properties: {
            id: { type: "string", example: "genshin:document:doc_book_1" },
            entityId: { type: "string", example: "genshin:book:the-fox-in-the-dandelion-sea" },
            category: {
              type: "string",
              enum: ["book", "artifact", "weapon", "monster", "character", "gcg", "food", "namecard", "story", "quote"],
              example: "book",
            },
            title: { type: "string", example: "The Fox in the Dandelion Sea — Vol. 1" },
            entityName: { type: "string", example: "The Fox in the Dandelion Sea" },
            entitySlug: { type: "string", example: "the-fox-in-the-dandelion-sea" },
            entityKind: { type: "string", example: "book" },
            volumeNumber: { type: ["integer", "null"], example: 1 },
            content: { type: "string" },
            snippet: { type: "string", example: "A hunter stepped into the forest of dandelions..." },
            rarity: { type: ["integer", "null"], example: 4 },
            icon: { type: ["string", "null"] },
            provenance: { type: ["object", "null"] },
          },
          required: ["id", "entityId", "category", "title", "entityName", "entitySlug", "entityKind", "content", "snippet"],
        },
        LoreBookDetail: {
          type: "object",
          properties: {
            id: { type: "string", example: "genshin:book:perinheri" },
            slug: { type: "string", example: "perinheri" },
            name: { type: "string", example: "Perinheri" },
            rarity: { type: ["integer", "null"], example: 4 },
            icon: { type: ["string", "null"] },
            volumeCount: { type: "integer", example: 2 },
            description: { type: ["string", "null"] },
            volumes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", example: "genshin:document:doc_book_perinheri_1" },
                  volumeNumber: { type: "integer", example: 1 },
                  title: { type: "string", example: "Volume 1" },
                  content: { type: "string" },
                },
                required: ["id", "volumeNumber", "title", "content"],
              },
            },
            revision: { type: "string" },
          },
          required: ["id", "slug", "name", "volumeCount", "volumes", "revision"],
        },
      },
    },
  };

  return NextResponse.json(openApiSpec, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}

