/** Map verified orchestrator claims to durable local identities (CONTRACT-001 R5). */
import { randomUUID } from "node:crypto";
import type { Database } from "better-sqlite3";
import { getDb } from "../db/sqlite";
import { FALLBACK_ADMIN_ID } from "./fallback-admin";
import type { AuthPrincipal } from "./orchestrator";

export type OrchestratorClaims = Extract<
  AuthPrincipal,
  { source: "orchestrator" }
>;

export interface LocalIdentity {
  id: string;
  username: string;
  email: string | null;
  role: string;
}

export const ORCHESTRATOR_PASSWORD = "!orchestrator-no-password";
const USER_FIELDS = "id, username, email, role";

/** Resolve claims using only the supplied database; never verify tokens here. */
export function mapOrchestratorIdentity(
  db: Database,
  claims: OrchestratorClaims,
): LocalIdentity {
  const findIdentity = () =>
    db
      .prepare(`SELECT ${USER_FIELDS} FROM users WHERE iss = ? AND sub = ?`)
      .get(claims.iss, claims.sub) as LocalIdentity | undefined;

  const map = db.transaction(() => {
    let user = findIdentity();
    if (!user) {
      const candidates = db
        .prepare(
          `
        SELECT ${USER_FIELDS} FROM users
        WHERE iss IS NULL AND sub IS NULL AND username = ? COLLATE NOCASE
          AND id != ?
      `,
        )
        .all(claims.upn, FALLBACK_ADMIN_ID) as LocalIdentity[];
      if (candidates.length === 1) {
        user = candidates[0];
      }
    }

    let username = claims.upn;
    const collision = (name: string) =>
      db
        .prepare("SELECT id FROM users WHERE username = ? AND id != ?")
        .get(name, user?.id ?? "");
    if (collision(username)) {
      console.warn(
        "Orchestrator username collision; preserving the other user's name.",
      );
      if (user) {
        username = user.username;
      } else {
        const base = `${claims.upn}#${claims.sub.slice(0, 8)}`;
        username = base;
        let suffix = 2;
        while (collision(username)) {
          username = `${base}-${suffix++}`;
        }
      }
    }

    if (user) {
      const previous = db
        .prepare("SELECT updatedAt FROM users WHERE id = ?")
        .get(user.id) as { updatedAt: string };
      const previousTime = Date.parse(previous.updatedAt);
      const updatedAt = new Date(
        Math.max(
          Date.now(),
          Number.isFinite(previousTime) ? previousTime + 1 : 0,
        ),
      ).toISOString();
      db.prepare(
        `
        UPDATE users SET username = ?, email = ?, iss = ?, sub = ?,
          updatedAt = ?
        WHERE id = ? AND (username != ? OR email IS NOT ? OR iss IS NOT ? OR sub IS NOT ?)
      `,
      ).run(
        username,
        claims.email,
        claims.iss,
        claims.sub,
        updatedAt,
        user.id,
        username,
        claims.email,
        claims.iss,
        claims.sub,
      );
      return { ...user, username, email: claims.email };
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    db.prepare(
      `
      INSERT INTO users (id, username, email, role, password, iss, sub, createdAt, updatedAt)
      VALUES (?, ?, ?, 'user', ?, ?, ?, ?, ?)
    `,
    ).run(
      id,
      username,
      claims.email,
      ORCHESTRATOR_PASSWORD,
      claims.iss,
      claims.sub,
      now,
      now,
    );
    return { id, username, email: claims.email, role: "user" };
  });

  try {
    return map.immediate();
  } catch (error) {
    // Defensive retry for a competing writer's identity insert.
    if ((error as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE") {
      const existing = findIdentity();
      if (existing) {
        return existing;
      }
    }
    throw error;
  }
}

/** Keep verified users authenticated when opening or accessing SQLite fails. */
export async function resolveOrchestratorIdentity(
  claims: OrchestratorClaims,
  openDb: () => Promise<Database | null> = getDb,
): Promise<LocalIdentity> {
  try {
    const db = await openDb();
    if (db) {
      return mapOrchestratorIdentity(db, claims);
    }
  } catch {
    console.warn(
      "Orchestrator identity database unavailable; using transient identity.",
    );
  }
  return {
    id: `orchestrator:${claims.sub}`,
    username: claims.upn,
    email: claims.email,
    role: "user",
  };
}
