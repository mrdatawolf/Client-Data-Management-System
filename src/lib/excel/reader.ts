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

  // Special handling for companies.xlsx - check COMPANIES_FILE_PATH at runtime
  if (fileKey === "companies" && process.env.COMPANIES_FILE_PATH) {
    return process.env.COMPANIES_FILE_PATH;
  }

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
 * Filter out inactive rows (where Inactive = 1)
 * This is the inverse of Active - removes rows marked as archived/hidden
 */
export function filterOutInactive<T extends Record<string, any>>(data: T[]): T[] {
  return data.filter((item) => item.Inactive !== 1 && item.Inactive !== '1');
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
 * Status meanings: 0=Good, 1=Billing Issue, 2=Must Contact Office
 */
export function getAllClients(): Array<{ value: string; label: string; group?: string }> {
  try {
    const companies = readExcelFile("companies");
    return companies
      .filter((c: any) => c.Abbrv && c["Company Name"]) // Only filter out entries without abbreviation or name
      .map((c: any) => ({
        value: c.Abbrv,
        label: `${c["Company Name"]} (${c.Abbrv})`,
        group: c.Group || undefined,
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

/**
 * Write workbook to file - handles UNC paths on Windows
 * XLSX.writeFile() doesn't handle UNC paths well, so we use fs.writeFileSync with a buffer
 */
function writeWorkbookToFile(workbook: XLSX.WorkBook, filePath: string): void {
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  // Get file stats before write to compare
  const statsBefore = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
  const sizeBefore = statsBefore?.size || 0;

  // Write the buffer
  fs.writeFileSync(filePath, buffer);

  // Verify the write succeeded by checking file stats
  const statsAfter = fs.statSync(filePath);
  console.log(`Excel write: ${filePath}`);
  console.log(`  Before: ${sizeBefore} bytes, After: ${statsAfter.size} bytes`);

  if (statsAfter.size === 0) {
    throw new Error(`Write verification failed: file is empty after write`);
  }
}

/**
 * Update a single cell in an Excel file
 * @param fileKey - The key of the Excel file (e.g., 'core', 'users')
 * @param rowIdentifier - An object with key-value pairs to identify the row (e.g., { Name: 'Server1', Client: 'BT' })
 * @param columnKey - The column to update
 * @param newValue - The new value for the cell
 * @returns true if successful, false otherwise
 */
export function updateExcelCell(
  fileKey: keyof typeof EXCEL_FILES,
  rowIdentifier: Record<string, any>,
  columnKey: string,
  newValue: any
): boolean {
  const config = EXCEL_FILES[fileKey];
  const filePath = getExcelFilePath(fileKey);

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
      throw new Error(`Sheet "${config.sheetName}" not found in ${config.fileName}`);
    }

    // Convert to JSON to find the row
    const data = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { header: 1 });
    const headers = data[0] as string[];

    // Find the column index for the update
    const columnIndex = headers.indexOf(columnKey);
    if (columnIndex === -1) {
      throw new Error(`Column "${columnKey}" not found in sheet`);
    }

    // Find the row that matches all identifier fields
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      const row = data[i] as any[];
      let matches = true;

      for (const [key, value] of Object.entries(rowIdentifier)) {
        const keyIndex = headers.indexOf(key);
        if (keyIndex === -1 || row[keyIndex] !== value) {
          matches = false;
          break;
        }
      }

      if (matches) {
        rowIndex = i;
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error(`Row not found matching identifiers: ${JSON.stringify(rowIdentifier)}`);
    }

    // Update the cell
    // Excel cell reference is like A1, B2, etc.
    const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });

    const oldValue = sheet[cellRef]?.v;

    // Create or update the cell
    if (!sheet[cellRef]) {
      sheet[cellRef] = { t: 's', v: newValue };
    } else {
      sheet[cellRef].v = newValue;
      // Update type if needed
      if (typeof newValue === 'number') {
        sheet[cellRef].t = 'n';
      } else {
        sheet[cellRef].t = 's';
      }
    }

    console.log(`Updating cell ${cellRef} in ${config.fileName}: "${oldValue}" -> "${newValue}"`);

    // Write the workbook back to file
    writeWorkbookToFile(workbook, filePath);

    // Clear cache for this file so next read gets fresh data
    clearCache(fileKey);

    // Verify the write by reading back the value
    const verifyBuffer = fs.readFileSync(filePath);
    const verifyWorkbook = XLSX.read(verifyBuffer, { type: "buffer" });
    const verifySheet = verifyWorkbook.Sheets[config.sheetName];
    const verifyValue = verifySheet[cellRef]?.v;
    console.log(`Verification read: cell ${cellRef} = "${verifyValue}"`);

    if (verifyValue !== newValue) {
      console.error(`WRITE VERIFICATION FAILED! Expected "${newValue}" but got "${verifyValue}"`);
      throw new Error(`Write verification failed: value was not persisted`);
    }

    console.log('Update verified successfully');
    return true;
  } catch (error) {
    console.error(`Error updating Excel file ${config.fileName}:`, error);
    throw error;
  }
}

/**
 * Update an entire row in an Excel file
 * @param fileKey - The key of the Excel file
 * @param rowIdentifier - An object with key-value pairs to identify the row
 * @param updates - An object with column keys and new values
 * @returns true if successful
 */
export function updateExcelRow(
  fileKey: keyof typeof EXCEL_FILES,
  rowIdentifier: Record<string, any>,
  updates: Record<string, any>
): boolean {
  const config = EXCEL_FILES[fileKey];
  const filePath = getExcelFilePath(fileKey);

  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });

    const sheet = workbook.Sheets[config.sheetName];
    if (!sheet) {
      throw new Error(`Sheet "${config.sheetName}" not found in ${config.fileName}`);
    }

    const data = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { header: 1 });
    const headers = data[0] as string[];

    // Find the row
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      const row = data[i] as any[];
      let matches = true;

      for (const [key, value] of Object.entries(rowIdentifier)) {
        const keyIndex = headers.indexOf(key);
        if (keyIndex === -1 || row[keyIndex] !== value) {
          matches = false;
          break;
        }
      }

      if (matches) {
        rowIndex = i;
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error(`Row not found matching identifiers: ${JSON.stringify(rowIdentifier)}`);
    }

    // Update all specified columns
    for (const [columnKey, newValue] of Object.entries(updates)) {
      const columnIndex = headers.indexOf(columnKey);
      if (columnIndex === -1) {
        console.warn(`Column "${columnKey}" not found, skipping`);
        continue;
      }

      const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });

      if (!sheet[cellRef]) {
        sheet[cellRef] = { t: 's', v: newValue };
      } else {
        sheet[cellRef].v = newValue;
        if (typeof newValue === 'number') {
          sheet[cellRef].t = 'n';
        } else {
          sheet[cellRef].t = 's';
        }
      }
    }

    writeWorkbookToFile(workbook, filePath);
    clearCache(fileKey);

    return true;
  } catch (error) {
    console.error(`Error updating Excel file ${config.fileName}:`, error);
    throw error;
  }
}

