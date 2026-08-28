"use client";

import { useState } from "react";
import Image from "next/image";

const localCharacterImages: Record<string, string> = {
  alhaitham: "/characters/alhaitham.png",
  arlecchino: "/characters/arlecchino.png",
  furina: "/characters/furina.png",
  nahida: "/characters/nahida.png",
  neuvillette: "/characters/neuvillette.png",
};

import { avatarIconMap } from "./avatar-icons";
import { weaponIconMap } from "./weapon-icons";

const localWeaponImages: Record<string, string> = {
  "a-thousand-floating-dreams": "/weapons/floating-dreams.png",
  "light-of-foliar-incision": "/weapons/foliar-incision.png",
  "hunters-path": "/weapons/hunters-path.png",
  "hunter-s-path": "/weapons/hunters-path.png",
};

export function CharacterPortrait({
  slug,
  name,
  imageUrl,
  className = "",
  sizes = "180px",
}: {
  slug: string;
  name: string;
  imageUrl?: string | null;
  className?: string;
  sizes?: string;
}) {
  const [error, setError] = useState(false);
  const icon = avatarIconMap[slug.toLowerCase()] ?? avatarIconMap[name.toLowerCase().replace(/[^a-z0-9]/g, "-")];
  const cdnUrl = icon ? `https://enka.network/ui/${icon}.png` : null;
  const src = imageUrl || localCharacterImages[slug] || cdnUrl;

  return (
    <span className={`banner-character-art ${className}`}>
      {src && !error ? (
        <Image
          src={src}
          alt={`${name} character artwork`}
          fill
          sizes={sizes}
          onError={() => setError(true)}
        />
      ) : (
        <span className="banner-character-fallback" aria-hidden="true">
          {name.slice(0, 2).toUpperCase()}
        </span>
      )}
    </span>
  );
}

export function WeaponPortrait({
  slug,
  name,
  imageUrl,
  className = "",
  sizes = "180px",
}: {
  slug: string;
  name: string;
  imageUrl?: string | null;
  className?: string;
  sizes?: string;
}) {
  const [error, setError] = useState(false);
  const cleanSlug = slug.toLowerCase();
  const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
  const compactName = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const icon = weaponIconMap[cleanSlug] ?? weaponIconMap[cleanName] ?? weaponIconMap[compactName];
  const cdnUrl = icon ? `https://enka.network/ui/${icon}.png` : null;
  const src = imageUrl || localWeaponImages[cleanSlug] || cdnUrl;

  return (
    <span className={`banner-character-art ${className}`}>
      {src && !error ? (
        <Image
          src={src}
          alt={`${name} weapon artwork`}
          fill
          sizes={sizes}
          onError={() => setError(true)}
          className="object-contain"
        />
      ) : (
        <span className="banner-character-fallback" aria-hidden="true">
          {name.slice(0, 2).toUpperCase()}
        </span>
      )}
    </span>
  );
}

export function SignalGlyph({ value }: { value: number }) {
  return (
    <span className="signal-glyph" aria-hidden="true">
      {[18, 35, 52, 72, 100].map((threshold, index) => (
        <i className={value >= threshold ? "active" : ""} key={threshold} style={{ height: `${7 + index * 3}px` }} />
      ))}
    </span>
  );
}

