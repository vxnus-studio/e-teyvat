"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Icon } from "./navigation";
import { Globe, Search, Sword, Users } from "lucide-react";
import { CharacterPortrait, WeaponPortrait } from "../database/banners/banner-visuals";

type ServerRegion = "asia" | "america" | "europe";

const SERVER_CONFIG: Record<ServerRegion, { label: string; offset: number; name: string }> = {
  asia: { label: "Asia (UTC+8)", offset: 8, name: "Asia / TW / HK / MO" },
  america: { label: "America (UTC-5)", offset: -5, name: "North America" },
  europe: { label: "Europe (UTC+1)", offset: 1, name: "Europe" },
};

function detectUserServer(): ServerRegion {
  if (typeof window === "undefined") return "asia";
  try {
    const offsetMins = new Date().getTimezoneOffset();
    if (offsetMins >= 240) return "america";
    if (offsetMins >= -180 && offsetMins <= 60) return "europe";
    return "asia";
  } catch {
    return "asia";
  }
}

function calculateServerDay(server: ServerRegion): { dayOfWeek: number; countdown: string } {
  const offset = SERVER_CONFIG[server].offset;
  const now = new Date();
  const serverTimeMs = now.getTime() + offset * 3600 * 1000;
  const serverDate = new Date(serverTimeMs);

  // Effective day flips at 4 AM server time
  const effectiveMs = serverTimeMs - 4 * 3600 * 1000;
  const effectiveDate = new Date(effectiveMs);
  const dayOfWeek = effectiveDate.getUTCDay();

  // Countdown to next 4 AM
  const hours = serverDate.getUTCHours();
  const minutes = serverDate.getUTCMinutes();
  const seconds = serverDate.getUTCSeconds();

  let diffSecs = (4 - hours) * 3600 - minutes * 60 - seconds;
  if (diffSecs <= 0) {
    diffSecs += 24 * 3600;
  }

  const hh = String(Math.floor(diffSecs / 3600)).padStart(2, "0");
  const mm = String(Math.floor((diffSecs % 3600) / 60)).padStart(2, "0");
  const ss = String(diffSecs % 60).padStart(2, "0");

  return { dayOfWeek, countdown: `${hh}:${mm}:${ss}` };
}

export interface FarmableCharacter {
  name: string;
  slug: string;
  element: "Pyro" | "Hydro" | "Anemo" | "Electro" | "Dendro" | "Cryo" | "Geo";
  rarity: 4 | 5;
  talentBook: string;
  nation: string;
}

export interface FarmableWeapon {
  name: string;
  slug: string;
  type: "Sword" | "Claymore" | "Polearm" | "Bow" | "Catalyst";
  rarity: 4 | 5;
  material: string;
  nation: string;
}

// 1. Monday & Thursday Data
const CHARS_MON_THU: FarmableCharacter[] = [
  { name: "Klee", slug: "klee", element: "Pyro", rarity: 5, talentBook: "Freedom", nation: "Mondstadt" },
  { name: "Tartaglia", slug: "tartaglia", element: "Hydro", rarity: 5, talentBook: "Freedom", nation: "Mondstadt" },
  { name: "Diona", slug: "diona", element: "Cryo", rarity: 4, talentBook: "Freedom", nation: "Mondstadt" },
  { name: "Sucrose", slug: "sucrose", element: "Anemo", rarity: 4, talentBook: "Freedom", nation: "Mondstadt" },
  { name: "Barbara", slug: "barbara", element: "Hydro", rarity: 4, talentBook: "Freedom", nation: "Mondstadt" },
  { name: "Amber", slug: "amber", element: "Pyro", rarity: 4, talentBook: "Freedom", nation: "Mondstadt" },
  { name: "Aloy", slug: "aloy", element: "Cryo", rarity: 5, talentBook: "Freedom", nation: "Mondstadt" },

  { name: "Keqing", slug: "keqing", element: "Electro", rarity: 5, talentBook: "Prosperity", nation: "Liyue" },
  { name: "Xiao", slug: "xiao", element: "Anemo", rarity: 5, talentBook: "Prosperity", nation: "Liyue" },
  { name: "Ningguang", slug: "ningguang", element: "Geo", rarity: 4, talentBook: "Prosperity", nation: "Liyue" },
  { name: "Qiqi", slug: "qiqi", element: "Cryo", rarity: 5, talentBook: "Prosperity", nation: "Liyue" },
  { name: "Shenhe", slug: "shenhe", element: "Cryo", rarity: 5, talentBook: "Prosperity", nation: "Liyue" },
  { name: "Yelan", slug: "yelan", element: "Hydro", rarity: 5, talentBook: "Prosperity", nation: "Liyue" },

  { name: "Yoimiya", slug: "yoimiya", element: "Pyro", rarity: 5, talentBook: "Transience", nation: "Inazuma" },
  { name: "Sangonomiya Kokomi", slug: "sangonomiya-kokomi", element: "Hydro", rarity: 5, talentBook: "Transience", nation: "Inazuma" },
  { name: "Thoma", slug: "thoma", element: "Pyro", rarity: 4, talentBook: "Transience", nation: "Inazuma" },
  { name: "Shikanoin Heizou", slug: "shikanoin-heizou", element: "Anemo", rarity: 4, talentBook: "Transience", nation: "Inazuma" },
  { name: "Kirara", slug: "kirara", element: "Dendro", rarity: 4, talentBook: "Transience", nation: "Inazuma" },

  { name: "Tighnari", slug: "tighnari", element: "Dendro", rarity: 5, talentBook: "Admonition", nation: "Sumeru" },
  { name: "Cyno", slug: "cyno", element: "Electro", rarity: 5, talentBook: "Admonition", nation: "Sumeru" },
  { name: "Candace", slug: "candace", element: "Hydro", rarity: 4, talentBook: "Admonition", nation: "Sumeru" },
  { name: "Faruzan", slug: "faruzan", element: "Anemo", rarity: 4, talentBook: "Admonition", nation: "Sumeru" },

  { name: "Lyney", slug: "lyney", element: "Pyro", rarity: 5, talentBook: "Equity", nation: "Fontaine" },
  { name: "Neuvillette", slug: "neuvillette", element: "Hydro", rarity: 5, talentBook: "Equity", nation: "Fontaine" },
  { name: "Navia", slug: "navia", element: "Geo", rarity: 5, talentBook: "Equity", nation: "Fontaine" },
  { name: "Chevreuse", slug: "chevreuse", element: "Pyro", rarity: 4, talentBook: "Equity", nation: "Fontaine" },

  { name: "Kinich", slug: "kinich", element: "Dendro", rarity: 5, talentBook: "Contention", nation: "Natlan" },
  { name: "Kachina", slug: "kachina", element: "Geo", rarity: 4, talentBook: "Contention", nation: "Natlan" },
  { name: "Iansan", slug: "iansan", element: "Electro", rarity: 4, talentBook: "Contention", nation: "Natlan" },
];

