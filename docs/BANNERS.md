# Banner Rotation Analysis in e-Teyvat

This document outlines the methodology, architecture, and limitations of the Banner Rotation Analysis system in e-Teyvat.

## Methodology

The banner rotation engine tracks Genshin Impact event wish banners to calculate historical rerun statistics for characters. This information is used to estimate "Rerun Pressure," a statistical model determining which characters are historically most likely to appear on upcoming banners based on their past patterns.

### Phase Tracking
Banners are tracked by **Phases**. A phase represents one time period within a game version (typically half a version). 
- Multiple simultaneous banners (e.g., Character Event Wish-1 and Character Event Wish-2) are merged into a single "Phase".
- Phases are sequentially numbered across the entire game's history to create a stable timeline index. For example, if Version 1.0 Phase 1 is index `1`, Version 1.0 Phase 2 is index `2`, and so on.

### Rerun Pressure Model
The pressure score (0-100) is a weighted metric indicating how historically "due" a character is for a rerun.

- **Current Wait Percentile (40%)**: How the character's current wait compares to their own past intervals.
- **Proximity to Historical Distribution (30%)**: How close the current wait is to their median, mode, or maximum historical wait time.
- **Global Overdue Ranking (20%)**: Where the character stands compared to all other characters of the same rarity.
- **Recent Rotation Adjustment (10%)**: A base penalty applied to characters who just reran in the last 1-2 phases.

### Confidence Score
The confidence score (0-100) measures the reliability of the statistical estimate.
- **Sample Size (60%)**: Penalizes characters with fewer than 8 past appearances.
- **Consistency (40%)**: Penalizes characters with high interval variance (standard deviation > 4).

## API Specifications

Read-only API endpoints are available under `/api/v1/genshin`:

### 1. Character Banner History
`GET /api/v1/genshin/characters/:character_slug/banner-history`
Returns chronological appearances, calculated wait intervals, and model analysis for a specific character.

### 2. Rerun Analysis
`GET /api/v1/genshin/characters/:character_slug/rerun-analysis`
Returns pre-calculated statistical data (median, mean, intervals, pressure score, confidence score).

### 3. Rerun Pressure Rankings
`GET /api/v1/genshin/banners/rerun-pressure`
Returns a ranked list of characters based on their Rerun Pressure Score.
**Params:**
- `limit` (default: 50)
- `offset` (default: 0)
- `pressureLevel` (optional filter: low, moderate, elevated, high, very_high)

## Architecture

Data is sourced from the [Samsara](https://github.com/benlei/samsara-web) dataset. 
The ingestion pipeline (`bun run sync:banners`) fetches the upstream `banners.yaml`, parses version strings (including Chronicles like "Luna V.1"), resolves character aliases to canonical e-Teyvat entities, and upserts phase data.
Statistics are deterministically calculated during sync and stored in the database (`banner_character_statistics`) rather than calculated on the fly.

## Limitations & Disclaimer

This system provides **statistical estimates only**. It does not possess insider information or leak data.
- HoYoverse explicitly breaks past patterns (e.g., exceptionally long waits for characters like Eula).
- The model treats past variance as predictive of future variance, which is not guaranteed.
- It is heavily disclaimed on frontend views to prevent users from conflating high "Pressure" with guaranteed reruns (the "Gambler's Fallacy").
