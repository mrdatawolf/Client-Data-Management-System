# ADR-002: Integrate with the production orchestrator at orca.biztechro.com

Status: Accepted
Date: 2026-11-02
Decision owners: Patrick Moon
Related tasks and contracts: CONTRACT-001, TASK-003, TASK-004, TASK-005
Amends: ADR-001 (context, decisions 2 and 4, costs and risks, follow-up 5)

## Context

ADR-001 was written against a test deployment of BTAuthOrchestrator at
`http://auth.biztechro.com:3210` (plain HTTP, reached on the LAN through
`/etc/hosts` entries). The orchestrator is now in production. As observed on
2026-11-02:

- Official address: `https://orca.biztechro.com`, publicly reachable over
  HTTPS through a Cloudflare tunnel. `GET /health` and
  `GET /.well-known/jwks.json` respond; the JWKS holds one RS256 key.
- `SERVICE_ISSUER` is `https://orca.biztechro.com`.
- `COOKIE_SECURE=false`. This is deliberate: it lets apps served over plain
  HTTP on a `*.biztechro.com` hostname receive `bt_session`. The
  orchestrator's own pages are still served over HTTPS.
- Local-login mode (`LOCAL_LOGIN=true`): `/auth/local-login` is live and
  `/auth/login` returns 404.
- New local account creation (`ALLOW_NEW_LOCAL_LOGIN_CREATION`) is disabled.
  Accounts are created by an administrator in the orchestrator console.
- In local-login mode, `upn` is the orchestrator username (short names such
  as `patrick`, `luis`, `jwoods`), `sub` is the orchestrator's local user ID,
  and `email` is the stored address (`@trustbiztech.com`).
- The orchestrator host runs in US Pacific time, so `bt_session` expires at
  midnight Pacific.
- Public DNS for `cdms.biztechro.com` currently resolves to Cloudflare.

## Decision

1. **CDMS uses the production orchestrator.** `AUTH_ORCHESTRATOR_URL` and
   `AUTH_EXPECTED_ISSUER` are both `https://orca.biztechro.com`. This
   resolves ADR-001 follow-up 5.
2. **CDMS may stay on plain HTTP** on its `*.biztechro.com` hostname, relying
   on the orchestrator's `COOKIE_SECURE=false`. The plaintext-cookie risk
   between browser and CDMS is accepted, as in ADR-001. If the orchestrator
   ever sets `COOKIE_SECURE=true`, CDMS must first move to HTTPS, or no
   browser will send it `bt_session`.
3. **Who may use CDMS depends on orchestrator account creation staying
   admin-only.** ADR-001 decision 5 (anyone the orchestrator authenticates
   may use CDMS) stands. Because the orchestrator is now reachable from the
   internet, enabling `ALLOW_NEW_LOCAL_LOGIN_CREATION` in production would
   let anyone on the internet obtain CDMS access. It must stay disabled
   unless a CDMS-side allow-list is introduced first.
4. **A future switch of the orchestrator to Entra mode is accepted to reset
   user mappings once.** Entra changes each user's `sub`, so each user gets a
   new local row on their first Entra sign-in and starts with default
   preferences and role. This happens once per user. Re-linking may be
   handled then, through the operator `users link` command (CONTRACT-001
   Q2(c)).
5. **Unauthenticated page requests redirect to the CDMS `/login` landing
   page**, not straight to the orchestrator (CONTRACT-001 Q1, R4.4). This
   refines ADR-001 decision 4: the orchestrator cannot return users to CDMS,
   and the landing page also carries the emergency admin sign-in.

## Alternatives considered

- **Require HTTPS for CDMS now.** Rejected for now: it adds TLS or tunnel
  infrastructure to the rollout, and the orchestrator is deliberately
  configured so HTTP consumers work.
- **Add a CDMS allow-list now.** Rejected for now: orchestrator accounts are
  admin-created, so the orchestrator's user list is the allow-list.

## Consequences

### Benefits

- No `/etc/hosts` entries or internal DNS needed for the orchestrator; it
  resolves publicly.
- Existing CDMS usernames are likely to match orchestrator usernames, so the
  one-time link in CONTRACT-001 R5.2 should carry most users' preferences
  over automatically.

### Costs and risks

- `bt_session` is sent unencrypted on the LAN when CDMS is reached over HTTP.
- CDMS access control now depends on an orchestrator setting
  (`ALLOW_NEW_LOCAL_LOGIN_CREATION`) that lives in another repository's
  deployment. Test accounts in the orchestrator (e.g. `testadmin`,
  `alextest`) also get CDMS access while they are active.
- Clients must resolve the CDMS hostname to the CDMS host. Because
  `cdms.biztechro.com` publicly points at Cloudflare, an internal DNS record
  (or a Cloudflare route to CDMS) is needed if that name is used.
- The orchestrator's public `/auth/local-register` page lists all
  orchestrator usernames. This is an orchestrator concern, but it discloses
  the set of CDMS-capable accounts.

## Follow-up work

1. CONTRACT-001 updated with the production address, issuer, cookie
   attributes for sign-out, and the observed `upn` format.
2. Infrastructure task (ADR-001 follow-up 2, still open): choose the CDMS
   hostname, its DNS or tunnel route, and update the Electron server URL and
   start scripts.
3. Optional request to BTAuthOrchestrator: stop listing usernames on the
   public registration page when creation is disabled.
