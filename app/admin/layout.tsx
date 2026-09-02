"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Image as ImageIcon,
  Sparkles,
  Sword,
  ShieldCheck,
  LogOut,
  ChevronRight,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  role: string;
  name: string;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          router.push("/admin/login");
        }
      } catch {
        router.push("/admin/login");
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [pathname, isLoginPage, router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } catch (e) {
      console.error(e);
      window.location.href = "/admin/login";
    }
  };

  if (isLoginPage) {
    return <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">{children}</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm font-mono text-[var(--text-muted)]">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--green)] animate-ping" />
          Verifying Neon Auth Session...
        </div>
      </div>
    );
  }

  const navItems = [
    {
      title: "Broken Image Detection",
      subtitle: "Audit & Cloudflare R2 Uploads",
      href: "/admin/images",
      icon: ImageIcon,
      active: pathname === "/admin" || pathname === "/admin/images",
    },
    {
      title: "Signature Weapon Matcher",
      subtitle: "Character BiS Weapon Links",
      href: "/admin/signatures",
      icon: Sword,
      active: pathname === "/admin/signatures",
    },
    {
      title: "Build Recommendations",
      subtitle: "Artifacts, Teams & Rotations",
      href: "/admin/builds",
      icon: Sparkles,
      active: pathname === "/admin/builds",
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col md:flex-row">
      {/* Admin Sidebar */}
      <aside className="w-full md:w-72 bg-[#0a110f] border-r border-[var(--border)] flex flex-col justify-between shrink-0 md:h-screen md:sticky md:top-0 z-40">
        <div>
          {/* Admin Header */}
          <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#66d9a7] to-[#28765a] flex items-center justify-center shadow-lg shadow-[rgba(90,216,162,0.2)]">
                <ShieldCheck className="w-4 h-4 text-[#041f16]" />
              </div>
              <div>
                <div className="text-sm font-black tracking-tight flex items-center gap-1.5">
                  <span>E-TEYVAT</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--accent)]">
                    Admin
                  </span>
                </div>
                <div className="text-[11px] text-[var(--text-muted)] font-mono">Neon Auth Console</div>
              </div>
            </div>
          </div>

          {/* Quick Return to Main Site */}
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <Link
              href="/"
              className="flex items-center justify-between text-xs text-[var(--text-muted)] hover:text-white px-3 py-2 rounded-lg bg-[var(--surface-sunken)] hover:bg-[var(--surface-raised)] border border-[var(--border)] transition-all group"
            >
              <span className="flex items-center gap-2 font-medium">
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                Return to Live Site
              </span>
              <ExternalLink className="w-3 h-3 opacity-50" />
            </Link>
          </div>

          {/* Nav Items */}
          <div className="p-3 space-y-1.5">
            <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              Core Operations
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    item.active
                      ? "bg-[rgba(98,213,163,0.12)] border-[rgba(98,213,163,0.3)] text-white shadow-sm"
                      : "border-transparent text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-raised)]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                        item.active
                          ? "bg-[var(--accent)] border-[var(--accent)] text-black"
                          : "bg-[var(--surface-sunken)] border-[var(--border)] text-[var(--text-muted)]"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate leading-tight">{item.title}</div>
                      <div className="text-[10px] text-[var(--text-muted)] truncate leading-normal mt-0.5">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-3.5 h-3.5 shrink-0 opacity-40 ${item.active ? "text-[var(--accent)] opacity-100" : ""}`}
                  />
                </Link>
              );
            })}
          </div>
        </div>

        {/* User Session Footer */}
        <div className="p-4 border-t border-[var(--border)] bg-[#090e0c]">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center font-bold text-xs text-[var(--accent)]">
                {user?.name?.[0] || "A"}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate text-white">{user?.name || "Administrator"}</div>
                <div className="text-[10px] text-[var(--text-muted)] truncate font-mono">{user?.email || "Neon Superadmin"}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout session"
              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-950/30 border border-transparent hover:border-rose-900/40 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Admin Content Container */}
      <main className="flex-1 overflow-y-auto min-h-screen bg-[var(--bg)] p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">{children}</div>
      </main>
    </div>
  );
}
