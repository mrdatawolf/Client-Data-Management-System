/**
 * SQLite-based user preferences database operations
 * With graceful degradation for environments where better-sqlite3 isn't available
 * (the client falls back to localStorage)
 */

import { getDb } from "../db/sqlite";

export interface UserPreference {
  id: string;
  userId: string;
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get a specific preference for a user
 */
export async function getPreference(
  userId: string,
  key: string
): Promise<string | null> {
  try {
    const db = await getDb();

    if (!db) {
      // Return null - client will fall back to localStorage
      return null;
    }

    const row = db
      .prepare("SELECT value FROM user_preferences WHERE userId = ? AND key = ?")
      .get(userId, key) as { value: string } | undefined;

    return row?.value ?? null;
  } catch (error) {
    console.error("Error reading preference:", error);
    return null;
  }
}

/**
 * Set a preference for a user (insert or update)
 */
export async function setPreference(
  userId: string,
  key: string,
  value: string
): Promise<boolean> {
  try {
    const db = await getDb();

    if (!db) {
      // Return false - client will fall back to localStorage
      return false;
    }

    const crypto = await import("crypto");
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO user_preferences (id, userId, key, value, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(userId, key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt`
    ).run(crypto.randomUUID(), userId, key, value, now, now);

    return true;
  } catch (error: any) {
    // Silently handle foreign key constraint errors (user doesn't exist in DB)
    // This happens with break-glass auth or DISABLE_AUTH=true - client will use localStorage
    if (error?.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
      return false;
    }
    console.error("Error setting preference:", error);
    return false;
  }
}

/**
 * Get all preferences for a user
 */
export async function getAllPreferences(
  userId: string
): Promise<Record<string, string>> {
  try {
    const db = await getDb();

    if (!db) {
      // Return empty - client will fall back to localStorage
      return {};
    }

    const rows = db
      .prepare("SELECT key, value FROM user_preferences WHERE userId = ?")
      .all(userId) as { key: string; value: string }[];

    const preferences: Record<string, string> = {};
    for (const row of rows) {
      preferences[row.key] = row.value;
    }

    return preferences;
  } catch (error) {
    console.error("Error reading preferences:", error);
    return {};
  }
}

/**
 * Delete a specific preference for a user
 */
export async function deletePreference(
  userId: string,
  key: string
): Promise<boolean> {
  try {
    const db = await getDb();

    if (!db) {
      return false;
    }

    const result = db
      .prepare("DELETE FROM user_preferences WHERE userId = ? AND key = ?")
      .run(userId, key);

    return result.changes > 0;
  } catch (error) {
    console.error("Error deleting preference:", error);
    return false;
  }
}

/**
 * Delete all preferences for a user
 */
export async function deleteAllPreferences(userId: string): Promise<boolean> {
  try {
    const db = await getDb();

    if (!db) {
      return false;
    }

    db.prepare("DELETE FROM user_preferences WHERE userId = ?").run(userId);

    return true;
  } catch (error) {
    console.error("Error deleting preferences:", error);
    return false;
  }
}
