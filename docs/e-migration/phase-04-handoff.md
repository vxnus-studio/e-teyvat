# Phase 4 Handoff — Cutover Readiness

Status: in progress — read-only readiness gate and install measurement instrumentation added

Objective: prove that E-Teyvat can be switched to the E snapshot safely, measured under representative load, and rolled back without losing the legacy Drizzle path.

## Scope

Phase 4 owns operational readiness and controlled cutover. It does not redesign the snapshot lifecycle or change the E contract. The default runtime remains Drizzle until every gate below is evidenced.

## Current cutover design

- `TEYVAT_RUNTIME_BACKEND=e-postgres` enables E-native entity and farming reads.
- Without that flag, the application continues to use Drizzle.
- `TEYVAT_E_DATABASE_URL` points to the E snapshot target; `DATABASE_URL` remains the legacy baseline.
- Snapshot installation promotes a complete revision into public `e_*` tables and retains the previous revision for rollback.
- Knowledge search and banner/rerun surfaces intentionally remain on Drizzle.

## Read-only gate

Run in an isolated environment:

```text
npm run teyvat:verify-cutover
npm run teyvat:benchmark-cutover
```

The gate refuses to continue when the E target and Drizzle baseline have the same database fingerprint. It then verifies exactly one active snapshot, matches its recorded counts against public E tables, and checks for orphan aliases, relations, and documents.

The benchmark runs representative entity lookup/search/detail/alias and farming operations after a warmup, reporting p50/p95/max latency and errors for both E and Drizzle. Set `TEYVAT_BENCHMARK_ITERATIONS` to increase the sample count.

`npm run teyvat:install-snapshot` now reports the install duration, exact SQL request count, distinct checked-out connections observed, peak pool connections observed, and database storage before/after the operation. An already-active revision is detected before staging and therefore produces a no-op measurement; it must not be used as evidence for a full installation.

Current evidence: the updated E and Drizzle Neon endpoints are distinct. The E target is now snapshot-managed with revision `5a805b7aebf8d58951857fd25aad34fcdceb7580aed29f0729253bb3a05fa959`, full expected counts, and zero orphan records. The previous proof target was not modified.

## Acceptance gates

- [x] Read-only cutover gate passes against the intended production-like E target.
- [x] Read-only cutover gate passes against a disposable lifecycle-managed PostgreSQL target (full 8,696 / 8,468 / 14,244 / 11,610 snapshot; zero orphan records).
- [x] E and Drizzle target separation is enforced by fingerprint checks in existing parity/finalizer harnesses.
- [x] Snapshot promotion and rollback pass against a disposable PostgreSQL target.
- [x] Entity and farming parity pass with `TEYVAT_RUNTIME_BACKEND=e-postgres`.
- [x] Initial representative latency and error baseline recorded with the E reader on the updated target (3 samples per operation; zero errors).
- [ ] Full snapshot install is measured against a Neon-like target, including connection count, request count, duration, and storage growth.
- [x] Rollback is rehearsed after a successful E-backed read, restoring the original revision while the cutover gate remains green.
- [x] A deployment runbook names the exact revision, adapter version (`@vxnus/e-postgres@0.2.1`), environment variables, health checks, and rollback command.
- [ ] A controlled canary or maintenance-window cutover is approved.

## Stop conditions

Do not enable the E backend broadly if:

- the cutover gate cannot prove target separation;
- the active revision counts do not match public tables;
- any orphan graph record exists;
- E-backed entity or farming responses differ from the agreed contract;
- the exact adapter version cannot be identified;
- rollback has not been rehearsed on the target class being cut over.

## Operational runbook draft

1. Build and verify the artifact revision.
2. Install it with `npm run teyvat:install-snapshot` against the E target.
3. Run `npm run teyvat:verify-cutover`, `npm run teyvat:finalize-e-postgres`, and `TEYVAT_RUNTIME_BACKEND=e-postgres npm run teyvat:verify-parity`.
4. Confirm the deployed adapter is `@vxnus/e-postgres@0.2.1`, then enable `TEYVAT_RUNTIME_BACKEND=e-postgres` for the canary deployment only.
5. Monitor entity/farming errors and latency while retaining Drizzle for rollback and all non-E surfaces.
6. Roll back with `npm run teyvat:rollback-snapshot -- <active-revision>` if any stop condition occurs, then remove the E backend flag.

