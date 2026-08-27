# The Lore Engine

**Phase 1 Status:** Implemented & Live  
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
- **TCG Lore (`doc_gcg`)**: 606 Genius Invokation card story records.

### API Endpoints

- `GET /api/v1/lore/search` — Search narrative texts across categories (books, artifacts, weapons, monsters, characters) with pagination.
- `GET /api/v1/lore/books` — List and filter in-game book titles and metadata.
- `GET /api/v1/lore/books/:slug` — Retrieve full multi-volume text anthology for a book title.

### Interactive UI

- Accessible at `/lore-engine/` with category filtering, full-text keyword search, and an anthology reader modal supporting multi-volume switching.

> **AI Reasoning & Capability Notice:** Autonomous generative AI inference, synthesis, and reasoning capabilities are **currently not active**. Phase 1 of the Lore Engine operates exclusively as a deterministic lexical search and entity lookup index over canonical records. Verbatim source texts are returned for grounded verification without automated reasoning.

---

## Planned Phases (Future Roadmap)

### Phase 2: Dialogue & Transcript Expansion (Planned)

**Goal:** Expand the textual corpus with fine-grained character story chapters, voicelines, and quest dialogues.

- **Character Story Ingestion**: Ingest full 5-part character stories, Vision stories, and character details into `teyvat_documents`.
- **Voiceline Transcripts**: Populate character dialogue transcripts, voiceline interactions with other characters, and situational quotes.
- **Quest Dialogue Trees**: Normalize Archon, Story, and World Quest step-by-step dialogue scripts into searchable narrative chunks.
- **NPC Dialogue Graph**: Link non-playable characters (NPCs) with their world dialogue and regional associations.

### Phase 3: Semantic Embeddings & Inference Graph (Planned)

**Goal:** Enable fuzzy conceptual reasoning and extract cross-entity narrative relationship edges.

- **Revision-Scoped Vector Embeddings**: Generate 768-dimensional embeddings in `teyvat_embeddings` for hybrid dense + sparse retrieval.
- **Narrative Graph Edges**:
  - `character --allied_with--> character`
  - `character --belongs_to--> faction`
  - `entity --originated_in--> ancient_civilization`
  - `quest --features--> character`
- **Inference Engine**: Ground LLM answers with citation spans directly linked to specific book volumes, relic lore pieces, or quest dialogue timestamps.
