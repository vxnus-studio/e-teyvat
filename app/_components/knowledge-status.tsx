"use client";

import { useEffect, useState } from "react";

type Health = {
  status: string;
  connected: boolean;
  revision?: string | null;
  shortRevision?: string | null;
  gameVersion?: string | null;
  phaseLabel?: string | null;
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
  const shortRev = health?.shortRevision ?? (health?.revision ? health.revision.slice(0, 7) : null);
  const version = health?.gameVersion ?? "v7.0.1";

  return (
    <div className="topbar-status" aria-live="polite">
      <span className={`data-live ${ready ? "" : "pending"}`}>
        <i />
        {ready ? `${health.entityCount?.toLocaleString() ?? 0} entities` : "Neon setup pending"}
      </span>

      {ready && (
        <span className="version-pill" title={health.phaseLabel ?? "Current Version"}>
          <span className="version-pill-dot" />
          {version}
        </span>
      )}

      <span className="version-badge" title={health?.revision ? `Full Revision: ${health.revision}` : "Preview graph"}>
        {shortRev ? `rev ${shortRev}` : "Preview graph"}
      </span>
    </div>
  );
}

