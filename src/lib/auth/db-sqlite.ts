/**
 * SQLite-based authentication database using @libsql/client
 */

import * as path from "path";
import * as fs from "fs";
import bcrypt from "bcryptjs";
import { createClient } from "@libsql/client";

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

/**
 * Get database client
 */
function getDatabase() {
  return createClient({
    url: `file:${DB_PATH}`,
  });
}

/**
 * Find a user by username
 */
export async function findUserByUsername(username: string): Promise<User | null> {
  try {
    const db = getDatabase();
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
    return null;
  }
}

/**
 * Find a user by ID
 */
export async function findUserById(id: string): Promise<User | null> {
  try {
    const db = getDatabase();
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
  const db = getDatabase();

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
  const db = getDatabase();

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
  const db = getDatabase();

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
  const db = getDatabase();

  const result = await db.execute(
    "SELECT id, username, email, role, createdAt, updatedAt FROM users"
  );

  return result.rows.map((row) => ({
    id: row.id as string,
    username: row.username as string,
    email: row.email as string | null,
    role: row.role as string,
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  }));
}
