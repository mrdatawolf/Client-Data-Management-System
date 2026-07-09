/**
 * JWT token utilities for authentication
 */

import jwt from "jsonwebtoken";

// Must match the fallback in src/middleware.ts
export const DEFAULT_JWT_SECRET = "change-this-secret-in-production";

const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

if (JWT_SECRET === DEFAULT_JWT_SECRET && process.env.DISABLE_AUTH !== "true") {
  console.warn(
    "JWT_SECRET is not set — sessions are signed with a publicly known default. Set JWT_SECRET in .env."
  );
}

/**
 * Session lifetime in seconds, for cookie maxAge. Parses JWT_EXPIRES_IN
 * values like "3600", "30m", "24h", "7d".
 */
export function getSessionMaxAgeSeconds(): number {
  const match = /^(\d+)([smhd]?)$/.exec(JWT_EXPIRES_IN.trim());
  if (!match) return 60 * 60 * 24; // fall back to 24h
  const value = parseInt(match[1], 10);
  const unit = { s: 1, m: 60, h: 3600, d: 86400 }[match[2] || "s"] ?? 1;
  return value * unit;
}

export interface JWTPayload {
  userId: string;
  username: string;
  role?: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(payload: Omit<JWTPayload, "iat" | "exp">): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: getSessionMaxAgeSeconds(),
  });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error("JWT verification error:", error);
    return null;
  }
}

/**
 * Decode a JWT token without verification (for debugging)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Check if a token is expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return true;
  }

  return decoded.exp * 1000 < Date.now();
}
