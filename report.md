# E-Teyvat Migration Investigation Report

## 1. Executive summary

The migration is viable with `@vxnus/e@0.2.0`, provided E-Teyvat uses:

- `@vxnus/e` from npm.
- A build-time `/gi-data` → E import/normalization layer.
- E’s published `InMemoryEngine`.
- A thin Teyvat domain/query layer shared by Next.js API routes, server-rendered UI, and MCP.
- No Neon, Drizzle, SQLite, external synchronization, or runtime external data APIs.

Recommended flow:

```text
/gi-data normalized JSON
        ↓ build-time importer
E BatchDataset
        ↓
@vxnus/e InMemoryEngine
        ↓
Teyvat domain/query layer
        ↓
Next.js UI / API / MCP
```

`@vxnus/e@0.2.0` is sufficient for entities, aliases, relations, documents, provenance, lexical entity search, and bounded traversal. It does not provide document full-text search, temporal filtering, updates/deletes, or domain-specific banner/farming queries. Those belong in the Teyvat layer or generated indexes.

Important findings:

- The current app declares `"e": "file:../e"`, not the published package.
- Published `@vxnus/e@0.2.0` exposes only the core contract and `InMemoryEngine`; SQLite/Postgres are separate packages.
- `/gi-data` contains 8,334 entities, 14,244 relations, and 11,610 documents.
- 629 relation endpoints do not currently resolve against canonical entity IDs.
- 299 `SET_MEMBER` relations refer to `reliquary_set` and `reliquary_piece` records that are not top-level entities.
- 31 recipe relations have category mismatches.
- 1,724 entities lack `name.en`, mainly quests and static tables.
- 163 documents have ambiguous raw parent IDs unless document category is used.
- Banner history exists in `/gi-data`, but current rerun statistics are not precomputed there.
- No MCP implementation exists in the current E-Teyvat, E, or gi-data checkouts.

No application, dependency, database, or dataset files were modified during the investigation.

## 2. Current E-Teyvat architecture

E-Teyvat is a Next.js 16.2.12 App Router application with server-rendered pages, client components, route handlers, Neon/Postgres, Drizzle, Cloudflare R2, synchronization scripts, and banner-analysis logic.

Relevant files:

- [`package.json`](./package.json)
- [`db/client.ts`](./db/client.ts)
- [`db/schema.ts`](./db/schema.ts)
- [`next.config.ts`](./next.config.ts)
- [`middleware.ts`](./middleware.ts)

Current flow:

```text
Client components ────────┐
                          │
Server pages ─────────────┼──> Drizzle ──> Neon/Postgres
                          │
API route handlers ───────┘

GitHub Actions / sync scripts ──> external APIs ──> Neon
```

### UI and server boundaries

Client-side API consumers:

- [`app/_components/entity-explorer.tsx`](./app/_components/entity-explorer.tsx)
- [`app/_components/knowledge-console.tsx`](./app/_components/knowledge-console.tsx)
- [`app/_components/knowledge-status.tsx`](./app/_components/knowledge-status.tsx)
- [`app/admin/page.tsx`](./app/admin/page.tsx)

These call `/api/entities`, `/api/farming`, `/api/health`, `/api/upload`, and `/api/admin/entities/:id`.

Server components directly accessing Drizzle include:

- [`app/characters/[character]/page.tsx`](./app/characters/[character]/page.tsx)
- [`app/characters/[character]/banner-history/page.tsx`](./app/characters/[character]/banner-history/page.tsx)
- [`app/database/banners/page.tsx`](./app/database/banners/page.tsx)
- [`app/database/banners/rotation/page.tsx`](./app/database/banners/rotation/page.tsx)
- [`app/database/banners/rerun-pressure/page.tsx`](./app/database/banners/rerun-pressure/page.tsx)

These pages bypass API routes and must be migrated to the Teyvat domain layer.

### API routes

Current route handlers include:

- `GET /api/entities`
- `GET /api/entities/[kind]/[slug]`
- `GET /api/farming`
- `GET /api/knowledge/search`
- `GET /api/health`
- `GET /api/v1/genshin/characters/[character]/banner-history`
- `GET /api/v1/genshin/characters/[character]/rerun-analysis`
- `GET /api/v1/genshin/banners/rerun-pressure`
- `POST /api/upload`
- `PATCH /api/admin/entities/[id]`
- `POST /api/auth/login`
- `POST /api/auth/logout`

