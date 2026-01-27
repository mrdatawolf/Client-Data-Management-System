/**
 * SQLite-based user preferences database operations
 * With fallback for environments where @libsql/client isn't available
 */

export interface UserPreference {
  id: string;
  userId: string;
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

const DB_PATH = process.env.AUTH_DB_PATH || "./data/auth.db";

// Flag to track if database is available
let dbAvailable: boolean | null = null;
let dbClient: any = null;

/**
 * Get database client with dynamic import
 * Returns null if @libsql/client is not available
 */
async function getDatabase(): Promise<any | null> {
  // If we already know the database is unavailable, return null immediately
  if (dbAvailable === false) {
    return null;
  }

  // If we have a cached client, return it
  if (dbClient) {
    return dbClient;
  }

  try {
    // Dynamic import to avoid build-time module resolution issues
    const { createClient } = await import("@libsql/client");
    dbClient = createClient({
      url: `file:${DB_PATH}`,
    });
    dbAvailable = true;
    return dbClient;
  } catch (error) {
    console.warn("@libsql/client not available for preferences, using localStorage fallback on client");
    dbAvailable = false;
    return null;
  }
}

/**
 * Get a specific preference for a user
 */
export async function getPreference(
  userId: string,
  key: string
): Promise<string | null> {
  try {
    const db = await getDatabase();

    if (!db) {
      // Return null - client will fall back to localStorage
      return null;
    }

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
    const db = await getDatabase();

    if (!db) {
      // Return false - client will fall back to localStorage
      return false;
    }

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
    const db = await getDatabase();

    if (!db) {
      // Return empty - client will fall back to localStorage
      return {};
    }

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
    const db = await getDatabase();

    if (!db) {
      return false;
    }

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
    const db = await getDatabase();

    if (!db) {
      return false;
    }

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
