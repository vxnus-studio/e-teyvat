"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Icon, type IconName } from "./navigation";
import { CalendarDays, Clock, Globe, Sparkles } from "lucide-react";

type ServerRegion = "asia" | "america" | "europe";

const SERVER_CONFIG: Record<ServerRegion, { label: string; offset: number; name: string }> = {
  asia: { label: "Asia (UTC+8)", offset: 8, name: "Asia / TW / HK / MO" },
  america: { label: "America (UTC-5)", offset: -5, name: "North America" },
  europe: { label: "Europe (UTC+1)", offset: 1, name: "Europe" },
};

function detectUserServer(): ServerRegion {
  if (typeof window === "undefined") return "asia";
  try {
    const offsetMins = new Date().getTimezoneOffset(); // e.g. -420 for UTC+7, 300 for UTC-5
    if (offsetMins >= 240) return "america"; // UTC-4 to UTC-10
    if (offsetMins >= -180 && offsetMins <= 60) return "europe"; // UTC-1 to UTC+3
    return "asia"; // UTC+4 to UTC+12
  } catch {
    return "asia";
  }
}

interface DomainSchedule {
  dayName: string;
  weapon: {
    title: string;
    note: string;
    regions: string[];
    drops: string[];
    materials: string[];
  };
  talent: {
    title: string;
    note: string;
    regions: string[];
    drops: string[];
    materials: string[];
  };
}

