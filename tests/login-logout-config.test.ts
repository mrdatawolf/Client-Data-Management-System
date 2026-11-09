/** Login retirement, break-glass sessions, shared-cookie logout and public config. */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { authenticateRequestCookies } from "../src/lib/auth/orchestrator";
import { POST as logout } from "../src/app/api/auth/logout/route";
import { GET as config } from "../src/app/api/config/route";

test("fallback-only login never consults SQLite and issues accepted sessions", async (t) => {
  const original = { ...process.env };
  const dir = mkdtempSync(join(tmpdir(), "cdms-login-"));
  t.after(() => {
    process.env = original;
    rmSync(dir, { recursive: true, force: true });
  });
  process.env.AUTH_DB_PATH = join(dir, "auth.db");
  process.env.FALLBACK_ADMIN_USERNAME = "emergency";
  process.env.FALLBACK_ADMIN_PASSWORD = "test-only";
  process.env.JWT_SECRET = "task005-test-secret";
  process.env.JWT_EXPIRES_IN = "1h";
  process.env.COOKIE_SECURE = "false";
  const db = new Database(process.env.AUTH_DB_PATH);
  db.exec("CREATE TABLE users (username TEXT, password TEXT)");
  db.prepare("INSERT INTO users VALUES (?, ?)").run(
    "legacy",
    bcrypt.hashSync("correct", 10),
  );
  db.close();
  const { POST: login } = await import("../src/app/api/auth/login/route");
  const send = (body: unknown) =>
    login(
      new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
      }),
    );
  for (const body of [
    { username: "legacy", password: "correct" },
    { username: "emergency", password: "wrong" },
  ]) {
    const response = await send(body);
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      error: "Invalid username or password",
    });
  }
  for (const body of [
    {},
    { username: "emergency" },
    { password: "test-only" },
  ]) {
    assert.equal((await send(body)).status, 400);
  }
  // A directory cannot be opened as the auth DB. Fallback still succeeds.
  process.env.AUTH_DB_PATH = dir;
  for (const secure of ["false", "true"]) {
    process.env.COOKIE_SECURE = secure;
    const response = await send({
      username: "emergency",
      password: "test-only",
    });
    assert.equal(response.status, 200);
    const header = response.headers.get("set-cookie")!;
    assert.match(header, /Path=\/;.*Max-Age=3600;.*HttpOnly;.*SameSite=lax/i);
    assert.equal(/; Secure/i.test(header), secure === "true");
    const token = response.cookies.get("session")!.value;
    const principal = await authenticateRequestCookies({
      get: (name) => (name === "session" ? { value: token } : undefined),
    });
    assert.equal(principal?.source, "fallback");
    assert.equal((await response.json()).user.id, "fallback-admin-001");
  }
  for (const key of ["FALLBACK_ADMIN_USERNAME", "FALLBACK_ADMIN_PASSWORD"]) {
    const value = process.env[key];
    delete process.env[key];
    assert.equal(
      (await send({ username: "emergency", password: "test-only" })).status,
      401,
    );
    process.env[key] = value;
  }
  const source = readFileSync("src/lib/auth/db-sqlite.ts", "utf8");
  const verifier = source
    .split("export async function verifyFallbackAdmin")[1]
    .split("/**")[0];
  assert.ok(!verifier.includes("getDb"));
  assert.ok(!verifier.includes("findUser"));
  assert.ok(!source.includes("bcrypt.compare(password, user.password)"));
});

test("logout always expires both cookies with independent Secure rules", async (t) => {
  const original = { ...process.env };
  t.after(() => {
    process.env = original;
  });
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Logout must not call BT Auth");
  });
  for (const cookieSecure of ["true", "false"]) {
    process.env.COOKIE_SECURE = cookieSecure;
    for (const [url, forwarded, secure] of [
      ["http://cdms.biztechro.com", "", false],
      ["https://cdms.biztechro.com", "", true],
      ["http://cdms.biztechro.com", "https, http", true],
      ["http://cdms.biztechro.com", "http, https", false],
    ] as const) {
      for (const cookie of ["", "session=invalid; bt_session=invalid"]) {
        const response = await logout(
          new NextRequest(url + "/api/auth/logout", {
            method: "POST",
            headers: { cookie, "x-forwarded-proto": forwarded },
          }),
        );
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), {
          message: "Logged out successfully",
        });
        const headers = response.headers.getSetCookie();
        assert.equal(headers.length, 2);
        for (const name of ["session", "bt_session"]) {
          const header = headers.find((value) => value.startsWith(name + "="))!;
          assert.match(header, /Max-Age=0/i);
          assert.match(header, /Path=\/;/i);
          assert.match(header, /HttpOnly/i);
          assert.match(header, /SameSite=lax/i);
          assert.equal(
            /; Secure/i.test(header),
            name === "session" ? cookieSecure === "true" : secure,
          );
          assert.equal(
            /Domain=\.biztechro.com/i.test(header),
            name === "bt_session",
          );
        }
      }
    }
  }
});

test("public config returns booleans and configured URL without credentials", async (t) => {
  const original = { ...process.env };
  const state = globalThis as typeof globalThis & { [key: symbol]: unknown };
  const key = Symbol.for("cdms.auth.orchestrator.v1");
  const cached = state[key];
  t.after(() => {
    process.env = original;
    if (cached === undefined) delete state[key];
    else state[key] = cached;
  });
  process.env.FALLBACK_ADMIN_USERNAME = "private-admin-name";
  process.env.FALLBACK_ADMIN_PASSWORD = "private-admin-password";
  process.env.AUTH_EXPECTED_ISSUER = "https://auth.example";
  process.env.AUTH_ORCHESTRATOR_URL = "https://auth.example///";
  delete process.env.AUTH_LOGIN_PATH;
  delete state[key];
  let body = await (await config()).json();
  assert.equal(
    body.orchestratorLoginUrl,
    "https://auth.example/auth/local-login",
  );
  assert.equal(body.fallbackAdminEnabled, true);
  assert.equal(typeof body.authDisabled, "boolean");
  assert.equal(typeof body.appName, "string");
  assert.equal(typeof body.version, "string");
  assert.ok(!JSON.stringify(body).includes("private-admin"));
  process.env.AUTH_LOGIN_PATH = "/auth/login";
  assert.equal(
    (await (await config()).json()).orchestratorLoginUrl,
    "https://auth.example/auth/login",
  );
  for (const url of ["", "invalid", "ftp://auth.example"]) {
    process.env.AUTH_ORCHESTRATOR_URL = url;
    delete state[key];
    assert.equal((await (await config()).json()).orchestratorLoginUrl, null);
  }
  process.env.AUTH_ORCHESTRATOR_URL = "https://auth.example";
  delete process.env.AUTH_EXPECTED_ISSUER;
  delete process.env.FALLBACK_ADMIN_PASSWORD;
  process.env.DISABLE_AUTH = "true";
  delete state[key];
  body = await (await config()).json();
  assert.equal(body.orchestratorLoginUrl, null);
  assert.equal(body.fallbackAdminEnabled, false);
  assert.equal(body.authDisabled, true);
});
