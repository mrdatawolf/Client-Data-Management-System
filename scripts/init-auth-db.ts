#!/usr/bin/env tsx

/**
 * Initialize SQLite authentication database with default admin user
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import bcrypt from "bcryptjs";
import { createClient } from "@libsql/client";

const DB_PATH = process.env.AUTH_DB_PATH || "./data/auth.db";
const DB_DIR = path.dirname(DB_PATH);

async function initAuthDB() {
  console.log("🔐 Initializing authentication database (SQLite)...\n");

  // Create data directory if it doesn't exist
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    console.log(`✓ Created directory: ${DB_DIR}`);
  }

  // Check if database already exists
  if (fs.existsSync(DB_PATH)) {
    console.log("⚠ Database already exists at:", DB_PATH);
    console.log("  To reset the database, delete the file and run this script again.\n");
    return;
  }

  // Create database client
  const db = createClient({
    url: `file:${DB_PATH}`,
  });

  // Create users table
  await db.execute(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  // Create index on username for faster lookups
  await db.execute("CREATE INDEX idx_username ON users(username)");

  // Create default admin user
  const adminPassword = "admin123";
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.execute({
    sql: "INSERT INTO users (id, username, password, email, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [id, "admin", hashedPassword, "admin@example.com", "admin", now, now],
  });

  console.log("✓ Authentication database created successfully!");
  console.log(`  Location: ${DB_PATH}\n`);
  console.log("📝 Default admin credentials:");
  console.log("  Username: admin");
  console.log("  Password: admin123");
  console.log("\n⚠  IMPORTANT: Change the default password after first login!\n");
}

// Run the initialization
initAuthDB()
  .then(() => {
    console.log("✓ Initialization complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("✗ Error initializing database:", error);
    process.exit(1);
  });
