# TASK-003: Verify `bt_session` and gate requests on it

Owner role: Implementer
Assigned agent: Codex
Proposed by: Claude
Proposed date: 2026-10-20
Approved by: Patrick
Approved date: 2026-11-02
Related contracts: CONTRACT-001
Related ADRs: ADR-001, ADR-002
Dependencies: CONTRACT-001 approved

## Desired outcome

CDMS accepts a valid orchestrator `bt_session` (or a valid fallback-admin
`session`) as authentication on every gated route, verified offline against
the orchestrator's JWKS, and reports orchestrator reachability in
`/api/health`.

## Context

Implements CONTRACT-001 R1–R4, R7.2–R7.3 and R10. Today `src/proxy.ts`
accepts any `session` JWT signed with `JWT_SECRET`. `jose` (^6) is already a
dependency.

## Scope

### Included

- New verification module in `src/lib/auth/` (config read/validation, JWKS
  cache with refresh rules, `bt_session` verification, fallback `session`
  verification restricted to the fallback admin id).
- `src/proxy.ts` uses it per R4; unauthenticated pages still redirect to
  `/login`.
- `/api/health` gains the `auth` object (R10).
- `.env.example` entries for `AUTH_ORCHESTRATOR_URL`,
  `AUTH_EXPECTED_ISSUER`, `AUTH_LOGIN_PATH`.
- Validation checks for R2/R3 (see contract validation item 1), including
  deciding how they run given there is no test runner today.

### Excluded

- Identity mapping, DB migration, `/api/auth/me` (TASK-004).
- Login page, login/logout routes (TASK-005).
- DNS, hostname, Electron, start scripts.

## Plan

1. Add the verification module and its config validation.
2. Switch `proxy.ts` to it.
3. Add the health `auth` section.
4. Add validation checks; run build and lint.

## Acceptance criteria

- [x] All R2 rejection cases are rejected and the valid case accepted.
- [x] JWKS caching and refresh behave per R3, including outage with cached keys.
- [x] A stale local-user `session` cookie no longer authenticates (R7.2).
- [x] Fallback admin `session` still authenticates.
- [x] Missing orchestrator config fails closed with a startup error (R1).
- [x] `/api/health` includes `auth` without changing top-level `ok`.
- [x] `npm run build` and `npm run lint` pass.

## Validation requirements

CONTRACT-001 validation items 1, 3 (stale cookie part) and 5.

## Risks and assumptions

- Between this task and TASK-004/005, local users cannot sign in (their
  `session` cookies are rejected and they cannot yet obtain `bt_session`
  on the IP address). Tasks 003–005 should ship together.
- Assumes Next 16 `proxy.ts` runs where an in-process module-level cache
  persists between requests; to be confirmed during implementation.

## Blocker

None.

## Implementation handoff

Task: TASK-003
Implementer: Codex
Date: 2026-11-02

### Changes made

- Added `src/lib/auth/orchestrator.ts`: trusted configuration, injectable verifier
  factory, strict RS256/issuer/identity/timestamp verification, and a local JWKS
  cache. Freshness is 10 minutes; unknown-kid attempts are limited to 30 seconds;
  fetches use a 5-second timeout and no-store. Concurrent fetches share a promise.
  Failed refreshes retain existing keys; successful empty sets revoke all keys.
- Shared the default verifier/cache through `globalThis[Symbol.for(...)]` across
  separately bundled proxy and route code. Added fallback-first cookie
  authentication returning a typed principal; only configured fallback-admin
  HS256 sessions with expiry qualify.
- Updated proxy gating, startup configuration diagnostics, and health auth status
  with Swagger documentation. Existing public paths, matcher and top-level
  data-source health semantics are preserved.
- Added the dependency-free Node test runner command and 25 auth/proxy tests.
- Preserved the pre-existing db-sqlite/fallback-admin changes and worked directly
  on main. No commit, push, identity mapping, login/logout/config-route change,
  or database migration was performed.

### Validation performed

Commands below used Node 24.16.0 via
`export PATH=/home/patrick/.nvm/versions/node/v24.16.0/bin:$PATH`, except the
initial test attempts noted explicitly.

- `npm test`: final PASS, 25 tests, 25 passed, 0 failed/skipped.
  Also passed an earlier Node 24 run and a Node 20 run. The initial Node 20
  attempt failed before running tests because tsx's CommonJS output disallowed
  top-level await; replaced it with a Node test `before` hook.
- `npm run lint`: PASS, exit 0, no diagnostics (both runs).
- `npx tsc --noEmit`: PASS, exit 0, no diagnostics (both runs).
- `npm run build`: PASS (both runs); Next.js 16.1.1 compiled, completed
  TypeScript checking, and generated 34/34 static pages. Final compilation:
  4.4 seconds. The build's `npm run docs:generate` also passed, generating
  OpenAPI for 10 paths and copying Swagger UI assets (generated assets ignored).
