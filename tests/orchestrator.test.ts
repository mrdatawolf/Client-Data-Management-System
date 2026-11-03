/** Contract checks use local keys and deterministic network/clock substitutes. */
import test, { before } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPair, exportJWK, SignJWT, type JWTPayload } from "jose";
import { authenticateRequestCookies, createOrchestratorVerifier, logAuthConfiguration, readAuthConfig } from "../src/lib/auth/orchestrator";
import { FALLBACK_ADMIN_ID } from "../src/lib/auth/fallback-admin";
import { proxy } from "../src/proxy";
import { NextRequest } from "next/server";

const issuer = "https://auth.example";
const base = 1800000000000;
let first: Awaited<ReturnType<typeof generateKeyPair>>;
let second: Awaited<ReturnType<typeof generateKeyPair>>;
let jwk1: Awaited<ReturnType<typeof exportJWK>>;
let jwk2: Awaited<ReturnType<typeof exportJWK>>;
before(async () => {
  first = await generateKeyPair("RS256");
  second = await generateKeyPair("RS256");
  jwk1 = { ...await exportJWK(first.publicKey), kid: "first" };
  jwk2 = { ...await exportJWK(second.publicKey), kid: "second" };
});

function fixture() {
  let time = base;
  let keys = [jwk1];
  let down = false;
  let malformed = false;
  const calls: string[] = [];
  const verifier = createOrchestratorVerifier({
    orchestratorUrl: issuer + "/", expectedIssuer: issuer, now: () => time,
    fetch: async (input, init) => {
      calls.push(String(input));
      assert.equal(init?.cache, "no-store");
      assert.ok(init?.signal instanceof AbortSignal);
      if (down) throw new Error("offline");
      return Response.json(malformed ? { keys: [null] } : { keys });
    },
  });
  return {
    verifier, calls,
    advance: (ms: number) => { time += ms; },
    keys: (value: typeof keys) => { keys = value; },
    down: () => { down = true; },
    malformed: () => { malformed = true; },
  };
}
async function token(overrides: JWTPayload = {}, kid = "first", key = first.privateKey) {
  const payload: JWTPayload = {
    iss: issuer, sub: "subject", email: "a@example.com", upn: "alice",
    iat: base / 1000, exp: base / 1000 + 3600, ...overrides,
  };
  return new SignJWT(payload).setProtectedHeader({ alg: "RS256", kid }).sign(key);
}
const settle = () => new Promise((resolve) => setImmediate(resolve));

test("valid RS256 token, extra claims and audience ignored; fresh cache reused", async () => {
  const f = fixture();
  assert.equal((await f.verifier.verify(await token({ aud: "unused", extra: true })))?.source, "orchestrator");
  assert.ok(await f.verifier.verify(await token()));
  assert.equal(f.calls.length, 1);
});

