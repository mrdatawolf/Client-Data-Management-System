import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";
import { EXCEL_FILES, type ExcelFileConfig } from "@/types/data";

// Cache for parsed Excel data
const dataCache = new Map<string, { data: any[]; timestamp: number }>();

// Cache TTL from environment (default 5 minutes)
const CACHE_TTL = parseInt(process.env.EXCEL_CACHE_TTL || "300000", 10);

/**
 * Get the full path to an Excel file
 */
export function getExcelFilePath(fileKey: keyof typeof EXCEL_FILES): string {
  const config = EXCEL_FILES[fileKey];

  // Use custom path if specified (e.g., for companies.xlsx)
  if (config.path) {
    return config.path;
  }

  // Use base path from environment
  const basePath = process.env.EXCEL_BASE_PATH || "./Examples";
  return path.join(basePath, config.fileName);
}

/**
 * Read and parse an Excel file
 */
export function readExcelFile<T = any>(
  fileKey: keyof typeof EXCEL_FILES,
  useCache = true
): T[] {
  const config = EXCEL_FILES[fileKey];
  const filePath = getExcelFilePath(fileKey);

  // Check cache first
  if (useCache) {
    const cached = dataCache.get(fileKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data as T[];
    }
  }

  try {
    // Read the Excel file
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });

    // Get the specified sheet
    const sheet = workbook.Sheets[config.sheetName];
    if (!sheet) {
      throw new Error(
        `Sheet "${config.sheetName}" not found in ${config.fileName}`
      );
    }

    // Convert sheet to JSON
    const data = XLSX.utils.sheet_to_json<T>(sheet);

    // Update cache
    dataCache.set(fileKey, { data, timestamp: Date.now() });

    return data;
  } catch (error) {
    console.error(`Error reading Excel file ${config.fileName}:`, error);
    throw error;
  }
}

/**
 * Clear cache for a specific file or all files
 */
export function clearCache(fileKey?: keyof typeof EXCEL_FILES): void {
  if (fileKey) {
    dataCache.delete(fileKey);
  } else {
    dataCache.clear();
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const stats: Record<string, { size: number; age: number }> = {};

  dataCache.forEach((value, key) => {
    stats[key] = {
      size: value.data.length,
      age: Date.now() - value.timestamp,
    };
  });

  return stats;
}

/**
 * Filter data by client
 */
export function filterByClient<T extends { Client: string }>(
  data: T[],
  client?: string
): T[] {
  if (!client) return data;
  return data.filter((item) => item.Client === client);
}

/**
 * Filter data by active status
 */
export function filterByActive<T extends { Active: number }>(
  data: T[],
  active?: boolean
): T[] {
  if (active === undefined) return data;
  return data.filter((item) => (active ? item.Active === 1 : item.Active === 0));
}

/**
 * Search data across multiple fields
 */
export function searchData<T extends Record<string, any>>(
  data: T[],
  searchTerm: string,
  fields: (keyof T)[]
): T[] {
  if (!searchTerm) return data;

  const lowerSearch = searchTerm.toLowerCase();
  return data.filter((item) =>
    fields.some((field) => {
      const value = item[field];
      return value != null && String(value).toLowerCase().includes(lowerSearch);
    })
  );
}

/**
 * Sort data by a field
 */
export function sortData<T extends Record<string, any>>(
  data: T[],
  field: keyof T,
  direction: "asc" | "desc" = "asc"
): T[] {
  return [...data].sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];

    if (aVal == null) return 1;
    if (bVal == null) return -1;

    if (typeof aVal === "number" && typeof bVal === "number") {
      return direction === "asc" ? aVal - bVal : bVal - aVal;
    }

    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();

    if (direction === "asc") {
      return aStr.localeCompare(bStr);
    } else {
      return bStr.localeCompare(aStr);
    }
  });
}

/**
 * Get all unique clients from companies file
 */
export function getAllClients(): Array<{ value: string; label: string }> {
  try {
    const companies = readExcelFile("companies");
    return companies
      .filter((c: any) => c.Status === 1)
      .map((c: any) => ({
        value: c.Abbrv,
        label: `${c["Company Name"]} (${c.Abbrv})`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  } catch (error) {
    console.error("Error loading clients:", error);
    return [];
  }
}

/**
 * Validate that a client exists
 */
export function isValidClient(clientAbbr: string): boolean {
  const clients = getAllClients();
  return clients.some((c) => c.value === clientAbbr);
}
