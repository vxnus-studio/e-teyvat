"use client";

import { useEffect, useState } from "react";

type Health = {
  status: string;
  connected: boolean;
  revision?: string | null;
  entityCount?: number;
};

export function KnowledgeStatus() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/health")
      .then((response) => response.json() as Promise<Health>)
      .then((result) => {
        if (active) setHealth(result);
      })
      .catch(() => {
        if (active) setHealth({ status: "offline", connected: false });
      });
    return () => {
      active = false;
    };
  }, []);

  const ready = health?.status === "ready";
  return (
    <div className="topbar-status" aria-live="polite">
      <span className={`data-live ${ready ? "" : "pending"}`}>
        <i />
        {ready ? `${health.entityCount ?? 0} entities` : "Neon setup pending"}
      </span>
      <span className="version-badge">
        {health?.revision ? `rev ${health.revision}` : "Preview graph"}
      </span>
    </div>
  );
}

