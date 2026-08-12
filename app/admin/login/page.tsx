"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
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
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/admin");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center pt-24 pb-12 w-full max-w-md mx-auto">
      <div className="w-full p-8 panel flex flex-col gap-8">
        <div className="text-center flex flex-col gap-2">
          <h1 className="h1-title text-[var(--accent)]">E-Teyvat Admin</h1>
          <p className="text-[var(--text-muted)]">Enter your passcode to manage assets</p>
        </div>
        
        <form onSubmit={handleLogin} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[var(--text-light)]">
              Passcode
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[var(--surface-sunken)] border border-[var(--border)] rounded px-4 py-3 text-[var(--text-light)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              placeholder="••••••••"
              required
            />
          </div>
          
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-500/50 rounded text-red-200 text-sm">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--surface)] font-semibold py-3 px-4 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50 mt-2"
          >
            {loading ? "Authenticating..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
