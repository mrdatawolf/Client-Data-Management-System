/**
 * API routes for specific user preference
 * GET - Get a specific preference
 * PUT - Update a specific preference
 * DELETE - Delete a specific preference
 */

import { NextRequest, NextResponse } from "next/server";
import { getPreference, setPreference, deletePreference } from "@/lib/preferences/db";
import { getSessionUser } from "@/lib/auth/session";

interface RouteContext {
  params: Promise<{ key: string }>;
}

/**
 * @swagger
 * /api/preferences/{key}:
 *   get:
 *     tags: [Preferences]
 *     summary: Get a specific preference for the current user
 *     parameters:
 *       - name: key
 *         in: path
 *         required: true
 *         schema: { type: string, example: theme }
 *     responses:
 *       200: { description: The preference value }
 *       401: { description: Not authenticated }
 *       404: { description: Preference not found }
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const user = getSessionUser(request);

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
 * @swagger
 * /api/preferences/{key}:
 *   put:
 *     tags: [Preferences]
 *     summary: Update a specific preference for the current user
 *     parameters:
 *       - name: key
 *         in: path
 *         required: true
 *         schema: { type: string, example: theme }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [value]
 *             properties:
 *               value: { type: string, example: dark }
 *     responses:
 *       200: { description: Preference updated }
 *       400: { description: Missing or invalid value }
 *       401: { description: Not authenticated }
 *       500: { description: Failed to update preference }
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const user = getSessionUser(request);

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
 * @swagger
 * /api/preferences/{key}:
 *   delete:
 *     tags: [Preferences]
 *     summary: Delete a specific preference for the current user
 *     parameters:
 *       - name: key
 *         in: path
 *         required: true
 *         schema: { type: string, example: theme }
 *     responses:
 *       200: { description: Preference deleted }
 *       401: { description: Not authenticated }
 *       404: { description: Preference not found }
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const user = getSessionUser(request);

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
