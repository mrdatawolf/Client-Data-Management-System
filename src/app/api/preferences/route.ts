/**
 * API routes for user preferences
 * GET - Get all preferences for the authenticated user
 * POST - Set a preference for the authenticated user
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthenticatedRequest } from "@/lib/auth/middleware";
import { getAllPreferences, setPreference } from "@/lib/preferences/db";

/**
 * GET /api/preferences
 * Returns all preferences for the authenticated user
 */
export const GET = requireAuth(async (request: AuthenticatedRequest) => {
  const userId = request.user?.userId;

  if (!userId) {
    return NextResponse.json({ error: "User ID not found" }, { status: 401 });
  }

  const preferences = await getAllPreferences(userId);

  return NextResponse.json({
    data: preferences,
  });
});

/**
 * POST /api/preferences
 * Set a preference for the authenticated user
 * Body: { key: string, value: string }
 */
export const POST = requireAuth(async (request: AuthenticatedRequest) => {
  const userId = request.user?.userId;

  if (!userId) {
    return NextResponse.json({ error: "User ID not found" }, { status: 401 });
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

    const success = await setPreference(userId, key, value);

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
});