The routes currently contain SQL query logic directly. They should become thin request/response adapters over domain functions.

### Database schema

[`db/schema.ts`](./db/schema.ts) defines generic tables:

- `entities`
- `aliases`
- `relations`
- `knowledge_documents`
- `sync_runs`

It also defines Teyvat-specific banner tables:

- `banner_sources`
- `banner_phases`
- `banner_phase_characters`
- `banner_character_statistics`

The old entity model uses integer serial IDs, `sourceKey`, `kind`, `slug`, `canonicalData`, `customImageUrl`, `isActive`, and sync metadata. This should not be retained as an intermediate database abstraction.

## 3. Current `/e` architecture

The local `/e` repository contains:

```text
/e
├── packages/core
├── packages/sqlite
├── packages/postgres
└── packages/differential
```

Relevant files:

- [`packages/core/src/types.ts`](../e/packages/core/src/types.ts)
- [`packages/core/src/engine.ts`](../e/packages/core/src/engine.ts)
- [`packages/core/src/validation.ts`](../e/packages/core/src/validation.ts)
- [`packages/sqlite/src/index.ts`](../e/packages/sqlite/src/index.ts)
- [`packages/postgres/src/index.ts`](../e/packages/postgres/src/index.ts)

### Core exports

`@vxnus/e` exports:

- `Entity`, `Alias`, `Relation`, `Claim`, `Document`
- `Provenance`, `TemporalSemantics`, `IdentityMapping`
- traversal types
- search types
- `QueryRequest`, `KnowledgeResult`, `EQueryEngine`
- `EFixtureMutator`, `EBatchMutator`, `BatchDataset`
- `InMemoryEngine`
- validation functions
- E error classes and limit constants

### Entity model

```ts
interface Entity {
  id: string;
  namespace: string;
  kind: string;
  slug: string;
  name: string;
  data: CanonicalJsonObject;
  identities?: IdentityMapping[];
  provenance?: Provenance;
  temporal?: TemporalSemantics;
}
```

E does not impose a Teyvat ontology. `kind` is a string and domain semantics remain outside E.

### Alias model

```ts
interface Alias {
  id: string;
  entityId: string;
  alias: string;
}
```

There is no language, namespace, or normalized-alias field. `InMemoryEngine.resolve` performs exact alias matching. Normalization must be handled by the Teyvat layer or by generated alias variants.

### Relation model

```ts
interface Relation {
  id: string;
  subjectId: string;
  predicate: string;
  objectId: string;
  provenance?: Provenance;
  temporal?: TemporalSemantics;
  metadata?: CanonicalJsonObject;
}
```

This maps well to `/gi-data` relations.

### Document model

```ts
interface Document {
  id: string;
  entityId: string;
  content: string;
  provenance?: Provenance;
}
```

E 0.2.0 does not provide document titles, categories, metadata, or document search. Those fields require content encoding or a Teyvat-side document index.

### Query and traversal

`EQueryEngine.query()` supports:

- `getCapabilities`
- `resolve`
- `getEntity`
- `findRelations`
- `findClaims`
- `findDocuments`
- `search`
- `traverse`

`InMemoryEngine` provides exact alias resolution, lexical entity search by name/slug, relation lookup, bounded BFS traversal, claims/documents, provenance preservation, and deterministic ordering.

It does not provide semantic search, hybrid search, temporal filtering, document full-text search, update/delete operations, or fuzzy alias resolution.

### Mutations

`InMemoryEngine` exposes `insertEntity`, `insertAlias`, `insertRelation`, `insertClaim`, `insertDocument`, and atomic `ingestBatch`.

This is sufficient for one-time read-only bootstrap. It is not a persistence mechanism for application mutations.

### Storage implementations

The local repository contains `@vxnus/e-sqlite` and `@vxnus/e-postgres`, but neither is part of `@vxnus/e`.

SQLite should not be used for the target architecture because it adds a database, requires a native dependency, and is unsuitable for typical serverless filesystem assumptions. It is useful only for local benchmarking.

Postgres is explicitly incompatible with the target because Neon/Postgres is being removed.

## 4. Published `@vxnus/e@0.2.0` assessment

