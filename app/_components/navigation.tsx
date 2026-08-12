"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KnowledgeStatus } from "./knowledge-status";

export type IconName =
  | "home"
  | "users"
  | "sword"
  | "artifact"
  | "enemy"
  | "quest"
  | "map"
  | "calendar"
  | "chevron"
  | "clock";

export function Icon({ name, size = 19 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: <><path d="m3 10.8 9-7 9 7" /><path d="M5 9.5V21h14V9.5M9 21v-7h6v7" /></>,
    users: <><circle cx="9" cy="7" r="3.5" /><path d="M3 20c.4-4.3 2.4-6.5 6-6.5s5.6 2.2 6 6.5M16 4.8a3.4 3.4 0 0 1 0 6.5M17 14c2.5.6 3.8 2.5 4 5.3" /></>,
    sword: <><path d="m14.5 4.5 5-1-1 5L8 19l-3 1 1-3Z" /><path d="m11 12 3 3M5 14l5 5" /></>,
    artifact: <><path d="m12 3 6 4v10l-6 4-6-4V7Z" /><path d="m12 7 3.5 2v6L12 17l-3.5-2V9Z" /></>,
    enemy: <><path d="m6 8-3-4 5 2 4-3 4 3 5-2-3 4 1 4c0 5-3 9-7 9s-7-4-7-9Z" /><path d="m9 12 2 1M15 12l-2 1M10 17h4" /></>,
    quest: <><path d="M5 3h14v18H5z" /><path d="M8 7h8M8 11h8M8 15h5" /></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" /><path d="M9 3v15M15 6v15" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18M8 14h2M14 14h2M8 18h2" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  };

  return (
    <svg aria-hidden="true" className="icon" fill="none" height={size} viewBox="0 0 24 24" width={size}>
      {paths[name]}
    </svg>
  );
}

export const navigation: { label: string; icon: IconName; href: string }[] = [
  { label: "Home", icon: "home", href: "/" },
  { label: "Characters", icon: "users", href: "/database/characters/" },
  { label: "Weapons", icon: "sword", href: "/database/weapons/" },
  { label: "Artifacts", icon: "artifact", href: "/database/artifacts/" },
  { label: "Banners", icon: "calendar", href: "/database/banners/" },
  { label: "Enemies", icon: "enemy", href: "/database/enemies/" },
  { label: "Knowledge", icon: "quest", href: "/knowledge/" },
  { label: "Explore", icon: "map", href: "/explore/" },
];

export function BrandMark() {
  return <span className="brand-mark" aria-hidden="true"><span /></span>;
}

export function Topbar() {
  return (
    <header className="topbar">
      <Link className="topbar-logo" href="/" aria-label="E-Teyvat home"><BrandMark /></Link>
      <Link className="topbar-brand" href="/">
        <strong>E-Teyvat</strong>
        <span>Genshin Database</span>
      </Link>
      <KnowledgeStatus />
    </header>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === href : pathname.startsWith(href.replace(/\/$/, ""));

  return (
    <aside className="sidebar">
      <nav aria-label="Database navigation">
        {navigation.map((item) => (
          <Link 
            className={`rail-link ${isActive(item.href) ? "active" : ""}`}
            href={item.href} 
            key={item.label} 
            aria-label={item.label}
          >
            <Icon name={item.icon} />
            <span className="rail-tooltip">{item.label}</span>
          </Link>
        ))}
      </nav>
      <span className="rail-status" title="Database online"><i /></span>
    </aside>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === href : pathname.startsWith(href.replace(/\/$/, ""));

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {navigation.slice(0, 4).map((item) => (
        <Link 
          className={isActive(item.href) ? "active" : ""}
          href={item.href} 
          key={item.label}
        >
          <Icon name={item.icon} size={19} />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
