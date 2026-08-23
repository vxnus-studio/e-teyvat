# Phase 4 Handoff — Cutover Readiness

Status: in progress — read-only readiness gate added; current proof target is not snapshot-managed

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
```

The gate refuses to continue when the E target and Drizzle baseline have the same database fingerprint. It then verifies exactly one active snapshot, matches its recorded counts against public E tables, and checks for orphan aliases, relations, and documents.

Current evidence: the configured E and Drizzle Neon endpoints are distinct, but the E target predates the snapshot lifecycle and has no `teyvat_e_snapshots` control table. The gate therefore fails closed with an explicit message. Do not initialize that populated proof target automatically; use a reviewed production-like target or a disposable clone for the first lifecycle-managed installation.

## Acceptance gates

- [ ] Read-only cutover gate passes against the intended production-like E target.
- [x] E and Drizzle target separation is enforced by fingerprint checks in existing parity/finalizer harnesses.
- [x] Snapshot promotion and rollback pass against a disposable PostgreSQL target.
- [x] Entity and farming parity pass with `TEYVAT_RUNTIME_BACKEND=e-postgres`.
- [ ] Representative API latency and error-rate baseline is recorded with the E flag enabled.
- [ ] Full snapshot install is measured against a Neon-like target, including connection count, request count, duration, and storage growth.
- [ ] Rollback is rehearsed after a successful E-backed read window, with entity and farming responses compared before and after.
- [ ] A deployment runbook names the exact revision, adapter version, environment variables, health checks, and rollback command.
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
3. Run `npm run teyvat:verify-cutover` and the E-backed finalizer.
4. Enable `TEYVAT_RUNTIME_BACKEND=e-postgres` for the canary deployment only.
5. Monitor entity/farming errors and latency while retaining Drizzle for rollback and all non-E surfaces.
6. Roll back with `npm run teyvat:rollback-snapshot -- <active-revision>` if any stop condition occurs, then remove the E backend flag.

No production cutover is authorized by this document; the unchecked gates are required first.
