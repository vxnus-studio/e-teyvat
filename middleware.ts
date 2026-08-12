import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isLoginRoute = path === "/admin/login" || path === "/admin/login/";

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
  matcher: "/admin/:path*",
};
