import { NextRequest, NextResponse } from "next/server";
import { readExcelFile, filterOutInactive } from "@/lib/excel/reader";

/**
 * GET /api/data/devices?client=XXX
 * Returns devices (printers, scanners, etc.) for a specific client
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const client = searchParams.get("client");

    if (!client) {
      return NextResponse.json(
        { error: "Client parameter required" },
        { status: 400 }
      );
    }

    const data = readExcelFile("devices");
    // Note: Device interface uses lowercase "client" field
    const filtered = data.filter((item: any) => item.client === client);
    const activeData = filterOutInactive(filtered);

    return NextResponse.json({
      data: activeData,
      count: activeData.length,
    });
  } catch (error) {
    console.error("Error loading devices:", error);
    return NextResponse.json(
      { error: "Failed to load devices", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
