import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

// Columns A-J in the misc xlsx files
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

function getMiscFilePath(client: string): string {
  const basePath = process.env.EXCEL_BASE_PATH || "./Examples";
  return path.join(basePath, "Misc", `${client}.xlsx`);
}

function readMiscData(filePath: string): { data: Record<string, any>[]; sheetName: string } | null {
  if (!fs.existsSync(filePath)) return null;

  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return null;

  const allData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
  const data = allData.map((row) => {
    const filtered: Record<string, any> = {};
    for (const col of MISC_COLUMNS) {
      filtered[col] = row[col] ?? "";
    }
    return filtered;
  });

  return { data, sheetName };
}

function writeMiscData(filePath: string, data: Record<string, any>[], sheetName: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  fs.writeFileSync(filePath, buffer);
}

/**
 * GET /api/data/misc/[client]
 * Reads the client-specific misc xlsx file from the Misc folder
 * and returns columns A-J as JSON data
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

    const filePath = getMiscFilePath(client);
    const result = readMiscData(filePath);

    if (!result) {
      return NextResponse.json({ data: [], count: 0 });
    }

    return NextResponse.json({
      data: result.data,
      count: result.data.length,
    });
  } catch (error) {
    console.error("Error reading misc file:", error);
    return NextResponse.json(
      { error: "Failed to load misc data", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/data/misc/[client]
 * Update, add, or delete rows in the client-specific misc xlsx file
 *
 * Body:
 * {
 *   action: 'updateCell' | 'addRow' | 'deleteRow',
 *   rowIndex?: number,
 *   columnKey?: string,
 *   newValue?: any,
 *   rowData?: Record<string, any>
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
    const { action, rowIndex, columnKey, newValue, rowData } = body;

    if (!["updateCell", "addRow", "deleteRow"].includes(action)) {
      return NextResponse.json(
        { error: `Invalid action: ${action}` },
        { status: 400 }
      );
    }

    const filePath = getMiscFilePath(client);
    const result = readMiscData(filePath);
    const data = result?.data ?? [];
    const sheetName = result?.sheetName ?? "Sheet1";

    switch (action) {
      case "updateCell": {
        if (rowIndex == null || !columnKey) {
          return NextResponse.json(
            { error: "rowIndex and columnKey are required for updateCell" },
            { status: 400 }
          );
        }
        if (rowIndex < 0 || rowIndex >= data.length) {
          return NextResponse.json(
            { error: `rowIndex ${rowIndex} out of bounds (0-${data.length - 1})` },
            { status: 400 }
          );
        }
        if (!MISC_COLUMNS.includes(columnKey)) {
          return NextResponse.json(
            { error: `Invalid column: ${columnKey}` },
            { status: 400 }
          );
        }
        data[rowIndex][columnKey] = newValue ?? "";
        break;
      }

      case "addRow": {
        const newRow: Record<string, any> = {};
        for (const col of MISC_COLUMNS) {
          newRow[col] = rowData?.[col] ?? "";
        }
        data.push(newRow);
        break;
      }

      case "deleteRow": {
        if (rowIndex == null) {
          return NextResponse.json(
            { error: "rowIndex is required for deleteRow" },
            { status: 400 }
          );
        }
        if (rowIndex < 0 || rowIndex >= data.length) {
          return NextResponse.json(
            { error: `rowIndex ${rowIndex} out of bounds (0-${data.length - 1})` },
            { status: 400 }
          );
        }
        data.splice(rowIndex, 1);
        break;
      }
    }

    writeMiscData(filePath, data, sheetName);

    return NextResponse.json({ success: true, message: `${action} completed successfully` });
  } catch (error: any) {
    console.error("Error updating misc file:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update misc data" },
      { status: 500 }
    );
  }
}
