"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Icon } from "./navigation";
import { Globe, Search, Sword, Users, Loader2 } from "lucide-react";
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
  rarity: number;
  talentBook: string;
  nation: string;
}

export interface FarmableWeapon {
  name: string;
  slug: string;
  type: "Sword" | "Claymore" | "Polearm" | "Bow" | "Catalyst";
  rarity: number;
  material: string;
  nation: string;
}

export interface DayRotationData {
  dayName: string;
  chars: FarmableCharacter[];
  weapons: FarmableWeapon[];
}

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

  const [scheduleDays, setScheduleDays] = useState<Record<number, DayRotationData> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch daily rotation schedule directly from DB API
  useEffect(() => {
    let mounted = true;
    fetch("/api/farming/daily")
      .then((res) => res.json())
      .then((data) => {
        if (mounted && data?.days) {
          setScheduleDays(data.days);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load daily rotation schedule from API:", err);
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

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

  const defaultDayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][selectedDay];
  const currentData: DayRotationData = scheduleDays?.[selectedDay] ?? {
    dayName: defaultDayName,
    chars: [],
    weapons: [],
  };
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

        {/* Loading Spinner */}
        {loading && (
          <div className="p-12 flex flex-col items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
            <Loader2 className="animate-spin text-[var(--accent)]" size={24} />
            <span>Loading database schedule...</span>
          </div>
        )}

        {/* Content Area: Direct Character Cards */}
        {!loading && activeTab === "characters" && (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredCharacters.map((char) => {
              const colorClass = ELEMENT_COLORS[char.element] || "bg-white/10 text-white border-white/20";

              return (
                <Link
                  href={`/characters/${char.slug}`}
                  key={char.slug}
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
        {!loading && activeTab === "weapons" && (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredWeapons.map((weapon) => {
              return (
                <Link
                  href={`/database/weapons/${weapon.slug}`}
                  key={weapon.slug}
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
