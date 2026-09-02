# The Lore Engine

**Phase 1 Status:** Implemented & Live  
**Phase 1.5 Status:** Implemented & Live  
**Phase 2 & 3 Status:** Planned Roadmap

The Lore Engine connects structured Genshin Impact data with expansive in-game narrative archives. By grounding reasoning in canonical evidence, the engine empowers human readers, bots, and AI agents to discover, cite, and synthesize insights across Teyvat's rich lore.

---

## Phase 1: Canonical Narrative Archive & Retrieval (Implemented)

Phase 1 indexes all structured narrative text available in the Teyvat knowledge projection and exposes interactive readers and machine-readable REST search APIs.

### Available Data & Corpus

- **In-Game Books (`doc_book`)**: 1,239 distinct book volumes covering history, myths, poetry, and fairytales across Mondstadt, Liyue, Inazuma, Sumeru, Fontaine, and Natlan.
- **Artifact Relic Stories (`doc_relic`)**: 299 artifact lore stories attached to set pieces detailing ancient deities, civilizations, and historical eras.
- **Weapon Legends (`weapon`)**: 270 weapon histories and background lore texts.
- **Bestiary Lore (`monster`)**: 576 monster and boss combat lore profiles.
- **Character Chronicles (`avatar`)**: 134 character fetter profiles, native affiliations, and background overviews.
- **Culinary Lore (`food`)**: 444 food items and culinary records with descriptive flavor texts.
- **Namecard Chronicles (`namecard`)**: 289 namecard profile items detailing character and event vignettes.
- **TCG Lore (`doc_gcg`)**: 606 Genius Invokation card story records.

### API Endpoints

- `GET /api/v1/lore/overview` — Retrieve aggregate corpus telemetry (document counts by category, distinct book titles, dataset revision).
- `GET /api/v1/lore/search` — Search narrative texts across categories (`book`, `artifact`, `weapon`, `monster`, `character`, `food`, `namecard`) with pagination and relevance ranking.
- `GET /api/v1/lore/books` — List and filter in-game book titles and metadata.
- `GET /api/v1/lore/books/:slug` — Retrieve full multi-volume text anthology for a book title.

### Interactive UI

- Accessible at `/lore-engine/` with category filtering, full-text keyword search, telemetry stats bar, and an anthology reader modal supporting multi-volume switching.

> **AI Reasoning & Capability Notice:** Autonomous generative AI inference, synthesis, and reasoning capabilities are **currently not active**. Phase 1 of the Lore Engine operates exclusively as a deterministic lexical search and entity lookup index over canonical records. Verbatim source texts are returned for grounded verification without automated reasoning.

---

## Phase 1.5: Retrieval Precision & Corpus Enrichment (Implemented)

### 1. Canonical & Curated Alias Resolution
- Resolves alternate and divine true-names missing from basic entity indexes (e.g., Archon true-names: `Morax` / `Rex Lapis` → `Zhongli`, `Barbatos` → `Venti`, `Baal` / `Beelzebul` → `Raiden Shogun`, `Buer` → `Nahida`, `Focalors` → `Furina`, Harbingers like `Tartaglia` / `Childe`, `La Signora`, `The Knave`, etc.).
- Indexes projection aliases for all entities in the graph (`aliasesByEntityId`).

### 2. Multi-tier Relevance Scoring
Search results are prioritized using a weighted relevance heuristic:
1. **Exact Entity Name / Slugs**: Top match tier (`+120`).
2. **Curated Lore & Archon Aliases**: High priority resolution (`+100`).
3. **Projection Aliases**: Sub-alias and nickname matches (`+90`).
4. **Title & Headline Matches**: Canonical title matches (`+70`).
5. **Content Match Frequency**: Scored by keyword frequency in document text.
6. **Canonical Priority**: Tie-breakers prefer primary lore sources (books and artifact records).

### 3. Query-Aware Snippet Windows
- Dynamically locates keyword offsets in search results and extracts contextual windows (~240 chars centered around the query hit) rather than truncating from document starts.

### 4. Corpus Expansions (Culinary & Namecards)
- Added 444 food flavor narratives and 289 namecard lore profiles into searchable documents with dedicated console filters.

---

## Planned Phases (Future Roadmap)

### Phase 2: Dialogue & Transcript Expansion (Planned)

**Goal:** Expand the textual corpus with fine-grained character story chapters, voicelines, and quest dialogues.

- **Character Story Ingestion**: Ingest full 5-part character stories, Vision stories, and character details into `teyvat_documents` from raw pipeline snapshots.
- **Voiceline Transcripts**: Populate character dialogue transcripts, voiceline interactions with other characters, and situational quotes.
- **Quest Dialogue Trees**: Normalize Archon, Story, and World Quest step-by-step dialogue scripts into searchable narrative chunks.
- **NPC Dialogue Graph**: Link non-playable characters (NPCs) with their world dialogue and regional associations.
- **Dedicated Character Lore Pages**: Character detail routes at `/database/characters/[slug]/lore` aggregating story chapters and dialogue records.

### Phase 3: Graph Intelligence & Semantic Search (Planned)

**Goal:** Enable fuzzy conceptual reasoning, regional facets, and relational exploration.

- **Cross-Entity Lore Graph API (`GET /api/v1/lore/entity/:id/related`)**: Traverse the 14k+ relation edges (e.g., materials, boss drops, region, `appeared_in`) to return lore-adjacent entities and shared narratives.
- **Region & Temporal Version Filters**: Facet search queries by region (Mondstadt, Liyue, Inazuma, Sumeru, Fontaine, Natlan, Snezhnaya, Khaenri'ah) and game version (`temporal.validFrom`).
- **Interactive Narrative Knowledge Graph**: Force-directed graph visualization in `/explore` exploring entity clusters, factions, and artifact set connections.
- **MCP Lore Tools**: Expose `lore_search`, `lore_overview`, and `lore_get_book` tools via `/api/mcp` for direct AI assistant query execution.
- **Revision-Scoped Vector Embeddings**: Generate 768-dimensional embeddings in `teyvat_embeddings` for hybrid dense + sparse retrieval.
- **Inference Engine**: Ground LLM answers with citation spans directly linked to specific book volumes, relic lore pieces, or quest dialogue timestamps.
