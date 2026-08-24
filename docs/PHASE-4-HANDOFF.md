# Phase 4 handoff — Teyvat embedding activation

**Phase:** 4 — model activation and retrieval quality
**Status:** ready for implementation
**Prerequisite:** approved embedding model/provider, credentials, and a
rollback plan for the active revision.

## Outcome

Generate revision-scoped embeddings for the Teyvat projection and expose
semantic/hybrid retrieval only when the active index is complete.

## Teyvat-owned work

- Select one model, provider, and dimension compatible with the vector column.
- Generate embeddings only for changed chunk content hashes.
- Add readiness checks and deterministic lexical/vector hybrid ranking.
- Evaluate lore, entity, farming, and paraphrase fixtures before enabling the
  manifest capability.

## Completion gate

- every active vector matches chunk hash, model, dimension, and revision;
- partial indexing leaves semantic capability disabled;
- lexical retrieval remains usable during provider/index failures;
- E conformance and retrieval-quality checks pass.
