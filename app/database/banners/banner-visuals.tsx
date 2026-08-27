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

const avatarIconMap: Record<string, string> = {
  aino: "UI_AvatarIcon_Aino",
  albedo: "UI_AvatarIcon_Albedo",
  alhaitham: "UI_AvatarIcon_Alhatham",
  aloy: "UI_AvatarIcon_Aloy",
  alyosha: "UI_AvatarIcon_Alyosha",
  amber: "UI_AvatarIcon_Ambor",
  "arataki-itto": "UI_AvatarIcon_Itto",
  arlecchino: "UI_AvatarIcon_Arlecchino",
  baizhu: "UI_AvatarIcon_Baizhuer",
  barbara: "UI_AvatarIcon_Barbara",
  beidou: "UI_AvatarIcon_Beidou",
  bennett: "UI_AvatarIcon_Bennett",
  candace: "UI_AvatarIcon_Candace",
  charlotte: "UI_AvatarIcon_Charlotte",
  chasca: "UI_AvatarIcon_Chasca",
  chevreuse: "UI_AvatarIcon_Chevreuse",
  chiori: "UI_AvatarIcon_Chiori",
  chongyun: "UI_AvatarIcon_Chongyun",
  citlali: "UI_AvatarIcon_Citlali",
  clorinde: "UI_AvatarIcon_Clorinde",
  collei: "UI_AvatarIcon_Collei",
  cyno: "UI_AvatarIcon_Cyno",
  dehya: "UI_AvatarIcon_Dehya",
  diluc: "UI_AvatarIcon_Diluc",
  diona: "UI_AvatarIcon_Diona",
  dori: "UI_AvatarIcon_Dori",
  emilie: "UI_AvatarIcon_Emilie",
  eula: "UI_AvatarIcon_Eula",
  faruzan: "UI_AvatarIcon_Faruzan",
  fischl: "UI_AvatarIcon_Fischl",
  flins: "UI_AvatarIcon_Flins",
  freminet: "UI_AvatarIcon_Freminet",
  furina: "UI_AvatarIcon_Furina",
  gaming: "UI_AvatarIcon_Gaming",
  ganyu: "UI_AvatarIcon_Ganyu",
  gorou: "UI_AvatarIcon_Gorou",
  "hu-tao": "UI_AvatarIcon_Hutao",
  iansan: "UI_AvatarIcon_Iansan",
  jean: "UI_AvatarIcon_Qin",
  kachina: "UI_AvatarIcon_Kachina",
  "kaedehara-kazuha": "UI_AvatarIcon_Kazuha",
  kaeya: "UI_AvatarIcon_Kaeya",
  "kamisato-ayaka": "UI_AvatarIcon_Ayaka",
  "kamisato-ayato": "UI_AvatarIcon_Ayato",
  kaveh: "UI_AvatarIcon_Kaveh",
  keqing: "UI_AvatarIcon_Keqing",
  kinich: "UI_AvatarIcon_Kinich",
  kirara: "UI_AvatarIcon_Momoka",
  klee: "UI_AvatarIcon_Klee",
  "kujou-sara": "UI_AvatarIcon_Sara",
  "kuki-shinobu": "UI_AvatarIcon_Shinobu",
  layla: "UI_AvatarIcon_Layla",
  lisa: "UI_AvatarIcon_Lisa",
  lynette: "UI_AvatarIcon_Linette",
  lyney: "UI_AvatarIcon_Liney",
  mavuika: "UI_AvatarIcon_Mavuika",
  mika: "UI_AvatarIcon_Mika",
  mona: "UI_AvatarIcon_Mona",
  mualani: "UI_AvatarIcon_Mualani",
  nahida: "UI_AvatarIcon_Nahida",
  navia: "UI_AvatarIcon_Navia",
  neuvillette: "UI_AvatarIcon_Neuvillette",
  nilou: "UI_AvatarIcon_Nilou",
  ningguang: "UI_AvatarIcon_Ningguang",
  noelle: "UI_AvatarIcon_Noel",
  odette: "UI_AvatarIcon_Odette",
  ororon: "UI_AvatarIcon_Olorun",
  qiqi: "UI_AvatarIcon_Qiqi",
  "raiden-shogun": "UI_AvatarIcon_Shougun",
  razor: "UI_AvatarIcon_Razor",
  rosaria: "UI_AvatarIcon_Rosaria",
  "sangonomiya-kokomi": "UI_AvatarIcon_Kokomi",
  sayu: "UI_AvatarIcon_Sayu",
  sethos: "UI_AvatarIcon_Sethos",
  shenhe: "UI_AvatarIcon_Shenhe",
  "shikanoin-heizou": "UI_AvatarIcon_Heizo",
  sigewinne: "UI_AvatarIcon_Sigewinne",
  sucrose: "UI_AvatarIcon_Sucrose",
  tartaglia: "UI_AvatarIcon_Tartaglia",
  thoma: "UI_AvatarIcon_Tohma",
  tighnari: "UI_AvatarIcon_Tighnari",
  venti: "UI_AvatarIcon_Venti",
  wanderer: "UI_AvatarIcon_Wanderer",
  wriothesley: "UI_AvatarIcon_Wriothesley",
  xiangling: "UI_AvatarIcon_Xiangling",
  xiao: "UI_AvatarIcon_Xiao",
  xilonen: "UI_AvatarIcon_Xilonen",
  xingqiu: "UI_AvatarIcon_Xingqiu",
  xinyan: "UI_AvatarIcon_Xinyan",
  "yae-miko": "UI_AvatarIcon_Yae",
  yanfei: "UI_AvatarIcon_Feiyan",
  yaoyao: "UI_AvatarIcon_Yaoyao",
  yelan: "UI_AvatarIcon_Yelan",
  yoimiya: "UI_AvatarIcon_Yoimiya",
  "yun-jin": "UI_AvatarIcon_Yunjin",
  zhongli: "UI_AvatarIcon_Zhongli",
};

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

