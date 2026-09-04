import { NextRequest, NextResponse } from "next/server";
import {
  archiveMigratedRow,
  createMigratedRow,
  updateMigratedRow,
} from "@/lib/data/silver-datasets";

/**
 * POST /api/data/update
 * Update, add, or delete data through BTClientDataAPI.
 *
 * Body:
 * {
 *   action: 'updateCell' | 'updateRow' | 'addRow' | 'deleteRow' | 'setInactive',
 *   fileKey: string (e.g., 'core', 'users', 'services'),
 *   apiId?: number (required for all actions except addRow),
 *   columnKey?: string (for updateCell),
 *   newValue?: any (for updateCell),
 *   updates?: { [key]: value } (for updateRow),
 *   rowData?: { [key]: value } (for addRow)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, fileKey, columnKey, newValue, updates, rowData, apiId } = body;

    if (!fileKey) {
      return NextResponse.json({ error: "fileKey is required" }, { status: 400 });
    }

    if (action === "addRow") {
      if (!rowData) {
        return NextResponse.json({ error: "rowData is required for addRow" }, { status: 400 });
      }
      const row = await createMigratedRow(fileKey, rowData);
      return NextResponse.json({ success: true, row });
    }

    if (!Number.isInteger(apiId) || apiId <= 0) {
      return NextResponse.json(
        { error: `A stable apiId is required for ${action}` },
        { status: 400 },
      );
    }

    if (action === "updateCell") {
      if (!columnKey) {
        return NextResponse.json({ error: "columnKey is required for updateCell" }, { status: 400 });
      }
      const row = await updateMigratedRow(fileKey, apiId, { [columnKey]: newValue });
      return NextResponse.json({ success: true, row });
    }

    if (action === "updateRow") {
      if (!updates) {
        return NextResponse.json({ error: "updates are required for updateRow" }, { status: 400 });
      }
      const row = await updateMigratedRow(fileKey, apiId, updates);
      return NextResponse.json({ success: true, row });
    }

    if (action === "deleteRow" || action === "setInactive") {
      await archiveMigratedRow(fileKey, apiId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error('Update API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
