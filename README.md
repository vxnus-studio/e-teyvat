# E-Teyvat

E-Teyvat is an open structured knowledge base for **Genshin Impact**, designed for both humans and AI systems.

Rather than acting as another wiki, E-Teyvat exposes canonical entities, relationships, and searchable knowledge through public APIs. It can be used for AI retrieval, applications, websites, bots, and research that require consistent Genshin data.

Built with a static Next.js frontend, Cloudflare Workers, Neon Postgres, and Drizzle ORM, the project focuses on reliable data synchronization, graph relationships, and long-term machine-readable knowledge.

## Documentation

* [Architecture and AI Retrieval](docs/architecture.md)
* [Read API Reference](docs/api.md)

## Getting Started

Install dependencies and start the development server:

```bash
bun install
bun dev
```

Open **http://localhost:3000**.

The frontend works as a static preview by default. API-backed features become available once the hosted worker has a valid `DATABASE_URL`.

For local database tooling, copy:

```bash
cp .env.example .env.local
```

and configure your database connection.

## Database Setup

1. Create a Neon project.
2. Copy the pooled PostgreSQL connection string.
3. Set `DATABASE_URL` locally and in your GitHub Actions secrets.
4. Apply the database schema:

```bash
bun run db:migrate
```

5. Import the initial dataset:

```bash
bun run sync:genshin
```

6. Configure `DATABASE_URL` for the deployed Cloudflare Worker.

A scheduled GitHub Actions workflow runs monthly to keep the dataset synchronized with new Genshin releases. Manual synchronization is also supported.

## Data Model

The database is organized into several core tables:

* **entities** — canonical records imported from the genshin-db v5 dataset
* **aliases** — normalized names for robust entity resolution
* **relations** — graph edges connecting entities (such as `requires`, `located_in`, and `rewards`)
* **knowledge_documents** — searchable long-form knowledge with optional vector support
* **sync_runs** — import history, coverage statistics, and validation results

The importer hashes every source record, skips unchanged content, preserves existing embeddings, and rebuilds graph relationships after each successful synchronization.

Vector storage is prepared for future embedding providers, while full-text search and graph traversal work without embeddings.

## Read API

| Endpoint                        | Description                |
| ------------------------------- | -------------------------- |
| `GET /api/health`               | Health check               |
| `GET /api/entities`             | Search entities            |
| `GET /api/entities/:kind/:slug` | Retrieve a single entity   |
| `GET /api/farming`              | Farming recommendations    |
| `GET /api/knowledge/search`     | Search knowledge documents |

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

Game data, artwork, names, and other intellectual property belong to **COGNOSPHERE PTE. LTD. (HoYoverse)**. E-Teyvat is an independent fan project and is not affiliated with or endorsed by HoYoverse.
