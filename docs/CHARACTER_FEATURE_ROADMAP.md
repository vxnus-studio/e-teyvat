# Character Feature Roadmap

The first character-detail release should only present data that is authoritative
in the current `entities`, `relations`, and banner tables. Recommendation content
must not be inferred from descriptions or banner timing.

## Available now

- Character identity, rarity, element, weapon type, region, affiliation,
  birthday, version, voice actors, description, and artwork.
- Six character ascension stages with material quantities.
- Combat talents, passive talents, talent descriptions, scaling data, and
  talent-level material costs.
- Six constellations with names and descriptions.
- Character banner appearances and rerun-pressure analysis.
- Links between character pages, banner history, and material records.

## Deferred: weapon banners

Weapon entities exist, but weapon-banner history does not. A future release
requires:

1. An authoritative weapon-wish source.
2. A `banner_phase_weapons` table linked to `entities`.
3. Weapon appearance ingestion and optional rerun statistics.
4. Weapon sections in the banner overview and rotation timeline.

## Deferred: signature weapons

The current character and weapon payloads do not declare signature ownership.
Do not infer a signature weapon from matching banner dates.

Add either a curated mapping or an authoritative source and normalize it as:

```text
character --signature_weapon--> weapon
```

The relation must support zero, one, or multiple associated weapons and retain
source/provenance metadata.

## Deferred: builds, artifacts, teams, and rotations

Weapon and artifact entities exist, but character-specific recommendations do
not. Future recommendation data should include:

- Recommended weapons with role, rank, and explanation.
- Artifact sets, main stats, and substat priorities.
- Team compositions with roles and alternatives.
- Talent priority and combat rotations.
- Patch/version applicability and source provenance.

This content should live in a curated, versioned recommendation layer rather
than being guessed from canonical descriptions.

## Deferred: complete farming graph

Ascension and talent costs are available. The live relation graph currently
normalizes `requires` and `crafted_from`, but does not yet contain complete
domain reward or enemy drop edges. Before presenting authoritative farming
routes, populate and validate `rewards`, `drops`, `obtained_from`, and related
source edges.
