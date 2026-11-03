/** R5 and operator actions run against disposable, real SQLite files. */
import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { migrateOrchestratorIdentity } from "../src/lib/db/sqlite";
import {
  mapOrchestratorIdentity,
  resolveOrchestratorIdentity,
  ORCHESTRATOR_PASSWORD,
  type OrchestratorClaims,
} from "../src/lib/auth/identity";
import {
  linkUsers,
  setUserRole,
  listManagedUsers,
  removeManagedUser,
} from "../src/lib/auth/user-management";
import { FALLBACK_ADMIN_ID } from "../src/lib/auth/fallback-admin";

const claims: OrchestratorClaims = {
  source: "orchestrator",
  iss: "https://auth.example",
  sub: "subject-123",
  upn: "alice",
  email: "alice@example.com",
  iat: 1,
  exp: 2,
};

function fixture(t: TestContext, migrate = true) {
  const dir = mkdtempSync(join(tmpdir(), "cdms-identity-"));
  const path = join(dir, "auth.db");
  const db = new Database(path);
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
      email TEXT, role TEXT NOT NULL DEFAULT 'user', createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE user_preferences (
      id TEXT PRIMARY KEY, userId TEXT REFERENCES users(id) ON DELETE CASCADE,
      key TEXT, value TEXT, createdAt TEXT, updatedAt TEXT, UNIQUE(userId, key)
    );
  `);
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  if (migrate) migrateOrchestratorIdentity(db);
  const local = (username = "alice", id = username) => {
    db.prepare(
      `INSERT INTO users VALUES (?, ?, 'old-hash', 'old@email', 'admin',
      'old', 'old'${migrate ? ", NULL, NULL" : ""})`,
    ).run(id, username);
    return id;
  };
  const prefs = (id: string) =>
    db
      .prepare(
        `
    INSERT INTO user_preferences VALUES (?, ?, 'theme', 'dark', 'old', 'old')
  `,
      )
      .run(id, id);
  return { db, path, local, prefs };
}

test("migration twice preserves old data and preferences and creates partial unique index", (t) => {
  const { db, local, prefs } = fixture(t, false);
  local();
  prefs("alice");
  migrateOrchestratorIdentity(db);
  migrateOrchestratorIdentity(db);
  assert.equal(
    (db.prepare("SELECT username FROM users").get() as { username: string })
      .username,
    "alice",
  );
  assert.equal(
    (
      db.prepare("SELECT count(*) AS n FROM user_preferences").get() as {
        n: number;
      }
    ).n,
    1,
  );
  const columns = db.pragma("table_info(users)") as {
    name: string;
    notnull: number;
  }[];
  for (const name of ["iss", "sub"])
    assert.equal(columns.find((c) => c.name === name)?.notnull, 0);
  const indexes = db.pragma("index_list(users)") as {
    name: string;
    unique: number;
    partial: number;
  }[];
  assert.ok(
    indexes.some(
      (i) =>
        i.name === "idx_users_iss_sub" && i.unique === 1 && i.partial === 1,
    ),
  );
});

test("new user has unusable password; returning claims update email/upn and timestamp", async (t) => {
  const { db } = fixture(t);
  const user = mapOrchestratorIdentity(db, claims);
  assert.equal(user.role, "user");
  assert.match(user.id, /^[0-9a-f-]{36}$/);
  const stored = db.prepare("SELECT password FROM users").get() as {
    password: string;
  };
  assert.equal(stored.password, ORCHESTRATOR_PASSWORD);
  assert.equal(
    await bcrypt.compare(ORCHESTRATOR_PASSWORD, stored.password),
    false,
  );
  db.prepare("UPDATE users SET updatedAt = 'old'").run();
  const updated = mapOrchestratorIdentity(db, {
    ...claims,
    upn: "new",
    email: "new@email",
  });
  assert.deepEqual(updated, { ...user, username: "new", email: "new@email" });
  assert.notEqual(
    (db.prepare("SELECT updatedAt FROM users").get() as { updatedAt: string })
      .updatedAt,
    "old",
  );
});

for (const name of ["alice", "ALICE"]) {
  test(`one-time link preserves id, role and preferences (${name})`, (t) => {
    const { db, local, prefs } = fixture(t);
    local(name, "legacy");
    prefs("legacy");
    const user = mapOrchestratorIdentity(db, claims);
    assert.equal(user.id, "legacy");
    assert.equal(user.username, "alice");
    assert.equal(user.role, "admin");
    assert.equal(
      (
        db
          .prepare("SELECT value FROM user_preferences WHERE userId = ?")
          .get(user.id) as { value: string }
      ).value,
      "dark",
    );
    const other = mapOrchestratorIdentity(db, { ...claims, sub: "different" });
    assert.notEqual(other.id, user.id);
  });
}

test("ambiguous NOCASE candidates are not linked", (t) => {
  const { db, local } = fixture(t);
  local("alice");
  local("ALICE");
  const user = mapOrchestratorIdentity(db, claims);
  assert.equal(user.role, "user");
  assert.equal(
    (
      db.prepare("SELECT count(*) AS n FROM users WHERE iss IS NULL").get() as {
        n: number;
      }
    ).n,
    2,
  );
});

test("username collisions retain update name and deterministically disambiguate inserts", (t) => {
  const { db, local } = fixture(t);
  const warnings = t.mock.method(console, "warn", () => {});
  const first = mapOrchestratorIdentity(db, claims);
  local("taken");
  const update = mapOrchestratorIdentity(db, {
    ...claims,
    upn: "taken",
    email: "changed@email",
  });
  assert.equal(update.username, "alice");
  assert.equal(update.email, "changed@email");
  local("alice#other-su");
  const second = mapOrchestratorIdentity(db, {
    ...claims,
    sub: "other-subject",
  });
  assert.equal(second.username, "alice#other-su-2");
  assert.notEqual(first.id, second.id);
  assert.equal(warnings.mock.callCount(), 2);
});

test("fallback admin is never automatically linked", (t) => {
  const { db, local } = fixture(t);
  local("alice", FALLBACK_ADMIN_ID);
  assert.notEqual(mapOrchestratorIdentity(db, claims).id, FALLBACK_ADMIN_ID);
  assert.equal(
    (
      db
        .prepare("SELECT iss FROM users WHERE id = ?")
        .get(FALLBACK_ADMIN_ID) as { iss: null }
    ).iss,
    null,
  );
});

test("duplicate mapping across two connections resolves one row", (t) => {
  const { db, path } = fixture(t);
  const other = new Database(path);
  try {
    const first = mapOrchestratorIdentity(db, claims);
    const second = mapOrchestratorIdentity(other, claims);
    assert.equal(first.id, second.id);
    assert.equal(
      (db.prepare("SELECT count(*) AS n FROM users").get() as { n: number }).n,
      1,
    );
    assert.throws(
      () =>
        db
          .prepare(
            `INSERT INTO users SELECT 'duplicate', 'duplicate',
      password, email, role, createdAt, updatedAt, iss, sub FROM users`,
          )
          .run(),
      /UNIQUE/,
    );
  } finally {
    other.close();
  }
});

test("unavailable database (null or throw) returns stable transient identity", async () => {
  const absent = await resolveOrchestratorIdentity(claims, async () => null);
  const failed = await resolveOrchestratorIdentity(claims, async () => {
    throw new Error("offline");
  });
  assert.deepEqual(absent, failed);
  assert.equal(absent.id, "orchestrator:subject-123");
  assert.equal(absent.role, "user");
});

test("CLI role and link merge retain target preferences/role and cascade source preferences", (t) => {
  const { db, local, prefs } = fixture(t);
  local("legacy");
  prefs("legacy");
  const source = mapOrchestratorIdentity(db, claims);
  prefs(source.id);
  setUserRole(db, "legacy", "user");
  setUserRole(db, "legacy", "admin");
  db.prepare(
    "UPDATE users SET iss = 'old-issuer', sub = 'old-sub' WHERE id = 'legacy'",
  ).run();
  linkUsers(db, "legacy", "ALICE");
  const users = listManagedUsers(db);
  assert.equal(users.length, 1);
  assert.equal(users[0].id, "legacy");
  assert.equal(users[0].username, "alice");
  assert.equal(users[0].role, "admin");
  assert.equal(users[0].iss, claims.iss);
  assert.equal(users[0].sub, claims.sub);
  assert.equal(users[0].email, claims.email);
  assert.deepEqual(db.prepare("SELECT userId FROM user_preferences").all(), [
    { userId: "legacy" },
  ]);
  assert.equal(mapOrchestratorIdentity(db, claims).id, "legacy");
  removeManagedUser(db, "alice");
  assert.deepEqual(listManagedUsers(db), []);
  assert.deepEqual(db.prepare("SELECT * FROM user_preferences").all(), []);
});

test("CLI refuses invalid role/link targets and rolls back failed merge", (t) => {
  const { db, local } = fixture(t);
  local("legacy");
  local("fallback", FALLBACK_ADMIN_ID);
  mapOrchestratorIdentity(db, claims);
  for (const [target, source] of [
    ["alice", "alice"],
    ["missing", "alice"],
    ["legacy", "missing"],
    ["alice", "legacy"],
    ["fallback", "alice"],
  ]) {
    assert.throws(() => linkUsers(db, target, source));
  }
  assert.throws(() => setUserRole(db, "legacy", "owner"));
  assert.throws(() => setUserRole(db, "missing", "user"));
  assert.throws(() => setUserRole(db, "fallback", "user"));
  assert.throws(() => removeManagedUser(db, "fallback"));
  db.exec(`CREATE TRIGGER reject_merge BEFORE UPDATE ON users
    BEGIN SELECT RAISE(ABORT, 'test failure'); END`);
  assert.throws(() => linkUsers(db, "legacy", "alice"), /test failure/);
  assert.equal(listManagedUsers(db).length, 3);
});

test("link collision retains legacy username while updating identity and email", (t) => {
  const { db, local } = fixture(t);
  mapOrchestratorIdentity(db, { ...claims, sub: "other" });
  local("ALICE", "legacy");
  const user = mapOrchestratorIdentity(db, claims);
  assert.equal(user.id, "legacy");
  assert.equal(user.username, "ALICE");
  assert.equal(user.email, claims.email);
  assert.equal(user.role, "admin");
});
