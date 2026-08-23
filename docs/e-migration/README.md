# E Migration Plan

Status: Phase 4 in progress — E adapter and opt-in parity complete; cutover readiness is being verified.

This plan governs the migration from the current Drizzle-backed Teyvat persistence layer to an E-compatible runtime. Every phase is gated by evidence. A later phase must not be treated as complete merely because its code exists.

## Phases

| Phase | Focus | Status | Exit gate |
|---|---|---|---|
| 1 | Critical stabilization | Complete — compatibility isolation delivered | E/Postgres defects are fixed or explicitly isolated; the new code typechecks and the verification harness is trustworthy |
| 2 | Safe snapshot lifecycle | Complete — local PostgreSQL lifecycle verified | Repeatable, atomic, recoverable ingestion is demonstrated |
| 3 | Upstream E patch, release, and runtime/domain parity | Complete — opt-in entity/farming parity verified | The fixed E adapter is released and adopted; API and domain behavior match the current Teyvat contract |
| 4 | Cutover readiness | In progress | Production-like performance, rollback, and operational checks pass |

## Non-negotiable rules

- Do not cut over runtime routes while E/Postgres alias resolution is broken.
- Do not retry a partially completed multi-batch ingestion against the same tables.
- Keep the current Drizzle dataset available until a tested rollback path exists.
- Treat the published `@vxnus/e-postgres@0.2.1` as pre-1.0 and verify its exact installed version.
- Keep Phase 1 changes in `/e` and E-Teyvat separately reviewable.

## Documents

- [Phase 1 — Critical Stabilization](./phase-01-critical-stabilization.md)
- [Phase 2 Handoff — Safe Snapshot Lifecycle](./phase-02-handoff.md)
- [Phase 3 Handoff — E Patch, Release, and Runtime/Domain Parity](./phase-03-handoff.md)
- [Phase 4 Handoff — Cutover Readiness](./phase-04-handoff.md)
