#!/usr/bin/env tsx

/**
 * Migrate Excel files from Examples/Misc/ folder to SQLite database as BLOBs
 *
 * This script:
 * 1. Creates a misc_documents table in the database
 * 2. Reads all .xlsx files from Examples/Misc/
 * 3. Stores each file as a BLOB with the client abbreviation
 * 4. Tracks file metadata (name, size, last modified)
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@libsql/client";

const DB_PATH = process.env.MISC_DB_PATH || "./data/misc.db";
const DB_DIR = path.dirname(DB_PATH);
const MISC_FOLDER = "./Examples/Misc";

interface FileMetadata {
  client: string;
  fileName: string;
  fileData: Buffer;
  fileSize: number;
  lastModified: Date;
}

async function migrateMiscFiles() {
  console.log("📦 Starting Misc Files Migration to SQLite...\n");

  // Create data directory if it doesn't exist
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    console.log(`✓ Created directory: ${DB_DIR}`);
  }

  // Check if Misc folder exists
  if (!fs.existsSync(MISC_FOLDER)) {
    console.error(`✗ Error: Misc folder not found at ${MISC_FOLDER}`);
    process.exit(1);
  }

  // Create database client
  const db = createClient({
    url: `file:${DB_PATH}`,
  });

  // Create misc_documents table if it doesn't exist
  console.log("🔨 Creating misc_documents table...");
  await db.execute(`
    CREATE TABLE IF NOT EXISTS misc_documents (
      client TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      file_data BLOB NOT NULL,
      file_size INTEGER NOT NULL,
      last_modified TEXT NOT NULL,
      uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("✓ Table created successfully\n");

  // Read all .xlsx files from Misc folder
  const files = fs.readdirSync(MISC_FOLDER).filter((file) => file.endsWith(".xlsx"));

  if (files.length === 0) {
    console.log("⚠ No .xlsx files found in Misc folder");
    return;
  }

  console.log(`📁 Found ${files.length} Excel files to migrate\n`);

  let successCount = 0;
  let errorCount = 0;
  const errors: Array<{ file: string; error: string }> = [];

  // Process each file
  for (const fileName of files) {
    const filePath = path.join(MISC_FOLDER, fileName);
    const client = path.basename(fileName, ".xlsx"); // Extract client code from filename

    try {
      // Read file as binary
      const fileData = fs.readFileSync(filePath);
      const stats = fs.statSync(filePath);

      // Convert to base64 for storage (SQLite doesn't have native BLOB support in @libsql/client)
      const fileDataBase64 = fileData.toString("base64");

      // Insert into database
      await db.execute({
        sql: `INSERT OR REPLACE INTO misc_documents
              (client, file_name, file_data, file_size, last_modified, uploaded_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
          client,
          fileName,
          fileDataBase64,
          stats.size,
          stats.mtime.toISOString(),
          new Date().toISOString(),
        ],
      });

      console.log(`✓ ${fileName} → ${client} (${(stats.size / 1024).toFixed(2)} KB)`);
      successCount++;
    } catch (error) {
      console.error(`✗ Error processing ${fileName}:`, error);
      errors.push({ file: fileName, error: String(error) });
      errorCount++;
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 Migration Summary");
  console.log("=".repeat(60));
  console.log(`✓ Successfully migrated: ${successCount} files`);
  console.log(`✗ Failed: ${errorCount} files`);
  console.log(`📂 Database location: ${DB_PATH}`);

  if (errors.length > 0) {
    console.log("\n⚠ Errors encountered:");
    errors.forEach(({ file, error }) => {
      console.log(`  - ${file}: ${error}`);
    });
  }

  // Verify data
  const result = await db.execute("SELECT COUNT(*) as count FROM misc_documents");
  const count = result.rows[0].count;
  console.log(`\n✓ Database contains ${count} misc documents`);

  console.log("\n🎉 Migration complete!");
}

// Run the migration
migrateMiscFiles()
  .then(() => {
    console.log("\n✓ Script execution complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n✗ Fatal error during migration:", error);
    process.exit(1);
  });
