import { NextResponse } from "next/server";

/**
 * Logout endpoint
 * Since we're using JWT, logout is handled client-side by removing the token
 * This endpoint exists for consistency and can be extended for token blacklisting
 */
export async function POST() {
  return NextResponse.json({ message: "Logged out successfully" });
}
