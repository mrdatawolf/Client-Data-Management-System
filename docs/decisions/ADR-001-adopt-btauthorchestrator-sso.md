# ADR-001: Adopt BTAuthOrchestrator for user sign-in (shared-domain SSO)

Status: Proposed
Date: 2026-10-19
Decision owners: Patrick Moon
Related tasks and contracts: none yet (see "Follow-up work")

## Context

CDMS authenticates users itself: `POST /api/auth/login` checks a password
against the local SQLite `users` table and sets an HS256 `session` JWT signed
with `JWT_SECRET`, which `src/proxy.ts` verifies on every request. Per-user
preferences (`user_preferences`) are keyed to the local `users.id`. A
break-glass admin (`FALLBACK_ADMIN_USERNAME`/`PASSWORD`) bypasses the
database. Users reach CDMS by IP over HTTP, in a browser or via the Electron
wrapper (`electron-app/`), which loads a configured server URL.

BTAuthOrchestrator (sister repository) is now the organisation's
authentication service for internal tools. Its deployment, as observed on
2026-10-19:

- `http://auth.biztechro.com:3210`, i.e. host `192.168.203.238` (the same
  host as BTClientDataAPI). Plain HTTP; `COOKIE_SECURE=false`.
- Running in local-login mode (`LOCAL_LOGIN=true`): `GET /auth/local-login`
  serves the sign-in form; the Entra routes (`/auth/login`) return 404. The
  mode may later change to Entra without affecting consuming apps.
- `GET /health` and `GET /.well-known/jwks.json` are reachable.

On successful sign-in the orchestrator sets `bt_session`: an RS256 JWT with
`iss`, `sub`, `email`, `upn`, `iat`, `exp` (expiry = next local midnight on
the orchestrator host; no `aud`, roles, or refresh). The cookie is
`Domain=.biztechro.com; Path=/; HttpOnly; SameSite=Lax`. The domain is fixed
in the orchestrator's code. Consuming apps verify the token offline against
the published JWKS and own their own authorisation. The orchestrator
currently has no "return to app" parameter; sign-in ends on a "you may close
this window" page.

## Decision

1. **BTAuthOrchestrator becomes CDMS's identity provider, using shared-domain
   browser SSO.** CDMS will not collect or relay passwords. It reads the
   `bt_session` cookie set by the orchestrator and verifies it locally.
2. **CDMS must be served from a `*.biztechro.com` hostname** (e.g.
   `cdms.biztechro.com`; the exact name is to be chosen), resolvable to the
   CDMS host on the internal network, so that browsers send `bt_session` to
   it. Electron's configured server URL moves to that hostname. Access by
   bare IP will no longer carry a session.
3. **Verification** (in `src/proxy.ts` and server-side session helpers):
   - Use `jose` with `algorithms: ['RS256']` and a configured
     `AUTH_EXPECTED_ISSUER`.
   - Require the claims `sub`, `email`, `upn`, `iat` and `exp`, with
     non-empty strings and `exp > iat`.
   - Keys come from a JWKS fetched from a configured
     `AUTH_ORCHESTRATOR_URL`, cached in-process. Refresh on an unknown `kid`
     with a bounded retry, and keep verifying with cached keys while the
     orchestrator is unreachable.
   - The issuer and JWKS URL always come from configuration, never from the
     token.
4. **Unauthenticated access:**
   - Page requests redirect to `{AUTH_ORCHESTRATOR_URL}/auth/local-login`, or
     to `/auth/login` if the orchestrator moves to Entra mode. The CDMS
     `/login` page becomes a "sign in via BT Auth" landing page.
   - API requests return 401.
5. **Authorisation: anyone the orchestrator authenticates may use CDMS.**
   There is no CDMS-side allow-list. Access control lives entirely in the
   orchestrator's user management, including whether it permits
   self-registration.
6. **Local identity mapping:**
   - On first verified sign-in, CDMS creates a local `users` row keyed by
     (`iss`, `sub`) so preferences keep working. Later sign-ins update
     `email`/`username` from the token.
   - New rows get the default `user` role. Roles remain a CDMS concept (today
     `requireRole` is unused).
   - Existing local users may be linked once by matching `upn` to `username`,
     so they keep their preferences. The exact rule is defined in the
     contract.
