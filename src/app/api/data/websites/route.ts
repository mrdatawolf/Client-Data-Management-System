import { NextRequest, NextResponse } from "next/server";
import { ensureExcelFileExists } from "@/lib/excel/reader";
import { getReadSource, readMigratedDataset } from "@/lib/data/silver-datasets";

const WEBSITE_HEADERS = [
  "Client",
  "Registrar", "Registrar Credential Location",
  "Registrar Username", "Registrar Password",
  "DNS Host", "DNS Server Credential Location",
  "DNS Username", "DNS Password",
  "Website Host", "Website Credential Location",
  "Website Username", "Website Password",
  "URL", "Notes", "Is Inactive"
];

/**
 * GET /api/data/websites?client=XXX
 * Returns website/DNS records for a specific client
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

    // Preserve legacy file creation only when Excel is actually being read.
    if (getReadSource() !== "api") ensureExcelFileExists("websites", WEBSITE_HEADERS);
    const activeData = await readMigratedDataset("websites", client);

    return NextResponse.json({
      data: activeData,
      count: activeData.length,
    });
  } catch (error) {
    console.error("Error loading websites:", error);
    return NextResponse.json(
      { error: "Failed to load websites", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