const WEAPONS_MON_THU: FarmableWeapon[] = [
  { name: "Aquila Favonia", slug: "aquila-favonia", type: "Sword", rarity: 5, material: "Decarabian", nation: "Mondstadt" },
  { name: "The Stringless", slug: "the-stringless", type: "Bow", rarity: 4, material: "Decarabian", nation: "Mondstadt" },
  { name: "Favonius Codex", slug: "favonius-codex", type: "Catalyst", rarity: 4, material: "Decarabian", nation: "Mondstadt" },
  { name: "Cinnabar Spindle", slug: "cinnabar-spindle", type: "Sword", rarity: 4, material: "Decarabian", nation: "Mondstadt" },

  { name: "Primordial Jade Cutter", slug: "primordial-jade-cutter", type: "Sword", rarity: 5, material: "Guyun", nation: "Liyue" },
  { name: "Rust", slug: "rust", type: "Bow", rarity: 4, material: "Guyun", nation: "Liyue" },
  { name: "Whiteblind", slug: "whiteblind", type: "Claymore", rarity: 4, material: "Guyun", nation: "Liyue" },
  { name: "Blackcliff Pole", slug: "blackcliff-pole", type: "Polearm", rarity: 4, material: "Guyun", nation: "Liyue" },

  { name: "Mistsplitter Reforged", slug: "mistsplitter-reforged", type: "Sword", rarity: 5, material: "Distant Sea", nation: "Inazuma" },
  { name: "Hakushin Ring", slug: "hakushin-ring", type: "Catalyst", rarity: 4, material: "Distant Sea", nation: "Inazuma" },
  { name: "Akuoumaru", slug: "akuoumaru", type: "Claymore", rarity: 4, material: "Distant Sea", nation: "Inazuma" },
  { name: "Amenoma Kageuchi", slug: "amenoma-kageuchi", type: "Sword", rarity: 4, material: "Distant Sea", nation: "Inazuma" },

  { name: "Hunter's Path", slug: "hunters-path", type: "Bow", rarity: 5, material: "Forest Dew", nation: "Sumeru" },
  { name: "A Thousand Floating Dreams", slug: "a-thousand-floating-dreams", type: "Catalyst", rarity: 5, material: "Forest Dew", nation: "Sumeru" },
  { name: "Sapwood Blade", slug: "sapwood-blade", type: "Sword", rarity: 4, material: "Forest Dew", nation: "Sumeru" },
  { name: "Moonpiercer", slug: "moonpiercer", type: "Polearm", rarity: 4, material: "Forest Dew", nation: "Sumeru" },

  { name: "The First Great Magic", slug: "the-first-great-magic", type: "Bow", rarity: 5, material: "Sacred Dewdrop", nation: "Fontaine" },
  { name: "Splendor of Tranquil Waters", slug: "splendor-of-tranquil-waters", type: "Sword", rarity: 5, material: "Sacred Dewdrop", nation: "Fontaine" },
  { name: "Finale of the Deep", slug: "finale-of-the-deep", type: "Sword", rarity: 4, material: "Sacred Dewdrop", nation: "Fontaine" },
  { name: "Tidal Shadow", slug: "tidal-shadow", type: "Claymore", rarity: 4, material: "Sacred Dewdrop", nation: "Fontaine" },

  { name: "Fang of the Mountain King", slug: "fang-of-the-mountain-king", type: "Claymore", rarity: 5, material: "Blazing Heart", nation: "Natlan" },
  { name: "Earth Shaker", slug: "earth-shaker", type: "Claymore", rarity: 4, material: "Blazing Heart", nation: "Natlan" },
  { name: "Footprint of the Rainbow", slug: "footprint-of-the-rainbow", type: "Polearm", rarity: 4, material: "Blazing Heart", nation: "Natlan" },
  { name: "Ring of Yaxche", slug: "ring-of-yaxche", type: "Catalyst", rarity: 4, material: "Blazing Heart", nation: "Natlan" },
];