The published npm metadata and tarball were inspected separately from the local repository.

Published package:

- name: `@vxnus/e`
- version: `0.2.0`
- type: `module`
- main: `./dist/index.js`
- types: `./dist/index.d.ts`
- only export: `.`
- approximately 126 KB unpacked
- no runtime dependencies
- no storage adapter exports

The published tarball contains only core `dist` files, README, license, and package metadata. It does not contain SQLite, Postgres, filesystem loading, data import, document indexing, or MCP support.

The current E-Teyvat dependency is incorrect:

```json
"e": "file:../e"
```

It must become:

```json
"@vxnus/e": "0.2.0"
```

## 5. `/gi-data` assessment

Relevant files:

- [`data/normalized/entities/canonical_entities.json`](../gi-data/data/normalized/entities/canonical_entities.json)
- [`data/normalized/relations/canonical_relations.json`](../gi-data/data/normalized/relations/canonical_relations.json)
- [`data/normalized/documents/canonical_documents.json`](../gi-data/data/normalized/documents/canonical_documents.json)
- [`data/normalized/domains/canonical_domains.json`](../gi-data/data/normalized/domains/canonical_domains.json)
- [`data/normalized/indexes/ENTITY_INDEX.json`](../gi-data/data/normalized/indexes/ENTITY_INDEX.json)
- [`data/normalized/indexes/RELATION_INDEX.json`](../gi-data/data/normalized/indexes/RELATION_INDEX.json)
- [`data/normalized/indexes/PROVENANCE_INDEX.json`](../gi-data/data/normalized/indexes/PROVENANCE_INDEX.json)

### Dataset size

| Dataset | Count | Approximate size |
|---|---:|---:|
| Entities | 8,334 | 21.4 MB |
| Relations | 14,244 | 3.5 MB |
| Documents | 11,610 | 7.0 MB |
| Domains | 48 | 53 KB |
| Provenance index | — | 3.2 MB |
| Relation index | — | 2.6 MB |
| Entity index | — | 0.9 MB |

Categories include avatars, weapons, materials, domains, domain stages, monsters, reliquaries, banner phases, regions, elements, food, furniture, quests, books, GCG cards, namecards, achievement groups, and static configuration categories.

Documents include avatar stories, avatar voices, book volumes, GCG stories, and relic stories.

### Existing provenance concern

Some normalized records carry historical provenance such as `PROJECT_AMBER`, `SAMSARA`, and `GENSHIN_DB`. This does not create a runtime dependency if `/gi-data` is authoritative and bundled locally, but the project must decide whether historical `GENSHIN_DB` provenance is acceptable or those records must be excluded/reprocessed.

## 6. `/gi-data` → E mapping

### Entities

Recommended identity:

```text
namespace: genshin
id: genshin:{category}:{source-id}
kind: {category}
slug: normalized route/name/id
name: name.en, title, or deterministic fallback
data: original normalized record minus E wrapper fields
```

Examples:

```text
avatar:10000002
→ genshin:avatar:10000002

weapon:11101
→ genshin:weapon:11101
```

The domain layer may expose UI-friendly names such as `characters` and `weapons`, while E retains canonical raw categories.

### Names

Use this order:

1. `name.en`
2. `title`
3. `route`
4. `{category} {id}` fallback

This is required because all 1,714 quest entities lack `name.en`, along with several static entities.

### Aliases

No dedicated alias dataset exists. Generate deterministic aliases from `name.en`, `route`, and explicitly defined category-specific alternate names. Do not infer aliases from arbitrary prose.

### Relations

| `/gi-data` relation | E predicate |
|---|---|
| `ASCENSION_COST` | `ascension_cost` |
| `ASCENSION_MATERIAL` | `ascension_material` |
| `TALENT_MATERIAL` | `talent_material` |
| `RECIPE_INGREDIENT` | `recipe_ingredient` |
| `APPEARED_IN` | `appeared_in` |
| `DROPS` | `drops` |
| `DROPS_ARTIFACT_SET` | `drops_artifact_set` |
| `HAS_ELEMENT` | `has_element` |
| `HAS_STAGE` | `has_stage` |
| `LOCATED_IN` | `located_in` |
| `SET_MEMBER` | `set_member` |
| `SUITE_REQUIREMENT` | `suite_requirement` |