/**
 * Ensure a column exists in an Excel file, adding it if missing
 * @param fileKey - The key of the Excel file
 * @param columnName - The name of the column to ensure exists
 * @returns true if column exists or was added successfully
 */
export function ensureColumnExists(
  fileKey: keyof typeof EXCEL_FILES,
  columnName: string
): boolean {
  const config = EXCEL_FILES[fileKey];
  const filePath = getExcelFilePath(fileKey);

  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });

    const sheet = workbook.Sheets[config.sheetName];
    if (!sheet) {
      throw new Error(`Sheet "${config.sheetName}" not found in ${config.fileName}`);
    }

    const data = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { header: 1 });
    const headers = data[0] as string[];

    // Check if column already exists
    if (headers.includes(columnName)) {
      return true;
    }

    // Add the new column header
    const newColumnIndex = headers.length;
    const headerCellRef = XLSX.utils.encode_cell({ r: 0, c: newColumnIndex });
    sheet[headerCellRef] = { t: 's', v: columnName };

    // Update sheet range to include new column
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    range.e.c = newColumnIndex;
    sheet['!ref'] = XLSX.utils.encode_range(range);

    console.log(`Added column "${columnName}" to ${config.fileName}`);

    writeWorkbookToFile(workbook, filePath);
    clearCache(fileKey);

    return true;
  } catch (error) {
    console.error(`Error ensuring column exists in ${config.fileName}:`, error);
    throw error;
  }
}