- `node /tmp/task003-smoke.mjs`: PASS against the production build with a
  local mock orchestrator/data API and disposable SQLite database. A real RSA
  cookie passed proxy authentication; health observed that same cached key
  (`keysCached: true`, `keyCount: 1`, timestamp present, one total JWKS fetch).
  Switching only orchestrator health to HTTP 503 changed reachable from true
  to false while top-level ok remained true. A former local-user session got
  401 with exactly the required JSON. Server stopped and temporary DB removed.
  The first smoke attempt incorrectly shared the failing health endpoint with
  its mock data API, so top-level ok correctly changed; separated mock endpoints
  and reran successfully. Next start emitted the existing standalone-output
  advisory; the build was served and assertions completed.
- `git diff --check`: PASS, no whitespace errors.
- `git mv tasks/in-progress/TASK-003-orchestrator-token-verification.md tasks/review/TASK-003-orchestrator-token-verification.md`:
  FAILED, read-only .git/index.lock. Used a filesystem move; index reconciliation
  remains outstanding (see Unresolved risks).

### Acceptance criteria evidence

- R2: tests cover valid RS256, HS256/none/malformed/wrong signature, missing kid,
  wrong issuer, every missing required claim, blank/wrong-type identity claims,
  missing/non-numeric timestamps, exp <= iat, expired/future timestamps and the
  60-second tolerance. Audience and extra claims are ignored.
- R3: tests cover fresh reuse, unknown-kid rotation/retry/throttling, successful
  removal, malformed refresh retention, empty JWKS removal, fresh/stale outage,
  cold outage, fetch deduplication and rate-limited errors.
- R7.2/R7.3: tests reject former local users, missing expiry, expired fallback
  and non-HS256 sessions; accept configured fallback, reject unconfigured
  fallback, and prove fallback wins both cookies without fetching JWKS.
  Built-server smoke also proves proxy rejection of a stale local session.
- R1: invalid URL/missing issuer cases reject; startup diagnostics are asserted
  without throwing, and DISABLE_AUTH suppresses them. Instrumentation invokes
  diagnostics inside the existing nodejs guard.
- R4: tests exercise all four public paths, API 401/body, page 307/location and
  DISABLE_AUTH bypass; original matcher is unchanged.
- R10: unit checks cover live per-call health and cached metadata during outage;
  built-server smoke confirms cross-bundle visibility and top-level ok isolation.
- Build/lint/type checks pass as recorded above. Checkboxes indicate implementer
  evidence, not independent review or human acceptance.

### Assumptions and deviations

- Failed JWKS attempts are additionally throttled for 30 seconds (including cold
  starts and stale refreshes) to avoid hammering an unavailable orchestrator.
  Recovery may therefore wait up to that interval.
- A first-demand fetch is already the request's inline attempt when its kid is
  absent; do not immediately fetch the same JWKS twice. Concurrent unknown-kid
  requests await an already running fetch.
- Stale keys verify while the refresh runs in the background, as authorized.
  A request already verifying can finish with its selected key; subsequent
  verification uses the replacement set after refresh observes removal.
- Cache and throttles are process-local. The factory creates isolated test
  instances; production callers use the one global default instance.
- AUTH_LOGIN_PATH is read with its default for subsequent TASK-005 use; this
  task does not change login navigation beyond retaining the required redirect.
- Corrected stale edge-runtime wording in DEVELOPMENT and ARCHITECTURE.
  This small documentation correction is the only additional file beyond the
  explicitly listed implementation files; no architecture decision changed.
- Shell default was Node 20.19.2; required validation was rerun with installed
  Node 24.16.0. No dependencies were added.

### Unresolved risks

- TASK-003 through TASK-005 must ship together: local-user cookies now fail,
  but identity mapping and login/logout UI/routes remain for subsequent tasks.
- Production-hostname/browser SSO end-to-end validation belongs to the later
  integration work; this task used local cryptographic/network fixtures.
- Multiple server processes each maintain their own cache, as required by R3.
- Independent review and human acceptance remain pending.
- The required git mv was attempted but failed: Git could not create
  .git/index.lock because this session mounts .git read-only. The task was moved
  to tasks/review/ with a filesystem rename so its authoritative lifecycle state
  is review. The index still contains the pre-existing approved -> in-progress
  staged rename and needs reconciliation in a Git-write-capable session. This is
  the sole unmet mechanical requirement; no commit or push was attempted.

### Documentation updated

- `.env.example`: orchestrator URL, issuer and commented login-path default;
  existing fallback/JWT comments preserved.
- `docs/DEVELOPMENT.md`: environment variables, npm test, Node runtime.
- `docs/ARCHITECTURE.md`: proxy authentication/runtime description.
- `src/app/api/health/route.ts`: auth response Swagger schema.
- This task: assignment, acceptance evidence and implementation handoff.


## Review

Not reviewed.

## Human acceptance

Pending.
