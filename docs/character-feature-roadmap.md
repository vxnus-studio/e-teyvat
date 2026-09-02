# Character Feature Roadmap

The first character-detail release should only present data that is authoritative
in the current `entities`, `relations`, and banner tables. Recommendation content
must not be inferred from descriptions or banner timing.

# Character Feature Roadmap

The character-detail presentation focuses on authoritative data in `entities`,
`teyvat_entities`, `relations`, `teyvat_documents`, and banner rotation tables.

## Available Now (Implemented in UI & Database)

- **Character Identity & Visuals**: Name, title, rarity stars, element icon/tag, weapon type, region, affiliation, birthday, ascension special prop/substat, description, and character portrait artwork.
- **Canonical Chronicle & Story Chapters (Phase 2)**: Full 5-part character stories, Vision origin, and character quest chapters formatted in serif narrative typography.
- **Voiceline Dialogue Transcripts (Phase 2)**: Complete audio dialogue lines (combat lines, about characters, teapot interactions, situational weather lines) with instant search and subcategory filters.
- **Build Strategy & Theorycrafting**: Curated weapon rankings, optimal artifact sets, stat priorities, team synergies, and combat rotations.
- **Progression Calculator**: Step-by-step Level 20 through 90 ascension matrices with exact mora and material quantity counters, plus Talent Level 1-10 material breakdown.
- **Voice Archive**: Complete multilingual voice actor cast listings (English, Japanese, Chinese, Korean).
- **Ascension Material Links**: Normalized graph links (`ascension_cost` / `requires`) to required material family pages.
- **Talent Material Links**: Normalized graph links (`talent_material` / `requires`) to required skill book and boss drop pages.
- **Banner Intelligence**: Direct integration with banner rotation history, total appearances, current wait interval, rerun pressure score, and link to complete `/characters/:slug/banner-history`.
- **Machine-Readable Telemetry**: Revision headers and canonical data preserved in raw JSON.

## Future Plan: Constellations & Combat Scaling Drawer

- **Talent Scaling Deep Dive**: Combat talent multiplier scaling tables (Normal Attack, Elemental Skill, Elemental Burst) per talent level.
- **Constellation Showcase**: C1-C6 constellation drawer with active/passive enhancement descriptions.
- Patch/version applicability and source provenance.

This content should live in a curated, versioned recommendation layer rather
than being guessed from canonical descriptions.

## Farming Graph Status

Ascension and talent costs are normalized as `ascension_cost`, `talent_material`, and `requires`. Domain rewards (`rewards`) and boss/enemy drops (`drops`) are populated and queried via `/api/v1/farming`, with canonical material source notes serving as textual fallback.

