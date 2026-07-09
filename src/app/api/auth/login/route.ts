import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth/db";
import { generateToken, getSessionMaxAgeSeconds } from "@/lib/auth/jwt";
import { SESSION_COOKIE } from "@/lib/auth/session";

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in with username and password
 *     description: On success, sets the httpOnly `session` cookie (a signed JWT) used by all other endpoints.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string, example: patrick }
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Logged in — `session` cookie set
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 user: { $ref: '#/components/schemas/User' }
 *       400: { description: Username and password are required }
 *       401: { description: Invalid username or password }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Verify credentials against auth.db
    const user = await verifyPassword(username, password);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Create signed session token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role || "user",
    });

    // Create response with user info
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });

    // Set session cookie (HTTP-only for security)
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: getSessionMaxAgeSeconds(),
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
