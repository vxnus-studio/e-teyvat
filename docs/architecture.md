# E-Teyvat architecture

## Purpose

E-Teyvat turns the public genshin-db dataset into three complementary forms:

1. Canonical records for pages and exact lookups.
2. Explicit graph relations for questions that require multiple entities.
3. Searchable knowledge documents for AI retrieval.

The database is a knowledge source, not the AI itself. An agent should retrieve
small, relevant records from the read API and provide those records to its
language model as grounded context.

## System overview

```text
genshin-db API
      |
      | monthly or manual sync
      v
sync-genshin.ts -----> sync_runs
      |
      +--------------> entities + aliases
      +--------------> relations
      +--------------> knowledge_documents
                              |
                              v
                         Neon Postgres
                              |
                              v
Sites worker read API <---- Drizzle ORM
      |
      +--------------> Next.js database pages
      +--------------> AI tools and retrieval
```

The Next.js application is statically exported. Dynamic database reads happen
in the Sites worker, which receives `DATABASE_URL` only as a server-side runtime
environment variable.

## Data model

### `entities`

One canonical English record for each imported genshin-db object.

- `source_key` is stable within a folder, such as
  `weapons:splendor-of-tranquil-waters`.
- `kind` identifies the upstream folder.
- `slug`, `name`, and `description` support pages and exact lookup.
- `canonical_data` preserves the complete upstream JSON record.
- `content_hash` enables change detection.
- `is_active` is set to false when a previously imported record disappears.

Images are referenced from upstream data; image binaries are not stored in
Postgres.

### `aliases`

Normalized alternate names used for entity resolution. Normalization removes
case, accents, spaces, and punctuation. The canonical name is also inserted as
an alias.

### `relations`

A typed directed edge:

```text
subject entity --predicate--> object entity
```

Every relation keeps its source JSON path and optional metadata so an AI answer
can be traced back to the canonical record.

Current predicates include:

| Predicate | Meaning |
| --- | --- |
| `requires` | A weapon, character, recipe, or other entity consumes a material |
| `rewards` | A domain rewards a material or artifact |
| `contains_enemy` | A domain contains an enemy |
| `has_element` | An entity uses an element |
| `located_in` | An entity belongs to a region |
| `uses_material_family` | An entity uses a weapon-material family |
| `uses_talent_material_family` | An entity uses a talent-material family |
| `obtained_from` | An entity points directly to a domain |
| `part_of_domain` | A domain variation points to its entrance |
| `crafted_from` | A craft or recipe consumes an ingredient |

The read API also understands a future `drops` predicate. The current importer
does not yet infer every enemy drop edge from free-form source text, so live
farming results may return that text in `sourceNotes` instead.

### `knowledge_documents`

Small retrieval documents associated with an entity. The current importer
creates one `overview` document containing the most useful descriptive fields.

- PostgreSQL full-text search is available immediately.
- `embedding vector(768)` is nullable and reserved for semantic retrieval.
- If document content changes, its old embedding is cleared.
- If content is unchanged, its embedding is preserved.

No embedding provider or vector index has been selected yet.

### `sync_runs`

An audit row for every import attempt. It records status, content digest,
counts, timestamps, unresolved relations, missing folders, and errors.

The upstream API does not expose a dependable global dataset version, so
E-Teyvat derives `source_revision` from a stable digest of imported records.

## Answering a farming question

For:

> Where do I find a material for Splendor of Tranquil Waters?

The intended retrieval path is:

```text
Splendor of Tranquil Waters
  --requires / uses_material_family-->
weapon ascension materials
  <--rewards--
Echoes of the Deep Tides
```

The domain edge includes availability days and its entrance name. Enemy
materials are returned through `drops` edges when available, with canonical
material source text as a fallback.

The agent should call:

```http
GET /api/farming?target=Splendor%20of%20Tranquil%20Waters
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