`properties` maps to `Relation.metadata`. Source fields map to relation provenance.

### Provenance and temporal mapping

| `/gi-data` | E |
|---|---|
| `source.provider` | `provenance.provider` |
| `source.endpoint` | `provenance.source` |
| `source.raw_file` | `provenance.locator` or `sourceId` |
| `source.source_version` | `provenance.sourceRevision` |
| `source.raw_sha256` | `provenance.contentHash` |
| `source.captured_at` | `provenance.observedAt` |
| `source.resolution` | `provenance.confidence` or preserved in data |
| `temporal.valid_from` | `temporal.validFrom` |
| `temporal.valid_until` | `temporal.validUntil` |
| `temporal.is_active` | preserve in `data.temporal` |

### Documents

Use category-aware parent mapping:

- `avatar_story` → `avatar`
- `avatar_voice` → `avatar`
- `book_volume` → `book`
- `gcg_story` → `gcg_card`
- `relic_story` → `reliquary`

E lacks document title/category fields. Preserve them in content or in a Teyvat-side metadata index.

### Claims

There is no direct normalized claims dataset. Do not convert every description into a Claim. Use `Entity.data` for structured facts, `Document` for narrative text, and `Claim` only when explicit confidence-bearing assertions exist.

### Data that does not fit cleanly

- `reliquary_set` and `reliquary_piece` relation endpoints are not top-level entities.
- 31 recipe targets have category mismatches.
- E document metadata is too small for title/category/story fields.
- E aliases lack language and normalized-alias fields.
- E temporal data lacks active-state semantics.
- Large nested payloads must remain JSON-compatible and below E’s 4 MB serialized JSON limit.

## 7. Current → target architecture

### Current

```text
UI
 ├── server pages ────────────> Drizzle ──> Neon
 ├── client components ───────> API routes ─> Drizzle ─> Neon
 └── admin upload ─────────────> R2 + Neon metadata

Sync scripts
 ├── genshin-db API ───────────> Neon
 └── Samsara GitHub data ──────> Neon
```

### Target

```text
/gi-data normalized snapshot
        ↓
Teyvat importer / validator
        ↓
E BatchDataset
        ↓
@vxnus/e@0.2.0 InMemoryEngine
        ↓
Teyvat domain/query layer
 ┌──────────────┬──────────────┬─────────────┐
 │ Next pages   │ API routes   │ MCP tools   │
 └──────────────┴──────────────┴─────────────┘

Assets:
local public assets and/or R2/CDN independently
```

Next.js API routes can remain, but should be thin endpoints over domain functions.

## 8. Dependency removal matrix

| Dependency/component | Decision | Notes |
|---|---|---|
| `e: file:../e` | REPLACE | Use published `@vxnus/e@0.2.0`. |
| `@neondatabase/serverless` | REMOVE | No Neon runtime. |
| `drizzle-orm` | REMOVE | No database queries. |
| `drizzle-kit` | REMOVE | No migrations. |
| `db/` | REMOVE | Replace with engine/domain bootstrap. |
| `drizzle/` | REMOVE | Obsolete migrations. |
| `drizzle.config.ts` | REMOVE | No Drizzle configuration. |
| `scripts/sync-genshin.ts` | REMOVE | External ingestion prohibited. |
| `scripts/sync-banners.ts` | REMOVE | External ingestion prohibited. |
| `scripts/sanitize-names.ts` | REPLACE | Alias generation belongs in importer. |
| `.github/workflows/sync-genshin.yml` | REMOVE | Remove scheduled sync. |
| `DATABASE_URL` | REMOVE | No database. |
| `GENSHIN_API_BASE_URL` | REMOVE | No external API. |
| `GENSHIN_SYNC_*` | REMOVE | No sync settings. |
| `@aws-sdk/client-s3` | KEEP optional | R2 assets only. |
| `sharp` | KEEP optional | R2 image conversion only. |
| R2 credentials | KEEP optional | Asset storage only. |
| `NEXT_PUBLIC_CDN_URL` | KEEP optional | R2/CDN only. |
| `yaml` | REMOVE if canonical banners are used | No runtime YAML ingestion. |
| `recharts` | KEEP | Existing charts. |
| `lucide-react` | KEEP | UI dependency. |
| Next/React/Tailwind | KEEP | UI stack. |

