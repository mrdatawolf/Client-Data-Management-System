import { NextResponse } from "next/server";

/**
 * Logout endpoint - clears the session cookie
 */
export async function POST() {
  const response = NextResponse.json({ message: "Logged out successfully" });

  // Clear the session cookie
  response.cookies.set("session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0, // Expire immediately
    path: "/",
  });

  return response;
}
