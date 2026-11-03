/** Exercise real cookie verification, mapping, /me and preferences with a temp DB. */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { NextRequest } from "next/server";
import { getDb } from "../src/lib/db/sqlite";
import { getSessionUser } from "../src/lib/auth/session";
import { GET } from "../src/app/api/auth/me/route";
import { GET as getPreferences } from "../src/app/api/preferences/route";
import { FALLBACK_ADMIN_ID } from "../src/lib/auth/fallback-admin";

function request(cookie = "") {
  return new NextRequest("http://localhost/api/auth/me", {
    headers: { cookie },
  });
}

test("session sources, /me exact safe response and linked preferences", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "cdms-session-"));
  const original = { ...process.env };
  t.after(async () => {
    (await getDb())?.close();
    process.env = original;
    rmSync(dir, { recursive: true, force: true });
  });
  process.env.AUTH_DB_PATH = join(dir, "auth.db");
  process.env.DISABLE_AUTH = "true";
  const guest = await getSessionUser(request());
  assert.deepEqual(guest, {
    id: "guest",
    username: "guest",
    email: null,
    role: "admin",
    authSource: "disabled",
  });
  assert.deepEqual(await (await GET(request())).json(), { user: guest });
  delete process.env.DISABLE_AUTH;
  process.env.FALLBACK_ADMIN_USERNAME = "emergency";
  process.env.FALLBACK_ADMIN_PASSWORD = "test-only";
  process.env.JWT_SECRET = "test-only-secret";
  process.env.AUTH_ORCHESTRATOR_URL = "https://session.example";
  process.env.AUTH_EXPECTED_ISSUER = "https://session.example";
  const keys = await generateKeyPair("RS256");
  const jwk = { ...(await exportJWK(keys.publicKey)), kid: "session-test" };
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ keys: [jwk] }),
  );
  const fallbackToken = await new SignJWT({
    userId: FALLBACK_ADMIN_ID,
    username: "emergency",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(process.env.JWT_SECRET));
  const fallback = await getSessionUser(request(`session=${fallbackToken}`));
  assert.deepEqual(fallback, {
    id: FALLBACK_ADMIN_ID,
    username: "emergency",
    email: null,
    role: "admin",
    authSource: "fallback",
  });
  const denied = await GET(request());
  assert.equal(denied.status, 401);
  assert.deepEqual(await denied.json(), { error: "Not authenticated" });
  const token = await new SignJWT({ email: "alice@example.com", upn: "alice" })
    .setProtectedHeader({ alg: "RS256", kid: jwk.kid })
    .setIssuer(process.env.AUTH_EXPECTED_ISSUER)
    .setSubject("subject")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(keys.privateKey);
  const db = (await getDb())!;
  db.prepare(
    `INSERT INTO users VALUES
    ('legacy', 'ALICE', 'secret-password-hash', 'old@email', 'admin', 'old', 'old', NULL, NULL)`,
  ).run();
  db.prepare(
    `INSERT INTO user_preferences VALUES
    ('pref', 'legacy', 'theme', 'dark', 'old', 'old')`,
  ).run();
  const response = await GET(request(`bt_session=${token}`));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    user: {
      id: "legacy",
      username: "alice",
      email: "alice@example.com",
      role: "admin",
      authSource: "orchestrator",
    },
  });
  assert.deepEqual(
    await (await getPreferences(request(`bt_session=${token}`))).json(),
    {
      data: { theme: "dark" },
    },
  );
  assert.equal(
    (
      await getSessionUser(
        request(`session=${fallbackToken}; bt_session=${token}`),
      )
    )?.authSource,
    "fallback",
  );
});
