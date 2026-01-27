/**
 * API routes for user preferences
 * GET - Get all preferences for the authenticated user
 * POST - Set a preference for the authenticated user
 */

import { NextRequest, NextResponse } from "next/server";
import { getAllPreferences, setPreference } from "@/lib/preferences/db";

// Helper to get user from session cookie
function getUserFromSession(request: NextRequest): { id: string; username: string; role: string } | null {
  // Check if auth is disabled
  if (process.env.DISABLE_AUTH === "true") {
    return { id: "guest", username: "guest", role: "admin" };
  }

  const sessionCookie = request.cookies.get("session");
  if (!sessionCookie?.value) return null;

  try {
    return JSON.parse(Buffer.from(sessionCookie.value, "base64").toString());
  } catch {
    return null;
  }
}

/**
 * GET /api/preferences
 * Returns all preferences for the authenticated user
 */
export async function GET(request: NextRequest) {
  const user = getUserFromSession(request);

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const preferences = await getAllPreferences(user.id);

  return NextResponse.json({
    data: preferences,
  });
}

/**
 * POST /api/preferences
 * Set a preference for the authenticated user
 * Body: { key: string, value: string }
 */
export async function POST(request: NextRequest) {
  const user = getUserFromSession(request);

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key || typeof key !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'key' field" },
        { status: 400 }
      );
    }

    if (value === undefined || typeof value !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'value' field" },
        { status: 400 }
      );
    }

    const success = await setPreference(user.id, key, value);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to save preference" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { key, value },
    });
  } catch (error) {
    console.error("Error parsing request body:", error);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
