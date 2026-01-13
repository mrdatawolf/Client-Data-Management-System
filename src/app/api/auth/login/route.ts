import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth/db";
import { generateToken } from "@/lib/auth/jwt";

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

    // Verify credentials
    const user = await verifyPassword(username, password);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role || "user",
    });

    // Return token and user info
    return NextResponse.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
