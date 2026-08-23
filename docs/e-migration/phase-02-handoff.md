# Phase 2 Handoff — Safe Snapshot Lifecycle

Status: ready for handoff; blocked until Phase 1 exits.

Objective: make a complete Teyvat projection installable, retryable, verifiable, and recoverable without exposing a partial graph.

## Context from Phase 1

The current helper calls `PostgresEngine.ingestBatch()` for concurrent chunks. Each call has its own transaction. This avoids the impractical single transaction of roughly 42,000 serial row inserts, but it does not provide dataset-level atomicity. A failure can leave entities, aliases, relations, or documents from different revisions in the same database.

`ingestBatch()` also uses plain `INSERT`, so replaying the same projection fails with a duplicate-key error. This behavior is expected from the current adapter and must not be hidden with blind retries.

## Design target

Use an immutable, revisioned staging model:

```text
projection revision
        ↓
staging schema/tables
        ↓ validate counts, foreign keys, checksums
        ↓ atomic promotion
active revision → readers
        ↓
previous revision retained for rollback
```

Readers must see either the previous complete revision or the new complete revision, never a mixture.

## Required decisions

The Phase 2 owner must decide and document:

- separate schema versus revision-keyed tables;
- how the active revision is selected by readers;
- whether promotion uses a transaction, view swap, or table rename;
- retention count and cleanup policy for old revisions;
- behavior when two ingestion jobs target the same revision;
- recovery after process, connection, or statement failure;
- whether bulk loading is implemented in E or in the Teyvat integration layer.

## Required deliverables

- An ingestion state model: staged, validating, active, failed, retired.
- A migration/schema design with ownership boundaries between E and Teyvat.
- An idempotency strategy for the same projection revision.
- A promotion and rollback procedure.
- Failure-injection tests for every boundary between entity, alias, relation, and document loading.
- A performance report for the full 8,696 / 8,468 / 14,244 / 11,610 projection.
- Operational commands that identify and clean abandoned staging data safely.

## Acceptance tests

- Two installs of the same revision produce one active revision and no duplicate records.
- A failed install leaves the prior active revision queryable and unchanged.
- A successful promotion makes all four datasets visible consistently.
- A process restart during loading does not require destructive cleanup of active data.
- Readers never observe an orphan alias, relation, or document.
- Promotion and rollback are tested against a non-production database.
- Full-load time, SQL request count, connection usage, and storage growth are measured.

## Explicit non-goals

- Do not migrate application routes in Phase 2.
- Do not remove the legacy Drizzle tables.
- Do not add fuzzy alias semantics to the generic E contract.
- Do not call independent committed chunks “atomic ingestion.”

## Inputs and verification commands

Inputs:

- `data/teyvat/projection.json`
- `data/teyvat/manifest.json`
- the fixed E/Postgres adapter from Phase 1
- the baseline Drizzle dataset for parity comparison

Useful commands after implementation:

```text
npm run teyvat:verify-artifact
npm run teyvat:verify-e-postgres
npm run teyvat:verify-parity
npm run teyvat:verify-farming
```

All database commands must use an explicitly isolated test target. The current `TEYVAT_E_DATABASE_URL` proof-of-concept target is not automatically safe to reuse after a failed ingestion.

## Exit gate for Phase 3

Phase 3 can begin only when snapshot lifecycle tests pass and a reader can select a complete active revision. Phase 3 then owns semantic parity and domain behavior; it does not redesign ingestion again.