7. **Local password login is retired** for normal use: the `POST
   /api/auth/login` password check against SQLite is removed or disabled.
   The **break-glass fallback admin is kept**, as `docs/ARCHITECTURE.md`
   requires. It still issues a CDMS-signed `session` cookie, and `proxy.ts`
   accepts either a valid `bt_session` or a valid fallback `session`.
   `DISABLE_AUTH` keeps its current dev-only meaning.
8. **Sign-out** expires `bt_session` for `.biztechro.com` (possible once CDMS
   is on that domain) and the CDMS `session` cookie. Expiring `bt_session`
   signs the user out of every app that shares it. This is accepted.

## Alternatives considered

- **Credential relay (CDMS keeps its login form and forwards the password to
  `POST /auth/local-login`).**
  - Works over IP and needs no DNS changes.
  - Rejected for these reasons:
    - CDMS keeps handling passwords.
    - It breaks if the orchestrator switches to Entra.
    - The orchestrator's per-source-IP throttle would treat all CDMS users as
      one IP, so a few failed logins could lock everyone out.
- **CDMS re-issues its own session after verifying `bt_session` once.**
  - Rejected as the primary mechanism: it duplicates session state and
    outlives an orchestrator emergency key rotation. CDMS verifies
    `bt_session` directly instead, and only the fallback admin uses a CDMS
    session.
- **Keep local auth.** Rejected: the organisation is consolidating on the
  orchestrator to centralise provisioning and deprovisioning.

## Consequences

### Benefits

- Users are provisioned and deprovisioned in one place. An orchestrator
  emergency key rotation immediately invalidates CDMS sessions on the next
  JWKS refresh.
- CDMS no longer stores or checks user passwords.
- No orchestrator code changes are required for the core flow, and an
  orchestrator move to Entra needs only a configuration change in CDMS.

### Costs and risks

- **DNS dependency:** every client must resolve `auth.biztechro.com` and the
  CDMS hostname to internal addresses. On at least one workstation this
  currently relies on an `/etc/hosts` entry, while public DNS resolves
  `auth.biztechro.com` to Cloudflare. Internal DNS (or a split-horizon
  record) is required before rollout.
- **Sign-in UX:** with no "return to app" parameter in the orchestrator,
  users must come back to CDMS manually or refresh after signing in. This
  stays the case until the orchestrator adds a return-to feature.
- **Session length:** sessions end at midnight (orchestrator host time)
  instead of after the current `JWT_EXPIRES_IN=7d`, and there is no refresh.
- **Open self-registration:** anyone who can create an orchestrator account
  gains CDMS access. While `ALLOW_NEW_LOCAL_LOGIN_CREATION=True`, that
  includes anyone on the network who can reach `/auth/local-register`. This
  is accepted per decision 5, but the orchestrator's registration setting
  now directly controls who can read CDMS client data.
- **Plain HTTP:** the session cookie travels unencrypted on the LAN, as the
  CDMS cookie does today. Orchestrator TASK-003d (TLS) would apply to CDMS
  too when it lands.
- **Orchestrator outage:** existing sessions keep working on cached keys, but
  nobody can sign in. The fallback admin remains the recovery path.
- **Migration:** existing local passwords stop working. Users need
  orchestrator accounts, and preferences carry over only through the linking
  rule in decision 6.

## Follow-up work

1. **Contract (CONTRACT-001):** define CDMS auth behaviour:
   - configuration: `AUTH_ORCHESTRATOR_URL`, `AUTH_EXPECTED_ISSUER`, and the
     orchestrator login path;
   - verification rules, JWKS caching and refresh, and the error mapping;
   - identity mapping and the one-time linking rule;
   - fallback admin coexistence and sign-out.
2. **Infrastructure:** choose the CDMS hostname, add internal DNS for it and
   for `auth.biztechro.com`, and update the Electron server URL and the
   deployment and start scripts.
3. **Implementation task(s):**
   - verification module in `src/lib/auth/`;
   - `proxy.ts` and session-helper changes, and the login landing page;
   - user-table migration (`iss`/`sub` columns);
   - add orchestrator reachability to `/api/health`;
   - updates to `.env.example`, `docs/ARCHITECTURE.md` and
     `docs/DEVELOPMENT.md`.
4. **Requests to the BTAuthOrchestrator repository (optional, not
   blocking):** a validated return-to parameter so sign-in lands back in
   CDMS, and a review of `ALLOW_NEW_LOCAL_LOGIN_CREATION` now that it gates
   CDMS access.
5. **Confirm** the deployed orchestrator's `SERVICE_ISSUER` value, which
   becomes `AUTH_EXPECTED_ISSUER`.
