# The Lore Engine

**Phase 1 Status:** Implemented & Live  
**Phase 1.5 Status:** Implemented & Live  
**Phase 2 Status:** Implemented & Live  
**Phase 3 Status:** Planned Roadmap

The Lore Engine connects structured Genshin Impact data with expansive in-game narrative archives. By grounding reasoning in canonical evidence, the engine empowers human readers, bots, and AI agents to discover, cite, and synthesize insights across Teyvat's rich lore.

---

## Phase 1 & 1.5: Canonical Narrative Archive, Retrieval & Precision (Implemented)

Phase 1 & 1.5 index all structured narrative text available in the Teyvat knowledge projection and expose interactive readers and machine-readable REST search APIs.

### Available Data & Corpus

- **In-Game Books (`doc_book`)**: 1,239 distinct book volumes covering history, myths, poetry, and fairytales across Mondstadt, Liyue, Inazuma, Sumeru, Fontaine, and Natlan.
- **Artifact Relic Stories (`doc_relic`)**: 299 artifact lore stories attached to set pieces detailing ancient deities, civilizations, and historical eras.
- **Weapon Legends (`weapon`)**: 270 weapon histories and background lore texts.
- **Bestiary Lore (`monster`)**: 576 monster and boss combat lore profiles.
- **Character Chronicles (`avatar`)**: 134 character fetter profiles, native affiliations, and background overviews.
- **Culinary Lore (`food`)**: 444 food items and culinary records with descriptive flavor texts.
- **Namecard Chronicles (`namecard`)**: 289 namecard profile items detailing character and event vignettes.
- **TCG Lore (`doc_gcg`)**: 606 Genius Invokation card story records.

### Retrieval Capabilities
1. **Canonical & Curated Alias Resolution**: Archon true-names and epithets (`Morax` / `Rex Lapis` → `Zhongli`, `Barbatos` → `Venti`, `Baal` → `Raiden Shogun`, Harbingers, etc.).
2. **Multi-tier Relevance Scoring**: Prioritizes exact matches (`+120`), curated lore aliases (`+100`), projection aliases (`+90`), and titles (`+70`).
3. **Query-Aware Snippet Windows**: Extracts contextual windows (~240 chars centered around keyword match hits).

---

## Phase 2: Dialogue & Story Expansion (Implemented & Live)

Phase 2 hydrates and indexes the complete conversational, character story, and voiceline archives directly from the game's canonical dataset.

### Phase 2 Corpus Additions
- **Character Story Chapters (`story`)**: **942 full-length story documents** covering Character Details, 5-part character stories, Vision stories, and character quests for all playable cast members.
- **Voiceline Dialogue Transcripts (`quote`)**: **8,524 spoken dialogue transcripts** covering combat lines, about lines, teapot interactions, and situational quotes.
- **Rich Narrative UI Reader Modal**:
  - Immersive chapter typography with serif narrative formatting.
  - Dedicated blockquote transcript cards for voicelines.
  - Quick links to character pages in the database.

### API Endpoints
- `GET /api/v1/lore/overview` — Retrieve aggregate corpus telemetry (document counts by category, distinct book titles, dataset revision).
- `GET /api/v1/lore/search` — Search narrative texts across categories (`story`, `quote`, `book`, `artifact`, `weapon`, `monster`, `character`, `food`, `namecard`) with pagination and relevance ranking.
- `GET /api/v1/lore/books` — List and filter in-game book titles and metadata.
- `GET /api/v1/lore/books/:slug` — Retrieve full multi-volume text anthology for a book title.

---

## Planned Phases (Future Roadmap)

### Phase 3: Graph Intelligence & Semantic Search (Planned)

**Goal:** Enable fuzzy conceptual reasoning, regional facets, and relational exploration.

- **Cross-Entity Lore Graph API (`GET /api/v1/lore/entity/:id/related`)**: Traverse the 14k+ relation edges (e.g., materials, boss drops, region, `appeared_in`) to return lore-adjacent entities and shared narratives.
- **Region & Temporal Version Filters**: Facet search queries by region (Mondstadt, Liyue, Inazuma, Sumeru, Fontaine, Natlan, Snezhnaya, Khaenri'ah) and game version (`temporal.validFrom`).
- **Interactive Narrative Knowledge Graph**: Force-directed graph visualization in `/explore` exploring entity clusters, factions, and artifact set connections.
- **MCP Lore Tools**: Expose `lore_search`, `lore_overview`, and `lore_get_book` tools via `/api/mcp` for direct AI assistant query execution.
- **Revision-Scoped Vector Embeddings**: Generate 768-dimensional embeddings in `teyvat_embeddings` for hybrid dense + sparse retrieval.
- **Inference Engine**: Ground LLM answers with citation spans directly linked to specific book volumes, relic lore pieces, or quest dialogue timestamps.
