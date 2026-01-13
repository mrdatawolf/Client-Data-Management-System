import { NextRequest, NextResponse } from "next/server";
import { requireAuth, type AuthenticatedRequest } from "@/lib/auth/middleware";
import { findUserById } from "@/lib/auth/db";

async function handler(request: AuthenticatedRequest) {
  try {
    if (!request.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get full user details from database
    const user = await findUserById(request.user.userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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

export const GET = requireAuth(handler);
