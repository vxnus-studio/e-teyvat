import { DatabaseShell } from "../_components/database-shell";
import { Icon } from "../_components/navigation";

export const metadata = {
  title: "API Documentation | E-Teyvat",
  description: "Comprehensive public API documentation for E-Teyvat knowledge graph, entities, farming plans, banners, and AI retrieval.",
};

type Parameter = {
  name: string;
  type: string;
  required: boolean;
  description: string;
};

type ApiEndpoint = {
  id: string;
  method: "GET" | "POST";
  path: string;
  title: string;
  description: string;
  category: "Core & Health" | "Entities & Relations" | "Farming & Domains" | "Banner Intelligence" | "AI & Knowledge Retrieval";
  parameters?: Parameter[];
  headers?: { name: string; required: boolean; description: string }[];
  exampleRequest: string;
  exampleResponse: string;
  notes?: string;
};

const apiEndpoints: ApiEndpoint[] = [
  {
    id: "health-check",
    method: "GET",
    path: "/api/health",
    title: "Health & System Status",
    description: "Returns health status, active dataset revision, entity/relation counts, and current game version telemetry.",
    category: "Core & Health",
    exampleRequest: "curl -X GET https://eteyvat.vxnus.xyz/api/health",
    exampleResponse: JSON.stringify(
      {
        status: "ready",
        connected: true,
        revision: "81c86d97c771",
        shortRevision: "81c86d9",
        gameVersion: "v7.0.1",
        phaseLabel: "Version 7.0 P1",
        lastSyncedAt: "2026-07-26T03:17:00.000Z",
        entityCount: 4200,
        relationCount: 8900,
        unresolvedRelationCount: 0,
      },
      null,
      2
    ),
    notes: "Responses are cached with Cache-Control: public, max-age=60, s-maxage=300.",
  },
  {
    id: "search-entities",
    method: "GET",
    path: "/api/entities",
    title: "List & Search Entities",
    description: "Search canonical entities across all categories (characters, weapons, artifacts, enemies, materials, domains) with pagination and full-text keyword matching.",
    category: "Entities & Relations",
    parameters: [
      { name: "q", type: "string", required: false, description: "Case-insensitive entity name or keyword substring." },
      { name: "kind", type: "string", required: false, description: "Exact category filter (e.g. characters, weapons, artifacts, enemies, materials, domains)." },
      { name: "limit", type: "number", required: false, description: "Maximum records to return (1 to 50, default 24)." },
      { name: "page", type: "number", required: false, description: "Pagination page number (default 1)." },
    ],
    exampleRequest: "curl -X GET \"https://eteyvat.vxnus.xyz/api/entities?kind=characters&q=nahida&limit=10\"",
    exampleResponse: JSON.stringify(
      {
        items: [
          {
            id: "characters/nahida",
            kind: "characters",
            slug: "nahida",
            name: "Nahida",
            image: "https://cdn.eteyvat.vxnus.xyz/characters/nahida.png",
            description: "A caged bird secluded within the Sanctuary of Surasthana...",
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        preview: false,
      },
      null,
      2
    ),
  },
  {
    id: "entity-detail",
    method: "GET",
    path: "/api/entities/{kind}/{slug}",
    title: "Entity Detail & Graph Relations",
    description: "Retrieve a single canonical entity along with its typed relations (requirements, drops, domain sources, builds, elements).",
    category: "Entities & Relations",
    parameters: [
      { name: "kind", type: "string", required: true, description: "Entity kind folder (e.g. characters, weapons, artifacts)." },
      { name: "slug", type: "string", required: true, description: "Entity identifier slug (e.g. furina, splendor-of-tranquil-waters)." },
    ],
    exampleRequest: "curl -X GET https://eteyvat.vxnus.xyz/api/entities/weapons/splendor-of-tranquil-waters",
    exampleResponse: JSON.stringify(
      {
        entity: {
          id: "weapons/splendor-of-tranquil-waters",
          kind: "weapons",
          slug: "splendor-of-tranquil-waters",
          name: "Splendor of Tranquil Waters",
          rarity: 5,
          weaponType: "Sword",
          description: "A scepter with the color of clean water...",
        },
        relations: [
          {
            relationType: "requires",
            targetKind: "materials",
            targetSlug: "dross-of-pure-sacred-dewdrop",
            targetName: "Dross of Pure Sacred Dewdrop",
            metadata: { count: 5 },
          },
        ],
        preview: false,
      },
      null,
      2
    ),
  },
  {
    id: "farming-plan",
    method: "GET",
    path: "/api/farming",
    title: "Farming & Material Retrieval",
    description: "Retrieves complete ascension farming pathways, material costs, domain schedules, and enemy drop locations for any character or weapon.",
    category: "Farming & Domains",
    parameters: [
      { name: "target", type: "string", required: true, description: "Target entity name, slug, or alias (e.g. Furina, Splendor of Tranquil Waters)." },
      { name: "kind", type: "string", required: false, description: "Optional entity kind disambiguation (characters or weapons)." },
    ],
    exampleRequest: "curl -X GET \"https://eteyvat.vxnus.xyz/api/farming?target=Furina\"",
    exampleResponse: JSON.stringify(
      {
        target: {
          name: "Furina",
          kind: "characters",
          slug: "furina",
        },
        materials: [
          {
            name: "Varunada Lazurite Gemstone",
            kind: "materials",
            slug: "varunada-lazurite-gemstone",
            sources: [
              {
                sourceType: "boss_drop",
                name: "Hydro Tulpa",
                days: ["Always Available"],
              },
            ],
          },
          {
            name: "Teachings of Justice",
            kind: "materials",
            slug: "teachings-of-justice",
            sources: [
              {
                sourceType: "domain_reward",
                name: "Pale Forgotten Glory",
                days: ["Tuesday", "Friday", "Sunday"],
              },
            ],
          },
        ],
      },
      null,
      2
    ),
  },
  {
    id: "banner-rerun-pressure",
    method: "GET",
    path: "/api/v1/genshin/banners/rerun-pressure",
    title: "Banner Rerun Pressure Ranking",
    description: "Returns statistical banner pressure scores and urgency rankings for all characters based on historical rerun intervals and current absence duration.",
    category: "Banner Intelligence",
    parameters: [
      { name: "limit", type: "number", required: false, description: "Max characters to return (default 50)." },
      { name: "offset", type: "number", required: false, description: "Offset for pagination (default 0)." },
      { name: "pressureLevel", type: "string", required: false, description: "Filter by level: critical, elevated, normal, or recent." },
    ],
    exampleRequest: "curl -X GET \"https://eteyvat.vxnus.xyz/api/v1/genshin/banners/rerun-pressure?limit=5\"",
    exampleResponse: JSON.stringify(
      {
        currentPhase: {
          phaseKey: "7.0.1",
          sequenceIndex: 84,
        },
        characters: [
          {
            id: "shenhe",
            name: "Shenhe",
            currentWait: 22,
            medianInterval: 14,
            pressureScore: 92,
            pressureLevel: "critical",
            confidenceLevel: "high",
          },
          {
            id: "ganyu",
            name: "Ganyu",
            currentWait: 18,
            medianInterval: 12,
            pressureScore: 84,
            pressureLevel: "critical",
            confidenceLevel: "high",
          },
        ],
      },
      null,
      2
    ),
  },
  {
    id: "character-banner-history",
    method: "GET",
    path: "/api/v1/genshin/characters/{character}/banner-history",
    title: "Character Banner History",
    description: "Returns complete historical banner appearances, versions, start/end dates, and appearance interval history for a specific character.",
    category: "Banner Intelligence",
    parameters: [
      { name: "character", type: "string", required: true, description: "Character slug (e.g. nahida, zhongli, raiden-shogun)." },
    ],
    exampleRequest: "curl -X GET https://eteyvat.vxnus.xyz/api/v1/genshin/characters/nahida/banner-history",
    exampleResponse: JSON.stringify(
      {
        character: {
          id: "nahida",
          name: "Nahida",
          rarity: 5,
        },
        appearances: [
          {
            phaseKey: "3.2.1",
            version: "3.2",
            phaseNumber: 1,
            sequenceIndex: 38,
            startDate: "2022-11-02",
            endDate: "2022-11-18",
          },
          {
            phaseKey: "3.6.1",
            version: "3.6",
            phaseNumber: 1,
            sequenceIndex: 48,
            startDate: "2023-04-12",
            endDate: "2023-05-02",
          },
        ],
        intervals: [10, 14],
        currentWait: 6,
        source: {
          name: "Samsara",
          commitSha: null,
          importedAt: null,
        },
      },
      null,
      2
    ),
  },
  {
    id: "character-rerun-analysis",
    method: "GET",
    path: "/api/v1/genshin/characters/{character}/rerun-analysis",
    title: "Character Rerun Telemetry & Analysis",
    description: "Provides granular statistical distribution metrics, mean/median intervals, percentile benchmarks, and automated forecast analysis notes.",
    category: "Banner Intelligence",
    parameters: [
      { name: "character", type: "string", required: true, description: "Character slug (e.g. furina, arlecchino)." },
    ],
    exampleRequest: "curl -X GET https://eteyvat.vxnus.xyz/api/v1/genshin/characters/furina/rerun-analysis",
    exampleResponse: JSON.stringify(
      {
        character: {
          id: "furina",
          name: "Furina",
        },
        statistics: {
          appearanceCount: 3,
          completedIntervalCount: 2,
          intervals: [9, 11],
          currentWait: 5,
          meanInterval: 10,
          medianInterval: 10,
          minimumInterval: 9,
          maximumInterval: 11,
          modeIntervals: [9, 11],
          currentWaitPercentile: 45,
        },
        analysis: {
          pressureScore: 48,
          pressureLevel: "normal",
          confidenceScore: 82,
          confidenceLevel: "high",
          summary: "Furina is likely not due for a rerun immediately based on historical patterns.",
          reasons: [
            "Current absence of 5 phases is well under her median wait of 10 phases.",
          ],
        },
        disclaimer: "This is a statistical estimate based on historical banner rotations. It is not official information or a leak.",
        modelVersion: "v1.2",
      },
      null,
      2
    ),
  },
  {
    id: "knowledge-search",
    method: "GET",
    path: "/api/knowledge/search",
    title: "Full-Text Knowledge Search",
    description: "Execute PostgreSQL full-text rank queries over chunked lore, build guides, and structured entity documents with ts_rank scoring.",
    category: "AI & Knowledge Retrieval",
    parameters: [
      { name: "q", type: "string", required: true, description: "Search query text supporting English web-search syntax." },
      { name: "limit", type: "number", required: false, description: "Max results to return (1 to 50, default 8)." },
    ],
    exampleRequest: "curl -X GET \"https://eteyvat.vxnus.xyz/api/knowledge/search?q=archon+quest+fontaine&limit=4\"",
    exampleResponse: JSON.stringify(
      {
        items: [
          {
            entity_id: "characters/furina",
            kind: "characters",
            slug: "furina",
            name: "Furina",
            section: "Character Story 5",
            content: "For five hundred years, she had maintained this performance...",
            rank: 0.892,
          },
        ],
        preview: false,
      },
      null,
      2
    ),
    notes: "Ideal for AI Agent retrieval tools and fuzzy lore queries across the entire knowledge base.",
  },
  {
    id: "hub-provider-verify",
    method: "POST",
    path: "/api/e/verify",
    title: "E-Knowledge Hub Provider Verification",
    description: "Verifies the knowledge provider authenticity against E-Hub publisher specifications without revealing secret keys.",
    category: "AI & Knowledge Retrieval",
    headers: [
      { name: "Authorization", required: true, description: "Bearer <E_PUBLISHER_API_KEY>" },
    ],
    exampleRequest: "curl -X POST https://eteyvat.vxnus.xyz/api/e/verify \\\n  -H \"Authorization: Bearer test-key\"",
    exampleResponse: JSON.stringify(
      {
        id: "@vxnus/e-teyvat",
        publisher: "vxnus",
      },
      null,
      2
    ),
  },
];

const categories = [
  "Core & Health",
  "Entities & Relations",
  "Farming & Domains",
  "Banner Intelligence",
  "AI & Knowledge Retrieval",
] as const;

export default function ApiDocsPage() {
  return (
    <DatabaseShell
      eyebrow="Public Interface"
      title="API Reference & Integration"
      description="Connect your AI agents, bots, tools, and applications directly to E-Teyvat's structured Genshin Impact knowledge base and graph database."
    >
      <div className="flex flex-col gap-10">
        {/* Overview Banner */}
        <section className="bg-[var(--surface)] border border-[var(--line)] rounded-xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--green)] shadow-[0_0_8px_var(--green)]" />
              <span className="text-xs font-mono font-bold tracking-wider text-[var(--green)] uppercase">
                REST / OpenAPI 3.1 Protocol
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-[var(--text)] m-0">
              Machine-Readable Genshin Impact Telemetry & Facts
            </h2>
            <p className="text-xs md:text-sm text-[var(--text-2)] leading-relaxed m-0">
              All endpoints return standard JSON and support CDN edge caching. Designed for high-throughput AI retrieval, Discord bots, and interactive web tools.
            </p>
          </div>
          <div className="flex flex-col gap-3 shrink-0">
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-mono text-[var(--text-3)] uppercase tracking-wider">Base URL</span>
              <code className="bg-[#0c1512] border border-[var(--line-strong)] text-[var(--green-2)] px-3.5 py-2 rounded-lg text-xs font-mono select-all">
                https://eteyvat.vxnus.xyz/api
              </code>
            </div>
            <a
              href="/api/openapi.json"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-[rgba(98,213,163,0.12)] hover:bg-[rgba(98,213,163,0.2)] text-[var(--green-2)] border border-[rgba(98,213,163,0.3)] text-xs font-mono font-bold px-3.5 py-2 rounded-lg transition-all"
            >
              <Icon name="code" size={15} />
              <span>View OpenAPI 3.1 Spec (/api/openapi.json)</span>
            </a>
          </div>
        </section>

        {/* Quick Jump Index */}
        <nav className="flex flex-wrap gap-2 items-center" aria-label="API categories quick navigation">
          <span className="text-xs font-mono text-[var(--text-3)] mr-2 uppercase tracking-wider">Jump to:</span>
          <a
            href="/api/openapi.json"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-mono font-bold text-[var(--gold)] bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 rounded-md transition-colors inline-flex items-center gap-1.5"
          >
            <span>OpenAPI 3.1 Spec</span>
            <Icon name="chevron" size={11} />
          </a>
          {categories.map((cat) => (
            <a
              key={cat}
              href={`#${cat.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              className="text-xs font-medium text-[var(--text-2)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] hover:text-[var(--green)] border border-[var(--line)] px-3 py-1.5 rounded-md transition-colors"
            >
              {cat}
            </a>
          ))}
        </nav>

        {/* Endpoints by Category */}
        <div className="flex flex-col gap-14">
          {categories.map((cat) => {
            const catEndpoints = apiEndpoints.filter((ep) => ep.category === cat);
            const catId = cat.toLowerCase().replace(/[^a-z0-9]+/g, "-");

            return (
              <section key={cat} id={catId} className="flex flex-col gap-6">
                <div className="flex items-center gap-3 border-b border-[var(--line)] pb-3">
                  <span className="text-xs font-mono font-bold text-[var(--green)] tracking-wider uppercase">
                    Section
                  </span>
                  <h2 className="text-xl font-bold text-[var(--text)] m-0">{cat}</h2>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {catEndpoints.map((ep) => (
                    <article
                      key={ep.id}
                      id={ep.id}
                      className="bg-[var(--surface)] border border-[var(--line)] rounded-xl overflow-hidden shadow-sm"
                    >
                      {/* Header */}
                      <div className="p-5 md:p-6 border-b border-[var(--line)] bg-[#0e1915]/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span
                              className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                ep.method === "GET"
                                  ? "bg-[rgba(98,213,163,0.15)] text-[var(--green)] border border-[rgba(98,213,163,0.3)]"
                                  : "bg-[rgba(226,185,106,0.15)] text-[var(--gold)] border border-[rgba(226,185,106,0.3)]"
                              }`}
                            >
                              {ep.method}
                            </span>
                            <code className="text-sm font-mono font-bold text-[var(--text)]">
                              {ep.path}
                            </code>
                          </div>
                          <h3 className="text-base font-semibold text-[var(--text)] m-0 mt-1">
                            {ep.title}
                          </h3>
                        </div>
                        <a
                          href={ep.path.includes("{") ? "#" : ep.path}
                          target={ep.path.includes("{") ? undefined : "_blank"}
                          rel={ep.path.includes("{") ? undefined : "noreferrer"}
                          className={`text-xs font-mono inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors self-start md:self-auto ${
                            ep.path.includes("{")
                              ? "opacity-50 pointer-events-none border-[var(--line)] text-[var(--text-3)]"
                              : "border-[var(--line-strong)] bg-[var(--surface-2)] text-[var(--green-2)] hover:border-[var(--green)]"
                          }`}
                        >
                          <span>Test Endpoint</span>
                          <Icon name="chevron" size={12} />
                        </a>
                      </div>

                      {/* Body */}
                      <div className="p-5 md:p-6 flex flex-col gap-6">
                        <p className="text-xs md:text-sm text-[var(--text-2)] leading-relaxed m-0">
                          {ep.description}
                        </p>

                        {/* Parameters */}
                        {ep.parameters && ep.parameters.length > 0 && (
                          <div className="flex flex-col gap-2.5">
                            <h4 className="text-xs font-mono uppercase tracking-wider text-[var(--text-3)] m-0">
                              Parameters
                            </h4>
                            <div className="overflow-x-auto border border-[var(--line)] rounded-lg">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-[var(--surface-2)] text-[var(--text-3)] border-b border-[var(--line)] font-mono">
                                  <tr>
                                    <th className="py-2.5 px-3.5 font-medium">Name</th>
                                    <th className="py-2.5 px-3.5 font-medium">Type</th>
                                    <th className="py-2.5 px-3.5 font-medium">Requirement</th>
                                    <th className="py-2.5 px-3.5 font-medium">Description</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--line)]">
                                  {ep.parameters.map((param) => (
                                    <tr key={param.name} className="hover:bg-[var(--surface-2)]/50">
                                      <td className="py-2 px-3.5 font-mono text-[var(--green)]">
                                        {param.name}
                                      </td>
                                      <td className="py-2 px-3.5 font-mono text-[var(--text-3)]">
                                        {param.type}
                                      </td>
                                      <td className="py-2 px-3.5">
                                        {param.required ? (
                                          <span className="text-[10px] font-mono text-amber-400 font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 uppercase">
                                            Required
                                          </span>
                                        ) : (
                                          <span className="text-[10px] font-mono text-[var(--text-3)] uppercase">
                                            Optional
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-2 px-3.5 text-[var(--text-2)]">
                                        {param.description}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Headers */}
                        {ep.headers && ep.headers.length > 0 && (
                          <div className="flex flex-col gap-2.5">
                            <h4 className="text-xs font-mono uppercase tracking-wider text-[var(--text-3)] m-0">
                              Request Headers
                            </h4>
                            <div className="overflow-x-auto border border-[var(--line)] rounded-lg">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-[var(--surface-2)] text-[var(--text-3)] border-b border-[var(--line)] font-mono">
                                  <tr>
                                    <th className="py-2.5 px-3.5 font-medium">Header</th>
                                    <th className="py-2.5 px-3.5 font-medium">Requirement</th>
                                    <th className="py-2.5 px-3.5 font-medium">Description</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--line)]">
                                  {ep.headers.map((h) => (
                                    <tr key={h.name} className="hover:bg-[var(--surface-2)]/50">
                                      <td className="py-2 px-3.5 font-mono text-[var(--green)]">
                                        {h.name}
                                      </td>
                                      <td className="py-2 px-3.5">
                                        {h.required ? (
                                          <span className="text-[10px] font-mono text-amber-400 font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 uppercase">
                                            Required
                                          </span>
                                        ) : (
                                          <span className="text-[10px] font-mono text-[var(--text-3)] uppercase">
                                            Optional
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-2 px-3.5 text-[var(--text-2)]">
                                        {h.description}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Code Examples: Request & Response */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[11px] font-mono text-[var(--text-3)] uppercase tracking-wider">
                              Example Request
                            </span>
                            <pre className="bg-[#090f0d] border border-[var(--line)] p-3.5 rounded-lg text-xs font-mono text-[var(--text)] overflow-x-auto m-0 leading-relaxed">
                              {ep.exampleRequest}
                            </pre>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[11px] font-mono text-[var(--text-3)] uppercase tracking-wider">
                              Example Response (JSON)
                            </span>
                            <pre className="bg-[#090f0d] border border-[var(--line)] p-3.5 rounded-lg text-xs font-mono text-[var(--green-2)] overflow-x-auto max-h-56 m-0 leading-relaxed">
                              {ep.exampleResponse}
                            </pre>
                          </div>
                        </div>

                        {/* Optional Notes */}
                        {ep.notes && (
                          <div className="text-xs text-[var(--text-3)] bg-[var(--surface-2)] border border-[var(--line)] p-3 rounded-lg flex items-center gap-2">
                            <span className="text-[var(--gold)] font-mono font-bold">NOTE:</span>
                            <span>{ep.notes}</span>
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* AI Agent Recommendation Card */}
        <section className="bg-gradient-to-r from-[rgba(17,28,24,0.9)] to-[rgba(12,21,18,0.9)] border border-[rgba(98,213,163,0.25)] rounded-xl p-6 md:p-8 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Icon name="sparkles" size={20} />
            <h3 className="text-base font-bold text-[var(--green-2)] m-0">
              Integrating with Large Language Models & AI Tools
            </h3>
          </div>
          <p className="text-xs md:text-sm text-[var(--text-2)] leading-relaxed m-0 max-w-3xl">
            When constructing Function Calling tool definitions for AI agents (OpenAI, Gemini, Claude, LangChain, etc.), register these 3 core retrieval tools:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            <div className="bg-[#090f0d] border border-[var(--line)] p-4 rounded-lg flex flex-col gap-1">
              <code className="text-xs font-mono text-[var(--green)] font-bold">find_entity(query, kind)</code>
              <span className="text-xs text-[var(--text-3)]">Resolves names & pulls canonical stats from <code>/api/entities</code>.</span>
            </div>
            <div className="bg-[#090f0d] border border-[var(--line)] p-4 rounded-lg flex flex-col gap-1">
              <code className="text-xs font-mono text-[var(--green)] font-bold">get_farming_sources(target)</code>
              <span className="text-xs text-[var(--text-3)]">Extracts exact domain days & boss drops via <code>/api/farming</code>.</span>
            </div>
            <div className="bg-[#090f0d] border border-[var(--line)] p-4 rounded-lg flex flex-col gap-1">
              <code className="text-xs font-mono text-[var(--green)] font-bold">search_knowledge(query)</code>
              <span className="text-xs text-[var(--text-3)]">Deep lexical search over story text via <code>/api/knowledge/search</code>.</span>
            </div>
          </div>
        </section>
      </div>
    </DatabaseShell>
  );
}
