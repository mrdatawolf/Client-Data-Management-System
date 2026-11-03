/** Transactional operator actions for the users CLI; never handle passwords. */
import type { Database } from "better-sqlite3";
import { FALLBACK_ADMIN_ID } from "./fallback-admin";
import type { LocalIdentity } from "./identity";

export interface ManagedUser extends LocalIdentity {
  iss: string | null;
  sub: string | null;
  createdAt: string;
}

export function listManagedUsers(db: Database): ManagedUser[] {
  return db
    .prepare(
      `
    SELECT id, username, email, role, iss, sub, createdAt FROM users ORDER BY username
  `,
    )
    .all() as ManagedUser[];
}

function requireUser(
  db: Database,
  username: string,
  ignoreCase = false,
): ManagedUser {
  const users = db
    .prepare(
      `
    SELECT id, username, email, role, iss, sub, createdAt FROM users
    WHERE username = ? ${ignoreCase ? "COLLATE NOCASE" : ""}
  `,
    )
    .all(username) as ManagedUser[];
  if (users.length !== 1) {
    throw new Error("User not found or username is ambiguous");
  }
  return users[0];
}

function requireMutableUser(db: Database, username: string): ManagedUser {
  const user = requireUser(db, username);
  if (user.id === FALLBACK_ADMIN_ID) {
    throw new Error(
      "Manage the fallback admin through FALLBACK_ADMIN_* in .env",
    );
  }
  return user;
}

export function setUserRole(
  db: Database,
  username: string,
  role: string,
): void {
  if (role !== "admin" && role !== "user") {
    throw new Error("Role must be admin or user");
  }
  db.transaction(() => {
    const user = requireMutableUser(db, username);
    db.prepare("UPDATE users SET role = ?, updatedAt = ? WHERE id = ?").run(
      role,
      new Date().toISOString(),
      user.id,
    );
  }).immediate();
}

export function removeManagedUser(db: Database, username: string): void {
  db.transaction(() => {
    const user = requireMutableUser(db, username);
    db.prepare("DELETE FROM users WHERE id = ?").run(user.id);
  }).immediate();
}

/** Merge an orchestrator row into an existing account, keeping target preferences/role. */
export function linkUsers(
  db: Database,
  username: string,
  orchestratorUsername: string,
): void {
  db.transaction(() => {
    const target = requireMutableUser(db, username);
    const source = requireUser(db, orchestratorUsername, true);
    if (source.id === target.id) {
      throw new Error("Source and target must be different users");
    }
    if (source.iss === null || source.sub === null) {
      throw new Error("Source user has no orchestrator identity");
    }
    const collision = db
      .prepare(
        `
      SELECT id FROM users WHERE username = ? AND id NOT IN (?, ?)
    `,
      )
      .get(source.username, source.id, target.id);
    const nextUsername = collision ? target.username : source.username;
    // Release the unique identity and username before assigning them to target.
    // The surrounding transaction rolls back this deletion if the update fails.
    db.prepare("DELETE FROM users WHERE id = ?").run(source.id);
    db.prepare(
      `
      UPDATE users SET iss = ?, sub = ?, email = ?, username = ?, updatedAt = ?
      WHERE id = ?
    `,
    ).run(
      source.iss,
      source.sub,
      source.email,
      nextUsername,
      new Date().toISOString(),
      target.id,
    );
  }).immediate();
}
