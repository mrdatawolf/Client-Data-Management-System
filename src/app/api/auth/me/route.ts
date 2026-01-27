import { NextRequest, NextResponse } from "next/server";
import { findUserById } from "@/lib/auth/db";

export async function GET(request: NextRequest) {
  try {
    // Check if auth is disabled
    if (process.env.DISABLE_AUTH === "true") {
      return NextResponse.json({
        user: { id: "guest", username: "guest", role: "admin" }
      });
    }

    // Get session from cookie
    const sessionCookie = request.cookies.get("session");

    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Decode session
    let session;
    try {
      session = JSON.parse(Buffer.from(sessionCookie.value, "base64").toString());
    } catch {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Get full user details from database
    const user = await findUserById(session.id);

    if (!user) {
      // Session valid but user not in DB - return session data
      return NextResponse.json({
        user: {
          id: session.id,
          username: session.username,
          role: session.role
        }
      });
    }

    // Return user without password
    const { password, ...userWithoutPassword } = user;
    return NextResponse.json({ user: userWithoutPassword });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
