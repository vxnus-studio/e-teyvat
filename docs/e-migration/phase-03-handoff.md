# Phase 3 Handoff — E Patch, Release, and Runtime/Domain Parity

Status: complete — adapter adoption and opt-in entity/farming parity verified; runtime cutover remains deferred to Phase 4

Objective: replace the temporary E-Teyvat compatibility layer with a tested, released upstream E/Postgres fix, then prove runtime and domain behavior against the current Teyvat contract.

## Why the upstream patch comes first

`@vxnus/e-postgres@0.2.0` still emits a PostgreSQL-invalid alias-resolution query:

```sql
SELECT DISTINCT e.*
FROM e_entities e
JOIN e_aliases a ON e.id = a.entity_id
...
ORDER BY e.id COLLATE "C" ASC
```

PostgreSQL rejected the combination of `SELECT DISTINCT` and an `ORDER BY` expression that is not present in the select list with error `42P10`. It is fixed in the published `@vxnus/e-postgres@0.2.1`; E-Teyvat no longer carries a compatibility wrapper. Runtime cutover remains blocked until the domain parity work and Phase 4 operational gates are complete.

## Workstream 3.1 — Patch and release `/e` (critical)

In `/e`:

1. Change Postgres alias resolution to preserve exact alias matching, optional namespace filtering, duplicate-entity elimination, and deterministic entity-ID ordering. A distinct subquery with an outer `ORDER BY`, or an equivalent `EXISTS` query, is acceptable.
2. Add PostgreSQL regression coverage for one match, multiple entities sharing an alias, namespace filtering, no match, and deterministic ordering.
3. Run the relevant E tests, typecheck, lint, and build.
4. Publish a new `@vxnus/e-postgres` version greater than `0.2.0` with the corresponding core version if required by the workspace.
5. Record the release version and source commit in this handoff and in the E-Teyvat dependency update.

The patch must not add Teyvat-specific semantics to the generic E package.

## Workstream 3.2 — Adopt the released adapter

In E-Teyvat:

- update the E/Postgres dependency to the released version;
- verify the installed package resolves to the intended version;
- run alias, entity, relation, document, and parity checks against an isolated target;
- compare the released adapter result with the temporary compatibility query;
- remove `compat.ts` only after the released adapter passes the equivalent checks; **complete** — the wrapper was removed after verification;
- keep the snapshot installer and rollback path unchanged unless parity evidence requires a separate reviewed change.

## Workstream 3.3 — Runtime/domain parity

After the adapter release is adopted:

- identify the API routes and domain operations that must read the active E snapshot;
- define behavior for entity lookup, alias resolution, relations, claims/documents, namespaces, and not-found cases;
- add parity tests against the existing Drizzle-backed behavior;
- preserve the legacy Drizzle dataset until cutover and rollback tests pass;
- do not call runtime migration complete merely because E-native tables are populated.

### Initial runtime audit

The current application is not yet reading the E snapshot in production routes:

| Surface | Current implementation | Phase 3 implication |
|---|---|---|
| `GET /api/entities` | `getTeyvatPersistentEntityQueries()` backed by Drizzle | Define E-backed search pagination and ordering parity |
| `GET /api/entities/:kind/:slug` | `getTeyvatPersistentEntityQueries()` backed by Drizzle | Define E entity-detail and not-found parity |
| `GET /api/farming` | `getTeyvatPersistentFarmingQueries()` backed by Drizzle | Preserve Teyvat-specific farming semantics while changing the entity/relation reader |
| `GET /api/knowledge/search` | Direct Drizzle full-text query over `knowledgeDocuments` and `entities` | Decide whether E documents replace this path or remain a separate application projection |
| Banner and rerun-analysis routes/pages | Direct Drizzle queries over banner tables and entity tables | Keep these domain-specific tables outside the generic E graph unless a separate parity decision is approved |

Evidence was gathered from the route imports and `lib/teyvat/persistence/*`. No runtime cutover has been made. The first implementation candidate is the entity API pair, followed by farming; knowledge and banner data require explicit ownership decisions because they use application-specific fields and full-text behavior not represented by the generic E contract.

### Entity API implementation slice

`TeyvatEPostgresEntityQueries` now implements the entity query interface against the active E snapshot. Set `TEYVAT_RUNTIME_BACKEND=e-postgres` to exercise it through the existing persistent entity query entry point; the default remains Drizzle until cutover is approved. The implementation covers category mapping, slug/name/alias resolution, alias-aware search, pagination, entity views, and relation-backed detail responses.

The explicit E-backed parity run passes all 10 existing cases against the isolated target, including the Teyvat JavaScript `localeCompare` ordering contract. This ordering normalization is required because PostgreSQL's binary `COLLATE "C"` ordering differs for non-ASCII names.

The E-backed farming reader is also implemented behind the same flag. Its full material-ID parity cases pass against the Drizzle reader in the finalizer.

### Ownership decision for remaining routes

- Entity lookup, entity search, entity detail, alias resolution, and farming plans are covered by the E-backed runtime flag and verified against the Drizzle contract.
- Knowledge search remains on Drizzle because its contract depends on PostgreSQL full-text functions (`to_tsvector`, `websearch_to_tsquery`, and `ts_rank`) over `knowledgeDocuments`, while E currently exposes lexical entity search and does not provide document full-text search.
- Banner history, rerun analysis, banner rotation, and related pages remain on Drizzle because they depend on banner-specific tables, statistics, and application calculations. Their E graph relations are useful source data but are not a replacement for those application projections.
- The mixed ownership is intentional. Phase 4 may perform a controlled entity/farming cutover while retaining these Drizzle-backed surfaces; it must not claim the entire application has migrated to E.

## Critical stop conditions

Stop before runtime cutover if:

- the published package differs from the tested `/e` source;
- PostgreSQL alias resolution still fails with `42P10`;
- the new release changes alias, namespace, ordering, or ambiguity semantics without an approved contract decision;
- E-Teyvat must retain a compatibility wrapper to pass verification;
- parity requires silently changing existing Teyvat behavior.

## Exit criteria

- [x] `/e` patch committed and PostgreSQL regression tests pass.
- [x] `@vxnus/e-postgres@0.2.1` published.
- [x] E-Teyvat depends on and verifies the new release.
- [x] Temporary compatibility query removed after verification.
- [x] Runtime/domain parity tests pass for the agreed entity/farming contract.
- [x] Snapshot readers select one complete active revision.
- [ ] Cutover and rollback remain deferred to Phase 4 until production-like checks pass.

## Required handoff evidence

- `/e` source commit and package release version;
- test, typecheck, lint, and build output;
- isolated PostgreSQL alias regression output;
- E-Teyvat dependency diff and verification output;
- documented semantic differences, if any;
- list of runtime routes still using Drizzle and the proposed cutover sequence.
