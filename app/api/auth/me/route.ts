import { type NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "../../../../lib/auth/admin";

export async function GET(request: NextRequest) {
  const { authenticated, user } = await verifyAdminSession(request);
  if (!authenticated) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user,
  });
}
