"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, Mail, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() || undefined, password }),
      });

      if (res.ok) {
        router.push("/admin/images");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Authentication failed. Please verify credentials against Neon Auth.");
      }
    } catch {
      setError("An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg)] relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[rgba(98,213,163,0.06)] rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[var(--surface-sunken)] border border-[var(--border)] rounded-2xl p-8 shadow-2xl relative z-10">
        <div className="text-center flex flex-col items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#66d9a7] to-[#28765a] flex items-center justify-center shadow-lg shadow-[rgba(90,216,162,0.25)]">
            <ShieldCheck className="w-6 h-6 text-[#041f16]" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white flex items-center justify-center gap-2">
              <span>E-TEYVAT</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--accent)] font-bold">
                Admin
              </span>
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1">Managed Neon Auth Console</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 font-mono">
              Admin Email / Identifier
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@e-teyvat.vxnus.xyz (or leave blank)"
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 font-mono">
              Passcode / Token
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors font-mono"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-black font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-[rgba(98,213,163,0.2)] disabled:opacity-50"
          >
            {loading ? (
              "Authenticating..."
            ) : (
              <>
                Access Admin Dashboard <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-5 border-t border-[var(--border)] text-center text-[11px] text-[var(--text-muted)]">
          Authenticated with Neon Auth session tokens & Cloudflare R2 storage credentials.
        </div>
      </div>
    </div>
  );
}
