# Read API reference

## General behavior

All public data endpoints are read-only and return JSON. Responses are cached for
60 seconds in a browser or intermediary and for up to 300 seconds in a shared
cache (`Cache-Control: public, max-age=60, s-maxage=300`).

When the server has no `DATABASE_URL`, selected endpoints return explicit
preview data with `"preview": true`.

Production consumers should always inspect:

- HTTP status
- `preview`
- knowledge `revision`, when returned

## Health & System Status

```http
GET /api/health
```

Ready example:

```json
{
  "status": "ready",
  "connected": true,
  "revision": "81c86d97c771",
  "shortRevision": "81c86d9",
  "gameVersion": "v7.0.2",
  "phaseLabel": "Version 7.0 P2",
  "lastSyncedAt": "2026-07-26T03:17:00.000Z",
  "entityCount": 4200,
  "relationCount": 8900,
  "unresolvedRelationCount": 0
}
```

## List and search entities

```http
GET /api/v1/entities?kind=weapons&q=splendor&limit=24
```
*(Legacy alias: `GET /api/entities`)*

Parameters:

| Parameter | Required | Description |
| --- | --- | --- |
| `kind` | No | Exact entity folder (characters, weapons, artifacts, etc.) |
| `q` | No | Case-insensitive name substring |
| `limit` | No | Result limit from 1 to 50; default 24 |
| `page` | No | Pagination page number; default 1 |

The current `total` is the total count of matched records.

## Entity detail

```http
GET /api/v1/entities/{kind}/{slug}
```
*(Legacy alias: `GET /api/entities/{kind}/{slug}`)*

Example:

```http
GET /api/v1/entities/weapons/splendor-of-tranquil-waters
```

Returns the canonical entity and up to 100 outgoing relations.

## Farming retrieval

```http
GET /api/v1/farming?target={name-or-slug}
```
*(Legacy alias: `GET /api/farming`)*

Example:

```http
GET /api/v1/farming?target=Splendor%20of%20Tranquil%20Waters
```

The endpoint:

1. Resolves the target by slug, exact/partial name, or normalized alias.
2. Finds its requirement edges (`requires`, `uses_material_family`, `ascension_cost`, `talent_material`, `recipe_ingredient`).
3. Finds domain `rewards` and enemy `drops` edges pointing to those materials.
4. Returns structured quantities, availability days, domain entrances, and
   fallback source notes.

An AI tool should expose this endpoint directly rather than trying to recreate
the graph traversal in a prompt.

## Full-text knowledge search

```http
GET /api/v1/knowledge/search?q={query}&limit=8
```
*(Legacy alias: `GET /api/knowledge/search`)*

The query uses PostgreSQL English web-search syntax and ranks matches with
`ts_rank`.

Parameters:

| Parameter | Required | Description |
| --- | --- | --- |
| `q` | Yes | Full-text query |
| `limit` | No | Result limit from 1 to 50; default 8 |

## Lore Engine & Narrative Archive

> **AI Reasoning & Capability Notice:** Autonomous generative AI inference, synthesis, and reasoning capabilities are **currently not active**. The Lore Engine operates as a deterministic lexical search index over canonical in-game book volumes, artifact histories, weapon legends, and monster profiles. Results return verbatim source evidence for human readers and AI agents; they do not perform automated reasoning or lore theory generation.

- `GET /api/v1/lore/search` — Search narrative documents across categories (`book`, `artifact`, `weapon`, `monster`, `character`, `all`) with pagination.
- `GET /api/v1/lore/books` — List in-game book chronicles and metadata.
- `GET /api/v1/lore/books/{slug}` — Retrieve complete multi-volume anthology text for an in-game book.

## Banner Intelligence

- `GET /api/v1/banners/rerun-pressure` *(Legacy: `GET /api/v1/genshin/banners/rerun-pressure`)*
- `GET /api/v1/characters/{character}/banner-history` *(Legacy: `GET /api/v1/genshin/characters/{character}/banner-history`)*
- `GET /api/v1/characters/{character}/rerun-analysis` *(Legacy: `GET /api/v1/genshin/characters/{character}/rerun-analysis`)*

## OpenAPI 3.1 Specification

```http
GET /api/openapi.json
```

Returns the complete OpenAPI 3.1.0 specification for all public endpoints.

## E Provider Verification

```http
POST /api/e/verify
```

Handshake verification endpoint for E knowledge provider registration. Validates authorization headers with the publisher key.

## Future Plan: E Knowledge Provider Endpoints

These endpoints are part of the planned `@vxnus/e` remote provider distribution roadmap:

| Endpoint | Method | Status | Description |
| --- | --- | --- | --- |
| `/api/e/manifest` | GET | *Future Plan* | Dynamic dataset revision and capability manifest |
| `/api/e/retrieve` | POST | *Future Plan* | Lexical and hybrid vector cited chunk retrieval |

## Admin & Mutation Endpoints (Internal)

Protected by session cookies (`proxy.ts` middleware):

- `POST /api/auth/login` — Administrator authentication
- `POST /api/auth/logout` — Administrator logout
- `PATCH /api/admin/entities/{id}` — Update entity custom metadata and images
- `POST /api/upload` — Direct media upload to S3/R2 storage

## Error shape

```json
{
  "error": "Target entity not found."
}
```

Common statuses:

- `400`: missing or invalid query input
- `401`: unauthorized (admin endpoints)
- `404`: entity or endpoint not found
- `405`: unsupported HTTP method
- `500`: query failed unexpectedly
- `503`: configured database is unavailable

## Recommended AI Tool Definitions & Agent Architecture

### Ground Truth vs. AI Reasoning
E-Teyvat operates as the deterministic **Ground Truth & Retrieval Layer**. External AI models (Claude, Gemini, GPT, Llama, LangChain) call these read endpoints as function tools to fetch verbatim in-game chronicles, stats, and relations. The external AI model then executes the **semantic reasoning, contextual deduction, and narrative synthesis** over the retrieved factual context.

Register these core tools in your AI agent definition:

1. `find_entity(query, kind?, limit?)` → `GET /api/v1/entities`
   - Resolves aliases and retrieves canonical character/weapon/artifact records.
2. `get_farming_sources(target)` → `GET /api/v1/farming`
   - Computes deterministic talent/ascension pathways and weekday domain schedules.
3. `search_lore(query, category?, limit?, page?)` → `GET /api/v1/lore/search`
   - Retrieves 1,239 book volumes, 299 artifact chronicles, and weapon legends for grounded lore reasoning.
4. `search_knowledge(query, limit?)` → `GET /api/v1/knowledge/search`
   - Full-text rank search over chunked character dialogue and build guides.


