# TASK-004: Map orchestrator identities to local users

Owner role: Implementer
Assigned agent: Codex
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

- [x] New, returning, linked, ambiguous, collision and DB-unavailable cases
      behave per R5.
- [x] A linked user's existing preferences load after first orchestrator
      sign-in.
- [x] Migration is safe to run repeatedly on an existing `auth.db`.
- [x] `/api/auth/me` returns `authSource` and never a password hash.
- [x] `npm run build` and `npm run lint` pass.

## Validation requirements

CONTRACT-001 validation items 2 and 5.

## Risks and assumptions

- Production `auth.db` should be backed up before first deploy.
- Automatic linking matches CDMS usernames to orchestrator usernames
  (ADR-002); users whose names differ are linked with `users link`.

## Blocker

None.

## Implementation handoff

Task: TASK-004
Implementer: Codex
Date: 2026-11-03

### Changes made

- Added an exported, immediate-transaction migration on database open: nullable
  `iss`/`sub` columns discovered through PRAGMA and a partial unique identity
  index. Existing users and preferences are not rebuilt.
- Added database-handle identity mapping for R5, including one-time NOCASE
  linking, fallback-ID exclusion, unusable password sentinel, collision warnings,
  deterministic new usernames, updated claim fields, and transient identities.
  Immediate transactions serialize writers; a unique-constraint failure also
  re-reads the identity and returns the existing row when present.
- Replaced session JWT verification with the existing cookie authenticator.
  All three route modules await the helper. `/me` returns exactly the five
  public session fields, including nullable email and authSource.
- Replaced CLI add/passwd with role/link; list shows linked status and remove
  remains available. Factored operator logic into testable functions. CLI opens
  the shared database and runs migration before operations.
- Added 12 SQLite mapping/operator tests and one session/route integration test.
  All database fixtures use os.tmpdir and clean up their files.
- Worked directly on main without committing or pushing. No changes to proxy,
  orchestrator verification, login/logout/config, preferences DB failure
  handling, or db-sqlite password helpers.

### Validation performed

All tests/build/checks used Node 24.16.0 with
`export PATH=/home/patrick/.nvm/versions/node/v24.16.0/bin:$PATH`.

- `npx tsx --test tests/identity.test.ts`: PASS initially 11/11, then PASS
  12/12 after adding the automatic-link collision case. Zero failures/skips.
  Expected collision and transient-database warnings appeared.
- `npx tsx --test tests/session.test.ts`: initial FAIL, 0/1 passed,
  `401 !== 200` with `No cached JWKS`. The test installed its fetch mock after
  the shared verifier captured fetch. Moved mock setup before authentication;
  rerun PASS, 1/1, zero failures/skips. Production verifier unchanged.
- `npm test`: PASS initially 37/37; final PASS 38/38, 0 failures,
  0 skipped/cancelled. Includes all 25 existing TASK-003 tests. Expected invalid
  token, collision and unavailable DB diagnostic messages are printed.
- `npm run lint`: PASS both runs, exit 0, no diagnostics.
- `npx tsc --noEmit`: PASS both runs, exit 0, no diagnostics.
- `npm run build`: PASS both runs, exit 0. Next.js 16.1.1 compiled in 5.0s
  initially and 5.2s finally; TypeScript completed and 34/34 static pages were
  generated. Embedded `npm run docs:generate` passed both times, writing
  OpenAPI for 10 paths and copying Swagger UI assets (ignored generated files).
- `git diff --check`: PASS, no whitespace diagnostics (also checked after
  handoff/move).
- Formatting command `npx --yes prettier --write` on the six new/reworked TS
  modules/tests initially failed with EROFS writing the default npm cache.
  Reran with `npm_config_cache=/tmp/cdms-task004-npm-cache`: PASS, six files
  formatted. No dependency/lockfile changes. Final full checks followed this.

### Acceptance criteria evidence

- R5 cases: tests cover new UUID/user role/unusable bcrypt sentinel; returning
  email/upn updates; same-ID linking with admin role and preference retention;
  case-insensitive linking; ambiguous candidates; existing and new username
  collisions (including suffix collision and automatic-link collision);
  no automatic re-link; fallback ID exclusion; null/throw DB unavailability.
- Migration replay: two runs on a populated old-schema temp file preserve
  users/preferences, add nullable columns, and leave a partial unique index.
- Duplicate identity: two connections resolve the same ID and exactly one
  row; a raw duplicate identity insert fails the unique constraint. This is
  duplicate-insert validation, not a simultaneous multi-process stress test.
- CLI: role validation and updates; source lookup ignoring case; explicit
  overwrite of a previously linked target; source deletion with preferences
  cascade; target ID/role/preferences retention; required refusals; transaction
  rollback on forced update failure; list and removal results.
- Session/route integration: genuine locally signed RS256 and HS256 cookies
  resolve orchestrator/fallback sources; disabled guest source; fallback wins;
  `/me` returns exact public fields (no stored password hash); unauthenticated
  request returns 401 and required JSON. Preferences GET loads the preexisting
  preference after first sign-in.
- All task acceptance boxes are supported by these checks; independent review
  and human acceptance remain pending.

### Assumptions and deviations

- New username collisions use `<upn>#<first-eight-sub-characters>`, then `-2`,
  `-3`, etc. until available. Existing rows keep their prior username on a
  collision. Collision checks follow the existing case-sensitive UNIQUE
  constraint; automatic linking alone uses NOCASE.
- LINK SEMANTICS: merge the source orchestrator row into the named target in
  one transaction. Preserve target ID, role and preferences; copy source
  iss/sub/email and its username unless a third row conflicts; delete source
  and cascade its preferences. Source is deleted before updating target to
  release unique keys; rollback restores it if update fails. Explicitly linked
  targets may already have iss/sub (the authorized R5.4 exception).
- Target CLI names are exact; source lookup is case-insensitive and refuses
  ambiguous matches rather than choosing arbitrarily. `list` reveals the
  actual collision-renamed source username.
- Mapping updates advance updatedAt by at least one millisecond when changed,
  including consecutive updates in the same millisecond. Unchanged mappings
  leave updatedAt intact.
- Database access failures as well as open failures degrade to the transient
  user; no preference failure behavior changed.
- Shared User schema now describes the session fields and does not label IDs
  UUID-only, since fallback, guest and transient IDs are not UUIDs.

### Unresolved risks

- Back up production auth.db before rollout. Tests only touched temporary DBs.
- TASK-005 login/logout/UI work remains outside this implementation; TASK-003
  through TASK-005 should ship together. Production-hostname browser SSO was
  not exercised here.
- Explicit link intentionally discards source preferences, retaining target
  preferences only. Removing a local user does not revoke orchestrator access;
  a future sign-in can provision a new local row.
- No open implementation questions. Independent review and human acceptance
  are pending.
- Task moved with a plain filesystem rename as instructed. The pre-existing
  staged approved-to-in-progress rename remains in the read-only Git index;
  the orchestrating session must reconcile it with tasks/review.

### Documentation updated

- docs/DEVELOPMENT.md: CLI commands, merge rules, async session identity model.
- .env.example: orchestrator provisioning and role/link commands only;
  JWT/fallback comments unchanged.
- /me Swagger annotation and scripts/generate-api-docs.ts User schema.
- This task: assignment, evidenced acceptance boxes and implementation report.

## Review

Not reviewed.

## Human acceptance

Pending.
