# Phase 6: E-Postgres Proof of Concept

Status: completed as an isolated proof of concept. This was not a production cutover.

## Objective

Validate the pipeline:

```text
gi-data normalized data
  -> Teyvat E-compatible projection
  -> @vxnus/e-postgres
  -> E-native PostgreSQL tables
  -> Teyvat extension tables
```

The source data and existing `teyvat_*` baseline were not changed.

## Target and dependency

The experiment used `TEYVAT_E_DATABASE_URL`, pointing to a separate clean Neon target. The target initially contained only Neon-managed `neon_auth` tables and no application tables.

The application now resolves the published packages:

```text
@vxnus/e@0.2.0
@vxnus/e-postgres@0.2.0
```

There is no dependency on `file:../e`.

## Native schema

`PostgresEngine.open()` provisioned the native E schema:

- `e_schema_migrations`
- `e_entities`
- `e_aliases`
- `e_relations`
- `e_claims`
- `e_documents`

The adapter uses ordinary PostgreSQL types and does not require pgvector or another extension.

## Ingestion

The existing `data/teyvat/projection.json` was ingested through `PostgresEngine.ingestBatch()`.

The final native counts were:

| Table | Rows |
|---|---:|
| `e_entities` | 8,696 |
| `e_aliases` | 8,468 |
| `e_relations` | 14,244 |
| `e_documents` | 11,610 |
| `e_claims` | 0 |

The proof harness used dependency-ordered concurrent batches:

```text
entities -> aliases -> relations -> documents
```

Every write still used `PostgresEngine.ingestBatch()`. This was necessary because one full adapter batch performs tens of thousands of serial network inserts in a single transaction and was operationally impractical.

## Integrity results

Passed:

- zero orphan aliases;
- zero orphan relation subjects;
- zero orphan relation objects;
- zero orphan documents;
- zero empty required fields;
- zero duplicate entity IDs;
- zero duplicate relation IDs;
- provenance preserved;
- temporal metadata preserved;
- synthetic reliquary set and piece entities preserved;
- 31 recipe remappings preserved.

## Teyvat extensions

Only data not represented by E was stored separately:

- `teyvat_e_dataset_revisions` stores projection revision, source checksums, and counts;
- `teyvat_e_document_metadata` stores document category, title, and original parent/source ID.

Entities, aliases, relations, and documents were not duplicated.

## Query and parity results

The adapter successfully supported entity lookup, lexical search, relation filtering, traversal, and document retrieval.

Generic relation parity passed for the tested Furina case. Document parity passed for the representative category-aware document case.

Full Teyvat parity did not pass yet. Material/domain payload comparison needs a canonical comparison pass, and farming behavior remains Teyvat-specific. In particular, ambiguous `Mushroom` resolution differed between the generic E lookup and the existing Teyvat farming domain.

## Repeat ingestion

The adapter uses plain inserts. A repeated insert produced PostgreSQL error `23505` and left the entity count unchanged at 8,696.

`ingestBatch()` is therefore not an idempotent snapshot operation. Production ingestion needs explicit snapshot lifecycle, upsert, or staging/swap semantics outside the current adapter.

## Production decision

E-native PostgreSQL is structurally viable with Neon, but production cutover is not approved yet. The next phase must fix alias resolution, define safe snapshot ingestion, complete semantic parity, and measure reproducible full-load performance.

## Verification scripts

- `scripts/verify-teyvat-e-postgres.ts` — isolated ingestion and integrity proof;
- `scripts/finalize-teyvat-e-postgres.ts` — read-only counts, parity, capabilities, and performance checks;
- `lib/teyvat/e-postgres/` — isolated adapter harness and Teyvat extension ownership.
