import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get("easypips_admin_session")?.value;

  if (pathname.startsWith("/admin") && !session) {
    return NextResponse.redirect(new URL("/admin-login", request.url));
  }

  if (pathname.startsWith("/admin-login") && session) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/admin-login"],
};