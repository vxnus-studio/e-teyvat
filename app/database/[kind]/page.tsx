import { notFound } from "next/navigation";
import { DatabaseShell } from "../../_components/database-shell";
import { EntityExplorer } from "../../_components/entity-explorer";

const pages = {
  characters: {
    eyebrow: "Character index",
    title: "Characters",
    description:
      "Elements, talents, ascension costs, material families, and connected gameplay records.",
  },
  weapons: {
    eyebrow: "Equipment index",
    title: "Weapons",
    description:
      "Weapon stats, effects, ascension requirements, and every known farming source.",
  },
  materials: {
    eyebrow: "Resource index",
    title: "Materials",
    description:
      "A normalized inventory of upgrade materials connected to domains, enemies, recipes, and consumers.",
  },
  domains: {
    eyebrow: "Farming index",
    title: "Domains",
    description:
      "Domain entrances, schedules, rewards, regions, unlock requirements, and enemy lineups.",
  },
  artifacts: {
    eyebrow: "Equipment index",
    title: "Artifacts",
    description:
      "Artifact sets, effects, rarity, and the domains that reward each set.",
  },
  enemies: {
    eyebrow: "Enemy index",
    title: "Enemies",
    description:
      "Enemy records connected to material drops, domains, regions, and progression requirements.",
  },
} as const;

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(pages).map((kind) => ({ kind }));
}

export default async function DatabaseKindPage({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind } = await params;
  const page = pages[kind as keyof typeof pages];
  if (!page) notFound();

  return (
    <DatabaseShell {...page}>
      <EntityExplorer kind={kind} />
    </DatabaseShell>
  );
}