// 2. Tuesday & Friday Data
const CHARS_TUE_FRI: FarmableCharacter[] = [
  { name: "Jean", slug: "jean", element: "Anemo", rarity: 5, talentBook: "Resistance", nation: "Mondstadt" },
  { name: "Diluc", slug: "diluc", element: "Pyro", rarity: 5, talentBook: "Resistance", nation: "Mondstadt" },
  { name: "Mona", slug: "mona", element: "Hydro", rarity: 5, talentBook: "Resistance", nation: "Mondstadt" },
  { name: "Bennett", slug: "bennett", element: "Pyro", rarity: 4, talentBook: "Resistance", nation: "Mondstadt" },
  { name: "Noelle", slug: "noelle", element: "Geo", rarity: 4, talentBook: "Resistance", nation: "Mondstadt" },
  { name: "Razor", slug: "razor", element: "Electro", rarity: 4, talentBook: "Resistance", nation: "Mondstadt" },
  { name: "Eula", slug: "eula", element: "Cryo", rarity: 5, talentBook: "Resistance", nation: "Mondstadt" },

  { name: "Ganyu", slug: "ganyu", element: "Cryo", rarity: 5, talentBook: "Diligence", nation: "Liyue" },
  { name: "Hu Tao", slug: "hu-tao", element: "Pyro", rarity: 5, talentBook: "Diligence", nation: "Liyue" },
  { name: "Kaedehara Kazuha", slug: "kaedehara-kazuha", element: "Anemo", rarity: 5, talentBook: "Diligence", nation: "Liyue" },
  { name: "Xiangling", slug: "xiangling", element: "Pyro", rarity: 4, talentBook: "Diligence", nation: "Liyue" },
  { name: "Chongyun", slug: "chongyun", element: "Cryo", rarity: 4, talentBook: "Diligence", nation: "Liyue" },
  { name: "Yun Jin", slug: "yun-jin", element: "Geo", rarity: 4, talentBook: "Diligence", nation: "Liyue" },
  { name: "Yaoyao", slug: "yaoyao", element: "Dendro", rarity: 4, talentBook: "Diligence", nation: "Liyue" },

  { name: "Kamisato Ayaka", slug: "kamisato-ayaka", element: "Cryo", rarity: 5, talentBook: "Elegance", nation: "Inazuma" },
  { name: "Kamisato Ayato", slug: "kamisato-ayato", element: "Hydro", rarity: 5, talentBook: "Elegance", nation: "Inazuma" },
  { name: "Arataki Itto", slug: "arataki-itto", element: "Geo", rarity: 5, talentBook: "Elegance", nation: "Inazuma" },
  { name: "Kujou Sara", slug: "kujou-sara", element: "Electro", rarity: 4, talentBook: "Elegance", nation: "Inazuma" },
  { name: "Kuki Shinobu", slug: "kuki-shinobu", element: "Electro", rarity: 4, talentBook: "Elegance", nation: "Inazuma" },

  { name: "Nahida", slug: "nahida", element: "Dendro", rarity: 5, talentBook: "Ingenuity", nation: "Sumeru" },
  { name: "Alhaitham", slug: "alhaitham", element: "Dendro", rarity: 5, talentBook: "Ingenuity", nation: "Sumeru" },
  { name: "Layla", slug: "layla", element: "Cryo", rarity: 4, talentBook: "Ingenuity", nation: "Sumeru" },
  { name: "Dori", slug: "dori", element: "Electro", rarity: 4, talentBook: "Ingenuity", nation: "Sumeru" },
  { name: "Kaveh", slug: "kaveh", element: "Dendro", rarity: 4, talentBook: "Ingenuity", nation: "Sumeru" },

  { name: "Furina", slug: "furina", element: "Hydro", rarity: 5, talentBook: "Justice", nation: "Fontaine" },
  { name: "Clorinde", slug: "clorinde", element: "Electro", rarity: 5, talentBook: "Justice", nation: "Fontaine" },
  { name: "Sigewinne", slug: "sigewinne", element: "Hydro", rarity: 5, talentBook: "Justice", nation: "Fontaine" },
  { name: "Charlotte", slug: "charlotte", element: "Cryo", rarity: 4, talentBook: "Justice", nation: "Fontaine" },

  { name: "Ororon", slug: "ororon", element: "Electro", rarity: 4, talentBook: "Kindling", nation: "Natlan" },
  { name: "Citlali", slug: "citlali", element: "Cryo", rarity: 5, talentBook: "Kindling", nation: "Natlan" },
  { name: "Mavuika", slug: "mavuika", element: "Pyro", rarity: 5, talentBook: "Kindling", nation: "Natlan" },
  { name: "Xbalanque", slug: "xbalanque", element: "Pyro", rarity: 5, talentBook: "Kindling", nation: "Natlan" },
];

