import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Sliding-window rate limiter — keyed by "bucket:ip".
//
// NOTE: State lives in the Node.js module scope of the Proxy (proxy.ts).
// It is accurate for a single-instance deployment.  For horizontal scale-out
// replace this with a Redis-backed solution (e.g. Upstash Rate Limit) and
// inject UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN via env vars.
// ---------------------------------------------------------------------------

/** Timestamps (ms) of recent requests keyed by "bucket:ip". */
const rateLimitStore = new Map<string, number[]>();

/** Window length shared by all buckets: 60 seconds. */
const WINDOW_MS = 60_000;

/**
 * Rate-limit tiers applied per IP per 60 s window.
 *
 * | Bucket     | Limit | Routes                                     |
 * |------------|-------|--------------------------------------------|
 * | rest       | 120   | /api/v1/*, /api/entities, /api/farming, …  |
 * | mcp        |  60   | /api/mcp                                   |
 * | mutation   |  20   | /api/auth/*, /api/admin/*, /api/upload     |
 * | e-provider |  30   | /api/e/*                                   |
 */
const LIMITS: Record<string, number> = {
  rest: 120,
  mcp: 60,
  mutation: 20,
  "e-provider": 30,
};

/**
 * Classify the request path into a rate-limit bucket.
 * Returns null for paths that should bypass rate limiting (admin UI, etc.).
 */
function resolveBucket(path: string): string | null {
  if (path === "/api/mcp" || path === "/api/mcp/") return "mcp";
  if (
    path.startsWith("/api/auth/") ||
    path.startsWith("/api/admin/") ||
    path.startsWith("/api/upload")
  )
    return "mutation";
  if (path.startsWith("/api/e/")) return "e-provider";
  if (path.startsWith("/api/")) return "rest";
  return null;
}

/**
 * Check and record a request against the sliding-window.
 * Prunes timestamps older than WINDOW_MS on every call.
 */
function checkRateLimit(
  bucket: string,
  ip: string,
): { limited: boolean; count: number; limit: number } {
  const limit = LIMITS[bucket] ?? 60;
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  const timestamps = (rateLimitStore.get(key) ?? []).filter(
    (t) => t > windowStart,
  );

  if (timestamps.length >= limit) {
    rateLimitStore.set(key, timestamps);
    return { limited: true, count: timestamps.length, limit };
  }

  timestamps.push(now);
  rateLimitStore.set(key, timestamps);
  return { limited: false, count: timestamps.length, limit };
}

/** Periodic GC — purge fully-expired keys every 5 minutes. */
setInterval(
  () => {
    const cutoff = Date.now() - WINDOW_MS;
    for (const [key, timestamps] of rateLimitStore) {
      if (timestamps.every((t) => t <= cutoff)) {
        rateLimitStore.delete(key);
      }
    }
  },
  5 * 60_000,
);

// ---------------------------------------------------------------------------
// Proxy
// ---------------------------------------------------------------------------

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isLoginRoute = path === "/admin/login" || path === "/admin/login/";

  // ── Public API rate limiting ─────────────────────────────────────────────

  const bucket = resolveBucket(path);

  if (bucket !== null) {
    // Resolve client IP: Cloudflare > X-Forwarded-For > fallback.
    const ip =
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";

    const { limited, count, limit } = checkRateLimit(bucket, ip);

    if (limited) {
      return new Response(
        JSON.stringify({
          error: "rate_limit_exceeded",
          message: `Too many requests. Limit: ${limit} requests per 60 s per IP.`,
          retryAfter: 60,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "60",
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Window": "60",
          },
        },
      );
    }

    // Pass through, adding informational headers.
    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", String(limit));
    response.headers.set("X-RateLimit-Remaining", String(limit - count));
    response.headers.set("X-RateLimit-Window", "60");
    return response;
  }

  // ── Admin session guard ──────────────────────────────────────────────────

  if (path.startsWith("/admin") && !isLoginRoute) {
    const session = request.cookies.get("eteyvat_admin_session")?.value;

    if (!session || session !== "authenticated") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  if (isLoginRoute) {
    const session = request.cookies.get("eteyvat_admin_session")?.value;
    if (session === "authenticated") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