## 9. UI → domain query mapping

Recommended domain operations:

```ts
getEntity(id)
resolveEntity(query, options?)
searchEntities(options)
listEntities(kind, pagination?)
getEntityRelations(id, options?)
getDocuments(entityId)
searchKnowledge(query, options?)
getCharacter(slug)
getWeapon(slug)
getMaterial(slug)
getDomain(slug)
getFarmingSources(target)
getCharacterMaterials(character)
getWeaponMaterials(weapon)
getBannerHistory(character)
getBannerRotation(options)
getRerunAnalysis(character)
getRerunPressure(options)
getHealth()
```

Mapping:

| Current UI/API | Domain operation |
|---|---|
| `/api/entities` | `listEntities` / `searchEntities` |
| `/api/entities/[kind]/[slug]` | `resolveEntity` + `getEntityRelations` |
| Character detail page | `getCharacter` |
| Farming console | `getFarmingSources` |
| Knowledge search | `searchKnowledge` |
| Character banner history | `getBannerHistory` |
| Banner rotation page | `getBannerRotation` |
| Rerun pressure page | `getRerunPressure` |
| Rerun analysis API | `getRerunAnalysis` |
| Health API | `getHealth` |
| MCP | same domain functions |

The UI should receive Teyvat view models, not raw E `KnowledgeResult` objects.

## 10. API migration plan

Keep existing route URLs where practical. Rewrite handlers to validate parameters, call one domain function, preserve response shapes, return a deterministic dataset revision, and retain cache headers.

Routes requiring migration:

- [`app/api/entities/route.ts`](./app/api/entities/route.ts)
- `app/api/entities/[kind]/[slug]/route.ts`
- [`app/api/farming/route.ts`](./app/api/farming/route.ts)
- [`app/api/knowledge/search/route.ts`](./app/api/knowledge/search/route.ts)
- all `/api/v1/genshin/**` routes
- [`app/api/health/route.ts`](./app/api/health/route.ts)

The current preview fallback should be removed. Bundled `/gi-data` is the real source.

## 11. MCP migration plan

No MCP implementation was found in the current E-Teyvat, E, or gi-data repositories. MCP is therefore `UNKNOWN / NEEDS DECISION` rather than an existing path that can be migrated directly.

Recommended architecture:

```text
MCP tool
  ↓
Teyvat domain/query layer
  ↓
E engine + Teyvat indexes
  ↓
/gi-data
```

Initial tools should include:

- `find_entity`
- `get_entity`
- `get_entity_relations`
- `get_farming_sources`
- `search_knowledge`
- `get_character_materials`
- `get_banner_history`
- `get_rerun_analysis`

MCP must not call API routes internally or duplicate traversal/farming logic.

## 12. Cloudflare R2 assessment

R2 is independent from Neon and can remain for assets.

Current behavior:

- `/api/upload` converts uploads to AVIF with `sharp`.
- Files are stored under `kind/slug.avif`.
- The resulting key is written into Neon by the admin PATCH route.
- Image resolution reads `customImageUrl` from Neon.

Recommended target:

- Keep R2 only for image/asset storage.
- Remove database-backed `customImageUrl` updates.
- Use deterministic asset URLs based on kind and slug.
- Alternatively maintain a committed or R2-hosted asset manifest.
- Do not put canonical entity data in R2.
- Replace runtime `enka.network` and Cloudinary dependencies with local assets or R2 if external image hosts are not acceptable.

## 13. Data bootstrap strategy

Use A plus C:

- A: E `InMemoryEngine`.
- C: Teyvat-specific import/normalization layer.

The importer should read normalized `/gi-data`, validate source records, create E entities, generate aliases, create resolvable relations and documents, preserve provenance/temporal fields, produce a revision, and call `engine.ingestBatch()`.

The baseline dataset is below E’s 100,000-item batch limit even after canonical aliases are added.

Use a module-level singleton:

```text
first server request
  ↓
load generated dataset
  ↓
construct InMemoryEngine
  ↓
ingest once
  ↓
reuse engine for process lifetime
```

Use the default Node.js runtime for routes/pages that load the dataset. Do not import engine/data bootstrap code into client components.

Because `/gi-data` is a sibling repository, it will not automatically exist in a Vercel deployment. Choose one of:

