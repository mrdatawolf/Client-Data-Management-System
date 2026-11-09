import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Log out
 *     description: Expires the fallback `session` and shared `bt_session` (Domain=.biztechro.com, Path=/, HttpOnly, SameSite=Lax; Secure over HTTPS). Signs out all apps sharing bt_session without calling BT Auth. Works with or without credentials.
 *     security: []
 *     responses:
 *       200: { description: Logged out — both cookies expired }
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.json({ message: "Logged out successfully" });

  // Clear the session cookie
  response.cookies.set("session", "", {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    maxAge: 0, // Expire immediately
    path: "/",
  });

  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    .trim();
  response.cookies.set("bt_session", "", {
    domain: ".biztechro.com",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:" || forwardedProto === "https",
    maxAge: 0,
  });

  return response;
}
