import { NextResponse } from "next/server";
import { NEON_SESSION_COOKIE, NEON_TOKEN_COOKIE } from "../../../../lib/auth/admin";

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };

  response.cookies.set(NEON_SESSION_COOKIE, "", cookieOpts);
  response.cookies.set(NEON_TOKEN_COOKIE, "", cookieOpts);
  response.cookies.set("e_teyvat_admin_session", "", cookieOpts);

  return response;
}
