/**
 * Orchestrator token verification and process-local JWKS cache.
 * No database or Next.js dependencies: proxy and server routes share the
 * default instance through globalThis, even when bundled separately.
 */

import { createLocalJWKSet, decodeProtectedHeader, jwtVerify, type JSONWebKeySet } from "jose";
import { FALLBACK_ADMIN_ID, isFallbackAdminConfigured } from "./fallback-admin";

const FRESH_MS = 10 * 60 * 1000;
const RETRY_MS = 30 * 1000;

export interface AuthConfig {
  orchestratorUrl?: string;
  expectedIssuer?: string;
  loginPath?: string;
}

export type AuthPrincipal =
  | { source: "orchestrator"; iss: string; sub: string; email: string; upn: string; iat: number; exp: number }
  | { source: "fallback"; userId: string; username: string; role: "admin" };

export interface AuthHealth {
  orchestratorUrl: string | null;
  reachable: boolean;
  keysCached: boolean;
  keyCount: number;
  lastRefreshAt: string | null;
  error?: string;
}

interface Cookies {
  get(name: string): { value: string } | undefined;
}

/** Read only trusted deployment configuration, never token-supplied URLs. */
export function readAuthConfig(): AuthConfig {
  return {
    orchestratorUrl: process.env.AUTH_ORCHESTRATOR_URL,
    expectedIssuer: process.env.AUTH_EXPECTED_ISSUER,
    loginPath: process.env.AUTH_LOGIN_PATH || "/auth/local-login",
  };
}

export function createOrchestratorVerifier(options: AuthConfig & {
  fetch?: typeof fetch;
  now?: () => number;
}) {
  const fetcher = options.fetch ?? fetch;
  const now = options.now ?? Date.now;
  let url: string | null = null;
  let configError: string | undefined;
  try {
    const parsed = new URL(options.orchestratorUrl ?? "");
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
    url = parsed.href.replace(/\/+$/, "");
  } catch {
    configError = "AUTH_ORCHESTRATOR_URL must be an absolute http(s) URL";
  }
  if (!options.expectedIssuer?.trim()) {
    configError = [configError, "AUTH_EXPECTED_ISSUER is required"].filter(Boolean).join("; ");
  }

  let keys: JSONWebKeySet | undefined;
  let verifier: ReturnType<typeof createLocalJWKSet> | undefined;
  let lastRefreshAt: number | undefined;
  let lastFailureAt = -Infinity;
  let lastUnknownAt = -Infinity;
  let lastErrorAt = -Infinity;
  let pending: Promise<void> | undefined;

  function refresh(): Promise<void> {
    if (pending) return pending;
    if (configError || now() - lastFailureAt < RETRY_MS) return Promise.resolve();
    pending = (async () => {
      try {
        const response = await fetcher(`${url}/.well-known/jwks.json`, {
          signal: AbortSignal.timeout(5000), cache: "no-store",
        });
        if (!response.ok) throw new Error("JWKS HTTP failure");
        const body = await response.json();
        if (!body || !Array.isArray(body.keys) || !body.keys.every(
          (key: unknown) => key !== null && typeof key === "object" &&
            typeof (key as { kty?: unknown }).kty === "string"
        )) throw new Error("Invalid JWKS shape");
        const nextVerifier = createLocalJWKSet(body);
        keys = body;
        verifier = nextVerifier;
        lastRefreshAt = now();
        lastFailureAt = -Infinity;
      } catch {
        lastFailureAt = now();
        if (!keys && now() - lastErrorAt >= RETRY_MS) {
          console.error("Orchestrator JWKS unavailable; no cached keys, bt_session authentication denied");
          lastErrorAt = now();
        }
      }
    })().finally(() => { pending = undefined; });
    return pending;
  }

  async function verify(token: string): Promise<AuthPrincipal | null> {
    try {
      if (configError) throw new Error("Invalid orchestrator configuration");
      const header = decodeProtectedHeader(token);
      if (header.alg !== "RS256" || typeof header.kid !== "string" || !header.kid.trim()) {
        throw new Error("RS256 and a non-empty kid are required");
      }
      const hadKeys = keys !== undefined;
      if (!keys) await refresh();
      if (!keys || !verifier) throw new Error("No cached JWKS");
      if (!keys.keys.some((key) => key.kid === header.kid)) {
        // The initial fetch already constitutes this request's inline attempt.
        if (pending) {
          await pending;
        } else if (now() - lastUnknownAt >= RETRY_MS) {
          lastUnknownAt = now();
          if (hadKeys) await refresh();
        }
        if (!keys.keys.some((key) => key.kid === header.kid)) throw new Error("Unknown kid");
      } else if (now() - lastRefreshAt! >= FRESH_MS) {
        void refresh();
      }
      const { payload } = await jwtVerify(token, verifier, {
        algorithms: ["RS256"], issuer: options.expectedIssuer,
        clockTolerance: 60, currentDate: new Date(now()),
      });
      for (const claim of ["sub", "email", "upn"] as const) {
        if (typeof payload[claim] !== "string" || !payload[claim].trim()) {
          throw new Error(`Invalid ${claim} claim`);
        }
      }
      const { iat, exp } = payload;
      const seconds = now() / 1000;
      if (typeof iat !== "number" || typeof exp !== "number" ||
          !Number.isFinite(iat) || !Number.isFinite(exp) || exp <= iat ||
          exp <= seconds - 60 || iat > seconds + 60) {
        throw new Error("Invalid token timestamps");
      }
      return {
        source: "orchestrator", iss: payload.iss!, sub: payload.sub!,
        email: payload.email as string, upn: payload.upn as string, iat, exp,
      };
    } catch (error) {
      console.debug("bt_session rejected:", error instanceof Error ? error.message : "Invalid token");
      return null;
    }
  }

  /** Reachability is live; inspecting health never fetches or replaces JWKS. */
  async function health(): Promise<AuthHealth> {
    let error = configError;
    let reachable = false;
    if (url) {
      try {
        const response = await fetcher(`${url}/health`, {
          signal: AbortSignal.timeout(5000), cache: "no-store",
        });
        reachable = response.ok;
        if (!response.ok) error = error ?? `Orchestrator health returned HTTP ${response.status}`;
      } catch {
        error = error ?? "Orchestrator health request failed";
      }
    }
    return {
      orchestratorUrl: url, reachable, keysCached: keys !== undefined,
      keyCount: keys?.keys.length ?? 0,
      lastRefreshAt: lastRefreshAt === undefined ? null : new Date(lastRefreshAt).toISOString(),
      ...(error ? { error } : {}),
    };
  }

  return { verify, health, configError };
}