const WEAPONS_TUE_FRI: FarmableWeapon[] = [
  { name: "Skyward Harp", slug: "skyward-harp", type: "Bow", rarity: 5, material: "Boreal Wolf", nation: "Mondstadt" },
  { name: "The Flute", slug: "the-flute", type: "Sword", rarity: 4, material: "Boreal Wolf", nation: "Mondstadt" },
  { name: "The Widsith", slug: "the-widsith", type: "Catalyst", rarity: 4, material: "Boreal Wolf", nation: "Mondstadt" },
  { name: "Dragonspine Spear", slug: "dragonspine-spear", type: "Polearm", rarity: 4, material: "Boreal Wolf", nation: "Mondstadt" },

  { name: "Primordial Jade Winged-Spear", slug: "primordial-jade-winged-spear", type: "Polearm", rarity: 5, material: "Mist Veiled", nation: "Liyue" },
  { name: "The Black Sword", slug: "the-black-sword", type: "Sword", rarity: 4, material: "Mist Veiled", nation: "Liyue" },
  { name: "Prototype Crescent", slug: "prototype-crescent", type: "Bow", rarity: 4, material: "Mist Veiled", nation: "Liyue" },
  { name: "Dragon's Bane", slug: "dragons-bane", type: "Polearm", rarity: 4, material: "Mist Veiled", nation: "Liyue" },

  { name: "Thundering Pulse", slug: "thundering-pulse", type: "Bow", rarity: 5, material: "Narukami", nation: "Inazuma" },
  { name: "Redhorn Stonethresher", slug: "redhorn-stonethresher", type: "Claymore", rarity: 5, material: "Narukami", nation: "Inazuma" },
  { name: "Wavebreaker's Fin", slug: "wavebreakers-fin", type: "Polearm", rarity: 4, material: "Narukami", nation: "Inazuma" },
  { name: "Katsuragikiri Nagamasa", slug: "katsuragikiri-nagamasa", type: "Claymore", rarity: 4, material: "Narukami", nation: "Inazuma" },

  { name: "Key of Khaj-Nisut", slug: "key-of-khaj-nisut", type: "Sword", rarity: 5, material: "Oasis Garden", nation: "Sumeru" },
  { name: "Xiphos' Moonlight", slug: "xiphos-moonlight", type: "Sword", rarity: 4, material: "Oasis Garden", nation: "Sumeru" },
  { name: "Wandering Evenstar", slug: "wandering-evenstar", type: "Catalyst", rarity: 4, material: "Oasis Garden", nation: "Sumeru" },
  { name: "Fruit of Fulfillment", slug: "fruit-of-fulfillment", type: "Catalyst", rarity: 4, material: "Oasis Garden", nation: "Sumeru" },

  { name: "Absolution", slug: "absolution", type: "Sword", rarity: 5, material: "Ancient Chord", nation: "Fontaine" },
  { name: "Tome of the Eternal Flow", slug: "tome-of-the-eternal-flow", type: "Catalyst", rarity: 5, material: "Ancient Chord", nation: "Fontaine" },
  { name: "Flowing Purity", slug: "flowing-purity", type: "Catalyst", rarity: 4, material: "Ancient Chord", nation: "Fontaine" },
  { name: "Dialogues of the Desert Sages", slug: "dialogues-of-the-desert-sages", type: "Polearm", rarity: 4, material: "Ancient Chord", nation: "Fontaine" },

  { name: "Astral Vulture's Crimson Plumage", slug: "astral-vultures-crimson-plumage", type: "Bow", rarity: 5, material: "Delirious Decadence", nation: "Natlan" },
  { name: "Starcaller's Watch", slug: "starcallers-watch", type: "Catalyst", rarity: 5, material: "Delirious Decadence", nation: "Natlan" },
  { name: "Mountain-Bracing Bolt", slug: "mountain-bracing-bolt", type: "Polearm", rarity: 4, material: "Delirious Decadence", nation: "Natlan" },
  { name: "Chain Breaker", slug: "chain-breaker", type: "Bow", rarity: 4, material: "Delirious Decadence", nation: "Natlan" },
];

