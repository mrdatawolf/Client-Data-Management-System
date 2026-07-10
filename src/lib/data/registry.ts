/**
 * Data-source registry: the single place that knows where every piece of
 * app data currently lives, and how to verify it's reachable.
 *
 * Today every dataset is an Excel file (EXCEL_FILES) plus the SQLite
 * auth/preferences database. As datasets migrate to the database one file
 * at a time, their entry here flips from excel to sqlite — the startup
 * report and /api/health then show the new source automatically.
 *
 * Consumed by src/instrumentation.ts (startup report) and /api/health.
 */

import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";
import { EXCEL_FILES } from "@/types/data";
import { getExcelFilePath } from "@/lib/excel/reader";

export type DataSourceType = "excel" | "sqlite" | "folder";

export interface DataSourceStatus {
  /** Dataset key, e.g. "core", "companies", "auth-db" */
  key: string;
  type: DataSourceType;
  /** Resolved path the server actually uses */
  location: string;
  /** Sheet name (excel) or table name (sqlite) */
  container: string;
  ok: boolean;
  /** Row count (excel/sqlite) or file count (folder) when ok */
  rows?: number;
  /** Why the check failed */
  error?: string;
  /** Missing is expected/tolerable for this source */
  optional?: boolean;
}

function checkExcelSource(key: string): DataSourceStatus {
  const config = EXCEL_FILES[key];
  const location = getExcelFilePath(key as keyof typeof EXCEL_FILES);
  const base: DataSourceStatus = {
    key,
    type: "excel",
    location,
    container: config.sheetName,
    ok: false,
  };

  try {
    if (!fs.existsSync(location)) {
      return { ...base, error: "file not found" };
    }
    const workbook = XLSX.read(fs.readFileSync(location), { type: "buffer" });
    const sheet = workbook.Sheets[config.sheetName];
    if (!sheet) {
      return {
        ...base,
        error: `sheet "${config.sheetName}" not found (has: ${workbook.SheetNames.join(", ")})`,
      };
    }
    const rows = XLSX.utils.sheet_to_json(sheet).length;
    return { ...base, ok: true, rows };
  } catch (error) {
    return { ...base, error: error instanceof Error ? error.message : String(error) };
  }
}

function checkMiscFolder(): DataSourceStatus {
  const basePath = process.env.EXCEL_BASE_PATH || "./Examples";
  const location = path.join(basePath, "Misc");
  const base: DataSourceStatus = {
    key: "misc",
    type: "folder",
    location,
    container: "per-client .xlsx files",
    ok: false,
    optional: true,
  };

  try {
    if (!fs.existsSync(location)) {
      return { ...base, error: "folder not found" };
    }
    const files = fs.readdirSync(location).filter((f) => f.endsWith(".xlsx"));
    return { ...base, ok: true, rows: files.length };
  } catch (error) {
    return { ...base, error: error instanceof Error ? error.message : String(error) };
  }
}

async function checkSqliteSources(): Promise<DataSourceStatus[]> {
  const location = process.env.AUTH_DB_PATH || "./data/auth.db";
  const tables: Array<{ key: string; table: string }> = [
    { key: "auth-db", table: "users" },
    { key: "preferences-db", table: "user_preferences" },
  ];

  try {
    const { getDb, getDbLoadError } = await import("@/lib/db/sqlite");
    const db = await getDb();
    if (!db) {
      const reason = getDbLoadError();
      return tables.map(({ key, table }) => ({
        key,
        type: "sqlite" as const,
        location,
        container: table,
        ok: false,
        error: reason
          ? `better-sqlite3 failed to load: ${reason}`
          : "better-sqlite3 unavailable",
      }));
    }
    return tables.map(({ key, table }) => {
      try {
        const { n } = db
          .prepare(`SELECT COUNT(*) AS n FROM ${table}`)
          .get() as { n: number };
        return { key, type: "sqlite" as const, location, container: table, ok: true, rows: n };
      } catch (error) {
        return {
          key,
          type: "sqlite" as const,
          location,
          container: table,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });
  } catch (error) {
    return tables.map(({ key, table }) => ({
      key,
      type: "sqlite" as const,
      location,
      container: table,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }));
  }
}

/**
 * Check every registered data source. Reads each Excel workbook, so on a
 * slow network share this can take a few seconds.
 */
export async function checkDataSources(): Promise<DataSourceStatus[]> {
  const excel = Object.keys(EXCEL_FILES).map(checkExcelSource);
  const sqlite = await checkSqliteSources();
  return [...excel, checkMiscFolder(), ...sqlite];
}
