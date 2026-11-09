/**
 * SQLite-based authentication database using better-sqlite3
 * With graceful degradation for environments where the module isn't available
 */

import bcrypt from "bcryptjs";
import { getDb } from "../db/sqlite";
import { FALLBACK_ADMIN_ID } from "./fallback-admin";

interface User {
  id: string;
  username: string;
  password: string;
  email?: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Break-glass admin from the environment.
 * When FALLBACK_ADMIN_USERNAME and FALLBACK_ADMIN_PASSWORD are set in .env,
 * this account can ALWAYS log in with full admin access — even if the
 * database is unavailable or its users table is broken. Leave the variables
 * unset to disable it entirely.
 */
const BREAK_GLASS_ID = FALLBACK_ADMIN_ID;

let breakGlassAdmin: User | null | undefined;

function getBreakGlassAdmin(): User | null {
  if (
    !process.env.FALLBACK_ADMIN_USERNAME ||
    !process.env.FALLBACK_ADMIN_PASSWORD
  ) {
    return null;
  }

  if (breakGlassAdmin !== undefined) {
    return breakGlassAdmin;
  }

  const username = process.env.FALLBACK_ADMIN_USERNAME;
  const password = process.env.FALLBACK_ADMIN_PASSWORD;

  if (!username || !password) {
    breakGlassAdmin = null;
    return null;
  }

  const now = new Date().toISOString();
  breakGlassAdmin = {
    id: BREAK_GLASS_ID,
    username,
    password: bcrypt.hashSync(password, 10),
    email: null,
    role: "admin",
    createdAt: now,
    updatedAt: now,
  };
  return breakGlassAdmin;
}

/**
 * Find a user by username
 */
export async function findUserByUsername(
  username: string,
): Promise<User | null> {
  try {
    const db = await getDb();

    if (db) {
      const row = db
        .prepare("SELECT * FROM users WHERE username = ?")
        .get(username) as User | undefined;
      if (row) {
        return row;
      }
    }

    const admin = getBreakGlassAdmin();
    if (admin && username === admin.username) {
      return admin;
    }
    return null;
  } catch (error) {
    console.error("Error reading user database:", error);
    const admin = getBreakGlassAdmin();
    if (admin && username === admin.username) {
      return admin;
    }
    return null;
  }
}

/**
 * Find a user by ID
 */
export async function findUserById(id: string): Promise<User | null> {
  const admin = getBreakGlassAdmin();
  if (admin && id === admin.id) {
    return admin;
  }

  try {
    const db = await getDb();
    if (!db) {
      return null;
    }

    const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as
      User | undefined;
    return row ?? null;
  } catch (error) {
    console.error("Error reading user database:", error);
    return null;
  }
}

/**
 * Verify only the environment-configured fallback admin; never open the DB.
 */
export async function verifyFallbackAdmin(
  username: string,
  password: string,
): Promise<Omit<User, "password"> | null> {
  // Break-glass admin always works when configured, regardless of DB state
  const admin = getBreakGlassAdmin();
  if (
    admin &&
    username === admin.username &&
    (await bcrypt.compare(password, admin.password))
  ) {
    console.warn("Break-glass admin from .env logged in");
    const { password: _, ...adminWithoutPassword } = admin;
    return adminWithoutPassword;
  }

  return null;
}

/**
 * Delete a user
 */
export async function deleteUser(userId: string): Promise<boolean> {
  const db = await getDb();

  if (!db) {
    throw new Error("Database not available - cannot delete users");
  }

  const result = db.prepare("DELETE FROM users WHERE id = ?").run(userId);

  return result.changes > 0;
}

/**
 * List all users (without passwords)
 */
export async function listUsers(): Promise<Omit<User, "password">[]> {
  const db = await getDb();

  if (!db) {
    // No database — only the break-glass admin exists, if configured
    const admin = getBreakGlassAdmin();
    if (!admin) return [];
    const { password: _, ...adminWithoutPassword } = admin;
    return [adminWithoutPassword];
  }

  const rows = db
    .prepare(
      "SELECT id, username, email, role, createdAt, updatedAt FROM users ORDER BY username",
    )
    .all() as Omit<User, "password">[];

  return rows;
}