// 3. Wednesday & Saturday Data
const CHARS_WED_SAT: FarmableCharacter[] = [
  { name: "Venti", slug: "venti", element: "Anemo", rarity: 5, talentBook: "Ballad", nation: "Mondstadt" },
  { name: "Albedo", slug: "albedo", element: "Geo", rarity: 5, talentBook: "Ballad", nation: "Mondstadt" },
  { name: "Fischl", slug: "fischl", element: "Electro", rarity: 4, talentBook: "Ballad", nation: "Mondstadt" },
  { name: "Rosaria", slug: "rosaria", element: "Cryo", rarity: 4, talentBook: "Ballad", nation: "Mondstadt" },
  { name: "Kaeya", slug: "kaeya", element: "Cryo", rarity: 4, talentBook: "Ballad", nation: "Mondstadt" },
  { name: "Lisa", slug: "lisa", element: "Electro", rarity: 4, talentBook: "Ballad", nation: "Mondstadt" },
  { name: "Mika", slug: "mika", element: "Cryo", rarity: 4, talentBook: "Ballad", nation: "Mondstadt" },

  { name: "Zhongli", slug: "zhongli", element: "Geo", rarity: 5, talentBook: "Gold", nation: "Liyue" },
  { name: "Baizhu", slug: "baizhu", element: "Dendro", rarity: 5, talentBook: "Gold", nation: "Liyue" },
  { name: "Xingqiu", slug: "xingqiu", element: "Hydro", rarity: 4, talentBook: "Gold", nation: "Liyue" },
  { name: "Beidou", slug: "beidou", element: "Electro", rarity: 4, talentBook: "Gold", nation: "Liyue" },
  { name: "Yanfei", slug: "yanfei", element: "Pyro", rarity: 4, talentBook: "Gold", nation: "Liyue" },
  { name: "Gaming", slug: "gaming", element: "Pyro", rarity: 4, talentBook: "Gold", nation: "Liyue" },

  { name: "Raiden Shogun", slug: "raiden-shogun", element: "Electro", rarity: 5, talentBook: "Light", nation: "Inazuma" },
  { name: "Yae Miko", slug: "yae-miko", element: "Electro", rarity: 5, talentBook: "Light", nation: "Inazuma" },
  { name: "Gorou", slug: "gorou", element: "Geo", rarity: 4, talentBook: "Light", nation: "Inazuma" },
  { name: "Sayu", slug: "sayu", element: "Anemo", rarity: 4, talentBook: "Light", nation: "Inazuma" },

  { name: "Nilou", slug: "nilou", element: "Hydro", rarity: 5, talentBook: "Praxis", nation: "Sumeru" },
  { name: "Wanderer", slug: "wanderer", element: "Anemo", rarity: 5, talentBook: "Praxis", nation: "Sumeru" },
  { name: "Dehya", slug: "dehya", element: "Pyro", rarity: 5, talentBook: "Praxis", nation: "Sumeru" },
  { name: "Collei", slug: "collei", element: "Dendro", rarity: 4, talentBook: "Praxis", nation: "Sumeru" },
  { name: "Sethos", slug: "sethos", element: "Electro", rarity: 4, talentBook: "Praxis", nation: "Sumeru" },

  { name: "Wriothesley", slug: "wriothesley", element: "Cryo", rarity: 5, talentBook: "Order", nation: "Fontaine" },
  { name: "Emilie", slug: "emilie", element: "Dendro", rarity: 5, talentBook: "Order", nation: "Fontaine" },
  { name: "Arlecchino", slug: "arlecchino", element: "Pyro", rarity: 5, talentBook: "Order", nation: "Fontaine" },
  { name: "Lynette", slug: "lynette", element: "Anemo", rarity: 4, talentBook: "Order", nation: "Fontaine" },
  { name: "Chiori", slug: "chiori", element: "Geo", rarity: 5, talentBook: "Order", nation: "Fontaine" },

  { name: "Mualani", slug: "mualani", element: "Hydro", rarity: 5, talentBook: "Conflict", nation: "Natlan" },
  { name: "Xilonen", slug: "xilonen", element: "Geo", rarity: 5, talentBook: "Conflict", nation: "Natlan" },
  { name: "Chasca", slug: "chasca", element: "Anemo", rarity: 5, talentBook: "Conflict", nation: "Natlan" },
  { name: "Odette", slug: "odette", element: "Cryo", rarity: 5, talentBook: "Conflict", nation: "Natlan" },
];

