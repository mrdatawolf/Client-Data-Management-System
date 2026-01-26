/**
 * SQLite-based user preferences database operations
 */

import { createClient } from "@libsql/client";

export interface UserPreference {
  id: string;
  userId: string;
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

const DB_PATH = process.env.AUTH_DB_PATH || "./data/auth.db";

/**
 * Get database client
 */
function getDatabase() {
  return createClient({
    url: `file:${DB_PATH}`,
  });
}

/**
 * Get a specific preference for a user
 */
export async function getPreference(
  userId: string,
  key: string
): Promise<string | null> {
  try {
    const db = getDatabase();
    const result = await db.execute({
      sql: "SELECT value FROM user_preferences WHERE userId = ? AND key = ?",
      args: [userId, key],
    });

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].value as string;
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
    const db = getDatabase();
    const now = new Date().toISOString();

    // Check if preference exists
    const existing = await db.execute({
      sql: "SELECT id FROM user_preferences WHERE userId = ? AND key = ?",
      args: [userId, key],
    });

    if (existing.rows.length > 0) {
      // Update existing
      await db.execute({
        sql: "UPDATE user_preferences SET value = ?, updatedAt = ? WHERE userId = ? AND key = ?",
        args: [value, now, userId, key],
      });
    } else {
      // Insert new
      const crypto = await import("crypto");
      const id = crypto.randomUUID();

      await db.execute({
        sql: "INSERT INTO user_preferences (id, userId, key, value, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
        args: [id, userId, key, value, now, now],
      });
    }

    return true;
  } catch (error) {
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
    const db = getDatabase();
    const result = await db.execute({
      sql: "SELECT key, value FROM user_preferences WHERE userId = ?",
      args: [userId],
    });

    const preferences: Record<string, string> = {};
    for (const row of result.rows) {
      preferences[row.key as string] = row.value as string;
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
    const db = getDatabase();
    const result = await db.execute({
      sql: "DELETE FROM user_preferences WHERE userId = ? AND key = ?",
      args: [userId, key],
    });

    return result.rowsAffected > 0;
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
    const db = getDatabase();
    await db.execute({
      sql: "DELETE FROM user_preferences WHERE userId = ?",
      args: [userId],
    });

    return true;
  } catch (error) {
    console.error("Error deleting preferences:", error);
    return false;
  }
}
