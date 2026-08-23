# E Migration Plan

Status: Phase 1 — Critical Stabilization is active.

This plan governs the migration from the current Drizzle-backed Teyvat persistence layer to an E-compatible runtime. Every phase is gated by evidence. A later phase must not be treated as complete merely because its code exists.

## Phases

| Phase | Focus | Status | Exit gate |
|---|---|---|---|
| 1 | Critical stabilization | Complete — upstream release follow-up remains | E/Postgres defects are fixed or explicitly isolated; the new code typechecks and the verification harness is trustworthy |
| 2 | Safe snapshot lifecycle | Handoff ready | Repeatable, atomic, recoverable ingestion is demonstrated |
| 3 | Runtime/domain parity | Planned | API and domain behavior match the current Teyvat contract |
| 4 | Cutover readiness | Planned | Production-like performance, rollback, and operational checks pass |

## Non-negotiable rules

- Do not cut over runtime routes while E/Postgres alias resolution is broken.
- Do not retry a partially completed multi-batch ingestion against the same tables.
- Keep the current Drizzle dataset available until a tested rollback path exists.
- Treat the published `@vxnus/e-postgres@0.2.0` as a known-risk dependency.
- Keep Phase 1 changes in `/e` and E-Teyvat separately reviewable.

## Documents

- [Phase 1 — Critical Stabilization](./phase-01-critical-stabilization.md)
- [Phase 2 Handoff — Safe Snapshot Lifecycle](./phase-02-handoff.md)
