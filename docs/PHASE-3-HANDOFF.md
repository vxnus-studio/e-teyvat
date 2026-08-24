# Phase 3 handoff — Teyvat semantic retrieval

**Phase:** 3 — optional vector/hybrid retrieval
**Status:** foundation complete; semantic activation pending
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

## Delivered foundation

- Added `teyvat_embeddings`, keyed by chunk, dataset revision, and model, with
  content hashes and provider metadata.
- Applied migration `0006_revision_scoped_embeddings` to the configured Neon
  database.
- Kept the manifest semantic capability disabled because no embedding model or
  provider has been selected and no vectors have been generated.

## Completion gate

- no raw or normalized source data is modified;
- embeddings are traceable to chunk hash, model, and revision;
- lexical retrieval remains available during embedding outages;
- capability flags match actual readiness;
- vector and hybrid retrieval pass E conformance tests.

The remaining model selection, generation, indexing, and quality work is
handed off to Phase 4.
