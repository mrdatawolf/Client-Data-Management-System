/**
 * API routes for specific user preference
 * GET - Get a specific preference
 * PUT - Update a specific preference
 * DELETE - Delete a specific preference
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthenticatedRequest } from "@/lib/auth/middleware";
import { getPreference, setPreference, deletePreference } from "@/lib/preferences/db";

interface RouteContext {
  params: Promise<{ key: string }>;
}

/**
 * GET /api/preferences/[key]
 * Returns a specific preference for the authenticated user
 */
export const GET = requireAuth(async (request: AuthenticatedRequest, context?: RouteContext) => {
  const userId = request.user?.userId;

  if (!userId) {
    return NextResponse.json({ error: "User ID not found" }, { status: 401 });
  }

  const params = context ? await context.params : null;
  const key = params?.key;

  if (!key) {
    return NextResponse.json({ error: "Preference key required" }, { status: 400 });
  }

  const value = await getPreference(userId, key);

  if (value === null) {
    return NextResponse.json({ error: "Preference not found" }, { status: 404 });
  }

  return NextResponse.json({
    data: { key, value },
  });
});

/**
 * PUT /api/preferences/[key]
 * Update a specific preference for the authenticated user
 * Body: { value: string }
 */
export const PUT = requireAuth(async (request: AuthenticatedRequest, context?: RouteContext) => {
  const userId = request.user?.userId;

  if (!userId) {
    return NextResponse.json({ error: "User ID not found" }, { status: 401 });
  }

  const params = context ? await context.params : null;
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

    const success = await setPreference(userId, key, value);

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
});

/**
 * DELETE /api/preferences/[key]
 * Delete a specific preference for the authenticated user
 */
export const DELETE = requireAuth(async (request: AuthenticatedRequest, context?: RouteContext) => {
  const userId = request.user?.userId;

  if (!userId) {
    return NextResponse.json({ error: "User ID not found" }, { status: 401 });
  }

  const params = context ? await context.params : null;
  const key = params?.key;

  if (!key) {
    return NextResponse.json({ error: "Preference key required" }, { status: 400 });
  }

  const success = await deletePreference(userId, key);

  if (!success) {
    return NextResponse.json({ error: "Preference not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    message: `Preference '${key}' deleted`,
  });
});