const SCHEDULES: Record<number, DomainSchedule> = {
  // Sunday
  0: {
    dayName: "Sunday",
    weapon: {
      title: "All Weapon Materials Open",
      note: "Sunday Free Choice",
      regions: ["All 6 Regions"],
      drops: ["ALL", "6×", "✦"],
      materials: ["Decarabian", "Wolf", "Gladiator", "Guyun", "Aerosiderite", "Mist", "Distant Sea", "Narukami", "Mask"],
    },
    talent: {
      title: "All Talent Teachings Open",
      note: "Sunday Free Choice",
      regions: ["All 6 Regions"],
      drops: ["ALL", "6×", "✦"],
      materials: ["Freedom", "Resistance", "Ballad", "Prosperity", "Diligence", "Gold", "Transience", "Elegance", "Light"],
    },
  },
  // Monday
  1: {
    dayName: "Monday",
    weapon: {
      title: "Decarabian · Guyun · Distant Sea",
      note: "Mondstadt · Liyue · Inazuma · Sumeru · Fontaine · Natlan",
      regions: ["Decarabian", "Guyun", "Distant Sea", "Forest Dew", "Sacred Dewdrop", "Blazing Heart"],
      drops: ["D", "G", "S"],
      materials: ["Tile of Decarabian's Tower", "Luminous Sands from Guyun", "Coral Branch of a Distant Sea", "Copper Talisman of the Forest Dew", "Dross of Pure Sacred Dewdrop", "Blazing Sacrificial Heart's Terror"],
    },
    talent: {
      title: "Freedom · Prosperity · Transience",
      note: "Teachings of Freedom, Prosperity, Transience, Admonition, Equity, Contention",
      regions: ["Freedom", "Prosperity", "Transience", "Admonition", "Equity", "Contention"],
      drops: ["F", "P", "T"],
      materials: ["Teachings of Freedom", "Teachings of Prosperity", "Teachings of Transience", "Teachings of Admonition", "Teachings of Equity", "Teachings of Contention"],
    },
  },
  // Tuesday
  2: {
    dayName: "Tuesday",
    weapon: {
      title: "Boreal Wolf · Mist Veiled · Narukami",
      note: "Mondstadt · Liyue · Inazuma · Sumeru · Fontaine · Natlan",
      regions: ["Boreal Wolf", "Mist Veiled", "Narukami", "Oasis Garden", "Ancient Chord", "Delirious Decadence"],
      drops: ["W", "M", "N"],
      materials: ["Boreal Wolf's Milk Tooth", "Mist Veiled Lead Elixir", "Narukami's Wisdom", "Oasis Garden's Reminiscence", "Fragment of an Ancient Chord", "Delirious Decadence of the Sacred Lord"],
    },
    talent: {
      title: "Resistance · Diligence · Elegance",
      note: "Teachings of Resistance, Diligence, Elegance, Ingenuity, Justice, Kindling",
      regions: ["Resistance", "Diligence", "Elegance", "Ingenuity", "Justice", "Kindling"],
      drops: ["R", "D", "E"],
      materials: ["Teachings of Resistance", "Teachings of Diligence", "Teachings of Elegance", "Teachings of Ingenuity", "Teachings of Justice", "Teachings of Kindling"],
    },
  },
  // Wednesday
  3: {
    dayName: "Wednesday",
    weapon: {
      title: "Dandelion Gladiator · Aerosiderite · Mask",
      note: "Mondstadt · Liyue · Inazuma · Sumeru · Fontaine · Natlan",
      regions: ["Gladiator", "Aerosiderite", "Mask", "Scorching Might", "Pure Drop", "Night-Wind"],
      drops: ["G", "A", "M"],
      materials: ["Fetters of the Dandelion Gladiator", "Grain of Aerosiderite", "Mask of the Wicked Lieutenant", "Echo of Scorching Might", "Drop of Sublimated Dewdrop", "Night-Wind's Mystic Essence"],
    },
    talent: {
      title: "Ballad · Gold · Light",
      note: "Teachings of Ballad, Gold, Light, Praxis, Order, Conflict",
      regions: ["Ballad", "Gold", "Light", "Praxis", "Order", "Conflict"],
      drops: ["B", "G", "L"],
      materials: ["Teachings of Ballad", "Teachings of Gold", "Teachings of Light", "Teachings of Praxis", "Teachings of Order", "Teachings of Conflict"],
    },
  },
  // Thursday (same as Monday)
  4: {
    dayName: "Thursday",
    weapon: {
      title: "Decarabian · Guyun · Distant Sea",
      note: "Mondstadt · Liyue · Inazuma · Sumeru · Fontaine · Natlan",
      regions: ["Decarabian", "Guyun", "Distant Sea", "Forest Dew", "Sacred Dewdrop", "Blazing Heart"],
      drops: ["D", "G", "S"],
      materials: ["Tile of Decarabian's Tower", "Luminous Sands from Guyun", "Coral Branch of a Distant Sea", "Copper Talisman of the Forest Dew", "Dross of Pure Sacred Dewdrop", "Blazing Sacrificial Heart's Terror"],
    },
    talent: {
      title: "Freedom · Prosperity · Transience",
      note: "Teachings of Freedom, Prosperity, Transience, Admonition, Equity, Contention",
      regions: ["Freedom", "Prosperity", "Transience", "Admonition", "Equity", "Contention"],
      drops: ["F", "P", "T"],
      materials: ["Teachings of Freedom", "Teachings of Prosperity", "Teachings of Transience", "Teachings of Admonition", "Teachings of Equity", "Teachings of Contention"],
    },
  },
  // Friday (same as Tuesday)
  5: {
    dayName: "Friday",
    weapon: {
      title: "Boreal Wolf · Mist Veiled · Narukami",
      note: "Mondstadt · Liyue · Inazuma · Sumeru · Fontaine · Natlan",
      regions: ["Boreal Wolf", "Mist Veiled", "Narukami", "Oasis Garden", "Ancient Chord", "Delirious Decadence"],
      drops: ["W", "M", "N"],
      materials: ["Boreal Wolf's Milk Tooth", "Mist Veiled Lead Elixir", "Narukami's Wisdom", "Oasis Garden's Reminiscence", "Fragment of an Ancient Chord", "Delirious Decadence of the Sacred Lord"],
    },
    talent: {
      title: "Resistance · Diligence · Elegance",
      note: "Teachings of Resistance, Diligence, Elegance, Ingenuity, Justice, Kindling",
      regions: ["Resistance", "Diligence", "Elegance", "Ingenuity", "Justice", "Kindling"],
      drops: ["R", "D", "E"],
      materials: ["Teachings of Resistance", "Teachings of Diligence", "Teachings of Elegance", "Teachings of Ingenuity", "Teachings of Justice", "Teachings of Kindling"],
    },
  },
  // Saturday (same as Wednesday)
  6: {
    dayName: "Saturday",
    weapon: {
      title: "Dandelion Gladiator · Aerosiderite · Mask",
      note: "Mondstadt · Liyue · Inazuma · Sumeru · Fontaine · Natlan",
      regions: ["Gladiator", "Aerosiderite", "Mask", "Scorching Might", "Pure Drop", "Night-Wind"],
      drops: ["G", "A", "M"],
      materials: ["Fetters of the Dandelion Gladiator", "Grain of Aerosiderite", "Mask of the Wicked Lieutenant", "Echo of Scorching Might", "Drop of Sublimated Dewdrop", "Night-Wind's Mystic Essence"],
    },
    talent: {
      title: "Ballad · Gold · Light",
      note: "Teachings of Ballad, Gold, Light, Praxis, Order, Conflict",
      regions: ["Ballad", "Gold", "Light", "Praxis", "Order", "Conflict"],
      drops: ["B", "G", "L"],
      materials: ["Teachings of Ballad", "Teachings of Gold", "Teachings of Light", "Teachings of Praxis", "Teachings of Order", "Teachings of Conflict"],
    },
  },
};

