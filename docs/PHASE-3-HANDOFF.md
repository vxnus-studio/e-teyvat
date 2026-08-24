# Phase 3 handoff — Teyvat semantic retrieval

**Phase:** 3 — optional vector/hybrid retrieval
**Status:** planned
**Prerequisite:** Phase 2 hosted provider is live and operationally verified.

## Outcome

Teyvat can add semantic discovery over its existing revisioned chunks without
changing `gi-data`, source provenance, or the lexical E contract.

## Teyvat-owned work

- Select and record one embedding model and dimension.
- Add revision-scoped embeddings to chunks or a dedicated embedding table.
- Generate embeddings only for changed chunk content hashes.
- Combine lexical, structured, and vector candidates with deterministic
  tie-breaking and cited output.
- Expose `semanticSearch`/`hybrid` only after the index is ready.
- Measure retrieval quality on lore, entity, farming, and paraphrase fixtures.

## Completion gate

- no raw or normalized source data is modified;
- embeddings are traceable to chunk hash, model, and revision;
- lexical retrieval remains available during embedding outages;
- capability flags match actual readiness;
- vector and hybrid retrieval pass E conformance tests.
