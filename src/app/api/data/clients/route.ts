import { NextRequest, NextResponse } from "next/server";
import { getAllClients } from "@/lib/excel/reader";

export async function GET(request: NextRequest) {
  try {
    const clients = getAllClients();
    return NextResponse.json({ clients });
  } catch (error) {
    console.error("Failed to load clients:", error);
    return NextResponse.json({ error: "Failed to load clients" }, { status: 500 });
  }
}