for (const [name, claims] of Object.entries({
  "wrong issuer": { iss: "https://evil.example" },
  "missing sub": { sub: undefined }, "missing email": { email: undefined },
  "missing upn": { upn: undefined }, "missing iat": { iat: undefined },
  "missing exp": { exp: undefined }, "blank sub": { sub: " " },
  "blank email": { email: " " }, "non-string upn": { upn: 123 },
  "exp equals iat": { exp: base / 1000 },
  "exp before iat": { exp: base / 1000 - 1 },
  "expired": { iat: base / 1000 - 1000, exp: base / 1000 - 61 },
  "future iat": { iat: base / 1000 + 61 },
  "non-number iat": { iat: "today" },
})) {
  test(name + " rejected", async () => {
    assert.equal(await fixture().verifier.verify(await token(claims as JWTPayload)), null);
  });
}
test("60-second timestamp tolerance", async () => {
  const f = fixture();
  assert.ok(await f.verifier.verify(await token({ iat: base / 1000 + 60 })));
  assert.ok(await f.verifier.verify(await token({ iat: base / 1000 - 100, exp: base / 1000 - 59 })));
});
test("HS256, none, malformed, missing kid and invalid signature rejected", async () => {
  const f = fixture();
  const hs = await new SignJWT({}).setProtectedHeader({ alg: "HS256", kid: "first" })
    .sign(new TextEncoder().encode("test-secret"));
  for (const value of [hs, "eyJhbGciOiJub25lIn0.e30.", "bad",
    await token({}, ""), await token({}, "first", second.privateKey)]) {
    assert.equal(await f.verifier.verify(value), null);
  }
});
test("unknown kid refreshes, removes old key, and limits refreshes to 30 seconds", async () => {
  const f = fixture();
  assert.ok(await f.verifier.verify(await token()));
  f.keys([jwk2]);
  assert.ok(await f.verifier.verify(await token({}, "second", second.privateKey)));
  assert.equal(f.calls.length, 2);
  assert.equal(await f.verifier.verify(await token()), null);
  assert.equal(await f.verifier.verify(await token({}, "unknown")), null);
  assert.equal(f.calls.length, 2);
  f.advance(30000);
  assert.equal(await f.verifier.verify(await token({}, "unknown")), null);
  assert.equal(f.calls.length, 3);
});
test("outage retains fresh and stale keys; failures are throttled", async () => {
  const f = fixture();
  const value = await token();
  assert.ok(await f.verifier.verify(value));
  f.down();
  assert.ok(await f.verifier.verify(value));
  assert.equal(f.calls.length, 1);
  f.advance(600000);
  assert.ok(await f.verifier.verify(value));
  await settle();
  assert.ok(await f.verifier.verify(value));
  assert.equal(f.calls.length, 2);
  f.advance(30000);
  assert.ok(await f.verifier.verify(value));
  await settle();
  assert.equal(f.calls.length, 3);
});
test("cold outage rejects, deduplicates and throttles fetches and error logging", async (t) => {
  const log = t.mock.method(console, "error", () => {});
  const f = fixture(); f.down();
  const value = await token();
  assert.deepEqual(await Promise.all(Array.from({ length: 5 }, () => f.verifier.verify(value))), Array(5).fill(null));
  assert.equal(f.calls.length, 1);
  assert.equal(log.mock.callCount(), 1);
  f.advance(30000);
  assert.equal(await f.verifier.verify(value), null);
  assert.equal(f.calls.length, 2);
});
test("malformed refresh preserves keys; empty JWKS removes all keys", async () => {
  const f = fixture();
  assert.ok(await f.verifier.verify(await token()));
  f.malformed(); f.advance(600000);
  assert.ok(await f.verifier.verify(await token()));
  await settle();
  assert.ok(await f.verifier.verify(await token()));
  const empty = fixture();
  assert.ok(await empty.verifier.verify(await token()));
  empty.keys([]); empty.advance(600000);
  await empty.verifier.verify(await token());
  await settle();
  assert.equal(await empty.verifier.verify(await token()), null);
});
test("health is live per call and reports cache even during outage", async () => {
  const f = fixture();
  const before = await f.verifier.health();
  assert.equal(before.reachable, true);
  assert.equal(before.keysCached, false);
  assert.equal(before.lastRefreshAt, null);
  await f.verifier.verify(await token());
  f.down();
  const after = await f.verifier.health();
  assert.equal(after.reachable, false);
  assert.equal(after.keysCached, true);
  assert.equal(after.keyCount, 1);
  assert.equal(after.lastRefreshAt, new Date(base).toISOString());
  assert.ok(after.error);
  assert.equal(f.calls.filter((url) => url.endsWith("/health")).length, 2);
});
test("invalid configuration fails closed without network; startup logs without throwing", async (t) => {
  for (const config of [{}, { orchestratorUrl: "/relative", expectedIssuer: issuer },
    { orchestratorUrl: "ftp://example.com", expectedIssuer: issuer },
    { orchestratorUrl: issuer, expectedIssuer: " " }]) {
    const verifier = createOrchestratorVerifier({
      ...config, fetch: async () => { throw new Error("must not fetch"); },
    });
    assert.ok(verifier.configError);
    assert.equal(await verifier.verify(await token()), null);
  }
  const log = t.mock.method(console, "error", () => {});
  const names = ["DISABLE_AUTH", "AUTH_ORCHESTRATOR_URL", "AUTH_EXPECTED_ISSUER"];
  const saved = names.map((name) => process.env[name]);
  const cacheKey = Symbol.for("cdms.auth.orchestrator.v1");
  const cached = Object.getOwnPropertyDescriptor(globalThis, cacheKey);
  Reflect.deleteProperty(globalThis, cacheKey);
  names.forEach((name) => { delete process.env[name]; });
  try {
    assert.doesNotThrow(logAuthConfiguration);
    assert.equal(log.mock.callCount(), 1);
    assert.match(String(log.mock.calls[0].arguments[0]), /AUTH_ORCHESTRATOR_URL.*AUTH_EXPECTED_ISSUER/);
    process.env.DISABLE_AUTH = "true";
    logAuthConfiguration();
    assert.equal(log.mock.callCount(), 1);
  } finally {
    names.forEach((name, index) => {
      if (saved[index] === undefined) delete process.env[name];
      else process.env[name] = saved[index];
    });
    Reflect.deleteProperty(globalThis, cacheKey);
    if (cached) Object.defineProperty(globalThis, cacheKey, cached);
  }
  assert.equal(readAuthConfig().loginPath, "/auth/local-login");
});
test("fallback requires configuration, HS256, expiry and admin id; wins both cookies", async () => {
  const names = ["FALLBACK_ADMIN_USERNAME", "FALLBACK_ADMIN_PASSWORD", "JWT_SECRET"];
  const saved = names.map((name) => process.env[name]);
  try {
    process.env.JWT_SECRET = "test-only-secret";
    process.env.FALLBACK_ADMIN_USERNAME = "admin";
    process.env.FALLBACK_ADMIN_PASSWORD = "test-password";
    const f = fixture();
    const bt = await token();
    const session = async (userId: string, exp?: number, alg = "HS256") =>
      new SignJWT({ userId, ...(exp === undefined ? {} : { exp }) })
        .setProtectedHeader({ alg }).sign(new TextEncoder().encode(process.env.JWT_SECRET));
    const cookies = (value: string, orchestrator?: string) => ({
      get: (name: string) => {
        const valueFound = name === "session" ? value : orchestrator;
        return valueFound ? { value: valueFound } : undefined;
      },
    });
    const expiry = Math.floor(Date.now() / 1000) + 3600;
    assert.equal(await authenticateRequestCookies(cookies(await session("old-user", expiry)), f.verifier), null);
    for (const value of [await session(FALLBACK_ADMIN_ID), await session(FALLBACK_ADMIN_ID, 1),
      await session(FALLBACK_ADMIN_ID, expiry, "HS384")]) {
      assert.equal(await authenticateRequestCookies(cookies(value), f.verifier), null);
    }
    const admin = await session(FALLBACK_ADMIN_ID, expiry);
    assert.equal((await authenticateRequestCookies(cookies(admin, bt), f.verifier))?.source, "fallback");
    assert.equal(f.calls.length, 0);
    delete process.env.FALLBACK_ADMIN_PASSWORD;
    assert.equal(await authenticateRequestCookies(cookies(admin), f.verifier), null);
    assert.equal((await authenticateRequestCookies(cookies(admin, bt), f.verifier))?.source, "orchestrator");
  } finally {
    names.forEach((name, index) => {
      if (saved[index] === undefined) delete process.env[name];
      else process.env[name] = saved[index];
    });
  }
});
test("proxy preserves public paths, API 401, page 307 and disabled bypass", async () => {
  const saved = process.env.DISABLE_AUTH;
  try {
    delete process.env.DISABLE_AUTH;
    for (const path of ["/login", "/api/auth/login", "/api/auth/logout", "/api/config"]) {
      assert.equal((await proxy(new NextRequest("http://cdms.example" + path))).status, 200);
    }
    const api = await proxy(new NextRequest("http://cdms.example/api/health"));
    assert.equal(api.status, 401);
    assert.deepEqual(await api.json(), { error: "Not authenticated" });
    const page = await proxy(new NextRequest("http://cdms.example/"));
    assert.equal(page.status, 307);
    assert.equal(page.headers.get("location"), "http://cdms.example/login");
    process.env.DISABLE_AUTH = "true";
    assert.equal((await proxy(new NextRequest("http://cdms.example/api/health"))).status, 200);
  } finally {
    if (saved === undefined) delete process.env.DISABLE_AUTH;
    else process.env.DISABLE_AUTH = saved;
  }
});
