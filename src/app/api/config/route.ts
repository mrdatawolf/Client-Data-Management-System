import { NextResponse } from "next/server";

/**
 * Runtime configuration endpoint
 * Returns server-side config that can be checked at runtime
 */
export async function GET() {
  return NextResponse.json({
    authDisabled: process.env.DISABLE_AUTH === "true",
    appName: process.env.NEXT_PUBLIC_APP_NAME || "Client Data Management",
  });
}
