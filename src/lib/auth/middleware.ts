/**
 * Authentication middleware for API routes
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyToken, type JWTPayload } from "./jwt";

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

/**
 * Extract JWT token from request headers
 */
export function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return null;
  }

  // Extract Bearer token
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null;
  }

  return parts[1];
}

/**
 * Middleware to require authentication
 */
export function requireAuth(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const token = extractToken(request);

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Attach user to request
    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.user = payload;

    return handler(authenticatedRequest);
  };
}

/**
 * Middleware to require specific role
 */
export function requireRole(
  role: string,
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return requireAuth(async (request: AuthenticatedRequest) => {
    if (request.user?.role !== role) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    return handler(request);
  });
}

/**
 * Optional authentication - doesn't fail if no token
 */
export function optionalAuth(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const token = extractToken(request);

    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        const authenticatedRequest = request as AuthenticatedRequest;
        authenticatedRequest.user = payload;
      }
    }

    return handler(request as AuthenticatedRequest);
  };
}
