import { NextResponse } from "next/server";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { aliases, entities, syncRuns } from "../../db/schema";
import { getDatabase } from "../../db/client";

export type CanonicalData = Record<string, unknown>;

export const DEMO_ENTITIES = [
  {
    id: 1,
    kind: "characters",
    slug: "furina",
    name: "Furina",
    description: "A Hydro sword character whose kit revolves around party HP changes.",
    gameVersion: "4.2",
    image: "/characters/furina.png",
  },
  {
    id: 2,
    kind: "weapons",
    slug: "splendor-of-tranquil-waters",
    name: "Splendor of Tranquil Waters",
    description: "A 5-star sword with CRIT DMG and HP-change synergies.",
    gameVersion: "4.2",
    image: null,
  },
  {
    id: 3,
    kind: "domains",
    slug: "echoes-of-the-deep-tides",
    name: "Echoes of the Deep Tides",
    description: "A Fontaine domain for weapon ascension materials.",
    gameVersion: "4.0",
    image: null,
  },
];

export const DEMO_FARMING = {
  target: {
    kind: "weapons",
    slug: "splendor-of-tranquil-waters",
    name: "Splendor of Tranquil Waters",
  },
  materials: [
    {
      name: "Pure Sacred Dewdrop series",
      quantities: { dross: 5, sublimation: 14, spring: 14, essence: 6 },
      sources: [
        {
          type: "domain",
          name: "Echoes of the Deep Tides",
          region: "Fontaine",
          availableDays: ["Tuesday", "Friday", "Sunday"],
        },
      ],
    },
    {
      name: "Tainted Water series",
      quantities: { drop: 23, scoop: 27, newborn: 41 },
      sources: [{ type: "enemy", name: "Tainted Hydro Phantasms" }],
    },
    {
      name: "Transoceanic series",
      quantities: { pearl: 15, chunk: 23, crystal: 27 },
      sources: [{ type: "enemy", name: "Fontemer Aberrants" }],
    },
  ],
  revision: "preview-data",
  preview: true,
};

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function boundedLimit(value: string | null, fallback = 24) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(50, parsed)) : fallback;
}

export function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function imageFromData(data: CanonicalData) {
  const images =
    data.images && typeof data.images === "object"
      ? (data.images as CanonicalData)
      : null;
  if (!images) return null;
  // Artifacts
  if (typeof images["filename_flower"] === "string") {
    return `https://enka.network/ui/${images["filename_flower"]}.png`;
  }
  if (typeof images["filename_circlet"] === "string") {
    return `https://enka.network/ui/${images["filename_circlet"]}.png`;
  }

  // Geographies (Regions)
  if (typeof images["filename_image"] === "string") {
    return `https://res.cloudinary.com/genshin/image/upload/sprites/${images["filename_image"]}.png`;
  }

  // Monsters
  if (
    typeof images["filename_icon"] === "string" &&
    (images["filename_icon"] as string).startsWith("UI_MonsterIcon")
  ) {
    return `https://res.cloudinary.com/genshin/image/upload/sprites/${images["filename_icon"]}.png`;
  }

  // Characters / Weapons / Items
  if (typeof images["filename_icon"] === "string") {
    return `https://enka.network/ui/${images["filename_icon"]}.png`;
  }

  for (const key of ["hoyowiki_icon", "mihoyo_icon", "nameicon", "namepic", "image", "icon"]) {
    if (typeof images[key] === "string" && (images[key] as string).startsWith("http")) return images[key] as string;
  }
  
  return null;
}

export function resolveImageUrl(customImageUrl: string | null, canonicalData: CanonicalData | null) {
  if (customImageUrl) {
    if (customImageUrl.startsWith("http")) return customImageUrl;
    const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || "https://cdn.eteyvat.krzgn.xyz";
    return `${cdnUrl}/${customImageUrl}`;
  }
  return canonicalData ? imageFromData(canonicalData) : null;
}

export async function activeRevision(database: ReturnType<typeof getDatabase>) {
  const [run] = await database
    .select()
    .from(syncRuns)
    .where(eq(syncRuns.status, "ready"))
    .orderBy(desc(syncRuns.completedAt))
    .limit(1);
  return run ?? null;
}

export async function resolveEntity(
  database: ReturnType<typeof getDatabase>,
  query: string,
) {
  const normalized = normalize(query);
  const [direct] = await database
    .select()
    .from(entities)
    .where(
      and(
        eq(entities.isActive, true),
        or(
          eq(entities.slug, query.toLowerCase()),
          ilike(entities.name, query),
          ilike(entities.name, `%${query}%`),
        ),
      ),
    )
    .limit(1);
  if (direct) return direct;

  const [alias] = await database
    .select({ entity: entities })
    .from(aliases)
    .innerJoin(entities, eq(aliases.entityId, entities.id))
    .where(
      and(
        eq(aliases.normalizedAlias, normalized),
        eq(entities.isActive, true),
      ),
    )
    .limit(1);
  return alias?.entity ?? null;
}
