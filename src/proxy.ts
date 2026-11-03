/**
 * Global authentication proxy on the Next.js Node.js runtime.
 * Accepts verified orchestrator bt_session or configured fallback-admin session.
 * Public paths bypass authentication; pages redirect to /login and APIs get 401.
 * DISABLE_AUTH=true bypasses all checks.
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequestCookies } from "./lib/auth/orchestrator";

// Paths reachable without a session
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/config",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

export async function proxy(request: NextRequest) {
  if (process.env.DISABLE_AUTH === "true") {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (await authenticateRequestCookies(request.cookies)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Run on everything except Next.js internals and static assets
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|logo\\.png|smaller_logo\\.png).*)",
  ],
};
