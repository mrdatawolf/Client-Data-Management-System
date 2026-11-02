# TASK-004: Map orchestrator identities to local users

Owner role: Implementer
Assigned agent:
Proposed by: Claude
Proposed date: 2026-10-20
Approved by: Patrick
Approved date: 2026-11-02
Related contracts: CONTRACT-001
Related ADRs: ADR-001, ADR-002
Dependencies: TASK-003

## Desired outcome

Every orchestrator-authenticated user resolves to one local `users` row, so
preferences work, and existing local users keep their preferences through the
approved linking rule.

## Context

Implements CONTRACT-001 R5 and R8, and the `users` CLI changes from Q5.
`user_preferences` is keyed to `users.id`; `getSessionUser` in
`src/lib/auth/session.ts` is how routes learn who the user is.

## Scope

### Included

- Idempotent migration on DB open: nullable `iss`, `sub` columns and unique
  index on (`iss`, `sub`).
- Session helper that resolves the principal from `bt_session` or fallback
  `session` and performs identity mapping; callers (`/api/auth/me`,
  preferences routes) updated.
- `/api/auth/me` response per R8 (`authSource`).
- `scripts/users.ts` per Q5 and Q2(c): keep `list` and `remove`; add
  `role <username> <role>` and `link <username> <upn>`; remove `add` and
  `passwd`.
- Validation per CONTRACT-001 validation item 2.

### Excluded

- Role management UI or new role checks.
- Login page and login/logout routes (TASK-005).

## Plan

1. Schema migration.
2. Identity mapping function.
3. New session helper and caller updates.
4. CLI changes.
5. Validation against a temporary SQLite file.

## Acceptance criteria

- [ ] New, returning, linked, ambiguous, collision and DB-unavailable cases
      behave per R5.
- [ ] A linked user's existing preferences load after first orchestrator
      sign-in.
- [ ] Migration is safe to run repeatedly on an existing `auth.db`.
- [ ] `/api/auth/me` returns `authSource` and never a password hash.
- [ ] `npm run build` and `npm run lint` pass.

## Validation requirements

CONTRACT-001 validation items 2 and 5.

## Risks and assumptions

- Production `auth.db` should be backed up before first deploy.
- Automatic linking matches CDMS usernames to orchestrator usernames
  (ADR-002); users whose names differ are linked with `users link`.

## Blocker

None.

## Implementation handoff

Not started.

## Review

Not reviewed.

## Human acceptance

Pending.
