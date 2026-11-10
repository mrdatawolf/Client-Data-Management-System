import { access } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";

/** Columns returned from the "Users" sheet, in display order. */
export const PHONE_USER_COLUMNS = [
  "Name",
  "Extension",
  "Direct Number (DID)",
  "Mobile Phone",
  "Email",
  "Department",
  "Job Title",
  "Site",
  "Status",
] as const;

export type PhoneRow = Record<string, string>;

export type PhoneListResult =
  | { available: false }
  | { available: true; users: PhoneRow[]; callQueues: PhoneRow[] };

export class PhoneListError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const CLIENT_PATTERN = /^[A-Za-z0-9_-]+$/;
const PLACEHOLDER = /^%[^%]+%$/;

/** Converts any exceljs cell value (rich text, hyperlink, formula, date) to plain text. */
function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((r) => r.text).join("").trim();
    if ("text" in value) return cellText(value.text as ExcelJS.CellValue);
    if ("result" in value) return cellText(value.result as ExcelJS.CellValue);
    if ("error" in value) return "";
    return "";
  }
  return String(value).trim();
}

/**
 * Reads a sheet as objects keyed by its header row. Phone-system exports may
 * carry a `%Token%` placeholder row above the readable headers; it is skipped.
 */
function readSheet(sheet: ExcelJS.Worksheet | undefined): PhoneRow[] {
  if (!sheet) return [];
  let headers: string[] | null = null;
  const rows: PhoneRow[] = [];
  sheet.eachRow((row) => {
    const values: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      values[col - 1] = cellText(cell.value);
    });
    if (!headers) {
      const filled = values.filter(Boolean);
      if (filled.length > 0 && filled.every((v) => PLACEHOLDER.test(v))) return;
      headers = values.map((v) => v ?? "");
      return;
    }
    const record: PhoneRow = {};
    headers.forEach((header, i) => {
      if (header) record[header] = values[i] ?? "";
    });
    if (Object.values(record).some(Boolean)) rows.push(record);
  });
  return rows;
}

function toUserRow(row: PhoneRow): PhoneRow {
  const name = [row["First Name"], row["Last Name"]].filter(Boolean).join(" ");
  const out: PhoneRow = { Name: name };
  for (const key of PHONE_USER_COLUMNS) {
    if (key !== "Name") out[key] = row[key] ?? "";
  }
  return out;
}

/** Resolves `<PHONE_LIST>/<client>.xlsx`, refusing anything outside the folder. */
export function resolvePhoneListPath(client: string): string {
  const root = process.env.PHONE_LIST?.trim();
  if (!root) {
    throw new PhoneListError("PHONE_LIST is not configured", 500);
  }
  if (!CLIENT_PATTERN.test(client)) {
    throw new PhoneListError("Invalid client", 400);
  }
  const base = path.resolve(root);
  const file = path.resolve(base, `${client}.xlsx`);
  if (path.dirname(file) !== base) {
    throw new PhoneListError("Invalid client", 400);
  }
  return file;
}

/** Loads the phone-system user list for a client, if a file exists for it. */
export async function readPhoneList(client: string): Promise<PhoneListResult> {
  const file = resolvePhoneListPath(client);
  try {
    await access(file);
  } catch {
    return { available: false };
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file);
  const users = readSheet(workbook.getWorksheet("Users") ?? workbook.worksheets[0]);
  const callQueues = readSheet(workbook.getWorksheet("Call Queues"));
  return { available: true, users: users.map(toUserRow), callQueues };
}
