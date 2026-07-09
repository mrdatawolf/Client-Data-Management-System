#!/usr/bin/env tsx

/**
 * Initialize the SQLite user preferences table.
 * The shared schema (users + user_preferences) is created automatically
 * on first database open, so this just verifies it.
 */

import { getDb } from "../src/lib/db/sqlite";

async function initPreferencesDB() {
  console.log("⚙️  Initializing user preferences table...\n");

  const db = await getDb();
  if (!db) {
    console.error("✗ better-sqlite3 is not available — cannot create database");
    process.exit(1);
  }

  const table = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_preferences'")
    .get();

  if (!table) {
    console.error("✗ user_preferences table missing — schema creation failed");
    process.exit(1);
  }

  console.log("✓ user_preferences table ready!");
  console.log(`  Database: ${process.env.AUTH_DB_PATH || "./data/auth.db"}\n`);
}

initPreferencesDB()
  .then(() => {
    console.log("✓ Preferences initialization complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("✗ Error initializing preferences:", error);
    process.exit(1);
  });
