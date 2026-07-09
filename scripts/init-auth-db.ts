#!/usr/bin/env tsx

/**
 * Initialize the SQLite authentication database (schema only).
 * No default users are created — add one with:
 *   npm run users -- add <username> --role admin
 */

import { getDb } from "../src/lib/db/sqlite";

async function initAuthDB() {
  console.log("🔐 Initializing authentication database (SQLite)...\n");

  const db = await getDb();
  if (!db) {
    console.error("✗ better-sqlite3 is not available — cannot create database");
    process.exit(1);
  }

  const dbPath = process.env.AUTH_DB_PATH || "./data/auth.db";
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };

  console.log(`✓ Database ready at: ${dbPath}`);
  console.log(`  Users: ${n}`);

  if (n === 0) {
    console.log("\n📝 No users yet. Create your first admin with:");
    console.log("  npm run users -- add <username> --role admin\n");
  }
}

initAuthDB()
  .then(() => {
    console.log("✓ Initialization complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("✗ Error initializing database:", error);
    process.exit(1);
  });
