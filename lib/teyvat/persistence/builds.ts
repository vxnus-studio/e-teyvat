import { asc, desc, eq, inArray } from "drizzle-orm";
import { getDatabase } from "../../../db/client.ts";
import {
  characterBuildRecommendations,
  teyvatEntities,
  type BuildMainStats,
  type BuildProvenance,
  type BuildRotationStep,
  type BuildWeaponRecommendation,
} from "../../../db/schema.ts";


export interface HydratedBuildWeapon extends BuildWeaponRecommendation {
  entity?: {
    id: string;
    slug: string;
    name: string;
    image: string | null;
    rarity: number | null;
    type?: string;
    substat?: string;
    description?: string;
  } | null;
}

export interface HydratedBuildArtifactSet {
  artifactSlug: string;
  pieces: 2 | 4;
  entity?: {
    id: string;
    slug: string;
    name: string;
    image: string | null;
    rarity: number | null;
    bonus2pc?: string | null;
    bonus4pc?: string | null;
  } | null;
}

export interface HydratedBuildArtifact {
  rank: number;
  sets: HydratedBuildArtifactSet[];
  notes?: string;
}

export interface HydratedBuildTeammate {
  characterSlug: string;
  role: string;
  alternatives?: string[];
  entity?: {
    id: string;
    slug: string;
    name: string;
    image: string | null;
    rarity: number | null;
    element: string | null;
  } | null;
}

export interface HydratedBuildTeam {
  name: string;
  description?: string;
  members: HydratedBuildTeammate[];
}

export interface HydratedCharacterBuild {
  id: string;
  characterSlug: string;
  role: string;
  title: string | null;
  isPrimary: boolean;
  playstyle: string | null;
  weapons: HydratedBuildWeapon[];
  artifacts: HydratedBuildArtifact[];
  mainStats: BuildMainStats;
  substatPriority: string[];
  statTargets: Record<string, string>;
  talentPriority: string[];
  teams: HydratedBuildTeam[];
  rotationGuide: BuildRotationStep[];
  authorNotes: string | null;
  provenance: BuildProvenance;
  gameVersion: string;
}

function imageFromData(data: Record<string, unknown>): string | null {
  const custom = typeof data.custom_image_url === "string" ? data.custom_image_url : (typeof data.customImageUrl === "string" ? data.customImageUrl : null);
  if (custom) {
    if (custom.startsWith("http")) return custom;
    const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || "https://cdn.eteyvat.vxnus.xyz";
    return `${cdnUrl}/${custom}`;
  }
  const icon = typeof data.icon === "string" ? data.icon : null;
  if (icon?.startsWith("http")) return icon;
  if (icon) return `https://enka.network/ui/${icon}.png`;
  const images = data.images && typeof data.images === "object" && !Array.isArray(data.images) ? data.images as Record<string, unknown> : null;
  const filename = images && Object.values(images).find((value) => typeof value === "string" && value.length > 0);
  return typeof filename === "string" ? `https://enka.network/ui/${filename}.png` : null;
}

export class TeyvatBuildQueries {
  private readonly db;

  constructor(db = getDatabase()) {
    this.db = db;
  }