No production cutover is authorized by this document; the unchecked gates are required first.

## Canary approval record

Complete this record before enabling `TEYVAT_RUNTIME_BACKEND=e-postgres` for any deployed traffic:

- Approver / incident owner: ____________________
- Approved target and deployment: ____________________
- Scope and traffic limit: ____________________
- Maintenance window or start/end time (UTC): ____________________
- Pre-canary gate run timestamp and active revision: ____________________
- Rollback trigger and decision owner: ____________________
- Post-canary outcome: ____________________

The approval must explicitly confirm that the Drizzle path remains available, the E target is the separate `TEYVAT_E_DATABASE_URL` target, and rollback has an operator and a tested command.

## Phase 4 evidence record

The five-sample live benchmark against the earlier isolated Neon E target and Drizzle baseline reported zero errors. E p50 latency was approximately 151 ms for entity lookup, 258 ms for entity search, 362 ms for entity detail, 156 ms for alias resolution, and 497 ms for a farming plan. A three-sample benchmark on the updated snapshot-managed target also reported zero errors, with E p50 latency of approximately 235 ms for lookup, 302 ms for search, 415 ms for detail, 700 ms for alias resolution, and 757 ms for farming. These are directional measurements, not Neon capacity or SLO claims; larger representative traffic testing remains required.

A ten-iteration benchmark on the updated target also passed with zero errors for every E and Drizzle operation. E p50/p95 was 198/276 ms for lookup, 315/401 ms for search, 438/562 ms for detail, 182/266 ms for alias resolution, and 712/855 ms for farming. The corresponding Drizzle p50/p95 values were 220/299 ms, 423/504 ms, 487/525 ms, 216/300 ms, and 474/833 ms. These remain directional measurements rather than capacity or SLO claims.

The updated target’s current public E table footprint is approximately 37.9 MB including indexes and Teyvat extension tables. This is a point-in-time storage measurement; growth across revisions and production traffic remains unmeasured.

An isolated local PostgreSQL measurement target loaded the complete revision in 2.64 seconds, using 151 SQL requests, 2 observed connections, and 2 peak connections. Database storage grew from 7,935,679 to 46,118,591 bytes, a growth of 38,182,912 bytes (~36.4 MiB). Reinstalling the already-active revision took 11.8 ms, used 4 SQL requests, and added 0 bytes. The isolated target then passed the cutover gate and E-backed parity (10/10). These figures validate the instrumentation and lifecycle behavior but are not Neon-like capacity evidence.

The updated target passed `npm run teyvat:verify-cutover`, `TEYVAT_RUNTIME_BACKEND=e-postgres npm run teyvat:verify-parity`, and the E-backed finalizer after the snapshot installer was corrected to carry `e_schema_migrations` metadata. The measurement instrumentation type-checks and passes focused ESLint; a no-op install measurement was not treated as full-install evidence.

The updated Neon target accepted a full same-data rehearsal revision in approximately 26.5 seconds (control-row creation to activation). During rollback, the E alias read succeeded while the rehearsal revision was active; rollback restored the original revision `5a805b7aebf8d58951857fd25aad34fcdceb7580aed29f0729253bb3a05fa959`, with the rehearsal retained for recovery. Public storage was approximately 38.1 MB and the retained retired schema approximately 38.0 MB afterward. A subsequent full-install measurement remains intentionally pending because the target already contains the active revision and another revision would add retained storage; the installer now exposes the counters needed to close that gate on an explicitly approved measurement target.

The rollback harness also passed on a disposable PostgreSQL target after snapshot promotion, restoring `phase2-fixture-a` from `phase2-fixture-b` while preserving failure isolation and idempotent repeat behavior.
