import { type NextRequest, NextResponse } from "next/server";
import { getNeonAuthBaseUrl, NEON_SESSION_COOKIE, NEON_TOKEN_COOKIE } from "../../../../lib/auth/admin";

export async function POST(request: NextRequest) {
  try {
    const { email, password, token } = await request.json();
    const authUrl = getNeonAuthBaseUrl();
    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    // 1. Direct session token from client
    if (token) {
      const response = NextResponse.json({ success: true });
      const cookieOpts = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      };

      response.cookies.set(NEON_TOKEN_COOKIE, token, cookieOpts);
      response.cookies.set(NEON_SESSION_COOKIE, token, cookieOpts);
      response.cookies.set("e_teyvat_admin_session", "authenticated", cookieOpts);
      return response;
    }

    // 2. Authenticate against Neon Managed Better Auth server
    if (authUrl && email && password) {
      try {
        const neonRes = await fetch(`${authUrl}/sign-in/email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Origin": origin,
          },
          body: JSON.stringify({ email, password }),
        });

        const neonData = await neonRes.json().catch(() => ({}));

        if (neonRes.ok && (neonData.token || neonData.session?.token || neonData.user)) {
          const sessionToken = neonData.token || neonData.session?.token || "authenticated";

          const response = NextResponse.json({
            success: true,
            user: neonData.user || { email, role: "admin", name: email.split("@")[0] },
          });

          const cookieOpts = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax" as const,
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
          };

          response.cookies.set(NEON_TOKEN_COOKIE, sessionToken, cookieOpts);
          response.cookies.set(NEON_SESSION_COOKIE, sessionToken, cookieOpts);
          response.cookies.set("e_teyvat_admin_session", "authenticated", cookieOpts);

          return response;
        } else {
          console.warn("Neon Auth sign-in rejected:", neonData.message || neonRes.statusText);
        }
      } catch (neonErr) {
        console.warn("Neon Auth sign-in fetch error:", neonErr);
      }
    }

    // 3. Admin Passcode fallback if local password is configured
    if (process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD) {
      const response = NextResponse.json({
        success: true,
        user: { email: email || process.env.ADMIN_EMAIL || "admin", role: "admin", name: "Archon Administrator" },
      });
      response.cookies.set("e_teyvat_admin_session", "authenticated", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
      return response;
    }

    return NextResponse.json(
      { error: "Authentication failed. Please verify your email and password." },
      { status: 401 }
    );
  } catch (err) {
    console.error("Login route error:", err);
    return NextResponse.json({ error: "Invalid login request" }, { status: 400 });
  }
}
