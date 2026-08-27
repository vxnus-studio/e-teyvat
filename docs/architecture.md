# Teyvat architecture

## Purpose

Teyvat turns structured Genshin Impact data into three complementary forms:

1. Canonical records for pages and exact lookups.
2. Explicit graph relations for questions that require multiple entities.
3. Searchable knowledge documents for AI retrieval.

The database is a knowledge source, not the AI itself. An agent should retrieve
small, relevant records from the read API and provide those records to its
language model as grounded context.

## System overview

```text
Upstream Data Sources & Projections
      |
      | periodic or manual sync
      v
sync-genshin.ts / sync-banners.ts / ingest-teyvat.ts
      |
      +--------------> entities + aliases (legacy & teyvat_*)
      +--------------> relations (legacy & teyvat_*)
      +--------------> knowledge_documents + teyvat_chunks / embeddings
      +--------------> banner_phases + banner_character_statistics
      +--------------> sync_runs + teyvat_dataset_revisions
                               |
                               v
                          Neon Postgres
                               |
                               v
                     Next.js Route Handlers <---- Drizzle ORM
                               |
                               +--------------> Next.js database pages & UI
                               +--------------> Public REST API (/api/v1/*)
                               +--------------> AI tools and retrieval
```

The application is built on Next.js App Router. Dynamic database reads happen
in server route handlers and server components, which receive `DATABASE_URL` as a
server-side runtime environment variable.

## Data model

### `entities` & `teyvat_entities`

Canonical English records for imported game objects.

- `source_key` / `id` are stable identifiers (e.g. `weapons:splendor-of-tranquil-waters` or `genshin:weapon:splendor-of-tranquil-waters`).
- `kind` identifies the entity folder (e.g. `characters`, `weapons`, `materials`, `artifacts`, `domains`, `enemies`).
- `slug`, `name`, and `description` support pages, UI routes, and exact lookup.
- `canonical_data` / `data` preserves the complete upstream JSON record.
- `content_hash` enables change detection during ingestion.
- `is_active` is tracked to reflect current upstream catalog presence.

Images are referenced from upstream CDN URLs or local public assets; image binaries are not stored in Postgres.

### `aliases` & `teyvat_aliases`

Normalized alternate names used for entity resolution. Normalization removes
case, accents, spaces, and punctuation. The canonical name is also inserted as
an alias.

### `relations` & `teyvat_relations`

Typed directed edges:

```text
subject entity --predicate--> object entity
```

Every relation keeps its source JSON path, metadata, and provenance so answers
can be traced back to canonical records.

Current supported predicates include:

| Predicate | Meaning |
| --- | --- |
| `requires` | A weapon, character, recipe, or other entity consumes a material |
| `ascension_cost` / `ascension_material` | Character/weapon ascension material requirement |
| `talent_material` | Talent level-up material requirement |
| `recipe_ingredient` / `crafted_from` | A recipe, craft, or forge consumes an ingredient |
| `rewards` | A domain rewards a material or artifact |
| `drops` | An enemy or boss drops a material |
| `contains_enemy` | A domain contains an enemy |
| `has_element` | An entity uses an element |
| `located_in` | An entity belongs to a region |
| `uses_material_family` | An entity uses a weapon-material family |
| `uses_talent_material_family` | An entity uses a talent-material family |
| `obtained_from` | An entity points directly to a domain or source |
| `part_of_domain` | A domain variation points to its entrance |

### `knowledge_documents`, `teyvat_documents`, and `teyvat_chunks`

Chunked retrieval documents associated with an entity.

- PostgreSQL full-text search (`to_tsvector` / English dictionary) is active and queryable via `/api/v1/knowledge/search`.
- `embedding vector(768)` in `teyvat_embeddings` is prepared for revision-scoped semantic retrieval.
- Embedding table schema is migrated; automated generation and vector index activation are planned for Phase 4.

### `banner_phases` & `banner_character_statistics`

Tracks banner rotation timelines and character rerun pressure metrics:
- Sequence-indexed banner phases across game versions.
- Historical intervals, appearance counts, current wait durations.
- Pre-calculated rerun pressure scores (0-100) and confidence levels.

### `sync_runs` & `teyvat_dataset_revisions`

Audit records for every sync and projection installation:
- Tracks dataset revision hashes, source checksums, counts, and completion timestamps.
- Telemetry is exposed publicly via `GET /api/health`.

## Answering a farming question

For:

> Where do I find a material for Splendor of Tranquil Waters?

The intended retrieval path is:

```text
Splendor of Tranquil Waters
  --requires / uses_material_family / ascension_cost-->
weapon ascension materials
  <--rewards / drops--
Echoes of the Deep Tides (Domain) / Hydro Tulpa (Boss)
```

The domain edge includes availability days and entrance name. Enemy
materials are returned through `drops` edges when available, with canonical
material source notes as fallback.

The agent should call:

```http
GET /api/v1/farming?target=Splendor%20of%20Tranquil%20Waters
```

It should use the returned revision and structured sources as evidence rather
than asking a language model to remember this information.

## Recommended AI retrieval order

Use deterministic retrieval before semantic retrieval:

1. Resolve exact names and aliases.
2. Use a domain endpoint such as `/api/farming` for graph questions.
3. Use full-text search for descriptive questions.
4. Add vector search later for vague or conceptual questions.
5. Provide the selected records, relation paths, and data revision to the model.

This approach is cheaper, easier to audit, and uses less Neon storage than
embedding every JSON field.

## Storage strategy for Neon Free

The design intentionally avoids storing images and duplicate localized
datasets. The largest consumers should be canonical JSON, the full-text GIN
index, and later the embeddings.

A 768-dimensional float vector uses roughly 3 KB before row and index
overhead. For example, 10,000 overview chunks would use roughly 30 MB for raw
vector values. A vector index can add substantial overhead, so one should only
be created after measuring the real document count and query latency.

Recommended limits while using a 500 MB database:

- Import English only.
- Keep one or a few focused documents per entity.
- Do not store image binaries.
- Avoid a vector index until semantic search is actually enabled.
- Measure `pg_database_size(current_database())` after every major change.
- Retain compact sync summaries rather than full historical dataset snapshots.

## Current consistency boundary

The importer downloads and validates all requested folders before promoting
records. It refuses imports with fewer than 100 entities and records failures in
`sync_runs`.

Entity upserts, relation replacement, alias replacement, and document upserts
are not yet enclosed in one database transaction. A process failure during the
write phase can therefore leave partial derived tables. Transactional staging
and promotion is a recommended hardening task before the service becomes
critical.

## Security boundary

- `DATABASE_URL` must never use a `NEXT_PUBLIC_` prefix.
- The browser never connects directly to Neon.
- The current API is read-only.
- Public production use should add rate limiting and a clear caching policy.
- GitHub Actions and Sites need separate secret configuration.