- copy a normalized snapshot into E-Teyvat;
- publish `/gi-data` as a separate package;
- generate a checked-in E-compatible artifact during a controlled build step.

Do not depend on reading a sibling path at runtime.

Do not use `@vxnus/e-sqlite` for production. It is suitable only for local benchmarking or offline experiments.

## 14. E 0.2.0 gaps/blockers

### Blockers

1. No canonical handling exists for unresolved relation endpoints.
2. No decision exists on historical `GENSHIN_DB` provenance.
3. No deployment packaging strategy exists for the sibling `/gi-data` repository.
4. No MCP source implementation was found.
5. No persistent mechanism exists for admin image metadata after Neon removal.

### High

- E search does not search document content.
- E aliases are exact and not normalized.
- E has no update/delete API.
- E has no temporal filtering.
- E documents lack title/category metadata.
- In-memory startup and serverless memory usage require measurement.
- Banner statistics are not directly represented in `/gi-data`.
- Current image URLs rely on external hosts.
- Existing direct database pages require refactoring.

### Medium

- 1,724 entities have no `name.en`.
- UI kinds are plural while normalized categories are singular.
- Current image resolver expects legacy `images.filename_*` fields.
- Cache invalidation must be tied to the dataset revision.

### Low

- Claims are currently unnecessary.
- Semantic search is not required.
- SQLite is not suitable for production.
- Existing demo/preview wording becomes obsolete.

## 15. Risks

### Blocker

- Missing graph endpoints can make `ingestBatch` fail because E enforces foreign keys.
- Runtime cannot access `/gi-data` unless it is packaged.
- Custom asset overrides have no persistence after Neon removal.

### High

- Dataset size may cause high cold-start time or memory use.
- E’s 4 MB serialized JSON limit may reject unusually large records.
- Document search requires a Teyvat-side index.
- Banner rerun statistics must be recomputed deterministically.
- External image URLs may violate the no-external-runtime-data policy.
- Existing server pages will fail until migrated.
- Current dependency does not reference the published E package.

### Medium

- Alias behavior may regress without generated normalized variants.
- Category mismatches may produce incomplete farming results.
- Quest/static entities need fallback display names.
- E cannot filter temporal records natively.

### Low

- Claims are absent.
- Semantic search remains unavailable.
- Existing admin authentication is simplistic and should be reviewed separately.

## 16. Proposed repository structure

```text
e-teyvat/
├── app/
├── lib/
│   ├── teyvat/
│   │   ├── engine.ts
│   │   ├── bootstrap.ts
│   │   ├── import/
│   │   ├── entities.ts
│   │   ├── relations.ts
│   │   ├── search.ts
│   │   ├── knowledge.ts
│   │   ├── farming.ts
│   │   ├── characters.ts
│   │   ├── materials.ts
│   │   ├── domains.ts
│   │   ├── banners.ts
│   │   ├── rerun-pressure.ts
│   │   ├── images.ts
│   │   └── types.ts
│   └── assets/
├── data/
│   └── teyvat/
│       ├── entities.json
│       ├── relations.json
│       ├── documents.json
│       ├── aliases.json
│       └── manifest.json
├── mcp/
├── public/
├── scripts/
│   └── build-teyvat-data.ts
└── test/
```

Generated `data/teyvat` should be treated as a deployment artifact, not a second manually edited source of truth.

## 17. Phased migration plan

### Phase 0 — Investigation and decisions

Resolve missing relations, synthetic relic entities, historical provenance, data packaging, R2 metadata, and MCP ownership.

Verification: all decisions are documented and the complete E batch validates.

### Phase 1 — Replace the E dependency

Update `package.json`, `package-lock.json`, and `bun.lock` to use `@vxnus/e@0.2.0`. Do not add storage adapters.

Verification: `npm ls @vxnus/e` reports `0.2.0`; no dependency points to `/e`.

### Phase 2 — Introduce the E/Teyvat boundary

Add `lib/teyvat/**`, engine bootstrap, Teyvat view models, resolution, and search functions.

Verification: domain tests run without Neon and client components do not import server bootstrap code.

### Phase 3 — Build the `/gi-data` importer

Map entities, aliases, relations, documents, provenance, and temporal fields. Generate a manifest revision.

Verification: every imported record passes E validation, all relation endpoints resolve, and checksums are deterministic.

