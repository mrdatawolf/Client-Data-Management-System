# TASK-005: Login landing page, fallback-only login, sign-out, docs

Owner role: Implementer (UI parts may go to interface-designer)
Assigned agent:
Proposed by: Claude
Proposed date: 2026-10-20
Approved by: Patrick
Approved date: 2026-11-02
Related contracts: CONTRACT-001
Related ADRs: ADR-001, ADR-002
Dependencies: TASK-003, TASK-004

## Desired outcome

Users sign in through BT Auth from the CDMS `/login` page, the fallback admin
can still sign in there, local password login is gone, sign-out clears both
cookies, and project documentation describes the new auth model.

## Context

Implements CONTRACT-001 R6, R7.1, R9 and the UX expectations, and the
documentation items in ADR-001 follow-up 3.

## Scope

### Included

- `/login` landing page per the contract's UX expectations.
- `/api/config` exposes whether the fallback admin is configured (boolean)
  and the orchestrator sign-in URL.
- `POST /api/auth/login` accepts only the fallback admin (R6).
- `POST /api/auth/logout` expires `session` and `bt_session` (R9).
- Swagger annotations for changed routes.
- `docs/ARCHITECTURE.md`, `docs/DEVELOPMENT.md` and `.env.example` updated
  (JWT settings described as fallback-only).

### Excluded

- DNS, hostname, Electron server URL, start/deploy scripts.
- Orchestrator changes (return-to parameter).

## Plan

1. Restrict the login route.
2. Update logout.
3. Extend `/api/config`.
4. Rebuild `/login`.
5. Update docs; run build and lint; manual end-to-end check.

## Acceptance criteria

- [ ] Correct local-user password returns 401; fallback admin returns 200.
- [ ] Logout response expires `session` and `bt_session`
      (`Domain=.biztechro.com; Path=/; HttpOnly; SameSite=Lax`, plus
      `Secure` when the request arrived over HTTPS), per R9.
- [ ] `/login` shows BT Auth sign-in, Continue, the off-domain notice when
      applicable, and the emergency section only when configured.
- [ ] Docs and `.env.example` match the implemented behaviour.
- [ ] `npm run build` and `npm run lint` pass.

## Validation requirements

CONTRACT-001 validation items 3, 4 and 5. Item 4 (end-to-end) needs the
CDMS hostname to exist; if it does not yet, record that as a blocker on
acceptance rather than skipping it.

## Risks and assumptions

- End-to-end validation depends on the infrastructure follow-up (DNS).

## Blocker

None.

## Implementation handoff

Not started.

## Review

Not reviewed.

## Human acceptance

Pending.