type OrchestratorVerifier = ReturnType<typeof createOrchestratorVerifier>;
const CACHE_KEY = Symbol.for("cdms.auth.orchestrator.v1");
const processState = globalThis as typeof globalThis & { [CACHE_KEY]?: OrchestratorVerifier };

export function getOrchestratorVerifier(): OrchestratorVerifier {
  return processState[CACHE_KEY] ??= createOrchestratorVerifier(readAuthConfig());
}

/** Startup diagnostics never prevent the application or fallback admin starting. */
export function logAuthConfiguration(): void {
  if (process.env.DISABLE_AUTH !== "true") {
    const { configError } = getOrchestratorVerifier();
    if (configError) console.error(`Orchestrator authentication configuration error: ${configError}; bt_session authentication disabled`);
  }
}

/** Shared cookie authentication entry point; deliberate fallback sign-in wins. */
export async function authenticateRequestCookies(
  cookies: Cookies,
  orchestrator: OrchestratorVerifier = getOrchestratorVerifier()
): Promise<AuthPrincipal | null> {
  const session = cookies.get("session")?.value;
  if (session && isFallbackAdminConfigured()) {
    try {
      const { payload } = await jwtVerify(session, new TextEncoder().encode(
        process.env.JWT_SECRET || "change-this-secret-in-production"
      ), { algorithms: ["HS256"], requiredClaims: ["exp"] });
      if (payload.userId === FALLBACK_ADMIN_ID) {
        return {
          source: "fallback", userId: FALLBACK_ADMIN_ID,
          username: process.env.FALLBACK_ADMIN_USERNAME!, role: "admin",
        };
      }
      console.debug("session rejected: not the fallback admin");
    } catch {
      console.debug("session rejected: invalid fallback credential");
    }
  }
  const token = cookies.get("bt_session")?.value;
  return token ? orchestrator.verify(token) : null;
}
