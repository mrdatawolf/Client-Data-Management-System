/**
 * Resolve the verified request principal and its local identity for API routes.
 * Authentication enforcement lives in src/proxy.ts; no token verification is
 * duplicated here. Fallback and disabled sessions never require the database.
 */
import { NextRequest } from "next/server";
import { authenticateRequestCookies } from "./orchestrator";
import { FALLBACK_ADMIN_ID } from "./fallback-admin";
import { resolveOrchestratorIdentity } from "./identity";

export const SESSION_COOKIE = "session";

export interface SessionUser {
  id: string;
  username: string;
  email: string | null;
  role: string;
  authSource: "disabled" | "fallback" | "orchestrator";
}

/** Return the current user, or null when neither cookie authenticates. */
export async function getSessionUser(
  request: NextRequest,
): Promise<SessionUser | null> {
  if (process.env.DISABLE_AUTH === "true") {
    return {
      id: "guest",
      username: "guest",
      email: null,
      role: "admin",
      authSource: "disabled",
    };
  }

  const principal = await authenticateRequestCookies(request.cookies);
  if (!principal) {
    return null;
  }
  if (principal.source === "fallback") {
    return {
      id: FALLBACK_ADMIN_ID,
      username: principal.username,
      email: null,
      role: "admin",
      authSource: "fallback",
    };
  }
  return {
    ...(await resolveOrchestratorIdentity(principal)),
    authSource: "orchestrator",
  };
}
