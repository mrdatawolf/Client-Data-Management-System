/**
 * Global authentication proxy (Next.js middleware convention).
 *
 * Every page and API route requires a valid session cookie (a JWT signed
 * with JWT_SECRET) except the public paths below. Pages redirect to /login;
 * API routes get a 401. Set DISABLE_AUTH=true to bypass all checks.
 *
 * Verification uses jose because this runs on the edge runtime, where
 * jsonwebtoken's Node crypto isn't available. Tokens are issued by
 * /api/auth/login via src/lib/auth/jwt.ts — same secret, same HS256.
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Paths reachable without a session
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/config",
];

// Must match the fallback in src/lib/auth/jwt.ts
const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret-in-production";

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

  const token = request.cookies.get("session")?.value;
  if (token) {
    try {
      await jwtVerify(token, new TextEncoder().encode(JWT_SECRET));
      return NextResponse.next();
    } catch {
      // Invalid or expired token — treat as unauthenticated
    }
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
