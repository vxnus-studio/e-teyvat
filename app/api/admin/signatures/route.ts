import { type NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { verifyAdminSession } from "../../../../lib/auth/admin";
import { CHARACTER_SIGNATURE_WEAPONS, getSignatureWeaponSlug } from "../../../../lib/teyvat/signatures";
import { getDatabase } from "../../../../db/client";
import { teyvatEntities } from "../../../../db/schema";

function text(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object" && typeof (value as { en?: unknown }).en === "string") {
    const english = (value as { en: string }).en.trim();
    return english || null;
  }
  if (value && typeof value === "object" && typeof (value as { canonical?: unknown }).canonical === "string") {
    return (value as { canonical: string }).canonical.trim() || null;
  }
  return null;
}

function getImage(data: Record<string, unknown> | null): string | null {
  if (!data) return null;
  const custom = typeof data.custom_image_url === "string" ? data.custom_image_url : (typeof data.customImageUrl === "string" ? data.customImageUrl : null);
  if (custom) {
    if (custom.startsWith("http")) return custom;
    const cdn = process.env.NEXT_PUBLIC_CDN_URL || "https://cdn.e-teyvat.vxnus.xyz";
    return `${cdn}/${custom}`;
  }
  const icon = typeof data.icon === "string" ? data.icon : null;
  if (icon?.startsWith("http")) return icon;
  if (icon) return `https://enka.network/ui/${icon}.png`;
  const images = data.images && typeof data.images === "object" && !Array.isArray(data.images) ? (data.images as Record<string, unknown>) : null;
  const filename = images && Object.values(images).find((value) => typeof value === "string" && value.length > 0);
  return typeof filename === "string" ? `https://enka.network/ui/${filename}.png` : null;
}

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

    const weaponMap = new Map(
      weapons.map((w) => {
        const data = ((w.data && typeof w.data === "object") ? w.data : {}) as Record<string, unknown>;
        const typeRaw = text(data.weapon_type) ?? text(data.weaponType) ?? "Sword";
        const rarityRaw = typeof data.rarity === "number" ? data.rarity : (typeof data.rankLevel === "number" ? data.rankLevel : Number(data.rarity || data.rankLevel) || 4);

        return [
          (w.slug || "").toLowerCase(),
          {
            id: w.id,
            slug: w.slug,
            name: w.name || w.slug,
            image: getImage(data),
            rarity: rarityRaw,
            type: typeRaw,
          },
        ];
      })
    );

    const characterList = characters.map((c) => {
      const charSlug = (c.slug || "").toLowerCase();
      const data = ((c.data && typeof c.data === "object") ? c.data : {}) as Record<string, unknown>;
      
      const sigFromData = typeof data.signature_weapon_slug === "string" 
        ? data.signature_weapon_slug 
        : (typeof data.signatureWeaponSlug === "string" ? data.signatureWeaponSlug : null);

      const sigWeaponSlug = sigFromData || getSignatureWeaponSlug(charSlug);
      const weaponObj = sigWeaponSlug ? (weaponMap.get(sigWeaponSlug.toLowerCase()) || weaponMap.get(sigWeaponSlug.toLowerCase().replace(/_/g, "-"))) || null : null;

      const elementRaw = text(data.element) ?? text(data.elementText) ?? text(data.element_type) ?? "Anemo";
      const weaponTypeRaw = text(data.weapon_type) ?? text(data.weaponType) ?? "Sword";
      const rarityRaw = typeof data.rarity === "number" ? data.rarity : (typeof data.rankLevel === "number" ? data.rankLevel : Number(data.rarity || data.rankLevel) || 4);

      return {
        id: c.id,
        slug: c.slug,
        name: c.name || c.slug,
        image: getImage(data),
        rarity: rarityRaw,
        element: elementRaw,
        weaponType: weaponTypeRaw,
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
      const data = ((w.data && typeof w.data === "object") ? w.data : {}) as Record<string, unknown>;
      const typeRaw = text(data.weapon_type) ?? text(data.weaponType) ?? "Sword";
      const rarityRaw = typeof data.rarity === "number" ? data.rarity : (typeof data.rankLevel === "number" ? data.rankLevel : Number(data.rarity || data.rankLevel) || 4);

      return {
        id: w.id,
        slug: w.slug,
        name: w.name || w.slug,
        image: getImage(data),
        rarity: rarityRaw,
        type: typeRaw,
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
      CHARACTER_SIGNATURE_WEAPONS[cleanChar.replace(/_/g, "-")] = cleanWp;
    } else {
      delete CHARACTER_SIGNATURE_WEAPONS[cleanChar];
      delete CHARACTER_SIGNATURE_WEAPONS[cleanChar.replace(/_/g, "-")];
    }

    // Persist to database entity record if present
    try {
      const db = getDatabase();
      const [existingChar] = await db
        .select()
        .from(teyvatEntities)
        .where(eq(teyvatEntities.slug, cleanChar))
        .limit(1);

      if (existingChar) {
        const updatedData = {
          ...(existingChar.data as Record<string, unknown>),
          signature_weapon_slug: cleanWp,
          signatureWeaponSlug: cleanWp,
        };

        await db
          .update(teyvatEntities)
          .set({ data: updatedData })
          .where(eq(teyvatEntities.id, existingChar.id));
      }
    } catch (dbErr) {
      console.warn("Could not persist signature weapon to database directly:", dbErr);
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
