import { NextResponse } from "next/server";

export async function GET() {
  const openApiSpec = {
    openapi: "3.1.0",
    info: {
      title: "E-Teyvat Knowledge Base API",
      version: "1.0.0",
      description:
        "Open structured knowledge base and graph database for Genshin Impact entities, weapons, materials, farming pathways, banner rotations, and AI retrieval.",
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
        url: "https://eteyvat.vxnus.xyz",
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
      { name: "Farming", description: "Ascension costs, material schedules, and drop locations" },
      { name: "Banners", description: "Banner intelligence, rotation history, and statistical rerun pressure" },
      { name: "Knowledge & AI", description: "Full-text rank search and E-Knowledge provider verification" },
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
      "/api/entities": {
        get: {
          tags: ["Entities"],
          summary: "List and search entities",
          description: "Search canonical entities across all categories (characters, weapons, artifacts, enemies, materials, domains) with pagination and full-text keyword matching.",
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
              schema: { type: "string", enum: ["characters", "weapons", "artifacts", "enemies", "materials", "domains"] },
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
      "/api/entities/{kind}/{slug}": {
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
              description: "Entity kind folder (e.g. characters, weapons, artifacts).",
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
      "/api/farming": {
        get: {
          tags: ["Farming"],
          summary: "Retrieve farming plan and material sources",
          description: "Retrieves complete ascension farming pathways, material costs, domain schedules, and enemy drop locations for any character or weapon.",
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
              description: "Optional entity kind disambiguation (characters or weapons).",
              schema: { type: "string", enum: ["characters", "weapons"] },
            },
          ],
          responses: {
            "200": {
              description: "Structured farming plan with material sources and domain schedule",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      target: {
                        type: "object",
                        properties: {
                          name: { type: "string", example: "Furina" },
                          kind: { type: "string", example: "characters" },
                          slug: { type: "string", example: "furina" },
                        },
                        required: ["name", "kind", "slug"],
                      },
                      materials: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string", example: "Varunada Lazurite Gemstone" },
                            kind: { type: "string", example: "materials" },
                            slug: { type: "string", example: "varunada-lazurite-gemstone" },
                            sources: {
                              type: "array",
                              items: {
                                type: "object",
                                properties: {
                                  sourceType: { type: "string", example: "boss_drop" },
                                  name: { type: "string", example: "Hydro Tulpa" },
                                  days: {
                                    type: "array",
                                    items: { type: "string" },
                                    example: ["Always Available"],
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                    required: ["target", "materials"],
                  },
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
      "/api/v1/genshin/banners/rerun-pressure": {
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
      "/api/v1/genshin/characters/{character}/banner-history": {
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
      "/api/v1/genshin/characters/{character}/rerun-analysis": {
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
      "/api/knowledge/search": {
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
      "/api/e/verify": {
        post: {
          tags: ["Knowledge & AI"],
          summary: "E-Knowledge Hub publisher verification",
          description: "Verifies the knowledge provider authenticity against E-Hub publisher specifications without revealing secret keys.",
          operationId: "verifyKnowledgeProvider",
          security: [
            {
              BearerAuth: [],
            },
          ],
          responses: {
            "200": {
              description: "Provider verified successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      id: { type: "string", example: "@vxnus/e-teyvat" },
                      publisher: { type: "string", example: "vxnus" },
                    },
                    required: ["id", "publisher"],
                  },
                },
              },
            },
            "401": {
              description: "Unauthorized or invalid publisher key",
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
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "Enter your E Hub publisher bearer key",
        },
      },
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
            image: { type: ["string", "null"], example: "https://cdn.eteyvat.vxnus.xyz/characters/nahida.png" },
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
