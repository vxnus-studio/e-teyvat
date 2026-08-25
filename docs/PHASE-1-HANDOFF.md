# Phase 1 handoff — Teyvat E provider

**Phase:** 1 — E-compatible remote provider
**Status:** implementation complete; Neon deployment verification pending
**Input:** the existing normalized `gi-data` projection. Do not reacquire or
normalize source data in this phase.

## Outcome

Teyvat serves the normalized projection through the E retrieval contract while
preserving structured entities, relations, revision identity, provenance, and
citations.

## Teyvat-owned work

- Add E-compatible manifest and retrieval routes alongside existing public API
  routes.
- Read from the dedicated Teyvat projection tables, not legacy
  `knowledge_documents` tables.
- Add revision/source/chunk storage required for cited retrieval. Chunks are
  lexical retrieval units; embeddings are not required.
- Preserve the normalized artifact revision and source checksums.
- Return stable ordering for equal-ranked results and explicit `503` failures.
- Keep existing entity, farming, and banner routes working during migration.
- Provide the production base URL and manifest metadata needed for the E Hub to
  register `@vxnus/e-teyvat` as a `provider` distribution.

## Required response shape

```text
GET  /api/knowledge/manifest
POST /api/knowledge/retrieve
```

The response must conform to `@vxnus/e` and include `revision`, result content,
and source/document/chunk citations. The endpoint must never expose
`DATABASE_URL` or internal database details.

## Completion gate

- the artifact builds and verifies from `gi-data/data/normalized`;
- the new database projection matches artifact counts and revision hash;
- retrieval uses the dedicated Teyvat tables and returns cited results;
- manifest and retrieval contract tests pass against a local server;
- legacy routes remain green;
- no vector or external embedding dependency is introduced.

## Handoff to the next phase

Phase 2 hardens hosted deployment, caching, and provider promotion. Phase 3
can add vector/hybrid ranking without changing source acquisition or the E
response contract.
