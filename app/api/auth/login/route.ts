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

    if (!authUrl) {
      return NextResponse.json(
        { error: "NEON_AUTH_BASE_URL is not configured on the server." },
        { status: 500 }
      );
    }

    const normalizedEmail = (email || "").trim().toLowerCase();
    if (!normalizedEmail || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    // 2. Authenticate strictly against Neon Managed Auth server
    const neonRes = await fetch(`${authUrl}/sign-in/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Origin": origin,
      },
      body: JSON.stringify({ email: normalizedEmail, password }),
    });

    const neonData = await neonRes.json().catch(() => ({}));

    if (neonRes.ok && (neonData.token || neonData.session?.token || neonData.user)) {
      const sessionToken = neonData.token || neonData.session?.token || "authenticated";

      const response = NextResponse.json({
        success: true,
        user: neonData.user || { email: normalizedEmail, role: "admin", name: normalizedEmail.split("@")[0] },
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

    const errorMsg =
      neonData.message ||
      neonData.error ||
      (neonRes.status === 401 ? "Invalid email or password." : "Authentication failed against Neon Auth.");

    return NextResponse.json({ error: errorMsg }, { status: neonRes.status || 401 });
  } catch (err: any) {
    console.error("Neon Auth sign-in error:", err);
    return NextResponse.json({ error: err.message || "Invalid login request" }, { status: 500 });
  }
}
