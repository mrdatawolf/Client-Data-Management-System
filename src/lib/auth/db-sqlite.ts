/**
 * SQLite-based authentication database using @libsql/client
 * With fallback for environments where the module isn't available
 */

import bcrypt from "bcryptjs";

interface User {
  id: string;
  username: string;
  password: string;
  email?: string | null;
  role: string;
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
    console.warn("@libsql/client not available, using fallback authentication");
    dbAvailable = false;
    return null;
  }
}

/**
 * Default admin user for fallback when database is unavailable
 */
const FALLBACK_ADMIN: User = {
  id: "fallback-admin-001",
  username: "admin",
  // bcrypt hash of "admin123"
  password: "$2b$10$vGTuWeZolwBLnQcZNdjkiu8lNmeTUOnNV8Ci89dImxU9tiBOE1aBG",
  email: null,
  role: "admin",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Find a user by username
 */
export async function findUserByUsername(username: string): Promise<User | null> {
  try {
    const db = await getDatabase();

    // Fallback: return default admin if database unavailable
    if (!db) {
      if (username === FALLBACK_ADMIN.username) {
        return FALLBACK_ADMIN;
      }
      return null;
    }

    const result = await db.execute({
      sql: "SELECT * FROM users WHERE username = ?",
      args: [username],
    });

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id as string,
      username: row.username as string,
      password: row.password as string,
      email: row.email as string | null,
      role: row.role as string,
      createdAt: row.createdAt as string,
      updatedAt: row.updatedAt as string,
    };
  } catch (error) {
    console.error("Error reading user database:", error);
    // Fallback on error
    if (username === FALLBACK_ADMIN.username) {
      return FALLBACK_ADMIN;
    }
    return null;
  }
}

/**
 * Find a user by ID
 */
export async function findUserById(id: string): Promise<User | null> {
  try {
    const db = await getDatabase();

    // Fallback: return default admin if database unavailable
    if (!db) {
      if (id === FALLBACK_ADMIN.id) {
        return FALLBACK_ADMIN;
      }
      return null;
    }

    const result = await db.execute({
      sql: "SELECT * FROM users WHERE id = ?",
      args: [id],
    });

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id as string,
      username: row.username as string,
      password: row.password as string,
      email: row.email as string | null,
      role: row.role as string,
      createdAt: row.createdAt as string,
      updatedAt: row.updatedAt as string,
    };
  } catch (error) {
    console.error("Error reading user database:", error);
    if (id === FALLBACK_ADMIN.id) {
      return FALLBACK_ADMIN;
    }
    return null;
  }
}

/**
 * Verify a user's password
 */
export async function verifyPassword(
  username: string,
  password: string
): Promise<Omit<User, "password"> | null> {
  const user = await findUserByUsername(username);

  if (!user) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) {
    return null;
  }

  // Return user without password
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Create a new user
 */
export async function createUser(
  username: string,
  password: string,
  email?: string,
  role: string = "user"
): Promise<Omit<User, "password">> {
  const db = await getDatabase();

  if (!db) {
    throw new Error("Database not available - cannot create users in fallback mode");
  }

  // Check if username already exists
  const existingResult = await db.execute({
    sql: "SELECT id FROM users WHERE username = ?",
    args: [username],
  });

  if (existingResult.rows.length > 0) {
    throw new Error("Username already exists");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  const crypto = await import("crypto");
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.execute({
    sql: "INSERT INTO users (id, username, password, email, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [id, username, hashedPassword, email || null, role, now, now],
  });

  return {
    id,
    username,
    email: email || null,
    role,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Update a user's password
 */
export async function updateUserPassword(
  userId: string,
  newPassword: string
): Promise<boolean> {
  const db = await getDatabase();

  if (!db) {
    throw new Error("Database not available - cannot update password in fallback mode");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const now = new Date().toISOString();

  const result = await db.execute({
    sql: "UPDATE users SET password = ?, updatedAt = ? WHERE id = ?",
    args: [hashedPassword, now, userId],
  });

  return result.rowsAffected > 0;
}

/**
 * Delete a user
 */
export async function deleteUser(userId: string): Promise<boolean> {
  const db = await getDatabase();

  if (!db) {
    throw new Error("Database not available - cannot delete users in fallback mode");
  }

  const result = await db.execute({
    sql: "DELETE FROM users WHERE id = ?",
    args: [userId],
  });

  return result.rowsAffected > 0;
}

/**
 * List all users (without passwords)
 */
export async function listUsers(): Promise<Omit<User, "password">[]> {
  const db = await getDatabase();

  if (!db) {
    // Return fallback admin in list
    const { password: _, ...adminWithoutPassword } = FALLBACK_ADMIN;
    return [adminWithoutPassword];
  }

  const result = await db.execute(
    "SELECT id, username, email, role, createdAt, updatedAt FROM users"
  );

  return result.rows.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    username: row.username as string,
    email: row.email as string | null,
    role: row.role as string,
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  }));
}
