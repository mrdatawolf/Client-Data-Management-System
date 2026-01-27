/**
 * API routes for specific user preference
 * GET - Get a specific preference
 * PUT - Update a specific preference
 * DELETE - Delete a specific preference
 */

import { NextRequest, NextResponse } from "next/server";
import { getPreference, setPreference, deletePreference } from "@/lib/preferences/db";

interface RouteContext {
  params: Promise<{ key: string }>;
}

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
 * GET /api/preferences/[key]
 * Returns a specific preference for the authenticated user
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const user = getUserFromSession(request);

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const params = await context.params;
  const key = params?.key;

  if (!key) {
    return NextResponse.json({ error: "Preference key required" }, { status: 400 });
  }

  const value = await getPreference(user.id, key);

  if (value === null) {
    return NextResponse.json({ error: "Preference not found" }, { status: 404 });
  }

  return NextResponse.json({
    data: { key, value },
  });
}

/**
 * PUT /api/preferences/[key]
 * Update a specific preference for the authenticated user
 * Body: { value: string }
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const user = getUserFromSession(request);

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const params = await context.params;
  const key = params?.key;

  if (!key) {
    return NextResponse.json({ error: "Preference key required" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { value } = body;

    if (value === undefined || typeof value !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'value' field" },
        { status: 400 }
      );
    }

    const success = await setPreference(user.id, key, value);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update preference" },
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

/**
 * DELETE /api/preferences/[key]
 * Delete a specific preference for the authenticated user
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const user = getUserFromSession(request);

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const params = await context.params;
  const key = params?.key;

  if (!key) {
    return NextResponse.json({ error: "Preference key required" }, { status: 400 });
  }

  const success = await deletePreference(user.id, key);

  if (!success) {
    return NextResponse.json({ error: "Preference not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    message: `Preference '${key}' deleted`,
  });
}
