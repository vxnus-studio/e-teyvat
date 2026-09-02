# Teyvat Knowledge Base

**Website:** [https://e-teyvat.vxnus.xyz](https://e-teyvat.vxnus.xyz)

Teyvat is an open structured knowledge base for **Genshin Impact**, designed for both humans and AI systems.

Rather than acting as another wiki, Teyvat exposes canonical entities, relationships, and searchable knowledge through public APIs. It can be used for AI retrieval, applications, websites, bots, and research that require consistent Genshin data.

Built with a full-stack Next.js App Router frontend, Neon Postgres, and Drizzle ORM, the project focuses on reliable data synchronization, graph relationships, and long-term machine-readable knowledge.

## Documentation

* [Architecture and AI Retrieval](docs/architecture.md)
* [Read API Reference](docs/api.md)
* [Banner Intelligence & Rerun Pressure](docs/banners.md)
* [Character Feature Roadmap](docs/character-feature-roadmap.md)
* [The Lore Engine](docs/lore-engine.md)

## Getting Started

Install dependencies and start the development server:

```bash
bun install
bun dev
```

Open **http://localhost:3000**.

The frontend works as a static preview by default. API-backed features become available once the application has a valid `DATABASE_URL`.

For local database tooling, copy:

```bash
cp .env.example .env.local
```

and configure your database connection.

## Database Setup

1. Create a Neon project.
2. Copy the pooled PostgreSQL connection string.
3. Set `DATABASE_URL` locally and in your deployment environment secrets.
4. Apply the database schema:

```bash
bun run db:migrate
```

5. Import the initial dataset:

```bash
bun run sync:genshin
bun run sync:banners
```

6. Configure `DATABASE_URL` for the deployed Next.js application.

A scheduled GitHub Actions workflow runs periodically to keep the dataset synchronized with new Genshin releases. Manual synchronization is also supported.

## Data Model

The database is organized into core knowledge tables:

* **entities** / **teyvat_entities** — canonical records imported from structured game data and normalized projections
* **aliases** / **teyvat_aliases** — normalized names for robust entity resolution
* **relations** / **teyvat_relations** — graph edges connecting entities (such as `requires`, `located_in`, `rewards`, `ascension_cost`, `talent_material`, `recipe_ingredient`)
* **knowledge_documents** / **teyvat_documents** — searchable long-form knowledge with full-text search and vector support
* **teyvat_chunks** / **teyvat_embeddings** — chunked retrieval units and revision-scoped vector embeddings
* **banner_phases** / **banner_character_statistics** — banner rotation timelines and statistical rerun pressure model
* **sync_runs** / **teyvat_dataset_revisions** — import audit history, revision hashes, and coverage statistics

The importer hashes every source record, skips unchanged content, preserves existing embeddings, and rebuilds graph relationships after each successful synchronization.

### E Knowledge Provider Status

* `POST /api/e/verify` — Provider identity and key verification (**Implemented**)
* `GET /api/e/manifest` — E manifest advertising dataset revision & capabilities (*Future Plan*)
* `POST /api/e/retrieve` — E lexical/hybrid cited chunk retrieval (*Future Plan*)

E Hub publisher ownership and authentication are intentionally outside this repository. This provider remains independently operated on Neon.

## Read API

| Endpoint | Method | Status | Description |
| -------- | ------ | ------ | ----------- |
| `/api/health` | GET | Implemented | Health check, dataset revision & system telemetry |
| `/api/v1/entities` | GET | Implemented | Search canonical entities across kinds with pagination |
| `/api/v1/entities/:kind/:slug` | GET | Implemented | Retrieve a single entity and outgoing relations |
| `/api/v1/characters/:char/builds` | GET | Implemented | Curated character builds, weapons, artifacts & rotations |
| `/api/v1/farming` | GET | Implemented | Farming pathways, material costs & domain schedules |
| `/api/v1/lore/overview` | GET | Implemented | Aggregate lore telemetry (categories, volume counts, revision) |
| `/api/v1/lore/search` | GET | Implemented | Search 12,900+ narrative texts (books, stories, voicelines, relics) |
| `/api/v1/lore/books` | GET | Implemented | List 603 in-game books with 1,239 volume anthology chapters |
| `/api/v1/lore/books/:slug` | GET | Implemented | Retrieve full multi-volume text anthology with complete manuscripts |
| `/api/v1/banners/rerun-pressure` | GET | Implemented | Character banner rerun pressure rankings |
| `/api/v1/characters/:char/banner-history` | GET | Implemented | Historical character banner appearance timeline |
| `/api/v1/characters/:char/rerun-analysis` | GET | Implemented | Statistical rerun distribution & pressure analysis |
| `/api/e/verify` | POST | Implemented | E Provider verification handshake |
| `/api/mcp` | GET/POST | Implemented | Public MCP server (all 9 tools) |
| `/api/openapi.json` | GET | Implemented | OpenAPI 3.1 Specification |

## The Lore Engine Corpus (12,964+ Documents)

The database includes full-length narrative manuscripts, character story chapters, and spoken transcripts:
- **1,151 In-Game Book Volumes (`book`)**: Full-length novel manuscripts (including *Perinheri*, *Pale Princess*, *Breeze Amidst the Pages*).
- **942 Character Story Chapters (`story`)**: Full 5-part character stories, Vision chronicles, and quest stories.
- **8,524 Spoken Voicelines (`quote`)**: Complete audio dialogue transcripts with conversational category filters.
- **299 Artifact Set Relic Histories (`artifact`)**: Ancient civilization and deity histories.
- **270 Weapon Legends (`weapon`)**: Forged weapon backgrounds.
- **576 Bestiary Combat Profiles (`monster`)**: Monster lore and combat overviews.
- **444 Food Flavor Records (`food`)** & **289 Namecard Vignettes (`namecard`)**.

## MCP Server

The Teyvat Knowledge Base is available as a public **Model Context Protocol (MCP)** server, letting any MCP-compatible AI agent access all 9 tools without writing custom fetch logic.

**Endpoint:** `https://e-teyvat.vxnus.xyz/api/mcp`
 
### Connect with Streamable HTTP (recommended)
 
Add this to your `mcp_config.json` or equivalent client config:
 
```json
{
  "mcpServers": {
    "teyvat": {
      "url": "https://e-teyvat.vxnus.xyz/api/mcp"
    }
  }
}
```
 
### Connect via stdio proxy (for stdio-only clients)
 
```json
{
  "mcpServers": {
    "teyvat": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://e-teyvat.vxnus.xyz/api/mcp"]
    }
  }
}
```

### Available tools

| Tool | Description |
| ---- | ----------- |
| `find_entity` | Search entities by name, partial name, or alias |
| `get_entity` | Retrieve a single entity with outgoing graph relations |
| `get_farming_sources` | Farming pathways, material costs & domain schedules |
| `search_lore` | Full-text search across 1,239 books, 299 artifact histories & weapon legends |
| `get_lore_book` | Retrieve complete anthology text for an in-game book |
| `search_knowledge` | Full-text rank search over character dialogue & build guides |
| `get_banner_rerun_pressure` | Ranked banner rerun pressure scores for all characters |
| `get_character_banner_history` | Historical banner appearances for a character |
| `get_character_rerun_analysis` | Statistical rerun distribution & pressure analysis |

## Acknowledgments & Thanks To

e-teyvat is built upon the collective contributions of the Genshin Impact open-source and theorycrafting communities. Special thanks to:

* **[HoYoverse (COGNOSPHERE PTE. LTD.)](https://genshin.hoyoverse.com/)** — For creating the vast, beautiful world of Teyvat and the incredible game experience of *Genshin Impact*.
* **[Project Amber (gi.yatta.moe)](https://gi.yatta.moe/)** — For developing and maintaining the comprehensive community game data API and asset archive that powers our extraction and normalization pipeline.
* **[KeqingMains (KQM)](https://keqingmains.com/)** — For their peer-reviewed theorycrafting, character quick guides, weapon calculations, and rotation benchmarks that power our curated build recommendation layer.
* **[Samsara & Community Banner Trackers](https://samsara.top/)** — For meticulous archival of historical wish banner timelines, phases, and rate-up rosters.
* **[Enka.Network](https://enka.network/)** — For reliable asset infrastructure and game icon delivery.

## Disclaimer & Copyright

**e-teyvat** is an independent, non-commercial fan-made project created for educational, research, and companion purposes. It is not affiliated with, endorsed, or sponsored by **COGNOSPHERE PTE. LTD. (HoYoverse)**.

* All game content, character designs, illustrations, names, in-game text, audio, and visual assets are copyright and trademarks of **COGNOSPHERE PTE. LTD. / HoYoverse**.
* All community guides and calculations belong to their respective authors and theorycrafting organizations.

## License

This software and its application code are open source and licensed under the [MIT License](LICENSE).

