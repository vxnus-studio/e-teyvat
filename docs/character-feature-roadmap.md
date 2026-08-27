# Character Feature Roadmap

The first character-detail release should only present data that is authoritative
in the current `entities`, `relations`, and banner tables. Recommendation content
must not be inferred from descriptions or banner timing.

# Character Feature Roadmap

The character-detail presentation focuses on authoritative data in `entities`,
`teyvat_entities`, `relations`, and banner rotation tables.

## Available Now (Implemented in UI & Database)

- **Character Identity & Visuals**: Name, title, rarity stars, element icon/tag, weapon type, region, affiliation, birthday, ascension special prop/substat, description, and character portrait artwork.
- **Voice Archive**: Complete multilingual voice actor cast listings (English, Japanese, Chinese, Korean).
- **Ascension Material Links**: Normalized graph links (`ascension_cost` / `requires`) to required material family pages.
- **Talent Material Links**: Normalized graph links (`talent_material` / `requires`) to required skill book and boss drop pages.
- **Banner Intelligence**: Direct integration with banner rotation history, total appearances, current wait interval, rerun pressure score, and link to complete `/characters/:slug/banner-history`.
- **Machine-Readable Telemetry**: Revision headers and canonical data preserved in raw JSON.

## Future Plan: Granular Combat & Progression UI

The canonical JSON payload contains deep combat and progression data; dedicated UI presentation components are scheduled for upcoming releases:

- **Ascension Stage Breakdown**: Step-by-step Level 20 through 90 ascension matrices with exact mora and material quantity counters.
- **Talent Scaling & Costs**: Combat talent scaling tables (Normal Attack, Elemental Skill, Elemental Burst), passive talent mechanics, and Level 1-10 per-level material breakdowns.
- **Constellation Showcase**: C1-C6 constellation drawer with active/passive enhancement descriptions.

## Future Plan: Weapon Banners

Weapon entities exist, but weapon-banner history does not. A future release requires:

1. An authoritative weapon-wish source.
2. A `banner_phase_weapons` table linked to `entities`.
3. Weapon appearance ingestion and optional rerun statistics.
4. Weapon sections in the banner overview and rotation timeline.

## Future Plan: Signature Weapons

The current character and weapon payloads do not declare signature ownership.
Do not infer a signature weapon from matching banner dates.

Add either a curated mapping or an authoritative source and normalize it as:

```text
character --signature_weapon--> weapon
```

The relation must support zero, one, or multiple associated weapons and retain
source/provenance metadata.

## Future Plan: Builds, Artifacts, Teams, and Rotations

Weapon and artifact entities exist, but character-specific recommendations do
not. Future recommendation data should include:

- Recommended weapons with role, rank, and explanation.
- Artifact sets, main stats, and substat priorities.
- Team compositions with roles and alternatives.
- Talent priority and combat rotations.
- Patch/version applicability and source provenance.

This content should live in a curated, versioned recommendation layer rather
than being guessed from canonical descriptions.

## Farming Graph Status

Ascension and talent costs are normalized as `ascension_cost`, `talent_material`, and `requires`. Domain rewards (`rewards`) and boss/enemy drops (`drops`) are populated and queried via `/api/v1/farming`, with canonical material source notes serving as textual fallback.

