# Phase 1 — Critical Stabilization

Status: complete — upstream adapter release follow-up transferred to Phase 3

Owner: E platform + E-Teyvat integration

Objective: remove the blockers that make the current E/Postgres proof of concept unsafe to promote or difficult to verify.

## Why this phase is critical

The last commit proved that the projection can be represented in E-native tables, but it also exposed an upstream PostgreSQL defect and local integration failures:

1. `PostgresEngine.query({ type: "resolve" })` emits `SELECT DISTINCT e.* ... ORDER BY e.id COLLATE "C"`, which PostgreSQL rejects with `42P10`.
2. `ingestBatch()` uses plain inserts and is not idempotent.
3. The E-Teyvat batch helper commits independent transactions and can leave a partial dataset.
4. New E/Postgres code does not currently pass TypeScript or lint.
5. Runtime API routes still use Drizzle persistence; E-native PostgreSQL is not a production cutover.

## Scope

### In scope

- Patch and test the upstream alias-resolution SQL in `/e`.
- Pin the adapter to a known fixed release or use a reviewed compatibility wrapper.
- Make E-Teyvat’s new E/Postgres harness type-safe and lint-clean.
- Make verification fail closed when prerequisites or target identity checks are missing.
- Record the exact dependency and commit used by the proof of concept.

### Out of scope

- Migrating production API routes.
- Replacing Drizzle tables.
- Designing final staging/swap ingestion (Phase 2).
- Adding Teyvat-specific behavior to the generic E package.

## Work items

### P1. Fix alias resolution upstream

Preferred fix: remove the unnecessary `DISTINCT` if the result contract permits duplicate-free aliases by schema, otherwise select from a distinct subquery and order in the outer query. Preserve deterministic ordering and namespace filtering.

Required regression coverage:

- one alias resolving to one entity;
- multiple entities sharing an alias;
- namespace filtering;
- no-match behavior;
- PostgreSQL execution, not only mocked SQL.

Deliverable: a released adapter version newer than `0.2.0`, or a documented wrapper that is used by all E-Teyvat E/Postgres verification paths.

### P2. Make the proof harness buildable

Resolve the current failures from `npx tsc --noEmit`:

- add the PostgreSQL type declarations required by the application;
- replace the heterogeneous tuple inference in `lib/teyvat/e-postgres/ingest.ts`;
- type relation rows passed to parity helpers;
- remove new lint errors and whitespace errors.

Existing unrelated lint failures must be recorded separately rather than silently treated as Phase 1 failures.

### P3. Close the verification gap

The harness must prove, at minimum:

- the target database is distinct from the baseline;
- the adapter version and migration version are known;
- alias resolution works;
- representative entity, relation, and document parity passes;
- a failed operation does not alter the verified target snapshot;
- the process closes all pools and engines.

The harness must not report production readiness while ingestion remains independently committed per chunk.

## Acceptance criteria

- [x] The broken upstream alias query is explicitly isolated behind `compat.ts`; the upstream patch and release are now tracked as the first critical workstream in Phase 3.
- [x] E-Teyvat `npx tsc --noEmit` passes.
- [x] New E-Teyvat lint errors are resolved.
- [x] `git diff --check` is clean for Phase 1 changes.
- [x] Verification output records adapter version, source revision, target fingerprint, and limitations.
- [x] The Phase 2 handoff is written and the production cutover remains explicitly blocked.

## Implementation recorded in this phase

- Added `lib/teyvat/e-postgres/compat.ts`, a compatibility query using `EXISTS` for exact alias resolution without the broken `DISTINCT ... ORDER BY` SQL.
- Updated both E/Postgres verification scripts to use the compatibility query.
- Added `@types/pg` and `@types/bun`; corrected new ingestion/parity typing errors.
- Kept the published `@vxnus/e-postgres@0.2.0` dependency unchanged; the upstream adapter patch and release are Phase 3 prerequisites.

## Current evidence

Passed locally:

- `npm run teyvat:verify-artifact`
- `npm run teyvat:verify-domain`
- focused ESLint on all changed E/Postgres files
- `npx tsc --noEmit`
- `npm run build`
- `git diff --check`
- read-only final E/Postgres parity checker against the isolated Neon target

The live checker passed with 8,696 entities, 8,468 aliases, 14,244 relations, and 11,610 documents. It also reported zero orphan records, five passing representative entity comparisons, passing relation/document parity, and a passing compatibility alias lookup.

Not run as part of the final gate:

- `npm run teyvat:verify-e-postgres`, because it performs a fresh non-idempotent ingestion and the isolated target already contains the verified snapshot. Re-running it would be an invalid repeat-ingestion test, not a clean verification.
- Full repository lint still reports four pre-existing application errors and eleven warnings; no changed Phase 1 E/Postgres file is among them.

## Verification commands

Run from the E-Teyvat repository:

```text
npx tsc --noEmit
npm run lint
git diff --check
npm run teyvat:verify-artifact
npm run teyvat:verify-domain
npm run teyvat:verify-e-postgres
```

The final command requires separate `TEYVAT_E_DATABASE_URL` and `DATABASE_URL` values. It must not be run against the production database.

## Risks and stop conditions

Stop and hand back for review if:

- the adapter fix changes the E query contract;
- the target cannot be proven separate from the baseline;
- a verification retry could write to a previously partially ingested target;
- parity requires silently changing existing Teyvat semantics;
- the published package and local `/e` source differ.

## Handoff to Phase 2

Phase 2 may begin only after the acceptance criteria above are checked. Its first task is to design revisioned staging and atomic promotion; it must not start by adding more concurrent inserts to the existing `e_*` tables.