export function HomeRotation() {
  const [server, setServer] = useState<ServerRegion>("asia");
  const [mounted, setMounted] = useState(false);
  const [timeState, setTimeState] = useState<{
    dayOfWeek: number;
    dayName: string;
    countdown: string;
  }>({
    dayOfWeek: 3,
    dayName: "Wednesday",
    countdown: "--:--:--",
  });

  useEffect(() => {
    setServer(detectUserServer());
    setMounted(true);
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

      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      setTimeState({
        dayOfWeek,
        dayName: days[dayOfWeek],
        countdown: `${hh}:${mm}:${ss}`,
      });
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [server]);

  const schedule = SCHEDULES[timeState.dayOfWeek] ?? SCHEDULES[0];

  return (
    <>
      <section className="page-heading">
        <div>
          <h1>Home</h1>
          <p>Daily game data and domain rotations at a glance.</p>
        </div>

        <div className="flex items-center gap-3">
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
            <strong>{timeState.countdown}</strong>
          </div>
        </div>
      </section>

      <section className="rotation-section" id="rotation" aria-labelledby="rotation-title">
        <div className="section-header">
          <div>
            <span className="section-icon">
              <Icon name="calendar" />
            </span>
            <div>
              <h2 id="rotation-title">Today&apos;s Rotation</h2>
              <p>
                {timeState.dayName} · {SERVER_CONFIG[server].label} · {timeState.dayOfWeek === 0 ? "All material domains open" : "Domains of Forgery & Mastery open"}
              </p>
            </div>
          </div>
          <Link href="/database/domains/">
            All domains <Icon name="chevron" size={14} />
          </Link>
        </div>

        <div className="rotation-grid">
          {/* Weapon Materials */}
          <Link
            className="rotation-card gold group"
            href={`/database/materials?q=${encodeURIComponent(schedule.weapon.regions[0] ?? "Weapon")}`}
          >
            <span className="rotation-icon">
              <Icon name="sword" />
            </span>
            <div>
              <span>Weapon Materials</span>
              <strong>{schedule.weapon.title}</strong>
              <small>{schedule.weapon.note}</small>
            </div>
            <div className="drop-stack">
              {schedule.weapon.drops.map((drop) => (
                <i key={drop}>{drop}</i>
              ))}
            </div>
            <Icon name="chevron" size={14} />
          </Link>

          {/* Talent Books */}
          <Link
            className="rotation-card cyan group"
            href={`/database/materials?q=${encodeURIComponent(schedule.talent.regions[0] ?? "Talent")}`}
          >
            <span className="rotation-icon">
              <Icon name="users" />
            </span>
            <div>
              <span>Talent Books</span>
              <strong>{schedule.talent.title}</strong>
              <small>{schedule.talent.note}</small>
            </div>
            <div className="drop-stack">
              {schedule.talent.drops.map((drop) => (
                <i key={drop}>{drop}</i>
              ))}
            </div>
            <Icon name="chevron" size={14} />
          </Link>

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
      </section>
    </>
  );
}