const WEAPONS_WED_SAT: FarmableWeapon[] = [
  { name: "Amos' Bow", slug: "amos-bow", type: "Bow", rarity: 5, material: "Dandelion Gladiator", nation: "Mondstadt" },
  { name: "Wolf's Gravestone", slug: "wolfs-gravestone", type: "Claymore", rarity: 5, material: "Dandelion Gladiator", nation: "Mondstadt" },
  { name: "Favonius Sword", slug: "favonius-sword", type: "Sword", rarity: 4, material: "Dandelion Gladiator", nation: "Mondstadt" },
  { name: "Sacrificial Bow", slug: "sacrificial-bow", type: "Bow", rarity: 4, material: "Dandelion Gladiator", nation: "Mondstadt" },

  { name: "Memory of Dust", slug: "memory-of-dust", type: "Catalyst", rarity: 5, material: "Aerosiderite", nation: "Liyue" },
  { name: "Vortex Vanquisher", slug: "vortex-vanquisher", type: "Polearm", rarity: 5, material: "Aerosiderite", nation: "Liyue" },
  { name: "Prototype Archaic", slug: "prototype-archaic", type: "Claymore", rarity: 4, material: "Aerosiderite", nation: "Liyue" },
  { name: "Iron Sting", slug: "iron-sting", type: "Sword", rarity: 4, material: "Aerosiderite", nation: "Liyue" },

  { name: "Engulfing Lightning", slug: "engulfing-lightning", type: "Polearm", rarity: 5, material: "Mask of Wicked Lieutenant", nation: "Inazuma" },
  { name: "Haran Geppaku Futsu", slug: "haran-geppaku-futsu", type: "Sword", rarity: 5, material: "Mask of Wicked Lieutenant", nation: "Inazuma" },
  { name: "Kagura's Verity", slug: "kaguras-verity", type: "Catalyst", rarity: 5, material: "Mask of Wicked Lieutenant", nation: "Inazuma" },
  { name: "The Catch", slug: "the-catch", type: "Polearm", rarity: 4, material: "Mask of Wicked Lieutenant", nation: "Inazuma" },

  { name: "Light of Foliar Incision", slug: "light-of-foliar-incision", type: "Sword", rarity: 5, material: "Scorching Might", nation: "Sumeru" },
  { name: "Tulaytullah's Remembrance", slug: "tulaytullahs-remembrance", type: "Catalyst", rarity: 5, material: "Scorching Might", nation: "Sumeru" },
  { name: "Beacon of the Reed Sea", slug: "beacon-of-the-reed-sea", type: "Claymore", rarity: 5, material: "Scorching Might", nation: "Sumeru" },
  { name: "Toukabou Shigure", slug: "toukabou-shigure", type: "Sword", rarity: 4, material: "Scorching Might", nation: "Sumeru" },

  { name: "Cashflow Supervision", slug: "cashflow-supervision", type: "Catalyst", rarity: 5, material: "Pure Drop / Sublimated", nation: "Fontaine" },
  { name: "Crimson Moon's Semblance", slug: "crimson-moons-semblance", type: "Polearm", rarity: 5, material: "Pure Drop / Sublimated", nation: "Fontaine" },
  { name: "Rightful Reward", slug: "rightful-reward", type: "Polearm", rarity: 4, material: "Pure Drop / Sublimated", nation: "Fontaine" },
  { name: "Ultimate Overlord's Mega Magic Sword", slug: "ultimate-overlords-mega-magic-sword", type: "Claymore", rarity: 4, material: "Pure Drop / Sublimated", nation: "Fontaine" },

  { name: "Surf's Up", slug: "surfs-up", type: "Catalyst", rarity: 5, material: "Night-Wind's Mystic Essence", nation: "Natlan" },
  { name: "Peak Patrol Song", slug: "peak-patrol-song", type: "Sword", rarity: 5, material: "Night-Wind's Mystic Essence", nation: "Natlan" },
  { name: "Flute of Ezpitzal", slug: "flute-of-ezpitzal", type: "Sword", rarity: 4, material: "Night-Wind's Mystic Essence", nation: "Natlan" },
  { name: "Ash-Graven Drinking Horn", slug: "ash-graven-drinking-horn", type: "Catalyst", rarity: 4, material: "Night-Wind's Mystic Essence", nation: "Natlan" },
];

const ALL_CHARS = [...CHARS_MON_THU, ...CHARS_TUE_FRI, ...CHARS_WED_SAT];
const ALL_WEAPONS = [...WEAPONS_MON_THU, ...WEAPONS_TUE_FRI, ...WEAPONS_WED_SAT];

