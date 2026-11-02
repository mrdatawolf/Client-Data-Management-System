# CONTRACT-001: Sign-in via BTAuthOrchestrator (shared-domain SSO)

Status: Approved
Approved by: Patrick
Approved date: 2026-11-02
Related tasks: TASK-003, TASK-004, TASK-005
Related ADRs: ADR-001, ADR-002

## Purpose

Define the observable authentication behaviour of CDMS once
BTAuthOrchestrator ("the orchestrator") is its identity provider, as decided
in ADR-001 and ADR-002. CDMS verifies the orchestrator's `bt_session` cookie offline,
maps the identity to a local user record, and keeps the break-glass fallback
admin as its only local sign-in.

## Scope

### Included

- Configuration that CDMS reads for orchestrator auth.
- Verification of `bt_session`: algorithm, issuer, claims, JWKS retrieval,
  caching and refresh.
- How `src/proxy.ts` treats requests with and without a valid credential.
- Mapping a verified identity to a local `users` row, including the one-time
  link to existing local users.
- Fallback admin sign-in and how it coexists with `bt_session`.
- Sign-out.
- `/api/auth/me` and `/api/auth/login` behaviour after the change.
- Orchestrator reachability in `/api/health`.
- `/login` landing page behaviour.

### Excluded

- DNS, the CDMS hostname, Electron server URL, and deployment/start scripts
  (ADR-001 follow-up 2; infrastructure work).
- Any orchestrator code change, including a return-to parameter.
- CDMS role management UI or new uses of roles. Roles stay as they are;
  `requireRole` stays unused.
- TLS.
- Changes to `DISABLE_AUTH` semantics.

## Actors

- **Orchestrator user**: a person with an orchestrator account who has
  signed in at the orchestrator and holds a `bt_session` cookie.
- **Fallback admin**: the break-glass account defined by
  `FALLBACK_ADMIN_USERNAME`/`FALLBACK_ADMIN_PASSWORD`.
- **Unauthenticated client**: a browser, Electron window, or API caller with
  no valid credential.
- **Orchestrator**: issues `bt_session` and publishes its JWKS.
- **Operator**: configures `.env` and reads `/api/health`.

## Inputs and outputs

### Configuration