### Phase 4 — Migrate entity and knowledge reads

Rewrite entity/search routes and character/detail reads over the domain layer. Add document search indexing if needed.

Verification: explorer, resolution, detail pages, and knowledge search work without database variables.

### Phase 5 — Migrate farming logic

Use E relations and Teyvat mapping for requirements, materials, domain rewards, drops, quantities, and schedule days.

Verification: character and weapon farming fixtures produce expected sources and quantities.

### Phase 6 — Migrate banners

Read banner entities and `appeared_in` relations from E. Compute rerun statistics deterministically and preserve existing charts.

Verification: rotation, history, and rerun analysis match fixtures.

### Phase 7 — Migrate MCP

Expose the same domain functions as MCP tools.

Verification: MCP and API results match for equivalent requests.

### Phase 8 — Remove Neon and Drizzle

Remove `db/`, `drizzle/`, `drizzle.config.ts`, database imports, packages, environment variables, and obsolete tests.

Verification: repository-wide search finds no Neon, Drizzle, `DATABASE_URL`, or old schema imports.

### Phase 9 — Remove external synchronization

Remove sync scripts, scheduled GitHub Actions, external API URLs, and ingestion documentation.

Verification: no runtime or CI path performs external data ingestion.

### Phase 10 — Assets and deployment verification

Finalize local/R2 assets, Node runtime behavior, generated dataset packaging, memory, cold-start, cache, and Vercel deployment behavior.

Verification: build succeeds, data loads, assets resolve, and memory/startup measurements are acceptable.

## 18. Test and verification strategy

### Import tests

- entity, relation, document, and alias counts
- E validation
- deterministic IDs
- deterministic revision
- duplicate detection
- unresolved endpoint detection
- provenance preservation
- no external HTTP requests

### Domain tests

- slug and alias resolution
- kind-filtered search
- relation traversal
- farming sources
- document search
- banner history
- rerun pressure
- provenance and revision output

### API contract tests

Test existing response contracts for entity, farming, knowledge, health, and banner routes.

### UI verification

Verify explorer, character detail, farming console, knowledge search, banner observatory, rotation, rerun pressure, history, and retained admin asset flows.

### Deployment verification

Verify:

- no `DATABASE_URL`
- no Neon or Drizzle packages
- no external data API calls
- Node runtime selection
- generated dataset inclusion
- cold-start and memory usage
- revision-based caching
- image delivery

## 19. Final recommended architecture

Use `@vxnus/e@0.2.0` as a real npm dependency and instantiate its published `InMemoryEngine` from a generated `/gi-data` snapshot.

Keep generic graph behavior in E:

- entities
- aliases
- relations
- documents
- provenance
- traversal
- lexical entity search

Keep Genshin semantics in E-Teyvat:

- category mapping
- normalized alias behavior
- entity view models
- material/farming logic
- banner history
- rerun statistics
- document search indexes
- image resolution
- MCP tools

Keep API routes and the existing UI, but remove all direct database access.

Keep R2 only for optional asset storage. Do not use it as canonical data storage.

Do not introduce SQLite, Postgres, Neon, Drizzle, vector search, external sync, genshin-db, or runtime knowledge APIs.

## 20. Open questions before implementation

1. Should historical records with `GENSHIN_DB` provenance remain authoritative?
2. How should the 629 unresolved relation endpoints be handled?
3. Should `reliquary_set` and `reliquary_piece` become synthetic E entities?
4. Should recipe category mismatches be corrected in the importer or `/gi-data`?
5. What fallback name should be used for quests and static entities?
6. Should document title/category be embedded into content or kept in a Teyvat index?
7. Is full document-text search required in the first migration?
8. Where will the generated `/gi-data` artifact live for Vercel builds?
9. Is the in-memory cold-start and memory profile acceptable?
10. Should R2 asset overrides remain editable, and where should their manifest live?
11. What MCP implementation or deployment must be migrated?
12. Should external image hosts be eliminated in favor of local assets/R2?
13. Should banner statistics be computed at build time or lazily per process?
14. Which `/gi-data` categories are in scope for the first UI migration?
15. Should the old admin image editor remain, be simplified, or be removed?

Implementation should not begin until the relation-resolution, dataset-packaging, asset-manifest, and MCP questions are resolved.
