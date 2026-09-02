import { type NextRequest, NextResponse } from "next/server";
import { getNeonAuthBaseUrl, NEON_SESSION_COOKIE, NEON_TOKEN_COOKIE } from "../../../../lib/auth/admin";

export async function POST(request: NextRequest) {
  try {
    const { email, password, token } = await request.json();
    const authUrl = getNeonAuthBaseUrl();

    // If client supplied a pre-authenticated token from Neon Auth widget / frontend OAuth
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

    // Call managed Neon Auth login endpoint
    try {
      const neonRes = await fetch(`${authUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const neonData = await neonRes.json();

      if (neonRes.ok && (neonData.token || neonData.session_token || neonData.access_token)) {
        const sessionToken = neonData.token || neonData.session_token || neonData.access_token;
        const response = NextResponse.json({
          success: true,
          user: neonData.user || { email, role: "admin" },
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
      console.warn("Direct Neon Auth endpoint call:", neonErr);
    }

    // Passcode fallback if local password is set
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