| Variable | Required | Meaning |
| --- | --- | --- |
| `AUTH_ORCHESTRATOR_URL` | Yes, unless `DISABLE_AUTH=true` | Base URL of the orchestrator. Production: `https://orca.biztechro.com`. No trailing slash is required; one is tolerated. |
| `AUTH_EXPECTED_ISSUER` | Yes, unless `DISABLE_AUTH=true` | Exact `iss` value a `bt_session` must carry (the orchestrator's `SERVICE_ISSUER`). Production: `https://orca.biztechro.com`. |
| `AUTH_LOGIN_PATH` | No, default `/auth/local-login` | Path on the orchestrator that unauthenticated page requests are sent to. Set to `/auth/login` for Entra mode. |
| `FALLBACK_ADMIN_USERNAME` / `FALLBACK_ADMIN_PASSWORD` | No | Unchanged meaning: both set enables the fallback admin. |
| `JWT_SECRET` | Yes, if fallback admin is enabled | Signs and verifies the fallback admin's CDMS `session` cookie only. |
| `JWT_EXPIRES_IN` | No | Lifetime of the fallback admin `session` only. |
| `DISABLE_AUTH` | No | Unchanged. |

The JWKS URL is always `{AUTH_ORCHESTRATOR_URL}/.well-known/jwks.json`. The
issuer, JWKS URL and login URL never come from token contents.

### Cookies

- `bt_session` (read-only for CDMS, except on sign-out): RS256 JWT set by the
  orchestrator with `Domain=.biztechro.com; Path=/; HttpOnly; SameSite=Lax`,
  plus `Secure` when the orchestrator's `COOKIE_SECURE=true`. Production
  uses `COOKIE_SECURE=false` (ADR-002).
- `session` (CDMS-issued): HS256 JWT, issued only to the fallback admin.

## Preconditions

- CDMS is reached on a `*.biztechro.com` hostname, so the browser sends
  `bt_session`. Over a bare IP, only the fallback admin can sign in.
- While the orchestrator uses `COOKIE_SECURE=false`, that hostname may be
  plain HTTP. If the orchestrator sets `COOKIE_SECURE=true`, CDMS must be
  served over HTTPS, or the browser never sends it `bt_session`.
- Orchestrator account creation stays admin-only (ADR-002 decision 3).
- The CDMS server can reach `AUTH_ORCHESTRATOR_URL` at least once to obtain
  keys before the first orchestrator user can be verified.

## Required behavior

### R1. Configuration validation

1. When auth is enabled and `AUTH_ORCHESTRATOR_URL` or
   `AUTH_EXPECTED_ISSUER` is missing or `AUTH_ORCHESTRATOR_URL` is not an
   absolute `http(s)` URL, CDMS logs a clear error at startup and treats
   every `bt_session` as invalid (fails closed). The fallback admin still
   works.
2. CDMS does not refuse to start because of missing orchestrator config.

### R2. Verifying `bt_session`

A `bt_session` is valid only if all of the following hold:

1. It is a compact JWS whose header `alg` is `RS256`. Any other algorithm,
   including `none` and `HS256`, is rejected.
2. Its signature verifies against a key from the configured JWKS whose `kid`
   matches the token header.
3. `iss` equals `AUTH_EXPECTED_ISSUER` exactly.
4. `sub`, `email` and `upn` are present, are strings, and are non-empty
   after trimming.
5. `iat` and `exp` are present, are numbers, and `exp > iat`.
6. `exp` is in the future and `iat` is not in the future, each with a clock
   tolerance of 60 seconds.

`aud` is not checked (the orchestrator does not set one). Unknown extra
claims are ignored.

### R3. JWKS retrieval and caching

1. Keys are fetched on first need and cached in the server process.
2. Cached keys are considered fresh for 10 minutes. After that, the next
   verification triggers a background-or-inline refresh; a failed refresh
   keeps the existing keys.
3. When a token's `kid` is not in the cache, CDMS refreshes the JWKS once and
   retries verification. Unknown-`kid` refreshes are rate-limited to at most
   one per 30 seconds per process; a token whose `kid` is still unknown is
   rejected.
4. When the orchestrator is unreachable, tokens signed by cached keys keep
   verifying. If no keys have ever been fetched, every `bt_session` is
   rejected.
5. A key removed from the JWKS stops verifying once a refresh observes its
   removal (bounded by the 10-minute freshness window, or sooner via an
   unknown-`kid` refresh).
6. Each JWKS fetch has a timeout of 5 seconds.

### R4. Request gating (`src/proxy.ts`)

1. Public paths, reachable without a credential: `/login`,
   `/api/auth/login`, `/api/auth/logout`, `/api/config`, plus static assets
   already excluded by the matcher.
2. A request is authenticated if it carries a valid `bt_session` (R2) **or**
   a valid fallback `session` (R7).
3. Unauthenticated `/api/*` requests receive `401` with JSON
   `{ "error": "Not authenticated" }`.
4. Unauthenticated page requests receive a redirect (`307`) to the CDMS
   `/login` landing page. (See open question Q1.)
5. With `DISABLE_AUTH=true`, every request is allowed, as today.

### R5. Identity mapping

Run when an authenticated request first needs the local user (at the latest
on `GET /api/auth/me` and on any preferences call):

1. If a `users` row exists with matching (`iss`, `sub`), it is the user. If
   the token's `email` or `upn` differs from the stored values, the row is
   updated (`email` ← `email`, `username` ← `upn`) and `updatedAt` changes.
2. Otherwise, **one-time link**: if exactly one row has no `iss`/`sub`, and
   its `username` equals the token's `upn` compared case-insensitively, that
   row is linked: its `iss`/`sub` are set, `email` updated, and `username`
   set to `upn`. Its `id`, `role`, and preferences are kept. (See Q2.)
3. Otherwise a new row is created with a new `id`, `username` = `upn`,
   `email` = `email`, `role` = `user`, `iss`/`sub` from the token, and no
   usable password.
4. (`iss`, `sub`) is unique across `users`. A row once linked is never
   re-linked to a different (`iss`, `sub`).
5. If writing `username` would collide with a different row's `username`,
   the mapping does not overwrite it; the request is still authenticated and
   the user still resolves, and a warning is logged.
6. If the database is unavailable, the user is still authenticated; they get
   a transient identity (`id` = `sub`-derived, `role` = `user`), and
   preferences behave as they do today for users not in the DB.

### R6. Local password login retired

1. `POST /api/auth/login` succeeds only for the fallback admin's
   credentials. Any other username/password, including a correct password
   for an existing local user, returns `401` with
   `{ "error": "Invalid username or password" }`.
2. When the fallback admin is not configured, `POST /api/auth/login` returns
   `401` for every request with valid input; `400` stays for missing fields.
3. Local `users.password` values are never checked again by the
   application.

### R7. Fallback admin

1. Sign-in via `POST /api/auth/login` as today; on success CDMS sets the
   `session` cookie (HS256, `JWT_SECRET`, lifetime `JWT_EXPIRES_IN`).
2. A `session` cookie is valid only if it verifies with `JWT_SECRET`, is not
   expired, its `userId` is the fallback admin id, **and** the fallback admin
   is currently configured. `session` cookies issued to former local users
   before this change are therefore rejected.
3. When both a valid `session` and a valid `bt_session` are present, the
   fallback admin `session` wins. (See Q3.)

### R8. Current user (`GET /api/auth/me`)

1. Returns `200` with `{ "user": { id, username, email, role, authSource } }`
   where `authSource` is `"orchestrator"`, `"fallback"` or `"disabled"`.
2. Returns `401` when unauthenticated.
3. Never returns a password hash.

### R9. Sign-out (`POST /api/auth/logout`)

1. Expires the CDMS `session` cookie (`Path=/`).
2. Expires `bt_session` with `Domain=.biztechro.com; Path=/; HttpOnly;
   SameSite=Lax`, adding `Secure` when the request to CDMS arrived over
   HTTPS, so that the browser removes the orchestrator's cookie. (A browser
   ignores a non-`Secure` header that tries to replace a `Secure` cookie.) This also signs the user out of
   other apps sharing that cookie (accepted in ADR-001).
