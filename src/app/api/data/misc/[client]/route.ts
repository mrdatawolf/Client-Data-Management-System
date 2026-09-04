import { NextRequest, NextResponse } from "next/server";
import {
  archiveMigratedRow,
  createMigratedRow,
  readApiDataset,
  updateMigratedRow,
} from "@/lib/data/silver-datasets";

// Columns A-J in the misc rows dataset
const MISC_COLUMNS = [
  "Notes",
  "Notes 1",
  "Notes 2",
  "Notes 3",
  "Notes 4",
  "Notes 5",
  "Notes 6",
  "Notes 7",
  "Notes 8",
  "Notes 9",
];

/**
 * GET /api/data/misc/[client]
 * Returns the client's misc notes rows (columns A-J) from BTClientDataAPI.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ client: string }> }
) {
  try {
    const { client } = await context.params;

    if (!client) {
      return NextResponse.json(
        { error: "Client parameter required" },
        { status: 400 }
      );
    }

    const data = await readApiDataset("miscRows", client);
    return NextResponse.json({ data, count: data.length });
  } catch (error) {
    console.error("Error reading misc data:", error);
    return NextResponse.json(
      { error: "Failed to load misc data", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/data/misc/[client]
 * Update, add, or delete rows in the client's misc notes dataset.
 *
 * Body:
 * {
 *   action: 'updateCell' | 'addRow' | 'deleteRow',
 *   apiId?: number (required for updateCell/deleteRow),
 *   columnKey?: string (for updateCell),
 *   newValue?: any (for updateCell),
 *   rowData?: Record<string, any> (for addRow)
 * }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ client: string }> }
) {
  try {
    const { client } = await context.params;

    if (!client) {
      return NextResponse.json(
        { error: "Client parameter required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action, columnKey, newValue, rowData, apiId } = body;

    if (!["updateCell", "addRow", "deleteRow"].includes(action)) {
      return NextResponse.json(
        { error: `Invalid action: ${action}` },
        { status: 400 }
      );
    }

    if (action === "addRow") {
      const row = await createMigratedRow("miscRows", { Client: client, ...rowData });
      return NextResponse.json({ success: true, row });
    }

    if (!Number.isInteger(apiId) || apiId <= 0) {
      return NextResponse.json({ error: `A stable apiId is required for ${action}` }, { status: 400 });
    }

    if (action === "updateCell") {
      if (!MISC_COLUMNS.includes(columnKey)) {
        return NextResponse.json({ error: `Invalid column: ${columnKey}` }, { status: 400 });
      }
      const row = await updateMigratedRow("miscRows", apiId, { [columnKey]: newValue ?? "" });
      return NextResponse.json({ success: true, row });
    }

    await archiveMigratedRow("miscRows", apiId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating misc data:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update misc data" },
      { status: 500 }
    );
  }
}
