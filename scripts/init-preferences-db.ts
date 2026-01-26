#!/usr/bin/env tsx

/**
 * Initialize SQLite user preferences table
 * Adds preferences table to existing auth.db database
 */

import * as fs from "fs";
import { createClient } from "@libsql/client";

const DB_PATH = process.env.AUTH_DB_PATH || "./data/auth.db";

async function initPreferencesDB() {
  console.log("⚙️  Initializing user preferences table...\n");

  // Check if database exists
  if (!fs.existsSync(DB_PATH)) {
    console.error("✗ Auth database not found at:", DB_PATH);
    console.error("  Please run 'npm run auth:init' first.\n");
    process.exit(1);
  }

  // Create database client
  const db = createClient({
    url: `file:${DB_PATH}`,
  });

  // Check if preferences table already exists
  const tableCheck = await db.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='user_preferences'"
  );

  if (tableCheck.rows.length > 0) {
    console.log("⚠ user_preferences table already exists.");
    console.log("  To reset, drop the table manually and run this script again.\n");
    return;
  }

  // Create user_preferences table
  await db.execute(`
    CREATE TABLE user_preferences (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(userId, key)
    )
  `);

  // Create indexes for faster lookups
  await db.execute("CREATE INDEX idx_user_preferences_user ON user_preferences(userId)");
  await db.execute("CREATE INDEX idx_user_preferences_key ON user_preferences(key)");

  console.log("✓ user_preferences table created successfully!");
  console.log(`  Database: ${DB_PATH}\n`);
  console.log("📝 Available preference keys:");
  console.log("  - theme: 'light' | 'dark' | 'system'");
  console.log("  - (more to come)\n");
}

// Run the initialization
initPreferencesDB()
  .then(() => {
    console.log("✓ Preferences initialization complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("✗ Error initializing preferences:", error);
    process.exit(1);
  });