3. Returns `200` with or without a valid credential.
4. When CDMS is not served under `.biztechro.com`, step 2 has no effect in the
   browser; this is not an error.
5. CDMS does not call the orchestrator's `POST /auth/logout`, which accepts
   only same-origin requests.

### R10. Health (`GET /api/health`)

1. The response gains an `auth` object:
   `{ orchestratorUrl, reachable, keysCached, keyCount, lastRefreshAt, error? }`.
2. `reachable` reflects a live request to the orchestrator's `/health` made
   for this call, with the same 5-second timeout.
3. Orchestrator reachability does not change the existing top-level `ok`.
   (See Q4.)

## Postconditions and invariants

- CDMS never receives, stores or forwards an orchestrator password.
- No application path verifies a local user's stored password.
- Every authenticated orchestrator user has at most one `users` row.
- Existing preferences of a linked user remain attached to the same `id`.
- The issuer, JWKS URL and login URL come only from configuration.
- The fallback admin can sign in when the orchestrator and the database are
  both unavailable.

## Failure behavior

| Situation | Result |
| --- | --- |
| No credential | API 401, page redirect to `/login` |
| `bt_session` malformed, bad signature, wrong `alg`, wrong `iss`, missing/invalid claims, expired | Treated as no credential; nothing about the reason is sent to the client; logged at debug level |
| Orchestrator unreachable, keys cached | Verification continues with cached keys |
| Orchestrator unreachable, no keys ever fetched | Every `bt_session` rejected; fallback admin works; logged as error (rate-limited) |
| Orchestrator config missing | As above, plus a startup error |
| Auth DB unavailable | Orchestrator users still authenticated (R5.6); fallback admin works |
| Stale pre-migration `session` cookie | Rejected (R7.2) |

## Interfaces

- `src/proxy.ts`: gate per R4.
- Server-side session helper (replacing the current `getSessionUser`):
  resolves the authenticated principal for API routes, including identity
  mapping (R5). It may become async.
- `users` table gains nullable `iss` and `sub` columns with a unique index on
  (`iss`, `sub`). The migration runs automatically on database open and is
  idempotent on existing databases. New orchestrator rows need a `password`
  value that can never match a bcrypt comparison.
- `GET /api/auth/me`, `POST /api/auth/login`, `POST /api/auth/logout`,
  `GET /api/health`: as above, with Swagger annotations updated.
- `.env.example`: new variables documented; `JWT_SECRET`/`JWT_EXPIRES_IN`
  described as fallback-admin-only.

## UX expectations

`/login` becomes a landing page:

