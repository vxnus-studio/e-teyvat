# Phase 5 handoff — deploy Teyvat provider

**Phase:** 5 — production deployment and cross-boundary verification
**Status:** blocked on external deployment configuration
**Prerequisite:** hosting project access and the fresh Neon `DATABASE_URL` set
as a server-side deployment secret.

## Teyvat-owned gate

- Deploy commit `a71ac3b` or newer.
- Confirm `/api/knowledge/manifest` returns 200 with the ingested revision.
- Confirm `/api/knowledge/retrieve` returns cited lexical results.
- Keep semantic capability false until embedding configuration and complete
  indexing are present.

The provider is not complete in production while the hosted endpoint returns
503, even though local Neon verification passes.
