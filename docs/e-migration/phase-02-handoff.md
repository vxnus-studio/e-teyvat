# Phase 2 Handoff — Safe Snapshot Lifecycle

Status: complete — local PostgreSQL lifecycle verified; Neon capacity follow-up remains

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

## Phase 2 implementation decision

The implementation uses separate PostgreSQL schemas per projection revision:

- `e_stage_<hash>` contains the E tables and Teyvat metadata while a revision is loading.
- `teyvat_e_snapshots` records `staged`, `validating`, `active`, `failed`, and `retired` state.
- E readers continue to query the public `e_*` table names.
- Promotion moves the current public tables into a timestamped retired schema, moves the validated stage tables into `public` in one transaction, and records the new active revision.
- A process failure during loading can leave only a stage schema; retrying the same revision drops that stage and rebuilds it.
- A process failure during promotion rolls back the table moves because promotion is one transaction.
- A process starting an installation takes a PostgreSQL advisory lock, so concurrent installs cannot race on the same staging schema or promotion.
- The previous public tables are retained in the retired schema for rollback and later cleanup policy.

The loader uses parameterized multi-row inserts into staging. It does not call the non-idempotent `PostgresEngine.ingestBatch()` for snapshot installation. The generic E adapter remains unchanged and runtime routes remain on the existing persistence path.

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

Current implementation:

- `lib/teyvat/e-postgres/snapshot.ts` — staging, validation, promotion, and retry locking;
- `scripts/install-teyvat-snapshot.ts` — isolated target installation command;
- `scripts/rollback-teyvat-snapshot.ts` — explicit rollback to the most recent retained snapshot;
- `scripts/verify-teyvat-snapshot.ts` — empty-target failure, repeat, promotion, and rollback harness;
- `scripts/cleanup-teyvat-staging.ts` — age-based cleanup for failed or abandoned staging schemas;
- `npm run teyvat:install-snapshot` — command entry point;
- `npm run teyvat:rollback-snapshot -- <active-revision>` — rollback command.
- `npm run teyvat:verify-snapshot` — lifecycle verification command.
- `npm run teyvat:cleanup-staging -- <older-than-hours>` — staging cleanup command.

Static verification currently passes:

- `npx tsc --noEmit`;
- focused ESLint for the snapshot and lifecycle scripts;
- `git diff --check`;
- `npm run build`.

The lifecycle harness has passed against a fresh temporary PostgreSQL 18.4 target. The already populated Phase 1 target remains intentionally excluded because the installer would replace its public tables.

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

## Phase 2 verification record

- [x] Install a new revision into a disposable empty target.
- [x] Repeat the same revision and verify it is a no-op.
- [x] Inject a staged-load failure and verify the active tables are unchanged.
- [x] Verify promotion leaves one active revision and preserves the previous retired schema.
- [x] Exercise rollback from the retired schema.
- [x] Measure full-load time, request count, connection usage, and storage growth.
- [x] Repeat the failure test across separate process invocations using `TEYVAT_E_SNAPSHOT_FAIL_AFTER`.

The full projection load measured 1.78 seconds on the temporary cluster, with 113 parameterized data-insert statements, a pool limit of 4, and approximately 33 MB of projection data before PostgreSQL storage overhead. A repeat active-revision check took 5.7 ms. These are local measurements, not Neon capacity claims.

The lifecycle harness requires a disposable empty PostgreSQL database in `TEYVAT_E_SNAPSHOT_TEST_DATABASE_URL`. No local PostgreSQL service is currently listening, and the populated E proof target must not be used because the harness intentionally refuses non-empty databases.

## Exit gate for Phase 3

Phase 3 can begin only when snapshot lifecycle tests pass and a reader can select a complete active revision. Phase 3 then owns semantic parity and domain behavior; it does not redesign ingestion again.
