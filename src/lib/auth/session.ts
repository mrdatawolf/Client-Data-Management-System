/**
 * Session helpers for API routes: the session is a JWT (signed with
 * JWT_SECRET) stored in the httpOnly "session" cookie. Route-level
 * enforcement lives in src/middleware.ts; these helpers are for routes
 * that need to know WHO the user is.
 */

import { NextRequest } from "next/server";
import { verifyToken } from "./jwt";

export const SESSION_COOKIE = "session";

export interface SessionUser {
  id: string;
  username: string;
  role: string;
}

/**
 * Get the authenticated user from the request's session cookie.
 * Returns a guest admin when DISABLE_AUTH=true, null when not authenticated.
 */
export function getSessionUser(request: NextRequest): SessionUser | null {
  if (process.env.DISABLE_AUTH === "true") {
    return { id: "guest", username: "guest", role: "admin" };
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }

  return {
    id: payload.userId,
    username: payload.username,
    role: payload.role || "user",
  };
}
