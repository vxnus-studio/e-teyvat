"use client";

import { usePathname } from "next/navigation";
import { Topbar, Sidebar, MobileBottomNav } from "./navigation";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <div className="site-shell" id="home">
      <Topbar />
      <Sidebar />
      <main className="main-content">
        <div className="content-wrap">{children}</div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
