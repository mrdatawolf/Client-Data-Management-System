import { NextRequest, NextResponse } from "next/server";
import { addExcelRow, updateExcelRow, ensureExcelFileExists, readExcelFile } from "@/lib/excel/reader";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const abbrv = searchParams.get("abbrv");

    if (!abbrv) {
      return NextResponse.json({ error: "Missing abbrv" }, { status: 400 });
    }

    const companies = readExcelFile("companies");
    const company = companies.find((c: any) => String(c.Abbrv) === abbrv);

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({ company });
  } catch (error: any) {
    console.error("Failed to load company:", error);
    return NextResponse.json({ error: error.message || "Failed to load company" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, rowData, rowIdentifier } = body;

    if (!rowData) {
      return NextResponse.json({ error: "Missing rowData" }, { status: 400 });
    }

    ensureExcelFileExists("companies", ["Company Name", "Abbrv", "Group", "Status"]);

    if (action === "add") {
      const existing = readExcelFile("companies").some(
        (c: any) => String(c.Abbrv).trim().toLowerCase() === String(rowData.Abbrv).trim().toLowerCase()
      );
      if (existing) {
        return NextResponse.json({ error: "A company with this abbreviation already exists" }, { status: 409 });
      }

      const success = addExcelRow("companies", rowData);
      if (!success) {
        return NextResponse.json({ error: "Failed to add company" }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "update") {
      if (!rowIdentifier?.Abbrv) {
        return NextResponse.json({ error: "Missing company identifier" }, { status: 400 });
      }

      const success = updateExcelRow("companies", rowIdentifier, rowData);
      if (!success) {
        return NextResponse.json({ error: "Failed to update company" }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Failed to save company:", error);
    return NextResponse.json({ error: error.message || "Failed to save company" }, { status: 500 });
  }
}
