import { type NextRequest, NextResponse } from "next/server";
import { getNeonAuthBaseUrl, NEON_SESSION_COOKIE, NEON_TOKEN_COOKIE } from "../../../../lib/auth/admin";

export async function POST(request: NextRequest) {
  try {
    const { email, password, token } = await request.json();
    const authUrl = getNeonAuthBaseUrl();

    // 1. Direct Token pass-through from client
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

    // 2. Authenticate against Managed Better Auth / Neon Auth service
    if (authUrl && email && password) {
      const endpoints = [
        `${authUrl}/sign-in/email`,
        `${authUrl}/api/v1/auth/login`,
        `${authUrl}/login`,
      ];

      for (const endpoint of endpoints) {
        try {
          const neonRes = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });

          const neonData = await neonRes.json().catch(() => ({}));

          if (neonRes.ok) {
            const sessionToken =
              neonData.token ||
              neonData.session?.token ||
              neonData.session_token ||
              neonData.access_token ||
              "authenticated";

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
          }
        } catch (neonErr) {
          console.warn(`Neon Auth endpoint attempt (${endpoint}) failed:`, neonErr);
        }
      }
    }

    // 3. Passcode fallback if local password is set
    if (process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD) {
      const response = NextResponse.json({
        success: true,
        user: { email: email || "admin@e-teyvat.vxnus.xyz", role: "admin", name: "Archon Administrator" },
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
      { error: "Authentication failed. Please verify credentials against Neon Auth." },
      { status: 401 }
    );
  } catch (err) {
    console.error("Login route error:", err);
    return NextResponse.json({ error: "Invalid login request" }, { status: 400 });
  }
}
