/**
 * Shared SQLite connection (better-sqlite3) for the auth/preferences database.
 * Creates the schema on first open, so a missing database file "just works".
 * Returns null in environments where the native module is unavailable —
 * callers treat that as "database unavailable" and degrade gracefully.
 */

import * as fs from "fs";
import * as path from "path";
import type BetterSqlite3 from "better-sqlite3";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_username ON users(username);

  CREATE TABLE IF NOT EXISTS user_preferences (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(userId, key)
  );
  CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(userId);
  CREATE INDEX IF NOT EXISTS idx_user_preferences_key ON user_preferences(key);
`;

let db: BetterSqlite3.Database | null = null;
let dbAvailable: boolean | null = null;

/**
 * Get the shared database handle, opening it (and creating the schema)
 * on first use. Returns null if better-sqlite3 cannot be loaded.
 */
export async function getDb(): Promise<BetterSqlite3.Database | null> {
  if (dbAvailable === false) {
    return null;
  }
  if (db) {
    return db;
  }

  try {
    // Dynamic import to avoid build-time module resolution issues
    const { default: Database } = await import("better-sqlite3");
    const dbPath = process.env.AUTH_DB_PATH || "./data/auth.db";
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.exec(SCHEMA);
    dbAvailable = true;
    return db;
  } catch (error) {
    console.warn(
      "better-sqlite3 not available — database disabled:",
      error instanceof Error ? error.message : error
    );
    dbAvailable = false;
    return null;
  }
}
