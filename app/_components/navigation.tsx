"use client";

import {
  Icon,
  BrandMark,
  Topbar as BaseTopbar,
  Sidebar as BaseSidebar,
  MobileBottomNav as BaseMobileBottomNav,
  type IconName,
  type NavItem,
  type DrawerSection,
  type TopbarProps,
  type SidebarProps,
  type MobileBottomNavProps,
} from "@vxnus/ui-game";
import { KnowledgeStatus } from "./knowledge-status";

export { Icon, BrandMark };
export type { IconName, NavItem, DrawerSection };

export const navigation: NavItem[] = [
  { label: "Home", icon: "home", href: "/" },
  { label: "Characters", icon: "users", href: "/database/characters/" },
  { label: "Weapons", icon: "sword", href: "/database/weapons/" },
  { label: "Artifacts", icon: "artifact", href: "/database/artifacts/" },
  { label: "Enemies", icon: "enemy", href: "/database/enemies/" },
  { label: "Banners", icon: "calendar", href: "/database/banners/" },
  { label: "Lore Engine", icon: "sparkles", href: "/lore-engine/" },
  { label: "Knowledge", icon: "quest", href: "/knowledge/" },
  { label: "Explore", icon: "map", href: "/explore/" },
  { label: "API Docs", icon: "code", href: "/docs/" },
];

export const drawerDirectory: DrawerSection[] = [
  {
    category: "Database Archive",
    items: [
      { label: "Characters", href: "/database/characters/", icon: "users", desc: "102 builds & ascensions" },
      { label: "Weapons", href: "/database/weapons/", icon: "sword", desc: "Swords, bows & polearms" },
      { label: "Artifacts", href: "/database/artifacts/", icon: "artifact", desc: "Artifact sets & bonuses" },
      { label: "Materials", href: "/database/materials/", icon: "sparkles", desc: "Talent & ascension costs" },
      { label: "Enemies", href: "/database/enemies/", icon: "enemy", desc: "Bosses & drop tables" },
      { label: "Domains", href: "/database/domains/", icon: "map", desc: "Mastery & Trounce domains" },
    ],
  },
  {
    category: "Banner Intelligence",
    items: [
      { label: "Active Banners", href: "/database/banners/", icon: "calendar", desc: "Version 7.0 Phase 1 line-up" },
      { label: "Rotation Archive", href: "/database/banners/rotation/", icon: "clock", desc: "1.0 to 7.0 era timeline" },
      { label: "Rerun Pressure", href: "/database/banners/rerun-pressure/", icon: "chevron", desc: "Historical rerun forecasting" },
    ],
  },
  {
    category: "AI & Graph System",
    items: [
      { label: "Lore Engine", href: "/lore-engine/", icon: "sparkles", desc: "1,239 books & relic chronicles" },
      { label: "Knowledge Retrieval", href: "/knowledge/", icon: "quest", desc: "Trace entities & facts" },
      { label: "Graph Explorer", href: "/explore/", icon: "map", desc: "Explore 8,696 graph entities" },
      { label: "API Documentation", href: "/docs/", icon: "code", desc: "Public endpoints & AI tool schemas" },
    ],
  },
  {
    category: "System",
    items: [
      { label: "Admin Console", href: "/admin/", icon: "grid", desc: "Dataset revisions & assets" },
    ],
  },
];

export const primaryMobileNavItems: NavItem[] = [
  { label: "Home", icon: "home", href: "/" },
  { label: "Characters", icon: "users", href: "/database/characters/" },
  { label: "Banners", icon: "calendar", href: "/database/banners/" },
  { label: "Knowledge", icon: "quest", href: "/knowledge/" },
];

export function Topbar(props: Partial<TopbarProps>) {
  return (
    <BaseTopbar
      brandName="E-Teyvat"
      brandSubtext={
        <>
          by{" "}
          <a href="https://vxnus.xyz" target="_blank" rel="noopener noreferrer">
            VXNUS
          </a>
        </>
      }
      homeHref="/"
      brandLogo={<BrandMark />}
      statusSlot={<KnowledgeStatus />}
      homeAriaLabel="E-Teyvat home"
      {...props}
    />
  );
}

export function Sidebar(props: Partial<SidebarProps>) {
  return <BaseSidebar items={navigation} statusTitle="Database online" {...props} />;
}

export function MobileBottomNav(props: Partial<MobileBottomNavProps>) {
  return (
    <BaseMobileBottomNav
      primaryItems={primaryMobileNavItems}
      drawerSections={drawerDirectory}
      drawerTitle="Navigation & Directory"
      drawerSubtext="Browse all E-Teyvat knowledge archives"
      {...props}
    />
  );
}
