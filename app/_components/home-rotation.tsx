"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Icon, type IconName } from "./navigation";
import { CalendarDays, ChevronDown, ChevronUp, Clock, Globe, Sparkles, Sword, Users, Shield } from "lucide-react";

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

interface NationDrop {
  nation: string;
  domainTalent: string;
  talentSeries: string;
  talentCharacters: string[];
  domainWeapon: string;
  weaponSeries: string;
  weaponItems: string[];
}

interface DaySchedule {
  dayName: string;
  weaponTitle: string;
  talentTitle: string;
  nations: NationDrop[];
}

const NATIONS_MON_THU: NationDrop[] = [
  {
    nation: "Mondstadt",
    domainTalent: "Forsaken Rift",
    talentSeries: "Freedom",
    talentCharacters: ["Klee", "Tartaglia", "Diona", "Sucrose", "Barbara", "Aloy"],
    domainWeapon: "Cecilia Garden",
    weaponSeries: "Decarabian",
    weaponItems: ["Aquila Favonia", "The Stringless", "Favonius Codex", "Cinnabar Spindle"],
  },
  {
    nation: "Liyue",
    domainTalent: "Taishan Mansion",
    talentSeries: "Prosperity",
    talentCharacters: ["Keqing", "Xiao", "Ningguang", "Qiqi", "Shenhe", "Yelan"],
    domainWeapon: "Hidden Palace of Lianshan",
    weaponSeries: "Guyun",
    weaponItems: ["Primordial Jade Cutter", "Rust", "Whiteblind", "Blackcliff Pole"],
  },
  {
    nation: "Inazuma",
    domainTalent: "Violet Court",
    talentSeries: "Transience",
    talentCharacters: ["Yoimiya", "Kokomi", "Thoma", "Shikanoin Heizou", "Kirara"],
    domainWeapon: "Court of Flowing Sand",
    weaponSeries: "Distant Sea",
    weaponItems: ["Mistsplitter Reforged", "Hakushin Ring", "Akuoumaru", "Oathsworn Eye"],
  },
  {
    nation: "Sumeru",
    domainTalent: "Steeple of Ignorance",
    talentSeries: "Admonition",
    talentCharacters: ["Tighnari", "Cyno", "Candace", "Faruzan"],
    domainWeapon: "Tower of Abject Pride",
    weaponSeries: "Forest Dew",
    weaponItems: ["Hunter's Path", "A Thousand Floating Dreams", "Sapwood Blade", "Moonpiercer"],
  },
  {
    nation: "Fontaine",
    domainTalent: "Pale Forgotten Glory",
    talentSeries: "Equity",
    talentCharacters: ["Lyney", "Neuvillette", "Navia", "Chevreuse"],
    domainWeapon: "Echoes of the Deep Tides",
    weaponSeries: "Sacred Dewdrop",
    weaponItems: ["The First Great Magic", "Splendor of Tranquil Waters", "Finale of the Deep"],
  },
  {
    nation: "Natlan",
    domainTalent: "Blazing Ruins",
    talentSeries: "Contention",
    talentCharacters: ["Kinich", "Kachina", "Iansan"],
    domainWeapon: "Ancient Lookout",
    weaponSeries: "Blazing Heart",
    weaponItems: ["Fang of the Mountain King", "Earth Shaker", "Footprint of the Rainbow"],
  },
];

const NATIONS_TUE_FRI: NationDrop[] = [
  {
    nation: "Mondstadt",
    domainTalent: "Forsaken Rift",
    talentSeries: "Resistance",
    talentCharacters: ["Jean", "Diluc", "Mona", "Bennett", "Noelle", "Razor", "Eula"],
    domainWeapon: "Cecilia Garden",
    weaponSeries: "Boreal Wolf",
    weaponItems: ["Skyward Harp", "The Flute", "The Widsith", "Dragonspine Spear"],
  },
  {
    nation: "Liyue",
    domainTalent: "Taishan Mansion",
    talentSeries: "Diligence",
    talentCharacters: ["Ganyu", "Hu Tao", "Kazuha", "Chongyun", "Xiangling", "Yun Jin"],
    domainWeapon: "Hidden Palace of Lianshan",
    weaponSeries: "Mist Veiled",
    weaponItems: ["Primordial Jade Winged-Spear", "The Black Sword", "Prototype Crescent", "Rainslasher"],
  },
  {
    nation: "Inazuma",
    domainTalent: "Violet Court",
    talentSeries: "Elegance",
    talentCharacters: ["Ayaka", "Ayato", "Sara", "Itto", "Kuki Shinobu"],
    domainWeapon: "Court of Flowing Sand",
    weaponSeries: "Narukami",
    weaponItems: ["Thundering Pulse", "Redhorn Stonethresher", "Wavebreaker's Fin", "Predator"],
  },
  {
    nation: "Sumeru",
    domainTalent: "Steeple of Ignorance",
    talentSeries: "Ingenuity",
    talentCharacters: ["Nahida", "Dori", "Layla", "Alhaitham", "Kaveh"],
    domainWeapon: "Tower of Abject Pride",
    weaponSeries: "Oasis Garden",
    weaponItems: ["Key of Khaj-Nisut", "Xiphos' Moonlight", "Wandering Evenstar", "Fruit of Fulfillment"],
  },
  {
    nation: "Fontaine",
    domainTalent: "Pale Forgotten Glory",
    talentSeries: "Justice",
    talentCharacters: ["Furina", "Charlotte", "Clorinde"],
    domainWeapon: "Echoes of the Deep Tides",
    weaponSeries: "Ancient Chord",
    weaponItems: ["Absolution", "Tome of the Eternal Flow", "Flowing Purity"],
  },
  {
    nation: "Natlan",
    domainTalent: "Blazing Ruins",
    talentSeries: "Kindling",
    talentCharacters: ["Ororon", "Citlali", "Xbalanque"],
    domainWeapon: "Ancient Lookout",
    weaponSeries: "Delirious Decadence",
    weaponItems: ["Astral Vulture's Crimson Plumage", "Starcaller's Watch", "Mountain-Bracing Bolt"],
  },
];