const DAY_DATA: Record<number, { dayName: string; chars: FarmableCharacter[]; weapons: FarmableWeapon[] }> = {
  0: { dayName: "Sunday", chars: ALL_CHARS, weapons: ALL_WEAPONS },
  1: { dayName: "Monday", chars: CHARS_MON_THU, weapons: WEAPONS_MON_THU },
  2: { dayName: "Tuesday", chars: CHARS_TUE_FRI, weapons: WEAPONS_TUE_FRI },
  3: { dayName: "Wednesday", chars: CHARS_WED_SAT, weapons: WEAPONS_WED_SAT },
  4: { dayName: "Thursday", chars: CHARS_MON_THU, weapons: WEAPONS_MON_THU },
  5: { dayName: "Friday", chars: CHARS_TUE_FRI, weapons: WEAPONS_TUE_FRI },
  6: { dayName: "Saturday", chars: CHARS_WED_SAT, weapons: WEAPONS_WED_SAT },
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const ELEMENT_COLORS: Record<string, string> = {
  Pyro: "bg-[#e25d43]/15 text-[#f08570] border-[#e25d43]/30",
  Hydro: "bg-[#4fc7f4]/15 text-[#72d6ff] border-[#4fc7f4]/30",
  Anemo: "bg-[#72e2c4]/15 text-[#8ef0d8] border-[#72e2c4]/30",
  Electro: "bg-[#b877f6]/15 text-[#cc9cff] border-[#b877f6]/30",
  Dendro: "bg-[#9fd943]/15 text-[#b9ee66] border-[#9fd943]/30",
  Cryo: "bg-[#99e8ff]/15 text-[#c2f2ff] border-[#99e8ff]/30",
  Geo: "bg-[#e3b552]/15 text-[#ffd77d] border-[#e3b552]/30",
};

export function HomeRotation() {
  const [server, setServer] = useState<ServerRegion>(() => detectUserServer());
  const [userSelectedDay, setUserSelectedDay] = useState<number | null>(null);
  const [activeServerDay, setActiveServerDay] = useState<number>(() => calculateServerDay(detectUserServer()).dayOfWeek);
  const [activeTab, setActiveTab] = useState<"characters" | "weapons">("characters");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [countdown, setCountdown] = useState<string>(() => calculateServerDay(detectUserServer()).countdown);

  const selectedDay = userSelectedDay ?? activeServerDay;

  useEffect(() => {
    const updateTime = () => {
      const { dayOfWeek, countdown: nextCountdown } = calculateServerDay(server);
      setActiveServerDay(dayOfWeek);
      setCountdown(nextCountdown);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [server]);

  const setSelectedDay = (day: number) => {
    setUserSelectedDay(day);
  };

  const currentData = DAY_DATA[selectedDay] ?? DAY_DATA[0];
  const isToday = selectedDay === activeServerDay;

  const filteredCharacters = useMemo(() => {
    if (!searchQuery.trim()) return currentData.chars;
    const q = searchQuery.toLowerCase().trim();
    return currentData.chars.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.element.toLowerCase().includes(q) ||
        c.talentBook.toLowerCase().includes(q) ||
        c.nation.toLowerCase().includes(q)
    );
  }, [currentData.chars, searchQuery]);

  const filteredWeapons = useMemo(() => {
    if (!searchQuery.trim()) return currentData.weapons;
    const q = searchQuery.toLowerCase().trim();
    return currentData.weapons.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.type.toLowerCase().includes(q) ||
        w.material.toLowerCase().includes(q) ||
        w.nation.toLowerCase().includes(q)
    );
  }, [currentData.weapons, searchQuery]);

  return (
    <>
      <section className="page-heading">
        <div>
          <h1>Home</h1>
          <p>Find what characters and weapons you can farm today.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Server Selector */}
          <div className="flex items-center gap-1 bg-[var(--surface-raised)] border border-white/5 rounded-lg p-1 text-xs">
            <Globe size={13} className="text-[var(--text-muted)] ml-1 mr-0.5" />
            {(["asia", "america", "europe"] as ServerRegion[]).map((region) => (
              <button
                key={region}
                onClick={() => setServer(region)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all cursor-pointer ${
                  server === region
                    ? "bg-[var(--accent)] text-[var(--surface-sunken)] font-bold shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-light)]"
                }`}
              >
                {region.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="server-time">
            <Icon name="clock" size={15} />
            <span>Reset in</span>
            <strong>{countdown}</strong>
          </div>
        </div>
      </section>

      <section className="rotation-section" id="rotation" aria-labelledby="rotation-title">
        {/* Section Header */}
        <div className="section-header flex-wrap gap-4 py-3">
          <div className="flex items-center gap-3">
            <span className="section-icon">
              <Icon name="calendar" />
            </span>
            <div>
              <h2 id="rotation-title">
                {isToday ? `What Can I Farm Today? (${currentData.dayName})` : `What Can I Farm on ${currentData.dayName}?`}
              </h2>
              <p>
                {SERVER_CONFIG[server].label} · {selectedDay === 0 ? "Sunday Free Choice: All materials open" : "Domains of Mastery & Forgery open"}
              </p>
            </div>
          </div>

          {/* Interactive Day Tabs */}
          <div className="flex items-center gap-1 bg-[var(--surface-sunken)] border border-white/5 rounded-lg p-1">
            {DAY_NAMES.map((dayLabel, dayIndex) => {
              const isSelected = selectedDay === dayIndex;
              const isServerToday = activeServerDay === dayIndex;

              return (
                <button
                  key={dayLabel}
                  onClick={() => {
                    setSelectedDay(dayIndex);
                    setSearchQuery("");
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition-all cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? "bg-[var(--accent)] text-[var(--surface-sunken)] font-bold shadow-[0_0_10px_rgba(98,213,163,0.3)]"
                      : isServerToday
                      ? "bg-white/10 text-[var(--accent)] font-semibold"
                      : "text-[var(--text-muted)] hover:text-[var(--text-light)]"
                  }`}
                >
                  <span>{dayLabel}</span>
                  {isServerToday && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? "bg-[var(--surface-sunken)]" : "bg-[var(--accent)]"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab & Search Filter Bar */}
        <div className="p-3.5 border-b border-white/5 bg-[var(--surface-raised)]/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("characters")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "characters"
                  ? "bg-[#6bc8d7] text-black shadow-[0_0_14px_rgba(107,200,215,0.3)]"
                  : "bg-[var(--surface-sunken)] text-[var(--text-muted)] hover:text-[var(--text-light)] border border-white/5"
              }`}
            >
              <Users size={14} />
              <span>Characters ({currentData.chars.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("weapons")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "weapons"
                  ? "bg-[#e2b96a] text-black shadow-[0_0_14px_rgba(226,185,106,0.3)]"
                  : "bg-[var(--surface-sunken)] text-[var(--text-muted)] hover:text-[var(--text-light)] border border-white/5"
              }`}
            >
              <Sword size={14} />
              <span>Weapons ({currentData.weapons.length})</span>
            </button>
          </div>

          <div className="relative min-w-[220px] max-w-xs flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder={activeTab === "characters" ? "Search character, element, book..." : "Search weapon, type, material..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--surface-sunken)] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-[var(--text-light)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>

        {/* Content Area: Direct Character Cards */}
        {activeTab === "characters" && (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredCharacters.map((char) => {
              const colorClass = ELEMENT_COLORS[char.element] || "bg-white/10 text-white border-white/20";

              return (
                <Link
                  href={`/characters/${char.slug}`}
                  key={char.name}
                  className="bg-[var(--surface-sunken)] border border-white/5 hover:border-[var(--accent)] rounded-xl p-2.5 flex flex-col items-center gap-2 transition-all hover:scale-[1.02] group"
                >
                  <div className="w-16 h-16 relative rounded-lg overflow-hidden bg-[var(--surface-raised)]">
                    <CharacterPortrait slug={char.slug} name={char.name} sizes="64px" />
                  </div>

                  <div className="text-center w-full min-w-0">
                    <div className="flex items-center justify-center gap-1">
                      <strong className="text-xs font-semibold text-[var(--text-light)] group-hover:text-[var(--accent)] truncate">
                        {char.name}
                      </strong>
                    </div>

                    <div className="flex items-center justify-center gap-1 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.2 rounded border font-mono ${colorClass}`}>
                        {char.element}
                      </span>
                      <span className="text-[10px] text-[var(--banner-gold)] font-mono">
                        {"✦".repeat(char.rarity)}
                      </span>
                    </div>

                    <span className="text-[10px] text-[#6bc8d7] block mt-1 font-medium truncate">
                      {char.talentBook} Series
                    </span>
                  </div>
                </Link>
              );
            })}

            {filteredCharacters.length === 0 && (
              <div className="col-span-full p-8 text-center text-xs text-[var(--text-muted)]">
                No farmable characters found matching &quot;{searchQuery}&quot;.
              </div>
            )}
          </div>
        )}

        {/* Content Area: Direct Weapon Cards */}
        {activeTab === "weapons" && (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredWeapons.map((weapon) => {
              return (
                <Link
                  href={`/database/weapons/${weapon.slug}`}
                  key={weapon.name}
                  className="bg-[var(--surface-sunken)] border border-white/5 hover:border-[#e2b96a] rounded-xl p-2.5 flex flex-col items-center gap-2 transition-all hover:scale-[1.02] group"
                >
                  <div className="w-16 h-16 relative rounded-lg overflow-hidden bg-[var(--surface-raised)] flex items-center justify-center p-1">
                    <WeaponPortrait slug={weapon.slug} name={weapon.name} sizes="64px" />
                  </div>

                  <div className="text-center w-full min-w-0">
                    <div className="flex items-center justify-center gap-1">
                      <strong className="text-xs font-semibold text-[var(--text-light)] group-hover:text-[#e2b96a] truncate" title={weapon.name}>
                        {weapon.name}
                      </strong>
                    </div>

                    <div className="flex items-center justify-center gap-1 mt-1">
                      <span className="text-[10px] px-1.5 py-0.2 rounded border font-mono bg-[#e2b96a]/15 text-[#ffd77d] border-[#e2b96a]/30">
                        {weapon.type}
                      </span>
                      <span className="text-[10px] text-[var(--banner-gold)] font-mono">
                        {"✦".repeat(weapon.rarity)}
                      </span>
                    </div>

                    <span className="text-[10px] text-[#e2b96a] block mt-1 font-medium truncate" title={weapon.material}>
                      {weapon.material}
                    </span>
                  </div>
                </Link>
              );
            })}

            {filteredWeapons.length === 0 && (
              <div className="col-span-full p-8 text-center text-xs text-[var(--text-muted)]">
                No farmable weapons found matching &quot;{searchQuery}&quot;.
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
}
