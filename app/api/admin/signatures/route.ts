import { type NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { verifyAdminSession } from "../../../../lib/auth/admin";
import { CHARACTER_SIGNATURE_WEAPONS } from "../../../../lib/teyvat/signatures";
import { getDatabase } from "../../../../db/client";
import { teyvatEntities } from "../../../../db/schema";

export async function GET(request: NextRequest) {
  const { authenticated } = await verifyAdminSession(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDatabase();

    const characters = await db
      .select({
        id: teyvatEntities.id,
        slug: teyvatEntities.slug,
        name: teyvatEntities.name,
        data: teyvatEntities.data,
      })
      .from(teyvatEntities)
      .where(eq(teyvatEntities.kind, "avatar"))
      .orderBy(asc(teyvatEntities.name));

    const weapons = await db
      .select({
        id: teyvatEntities.id,
        slug: teyvatEntities.slug,
        name: teyvatEntities.name,
        data: teyvatEntities.data,
      })
      .from(teyvatEntities)
      .where(eq(teyvatEntities.kind, "weapon"))
      .orderBy(asc(teyvatEntities.name));

    function getImage(data: Record<string, unknown> | null): string | null {
      if (!data) return null;
      const custom = data.custom_image_url || data.customImageUrl;
      if (typeof custom === "string") {
        if (custom.startsWith("http")) return custom;
        const cdn = process.env.NEXT_PUBLIC_CDN_URL || "https://cdn.e-teyvat.vxnus.xyz";
        return `${cdn}/${custom}`;
      }
      const icon = data.icon;
      if (typeof icon === "string") return `https://enka.network/ui/${icon}.png`;
      return null;
    }

    const weaponMap = new Map(
      weapons.map((w) => [
        w.slug.toLowerCase(),
        {
          id: w.id,
          slug: w.slug,
          name: w.name,
          image: getImage(w.data as Record<string, unknown>),
          rarity: (w.data as Record<string, unknown>)?.rarity || (w.data as Record<string, unknown>)?.rankLevel || 4,
          type: (w.data as Record<string, unknown>)?.weapon_type || (w.data as Record<string, unknown>)?.weaponType || "Sword",
        },
      ])
    );

    const characterList = characters.map((c) => {
      const charSlug = c.slug.toLowerCase();
      const sigWeaponSlug = CHARACTER_SIGNATURE_WEAPONS[charSlug] || null;
      const weaponObj = sigWeaponSlug ? weaponMap.get(sigWeaponSlug.toLowerCase()) || null : null;
      const data = (c.data || {}) as Record<string, unknown>;

      return {
        id: c.id,
        slug: c.slug,
        name: c.name,
        image: getImage(data),
        rarity: data.rarity || data.rankLevel || 4,
        element: data.element || data.elementText || "Anemo",
        weaponType: data.weapon_type || data.weaponType || "Sword",
        signatureWeapon: weaponObj
          ? {
              slug: weaponObj.slug,
              name: weaponObj.name,
              image: weaponObj.image,
              rarity: weaponObj.rarity,
            }
          : sigWeaponSlug
          ? { slug: sigWeaponSlug, name: sigWeaponSlug, image: null, rarity: 5 }
          : null,
      };
    });

    const simpleWeapons = weapons.map((w) => {
      const data = (w.data || {}) as Record<string, unknown>;
      return {
        id: w.id,
        slug: w.slug,
        name: w.name,
        image: getImage(data),
        rarity: data.rarity || data.rankLevel || 4,
        type: data.weapon_type || data.weaponType || "Sword",
      };
    });

    return NextResponse.json({
      characters: characterList,
      weapons: simpleWeapons,
      totalCount: characterList.length,
      matchedCount: characterList.filter((c) => c.signatureWeapon !== null).length,
    });
  } catch (err) {
    console.error("Signature GET error:", err);
    return NextResponse.json({ error: "Failed to load signature data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { authenticated } = await verifyAdminSession(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { characterSlug, weaponSlug } = await request.json();
    if (!characterSlug) {
      return NextResponse.json({ error: "Character slug is required" }, { status: 400 });
    }

    const cleanChar = characterSlug.toLowerCase().trim();
    const cleanWp = weaponSlug ? weaponSlug.toLowerCase().trim() : null;

    if (cleanWp) {
      CHARACTER_SIGNATURE_WEAPONS[cleanChar] = cleanWp;
    } else {
      delete CHARACTER_SIGNATURE_WEAPONS[cleanChar];
    }

    return NextResponse.json({
      success: true,
      characterSlug: cleanChar,
      signatureWeaponSlug: cleanWp,
    });
  } catch (err) {
    console.error("Signature update error:", err);
    return NextResponse.json({ error: "Failed to update signature weapon" }, { status: 500 });
  }
}