const NATIONS_WED_SAT: NationDrop[] = [
  {
    nation: "Mondstadt",
    domainTalent: "Forsaken Rift",
    talentSeries: "Ballad",
    talentCharacters: ["Venti", "Kaeya", "Albedo", "Rosaria", "Lisa", "Mika", "Fischl"],
    domainWeapon: "Cecilia Garden",
    weaponSeries: "Dandelion Gladiator",
    weaponItems: ["Amos' Bow", "Favonius Sword", "Wolf's Gravestone", "Sacrificial Bow"],
  },
  {
    nation: "Liyue",
    domainTalent: "Taishan Mansion",
    talentSeries: "Gold",
    talentCharacters: ["Zhongli", "Xingqiu", "Beidou", "Yanfei", "Baizhu", "Gaming"],
    domainWeapon: "Hidden Palace of Lianshan",
    weaponSeries: "Aerosiderite",
    weaponItems: ["Memory of Dust", "Vortex Vanquisher", "Prototype Archaic", "Iron Sting"],
  },
  {
    nation: "Inazuma",
    domainTalent: "Violet Court",
    talentSeries: "Light",
    talentCharacters: ["Raiden Shogun", "Yae Miko", "Gorou", "Sayu"],
    domainWeapon: "Court of Flowing Sand",
    weaponSeries: "Mask of the Wicked Lieutenant",
    weaponItems: ["Engulfing Lightning", "Haran Geppaku Futsu", "Hakushin Ring", "Kagura's Verity"],
  },
  {
    nation: "Sumeru",
    domainTalent: "Steeple of Ignorance",
    talentSeries: "Praxis",
    talentCharacters: ["Nilou", "Wanderer", "Dehya", "Collei", "Sethos"],
    domainWeapon: "Tower of Abject Pride",
    weaponSeries: "Scorching Might",
    weaponItems: ["Light of Foliar Incision", "Tulaytullah's Remembrance", "Toukabou Shigure", "Forest Sanctuary"],
  },
  {
    nation: "Fontaine",
    domainTalent: "Pale Forgotten Glory",
    talentSeries: "Order",
    talentCharacters: ["Wriothesley", "Lynette", "Emilie", "Arlecchino"],
    domainWeapon: "Echoes of the Deep Tides",
    weaponSeries: "Pure Drop / Sublimated",
    weaponItems: ["Cashflow Supervision", "Crimson Moon's Semblance", "Rightful Reward"],
  },
  {
    nation: "Natlan",
    domainTalent: "Blazing Ruins",
    talentSeries: "Conflict",
    talentCharacters: ["Mualani", "Xilonen", "Chasca", "Odette"],
    domainWeapon: "Ancient Lookout",
    weaponSeries: "Night-Wind's Mystic Essence",
    weaponItems: ["Surf's Up", "Peak Patrol Song", "Flute of Ezpitzal"],
  },
];

