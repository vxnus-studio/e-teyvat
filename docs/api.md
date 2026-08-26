# Read API reference

## General behavior

All current endpoints are read-only and return JSON. Responses are cached for
60 seconds in a browser or intermediary and for up to 300 seconds in a shared
cache.

When the worker has no `DATABASE_URL`, selected endpoints return explicit
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
  "gameVersion": "v7.0.1",
  "phaseLabel": "Version 7.0 P1",
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

Parameters:

| Parameter | Required | Description |
| --- | --- | --- |
| `kind` | No | Exact entity folder (characters, weapons, artifacts, etc.) |
| `q` | No | Case-insensitive name substring |
| `limit` | No | Result limit from 1 to 50; default 24 |
| `page` | No | Pagination page number; default 1 |

The current `total` is the number of returned rows.

## Entity detail

```http
GET /api/v1/entities/{kind}/{slug}
```

Example:

```http
GET /api/v1/entities/weapons/splendor-of-tranquil-waters
```

Returns the canonical entity and up to 100 outgoing relations.

## Farming retrieval

```http
GET /api/v1/farming?target={name-or-slug}
```

Example:

```http
GET /api/v1/farming?target=Splendor%20of%20Tranquil%20Waters
```

The endpoint:

1. Resolves the target by slug, exact/partial name, or normalized alias.
2. Finds its `requires` and `uses_material_family` edges.
3. Finds domain `rewards` and future enemy `drops` edges pointing to those
   materials.
4. Returns structured quantities, availability days, domain entrances, and
   fallback source notes.

An AI tool should expose this endpoint directly rather than trying to recreate
the graph traversal in a prompt.

## Full-text knowledge search

```http
GET /api/v1/knowledge/search?q={query}&limit=8
```

The query uses PostgreSQL English web-search syntax and ranks matches with
`ts_rank`.

Parameters:

| Parameter | Required | Description |
| --- | --- | --- |
| `q` | Yes | Full-text query |
| `limit` | No | Result limit from 1 to 50; default 8 |

## Banner Intelligence

- `GET /api/v1/banners/rerun-pressure` (or legacy `/api/v1/genshin/banners/rerun-pressure`)
- `GET /api/v1/characters/{character}/banner-history` (or legacy `/api/v1/genshin/characters/{character}/banner-history`)
- `GET /api/v1/characters/{character}/rerun-analysis` (or legacy `/api/v1/genshin/characters/{character}/rerun-analysis`)

## Error shape

```json
{
  "error": "Target entity not found."
}
```

Common statuses:

- `400`: missing or invalid query input
- `404`: entity or endpoint not found
- `405`: unsupported HTTP method
- `500`: query failed unexpectedly
- `503`: configured database is unavailable

## Recommended AI tool definitions

Start with three tools:

1. `find_entity(kind?, query, limit?)` → `/api/v1/entities`
2. `get_farming_sources(target)` → `/api/v1/farming`
3. `search_knowledge(query, limit?)` → `/api/v1/knowledge/search`

