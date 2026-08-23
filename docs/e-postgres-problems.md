# E-Postgres Problems and Limitations

This document records defects and operational limitations found in `@vxnus/e-postgres@0.2.0` during the Phase 6 isolated proof of concept, plus their current status after the Phase 3 adapter release.

These are adapter problems, not problems with the normalized `/gi-data` source or the Teyvat projection contract.

## 1. Alias resolution emits invalid PostgreSQL

`PostgresEngine.query({ type: "resolve" })` issues a query equivalent to:

```sql
SELECT DISTINCT e.*
FROM e_entities e
JOIN e_aliases a ON e.id = a.entity_id
...
ORDER BY e.id COLLATE "C" ASC
```

PostgreSQL rejects this with:

```text
42P10: for SELECT DISTINCT, ORDER BY expressions must appear in select list
```

The native alias table is populated correctly, but the public E alias-query API is not currently reliable on PostgreSQL.

Resolution: fixed upstream in `@vxnus/e-postgres@0.2.1` with an `EXISTS` query that preserves deduplication, namespace filtering, and deterministic ordering. The published package passes the isolated PostgreSQL regression and E-Teyvat finalizer checks.

The temporary E-Teyvat compatibility wrapper has been removed. The remaining limitations below are still applicable unless explicitly marked otherwise.

## 2. `ingestBatch()` is not idempotent

The adapter uses plain `INSERT` statements and primary-key constraints. Repeating an ingestion produces a duplicate-key error (`23505`). It does not provide:

- upsert behavior;
- snapshot replacement;
- staging-table promotion;
- revision-aware replacement;
- resumable ingestion.

The transaction protects one batch, but does not make a sequence of separately committed batches atomic as a complete dataset.

Impact: callers must own snapshot lifecycle and must not retry a partially completed multi-batch ingestion blindly.

## 3. Full ingestion is network-round-trip bound

The implementation performs individual inserts for each entity, alias, relation, and document. A single full projection therefore requires approximately 42,000 serial SQL requests.

The first single-transaction experiment exceeded 17 minutes without committing. The proof harness had to use dependency-ordered concurrent `ingestBatch()` calls to complete the dataset.

Impact:

- ingestion is slow and expensive on Neon;
- one long transaction can hold connections and locks for an unacceptable period;
- concurrent batching is an application workaround, not a native adapter feature.

## 4. No generic Teyvat query semantics

The adapter provides generic E operations, but not Teyvat behavior such as:

- farming plans;
- category aliases and UI kind mapping;
- category-aware document metadata;
- dataset revision selection;
- recipe-specific interpretation;
- synthetic reliquary semantics.

These belong in Teyvat domain code and extension tables.

## 5. Limited search capabilities

The adapter reports lexical search only. It does not provide:

- full-text document search;
- semantic search;
- hybrid search;
- vector search;
- temporal filtering.

The native schema stores provenance and temporal JSONB, but `temporalQueries` is false.

## 6. Claims are modeled but unused by the projection

E provides `e_claims`, but the current Teyvat projection contains no claims. This is expected and not an ingestion failure. Narrative content remains in documents and structured facts remain in entity/relation data.

## 7. Stability

E and the adapter remain pre-1.0 and experimental. The SQL defect is fixed in `0.2.1`, but ingestion behavior, application-specific semantics, and runtime cutover requirements still prevent treating the adapter alone as production-ready.

## Required fixes before cutover

1. ~~Correct alias-resolution SQL upstream or isolate a tested compatibility wrapper.~~ Complete in `@vxnus/e-postgres@0.2.1`; keep the regression test.
2. Define staging/snapshot replacement semantics.
3. Add efficient bulk ingestion or a supported bulk-loading path.
4. Add failure recovery and partial-snapshot detection.
5. Complete Teyvat entity, document, alias, and farming parity tests.
6. Re-measure full ingestion and representative query performance after fixes.