const SCHEDULES: Record<number, DaySchedule> = {
  0: {
    dayName: "Sunday",
    weaponTitle: "All Weapon Materials Available",
    talentTitle: "All Talent Teachings Available",
    nations: NATIONS_MON_THU.concat(NATIONS_TUE_FRI, NATIONS_WED_SAT),
  },
  1: {
    dayName: "Monday",
    weaponTitle: "Decarabian · Guyun · Distant Sea · Forest Dew · Sacred Dewdrop · Blazing Heart",
    talentTitle: "Freedom · Prosperity · Transience · Admonition · Equity · Contention",
    nations: NATIONS_MON_THU,
  },
  2: {
    dayName: "Tuesday",
    weaponTitle: "Boreal Wolf · Mist Veiled · Narukami · Oasis Garden · Ancient Chord · Delirious Decadence",
    talentTitle: "Resistance · Diligence · Elegance · Ingenuity · Justice · Kindling",
    nations: NATIONS_TUE_FRI,
  },
  3: {
    dayName: "Wednesday",
    weaponTitle: "Dandelion Gladiator · Aerosiderite · Mask · Scorching Might · Pure Drop · Night-Wind",
    talentTitle: "Ballad · Gold · Light · Praxis · Order · Conflict",
    nations: NATIONS_WED_SAT,
  },
  4: {
    dayName: "Thursday",
    weaponTitle: "Decarabian · Guyun · Distant Sea · Forest Dew · Sacred Dewdrop · Blazing Heart",
    talentTitle: "Freedom · Prosperity · Transience · Admonition · Equity · Contention",
    nations: NATIONS_MON_THU,
  },
  5: {
    dayName: "Friday",
    weaponTitle: "Boreal Wolf · Mist Veiled · Narukami · Oasis Garden · Ancient Chord · Delirious Decadence",
    talentTitle: "Resistance · Diligence · Elegance · Ingenuity · Justice · Kindling",
    nations: NATIONS_TUE_FRI,
  },
  6: {
    dayName: "Saturday",
    weaponTitle: "Dandelion Gladiator · Aerosiderite · Mask · Scorching Might · Pure Drop · Night-Wind",
    talentTitle: "Ballad · Gold · Light · Praxis · Order · Conflict",
    nations: NATIONS_WED_SAT,
  },
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function HomeRotation() {
  const [server, setServer] = useState<ServerRegion>("asia");
  const [activeServerDay, setActiveServerDay] = useState<number>(3);
  const [selectedDay, setSelectedDay] = useState<number>(3);
  const [countdown, setCountdown] = useState<string>("--:--:--");
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<"all" | "talents" | "weapons">("all");

  useEffect(() => {
    const detected = detectUserServer();
    setServer(detected);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const offset = SERVER_CONFIG[server].offset;
      const now = new Date();
      const serverTimeMs = now.getTime() + offset * 3600 * 1000;
      const serverDate = new Date(serverTimeMs);

      // Effective day flips at 4 AM server time
      const effectiveMs = serverTimeMs - 4 * 3600 * 1000;
      const effectiveDate = new Date(effectiveMs);
      const dayOfWeek = effectiveDate.getUTCDay();

      setActiveServerDay(dayOfWeek);

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

      setCountdown(`${hh}:${mm}:${ss}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [server]);

  // Keep selected day in sync with active server day on initial load
  useEffect(() => {
    setSelectedDay(activeServerDay);
  }, [activeServerDay]);

  const schedule = SCHEDULES[selectedDay] ?? SCHEDULES[0];
  const isToday = selectedDay === activeServerDay;

  return (
    <>
      <section className="page-heading">
        <div>
          <h1>Home</h1>
          <p>Daily domain drops, talent books, and server reset schedule.</p>
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
        <div className="section-header flex-wrap gap-3">
          <div>
            <span className="section-icon">
              <Icon name="calendar" />
            </span>
            <div>
              <h2 id="rotation-title">
                {isToday ? "Today's Rotation" : `${schedule.dayName}'s Rotation`}
              </h2>
              <p>
                {schedule.dayName} · {SERVER_CONFIG[server].label} · {selectedDay === 0 ? "All material domains open" : "Domains of Forgery & Mastery open"}
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
                  onClick={() => setSelectedDay(dayIndex)}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition-all cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? "bg-[var(--accent)] text-[var(--surface-sunken)] font-bold shadow-[0_0_10px_rgba(98,213,163,0.3)]"
                      : isServerToday
                      ? "bg-white/10 text-[var(--accent)] font-semibold"
                      : "text-[var(--text-muted)] hover:text-[var(--text-light)]"
                  }`}
                >
                  <span>{dayLabel}</span>
                  {isServerToday && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-[var(--surface-sunken)]" : "bg-[var(--accent)]"}`} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3 Main Summary Cards */}
        <div className="rotation-grid">
          {/* Weapon Materials */}
          <div
            onClick={() => {
              setIsExpanded(true);
              setFilterType("weapons");
            }}
            className="rotation-card gold group cursor-pointer"
          >
            <span className="rotation-icon">
              <Icon name="sword" />
            </span>
            <div>
              <span>Weapon Materials</span>
              <strong>{schedule.weaponTitle}</strong>
              <small>{selectedDay === 0 ? "Sunday Choice" : "6 Regional Weapon Domains"}</small>
            </div>
            <div className="drop-stack">
              {["1", "2", "3"].map((d) => (
                <i key={d}>✦</i>
              ))}
            </div>
            <Icon name="chevron" size={14} />
          </div>

          {/* Talent Books */}
          <div
            onClick={() => {
              setIsExpanded(true);
              setFilterType("talents");
            }}
            className="rotation-card cyan group cursor-pointer"
          >
            <span className="rotation-icon">
              <Icon name="users" />
            </span>
            <div>
              <span>Talent Books</span>
              <strong>{schedule.talentTitle}</strong>
              <small>{selectedDay === 0 ? "Sunday Choice" : "6 Regional Talent Domains"}</small>
            </div>
            <div className="drop-stack">
              {["1", "2", "3"].map((d) => (
                <i key={d}>✦</i>
              ))}
            </div>
            <Icon name="chevron" size={14} />
          </div>

          {/* Weekly Bosses */}
          <Link className="rotation-card violet group" href="/database/domains/">
            <span className="rotation-icon">
              <Icon name="enemy" />
            </span>
            <div>
              <span>Weekly Bosses</span>
              <strong>3 discounted claims</strong>
              <small>30 Resin each · Resets Monday</small>
            </div>
            <div className="drop-stack">
              {["W", "30", "3×"].map((drop) => (
                <i key={drop}>{drop}</i>
              ))}
            </div>
            <Icon name="chevron" size={14} />
          </Link>
        </div>

        {/* Toggle Detailed Breakdown Button */}
        <div className="border-t border-white/5 px-4 py-2.5 flex items-center justify-between bg-[var(--surface-raised)]/40">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-semibold text-[var(--accent)] hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <span>{isExpanded ? "Hide Full Drops & Character Matrix" : `View All ${schedule.dayName} Regional Drops & Benefiting Characters`}</span>
          </button>

          <Link href="/database/domains/" className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
            All Domains Index →
          </Link>
        </div>

        {/* Expandable Regional Drop Matrix */}
        {isExpanded && (
          <div className="p-4 border-t border-white/5 bg-[var(--surface-sunken)]/60">
            {/* Filter Toggle */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider">Filter:</span>
              <button
                onClick={() => setFilterType("all")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                  filterType === "all" ? "bg-[var(--accent)] text-[var(--surface-sunken)] font-bold" : "bg-[var(--surface-raised)] text-[var(--text-muted)]"
                }`}
              >
                All Drops
              </button>
              <button
                onClick={() => setFilterType("talents")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                  filterType === "talents" ? "bg-[#6bc8d7] text-black font-bold" : "bg-[var(--surface-raised)] text-[var(--text-muted)]"
                }`}
              >
                <Users size={12} /> Talent Books
              </button>
              <button
                onClick={() => setFilterType("weapons")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                  filterType === "weapons" ? "bg-[#e2b96a] text-black font-bold" : "bg-[var(--surface-raised)] text-[var(--text-muted)]"
                }`}
              >
                <Sword size={12} /> Weapon Materials
              </button>
            </div>

            {/* 6 Nations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {schedule.nations.map((nationItem) => (
                <div key={nationItem.nation} className="bg-[var(--surface-raised)] border border-white/5 rounded-xl p-3.5 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <strong className="text-sm font-semibold text-[var(--text-light)]">{nationItem.nation}</strong>
                    <span className="text-[10px] font-mono uppercase text-[var(--accent)] tracking-wider">Region</span>
                  </div>

                  {/* Talent Series */}
                  {(filterType === "all" || filterType === "talents") && (
                    <div className="flex flex-col gap-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-muted)] flex items-center gap-1">
                          <Users size={11} className="text-[#6bc8d7]" /> {nationItem.domainTalent}
                        </span>
                        <Link
                          href={`/database/materials?q=${encodeURIComponent(nationItem.talentSeries)}`}
                          className="font-bold text-[#6bc8d7] hover:underline"
                        >
                          {nationItem.talentSeries} Series →
                        </Link>
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] pl-4">
                        Used by: <span className="text-[var(--text-light)]">{nationItem.talentCharacters.slice(0, 4).join(", ")}{nationItem.talentCharacters.length > 4 ? "..." : ""}</span>
                      </div>
                    </div>
                  )}

                  {/* Weapon Series */}
                  {(filterType === "all" || filterType === "weapons") && (
                    <div className="flex flex-col gap-1 text-xs pt-1 border-t border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-muted)] flex items-center gap-1">
                          <Sword size={11} className="text-[#e2b96a]" /> {nationItem.domainWeapon}
                        </span>
                        <Link
                          href={`/database/materials?q=${encodeURIComponent(nationItem.weaponSeries)}`}
                          className="font-bold text-[#e2b96a] hover:underline"
                        >
                          {nationItem.weaponSeries} Series →
                        </Link>
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] pl-4">
                        Used by: <span className="text-[var(--text-light)]">{nationItem.weaponItems.slice(0, 3).join(", ")}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
