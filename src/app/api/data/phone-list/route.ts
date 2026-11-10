import { NextRequest, NextResponse } from "next/server";
import { PhoneListError, readPhoneList } from "@/lib/data/phone-list";

/**
 * @swagger
 * /api/data/phone-list:
 *   get:
 *     tags: [Data]
 *     summary: Phone-system user list for a client
 *     description: Reads `<PHONE_LIST>/<client>.xlsx` (read-only). Returns `available false` when the client has no file.
 *     parameters:
 *       - in: query
 *         name: client
 *         required: true
 *         schema: { type: string, example: GLC }
 *         description: Client abbreviation (letters, digits, `_` and `-` only)
 *     responses:
 *       200:
 *         description: Phone list, or `{ available false }` when no file exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 available: { type: boolean }
 *                 users:
 *                   type: array
 *                   description: Users sheet (Name, Extension, Direct Number (DID), Mobile Phone, Email, Department, Job Title, Site, Status)
 *                   items: { type: object, additionalProperties: { type: string } }
 *                 callQueues:
 *                   type: array
 *                   description: Call Queues sheet, keyed by its header row
 *                   items: { type: object, additionalProperties: { type: string } }
 *       400: { description: Missing or invalid client }
 *       401: { description: Not authenticated }
 *       500: { description: PHONE_LIST not configured or the file could not be read }
 */
export async function GET(request: NextRequest) {
  const client = request.nextUrl.searchParams.get("client");
  if (!client) {
    return NextResponse.json({ error: "Client parameter required" }, { status: 400 });
  }
  try {
    return NextResponse.json(await readPhoneList(client));
  } catch (error) {
    if (error instanceof PhoneListError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error loading phone list:", error);
    return NextResponse.json(
      { error: "Failed to load phone list", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