  /**
   * Retrieves all build recommendations for a character slug and hydrates weapon,
   * artifact set, and teammate entities from teyvat_entities.
   */
  async getCharacterBuilds(characterSlug: string): Promise<HydratedCharacterBuild[]> {
    const rawBuilds = await this.db
      .select()
      .from(characterBuildRecommendations)
      .where(eq(characterBuildRecommendations.characterSlug, characterSlug.toLowerCase()))
      .orderBy(desc(characterBuildRecommendations.isPrimary), asc(characterBuildRecommendations.createdAt));

    if (!rawBuilds.length) return [];

    // Collect all referenced slugs
    const weaponSlugs = new Set<string>();
    const artifactSlugs = new Set<string>();
    const teammateSlugs = new Set<string>();

    for (const build of rawBuilds) {
      for (const w of build.weaponRecommendations ?? []) {
        if (w.weaponSlug) weaponSlugs.add(w.weaponSlug.toLowerCase());
      }
      for (const a of build.artifactRecommendations ?? []) {
        for (const s of a.sets ?? []) {
          if (s.artifactSlug) artifactSlugs.add(s.artifactSlug.toLowerCase());
        }
      }
      for (const t of build.teamRecommendations ?? []) {
        for (const m of t.members ?? []) {
          if (m.characterSlug) teammateSlugs.add(m.characterSlug.toLowerCase());
        }
      }
    }

    // Query entity lookup maps
    const weaponEntitiesMap = new Map<string, { id: string; slug: string; name: string; image: string | null; rarity: number | null; type?: string; description?: string }>();
    if (weaponSlugs.size > 0) {
      const rows = await this.db
        .select()
        .from(teyvatEntities)
        .where(inArray(teyvatEntities.slug, Array.from(weaponSlugs)));
      for (const row of rows) {
        if (row.kind === "weapon") {
          const data = (row.data ?? {}) as Record<string, unknown>;
          const rarity = typeof data.rarity === "number" ? data.rarity : (typeof data.rankLevel === "number" ? data.rankLevel : 4);
          weaponEntitiesMap.set(row.slug.toLowerCase(), {
            id: row.id,
            slug: row.slug,
            name: row.name,
            image: imageFromData(data),
            rarity,
            type: typeof data.weapon_type === "string" ? data.weapon_type : undefined,
            description: typeof data.description === "string" ? data.description : undefined,
          });
        }
      }
    }

    const artifactEntitiesMap = new Map<string, { id: string; slug: string; name: string; image: string | null; rarity: number | null; bonus2pc?: string | null; bonus4pc?: string | null }>();
    if (artifactSlugs.size > 0) {
      const rows = await this.db
        .select()
        .from(teyvatEntities)
        .where(inArray(teyvatEntities.slug, Array.from(artifactSlugs)));
      for (const row of rows) {
        if (row.kind === "reliquary") {
          const data = (row.data ?? {}) as Record<string, unknown>;
          const suit = (data.suit ?? {}) as Record<string, unknown>;
          artifactEntitiesMap.set(row.slug.toLowerCase(), {
            id: row.id,
            slug: row.slug,
            name: row.name,
            image: imageFromData(data),
            rarity: typeof data.rarity === "number" ? data.rarity : 5,
            bonus2pc: typeof suit["2"] === "string" ? suit["2"] : (typeof (suit["2"] as { en?: string })?.en === "string" ? (suit["2"] as { en: string }).en : null),
            bonus4pc: typeof suit["4"] === "string" ? suit["4"] : (typeof (suit["4"] as { en?: string })?.en === "string" ? (suit["4"] as { en: string }).en : null),
          });
        }
      }
    }

    const teammateEntitiesMap = new Map<string, { id: string; slug: string; name: string; image: string | null; rarity: number | null; element: string | null }>();
    if (teammateSlugs.size > 0) {
      const rows = await this.db
        .select()
        .from(teyvatEntities)
        .where(inArray(teyvatEntities.slug, Array.from(teammateSlugs)));
      for (const row of rows) {
        if (row.kind === "avatar") {
          const data = (row.data ?? {}) as Record<string, unknown>;
          const rarity = typeof data.rarity === "number" ? data.rarity : (typeof data.rankLevel === "number" ? data.rankLevel : 4);
          const element = typeof data.element === "string" ? data.element : (typeof data.elementText === "string" ? data.elementText : null);
          teammateEntitiesMap.set(row.slug.toLowerCase(), {
            id: row.id,
            slug: row.slug,
            name: row.name,
            image: imageFromData(data),
            rarity,
            element,
          });
        }
      }
    }

    // Hydrate builds
    return rawBuilds.map((build): HydratedCharacterBuild => {
      const hydratedWeapons: HydratedBuildWeapon[] = (build.weaponRecommendations ?? []).map((w) => ({
        ...w,
        entity: weaponEntitiesMap.get(w.weaponSlug.toLowerCase()) ?? null,
      }));

      const hydratedArtifacts: HydratedBuildArtifact[] = (build.artifactRecommendations ?? []).map((a) => ({
        rank: a.rank,
        notes: a.notes,
        sets: (a.sets ?? []).map((s) => ({
          artifactSlug: s.artifactSlug,
          pieces: s.pieces,
          entity: artifactEntitiesMap.get(s.artifactSlug.toLowerCase()) ?? null,
        })),
      }));

      const hydratedTeams: HydratedBuildTeam[] = (build.teamRecommendations ?? []).map((t) => ({
        name: t.name,
        description: t.description,
        members: (t.members ?? []).map((m) => ({
          characterSlug: m.characterSlug,
          role: m.role,
          alternatives: m.alternatives,
          entity: teammateEntitiesMap.get(m.characterSlug.toLowerCase()) ?? null,
        })),
      }));

      return {
        id: build.id,
        characterSlug: build.characterSlug,
        role: build.role,
        title: build.title,
        isPrimary: build.isPrimary,
        playstyle: build.playstyle,
        weapons: hydratedWeapons,
        artifacts: hydratedArtifacts,
        mainStats: build.mainStats ?? { sands: [], goblet: [], circlet: [] },
        substatPriority: build.substatPriority ?? [],
        statTargets: build.statTargets ?? {},
        talentPriority: build.talentPriority ?? [],
        teams: hydratedTeams,
        rotationGuide: build.rotationGuide ?? [],
        authorNotes: build.authorNotes,
        provenance: build.provenance ?? { source: "KeqingMains" },
        gameVersion: build.gameVersion,
      };
    });
  }
}

let cachedBuildQueries: TeyvatBuildQueries | undefined;

export function getTeyvatBuildQueries(): TeyvatBuildQueries {
  if (!cachedBuildQueries) {
    cachedBuildQueries = new TeyvatBuildQueries();
  }
  return cachedBuildQueries;
}