/**
 * Add a new row to an Excel file
 * @param fileKey - The key of the Excel file
 * @param rowData - An object with column keys and values for the new row
 * @returns true if successful
 */
export function addExcelRow(
  fileKey: keyof typeof EXCEL_FILES,
  rowData: Record<string, any>
): boolean {
  const config = EXCEL_FILES[fileKey];
  const filePath = getExcelFilePath(fileKey);

  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });

    const sheet = workbook.Sheets[config.sheetName];
    if (!sheet) {
      throw new Error(`Sheet "${config.sheetName}" not found in ${config.fileName}`);
    }

    // Get current data to find the next row
    const data = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { header: 1 });
    const headers = data[0] as string[];
    const newRowIndex = data.length;

    // Add each field to the new row
    for (const [columnKey, value] of Object.entries(rowData)) {
      const columnIndex = headers.indexOf(columnKey);
      if (columnIndex === -1) {
        console.warn(`Column "${columnKey}" not found, skipping`);
        continue;
      }

      const cellRef = XLSX.utils.encode_cell({ r: newRowIndex, c: columnIndex });
      sheet[cellRef] = {
        t: typeof value === 'number' ? 'n' : 's',
        v: value
      };
    }

    // Update sheet range
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    range.e.r = newRowIndex;
    sheet['!ref'] = XLSX.utils.encode_range(range);

    writeWorkbookToFile(workbook, filePath);
    clearCache(fileKey);

    return true;
  } catch (error) {
    console.error(`Error adding row to Excel file ${config.fileName}:`, error);
    throw error;
  }
}

/**
 * Delete a row from an Excel file
 * @param fileKey - The key of the Excel file
 * @param rowIdentifier - An object with key-value pairs to identify the row
 * @returns true if successful
 */
export function deleteExcelRow(
  fileKey: keyof typeof EXCEL_FILES,
  rowIdentifier: Record<string, any>
): boolean {
  const config = EXCEL_FILES[fileKey];
  const filePath = getExcelFilePath(fileKey);

  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });

    const sheet = workbook.Sheets[config.sheetName];
    if (!sheet) {
      throw new Error(`Sheet "${config.sheetName}" not found in ${config.fileName}`);
    }

    // Convert to array of arrays
    const data = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 }) as any[][];
    const headers = data[0] as string[];

    // Find and remove the row
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      const row = data[i] as any[];
      let matches = true;

      for (const [key, value] of Object.entries(rowIdentifier)) {
        const keyIndex = headers.indexOf(key);
        if (keyIndex === -1 || row[keyIndex] !== value) {
          matches = false;
          break;
        }
      }

      if (matches) {
        rowIndex = i;
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error(`Row not found matching identifiers: ${JSON.stringify(rowIdentifier)}`);
    }

    // Remove the row from data array
    data.splice(rowIndex, 1);

    // Create new sheet from modified data
    const newSheet = XLSX.utils.aoa_to_sheet(data);
    workbook.Sheets[config.sheetName] = newSheet;

    writeWorkbookToFile(workbook, filePath);
    clearCache(fileKey);

    return true;
  } catch (error) {
    console.error(`Error deleting row from Excel file ${config.fileName}:`, error);
    throw error;
  }
}