1. Primary action: **Sign in with BT Auth**, a link to
   `{AUTH_ORCHESTRATOR_URL}{AUTH_LOGIN_PATH}` opened in a new tab/window, plus
   a short instruction: "After signing in, return here and select
   Continue." A **Continue** button rechecks `/api/auth/me` and goes to the
   dashboard on success, or shows "Still not signed in" otherwise.
2. When the page is served from a host not under `.biztechro.com`, it shows a
   notice that BT Auth sign-in only works at the CDMS `biztechro.com`
   address.
3. Fallback admin sign-in is available on the same page as a secondary,
   collapsed "Emergency admin sign-in" section with the existing
   username/password form. It is shown only when the fallback admin is
   configured (exposed via `/api/config` as a boolean only).
4. Existing pages that redirect to `/login` on a `401` from `/api/auth/me`
   keep doing so.

## Validation requirements

The repository has no automated test runner today. Validation for the
implementation tasks:

1. Unit-level checks (a script or added test runner, decided in the task)
   for R2 using locally generated RSA keys and a stub JWKS: valid token;
   wrong `alg`; `alg: none`; wrong `iss`; each missing claim; `exp <= iat`;
   expired; future `iat`; unknown `kid` then refreshed; unreachable JWKS with
   cached keys; unreachable JWKS with no keys.
2. Identity mapping (R5) against a temporary SQLite file: new user, returning
   user with changed email, link of an existing local user (preferences
   kept), case-insensitive link, ambiguous link (two candidates), username
   collision, DB unavailable.
3. `POST /api/auth/login`: local user with correct password → 401; fallback
   admin → 200; stale local-user `session` cookie → rejected by proxy.
4. Manual end-to-end against the deployed orchestrator from a
   `*.biztechro.com` hostname: sign in, return, Continue, preferences load,
   sign out removes `bt_session`.
5. `npm run build` and `npm run lint` pass.

## Open questions

Each has a recommended answer that this draft already assumes. Approving the
contract as written accepts the recommendation.

- **Q1. Where do unauthenticated page requests go?** ADR-001 says straight to
  the orchestrator. Because the orchestrator cannot send users back, a direct
  redirect strands them on "you may close this window" and hides the
  fallback admin form. *Recommendation:* redirect to CDMS `/login` (R4.4),
  which links to the orchestrator. This refines ADR-001 decision 4 and
  should be recorded there if accepted.
  - **A1: I think your recommendation is the better way to handle it.
- **Q2. Linking rule.** In the production orchestrator's local-login mode,
  `upn` is the orchestrator username (short names such as `patrick`, `luis`,
  `jwoods`) and `sub` is its local user ID (ADR-002). Full-`upn` matching
  should therefore link existing CDMS users whose usernames match. *Options:*
  (a) case-insensitive match on full `upn` only (as drafted); (b) also match
  the `upn` local part when it is email-shaped; (c) an operator CLI command
  `npm run users -- link <username> <upn>` for names that differ.
  *Recommendation:* (a) plus (c), so no automatic guess links the wrong
  person. If accepted, (c) is an explicit operator action and is the one
  exception to R5.4, so it can also re-link users after a future move to
  Entra, which changes every `sub` (ADR-002 decision 4).
  - **A2: I also agree a plus c is the best way.
- **Q3. Precedence when both cookies are valid.** *Recommendation:* fallback
  `session` wins, since signing in as fallback admin is a deliberate act.
  - **A3: session winning is fine.
- **Q4. Does an unreachable orchestrator make `/api/health` `ok: false`?**
  *Recommendation:* no; report it in `auth` only, because existing sessions
  keep working and the data sources are unaffected.
  - **A4: agreed report it in auth only.
- **Q5. The `users` CLI (`scripts/users.ts`).** `add` and `passwd` create
  passwords nothing will check. *Recommendation:* keep `list`, `remove` and a
  new `role <username> <role>`; remove `add` and `passwd`; add `link` if Q2(c)
  is accepted. This is in TASK-004's scope.
  - **A5: do your recommendation
- **Q6. JWKS timings** (10-minute freshness, 30-second unknown-`kid` limit,
  5-second timeout, 60-second clock tolerance). *Recommendation:* accept as
  fixed constants, not configuration.
  - **A6: your recommendation is fine
- **Q7. Issuer value.** Resolved by ADR-002: `https://orca.biztechro.com`.
 
