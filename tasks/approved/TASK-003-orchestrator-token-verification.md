# TASK-003: Verify `bt_session` and gate requests on it

Owner role: Implementer
Assigned agent:
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

- [ ] All R2 rejection cases are rejected and the valid case accepted.
- [ ] JWKS caching and refresh behave per R3, including outage with cached keys.
- [ ] A stale local-user `session` cookie no longer authenticates (R7.2).
- [ ] Fallback admin `session` still authenticates.
- [ ] Missing orchestrator config fails closed with a startup error (R1).
- [ ] `/api/health` includes `auth` without changing top-level `ok`.
- [ ] `npm run build` and `npm run lint` pass.

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

Not started.

## Review

Not reviewed.

## Human acceptance

Pending.
