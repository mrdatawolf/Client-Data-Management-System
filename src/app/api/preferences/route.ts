/**
 * API routes for user preferences
 * GET - Get all preferences for the authenticated user
 * POST - Set a preference for the authenticated user
 */

import { NextRequest, NextResponse } from "next/server";
import { getAllPreferences, setPreference } from "@/lib/preferences/db";
import { getSessionUser } from "@/lib/auth/session";

/**
 * @swagger
 * /api/preferences:
 *   get:
 *     tags: [Preferences]
 *     summary: Get all preferences for the current user
 *     responses:
 *       200:
 *         description: Map of preference keys to values
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   additionalProperties: { type: string }
 *                   example: { theme: dark }
 *       401: { description: Not authenticated }
 */
export async function GET(request: NextRequest) {
  const user = getSessionUser(request);

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const preferences = await getAllPreferences(user.id);

  return NextResponse.json({
    data: preferences,
  });
}

/**
 * @swagger
 * /api/preferences:
 *   post:
 *     tags: [Preferences]
 *     summary: Set a preference for the current user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [key, value]
 *             properties:
 *               key: { type: string, example: theme }
 *               value: { type: string, example: dark }
 *     responses:
 *       200:
 *         description: Accepted. `serverSaved` is false when the value could not be persisted server-side (client falls back to localStorage).
 *       400: { description: Missing or invalid key/value }
 *       401: { description: Not authenticated }
 */
export async function POST(request: NextRequest) {
  const user = getSessionUser(request);

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

    // Return success even if DB save failed - client will use localStorage as fallback
    // This handles cases like fallback auth or DISABLE_AUTH where user doesn't exist in DB
    return NextResponse.json({
      success: true,
      serverSaved: success,
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
