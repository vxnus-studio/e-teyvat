# Phase 2 handoff — hosted Teyvat provider

**Phase:** 2 — hosted E provider and Hub promotion
**Status:** local Neon verification complete; hosted deployment pending
**Prerequisite:** Phase 1 provider routes and schema migration are pushed.

## Outcome

The normalized `gi-data` projection is installed in the public Teyvat Neon
database and serves the E provider contract over HTTPS.

## Teyvat-owned work

- Apply the Phase 1 migration to a clean Neon database.
- Run `teyvat:ingest` from the existing normalized artifact.
- Run database, domain, farming, projection, and provider contract checks.
- Configure narrow CORS for approved consumers and retain cache headers/ETags.
- Verify that manifest revision and retrieval revision agree with the installed
  projection.
- Keep `/api/knowledge/search` as a legacy compatibility route until callers
  have migrated to `/manifest` and `/retrieve`.

## Completion gate

- migration succeeds from zero;
- database counts and revision hash match `data/teyvat/manifest.json`;
- `/api/e/manifest` validates with `@vxnus/e`;
- `/api/e/retrieve` returns deterministic cited chunks;
- unknown revisions return `404`, unsupported modes return `400`, and database
  failures return `503`;
- no raw source or database credentials are exposed.

## Handoff to the next phase

Phase 3 may add embeddings and hybrid ranking. The normalized source boundary,
revision IDs, and citation shape remain unchanged.
