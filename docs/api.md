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

## Health

```http
GET /api/health
```

Ready example:

```json
{
  "status": "ready",
  "connected": true,
  "revision": "81c86d97c771",
  "lastSyncedAt": "2026-07-26T03:17:00.000Z",
  "entityCount": 4200,
  "relationCount": 8900,
  "unresolvedRelationCount": 120
}
```

## List and search entities

```http
GET /api/entities?kind=weapons&q=splendor&limit=24
```

Parameters:

| Parameter | Required | Description |
| --- | --- | --- |
| `kind` | No | Exact entity folder |
| `q` | No | Case-insensitive name substring |
| `limit` | No | Result limit from 1 to 50; default 24 |

The current `total` is the number of returned rows, not a separate database-wide
count.

## Entity detail

```http
GET /api/entities/{kind}/{slug}
```

Example:

```http
GET /api/entities/weapons/splendor-of-tranquil-waters
```

Returns the canonical entity and up to 100 outgoing relations.

## Farming retrieval

```http
GET /api/farming?target={name-or-slug}
```

Example:

```http
GET /api/farming?target=Splendor%20of%20Tranquil%20Waters
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
GET /api/knowledge/search?q={query}&limit=8
```

The query uses PostgreSQL English web-search syntax and ranks matches with
`ts_rank`.

Parameters:

| Parameter | Required | Description |
| --- | --- | --- |
| `q` | Yes | Full-text query |
| `limit` | No | Result limit from 1 to 50; default 8 |

Semantic vector search is not exposed yet because embeddings are not generated.

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

1. `find_entity(kind?, query, limit?)` → `/api/entities`
2. `get_farming_sources(target)` → `/api/farming`
3. `search_knowledge(query, limit?)` → `/api/knowledge/search`

The model should quote entity names and source availability from returned JSON,
include the revision in debugging traces, and say when the response is preview
data.
