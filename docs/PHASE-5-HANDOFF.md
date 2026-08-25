# Phase 5 handoff — deploy Teyvat provider

**Phase:** 5 — production deployment and cross-boundary verification
**Status:** complete
**Prerequisite:** hosting project access and the fresh Neon `DATABASE_URL` set
as a server-side deployment secret.

## Teyvat-owned gate

- Deploy commit `a71ac3b` or newer (the current branch also contains the
  registry-side promotion documentation and embedding activation path).
- Confirm `/api/e/manifest` returns 200 with the ingested revision.
- Confirm `/api/e/retrieve` returns cited lexical results.
- Keep semantic capability false until embedding configuration and complete
  indexing are present.

Production verification passed: the hosted manifest and lexical retrieval are
available with the ingested revision and citations.
