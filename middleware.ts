import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { decodeSessionCookie } from "@/lib/auth/session";

const PUBLIC_PATHS = ["/login", "/api/auth"];

function isPublicRoute(pathname: string) {
  if (pathname.startsWith("/_next") || pathname.startsWith("/api/public") || pathname.startsWith("/static")) {
    return true;
  }

  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("app_session")?.value ?? null;
  const sessionUser = decodeSessionCookie(sessionCookie);

  if (isPublicRoute(pathname)) {
    if (pathname === "/login" && sessionUser) {
      const homeUrl = new URL("/", request.url);
      return NextResponse.redirect(homeUrl);
    }

    return NextResponse.next();
  }

  if (!sessionUser) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/login") {
      const redirectParam = request.nextUrl.pathname + request.nextUrl.search;
      loginUrl.searchParams.set("redirect", redirectParam);
    }

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
