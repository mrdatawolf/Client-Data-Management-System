# TASK-005: Login landing page, fallback-only login, sign-out, docs

Owner role: Implementer (UI parts may go to interface-designer)
Assigned agent: Codex
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

- [x] Correct local-user password returns 401; fallback admin returns 200.
- [x] Logout response expires `session` and `bt_session`
      (`Domain=.biztechro.com; Path=/; HttpOnly; SameSite=Lax`, plus
      `Secure` when the request arrived over HTTPS), per R9.
- [x] `/login` shows BT Auth sign-in, Continue, the off-domain notice when
      applicable, and the emergency section only when configured.
- [x] Docs and `.env.example` match the implemented behaviour.
- [x] `npm run build` and `npm run lint` pass.

## Validation requirements

CONTRACT-001 validation items 3, 4 and 5. Item 4 (end-to-end) needs the
CDMS hostname to exist; if it does not yet, record that as a blocker on
acceptance rather than skipping it.

## Risks and assumptions

- End-to-end validation depends on the infrastructure follow-up (DNS).

## Blocker

Acceptance blocker: CONTRACT-001 validation item 4 requires a deployed
*.biztechro.com browser session. Not performed in this environment; the
operator/reviewer must run the manual steps below before human acceptance.

## Implementation handoff

Task: TASK-005
Implementer: Codex
Date: 2026-11-03

### Changes made

- Restricted login to verifyFallbackAdmin, which checks only the cached
  in-memory bcrypt hash of the environment fallback password and retains the
  break-glass warning. No DB access occurs on this path. Removed unused
  createUser/updateUserPassword and their exports after searching src/scripts.
  Missing fields retain 400; other credentials return the required 401.
- Preserved fallback session signing, lifetime and cookie attributes. Added
  authSource=fallback to the successful public user response.
- Logout always returns the existing JSON 200 and emits two expired cookies.
  Shared bt_session uses Domain=.biztechro.com, Path=/, HttpOnly, SameSite=Lax,
  Max-Age=0 and Secure for HTTPS URL or first forwarded protocol value.
- Added public fallbackAdminEnabled and orchestratorLoginUrl config fields.
  Added the small exported getOrchestratorLoginUrl helper in orchestrator.ts;
  it reuses existing verifier configError validation and normalizes the base.
  No verification, proxy or identity-mapping behavior changed.
- Rebuilt /login with the BT Auth new-tab link, exact return instruction,
  Continue check/live status, client-mounted hostname notice, optional collapsed
  emergency form, load-time session/config checks and guarded localStorage.
  Preserved card styling/dark mode; added keyboard focus and busy states.
- Added tests/login-logout-config.test.ts and updated Swagger/env/docs.
  Worked in the existing main checkout; no commit or push.

### Validation performed

Commands used Node 24.16.0 via
`export PATH=/home/patrick/.nvm/versions/node/v24.16.0/bin:$PATH`.

- `npx tsx --test tests/login-logout-config.test.ts`: initial FAIL (2/3
  passed); Node mock.method could not replace the imported SQLite namespace
  method. Removed that unsupported spy; retained raw SQLite bcrypt fixture,
  unavailable-DB-path checks and source assertion on the fallback verifier.
  Rerun PASS, 3/3, no skipped tests.
- `npm_config_cache=/tmp/cdms-task005-npm-cache npx --yes prettier --write
  src/app/api/auth/login/route.ts src/app/api/auth/logout/route.ts
  src/app/api/config/route.ts src/app/login/page.tsx src/lib/auth/db-sqlite.ts
  src/lib/auth/db.ts tests/login-logout-config.test.ts`: PASS, exit 0.
- `npm test`: PASS, 41/41, zero failures/skips. Includes existing stale
  local-session rejection, proxy redirects and session/identity tests.
- `npm run lint`: PASS, no diagnostics; final separate run exit 0.
- `npx tsc --noEmit`: PASS, no diagnostics; final separate run exit 0.
- `npm run build`: first run exited 0 and built 34/34 pages, but Swagger
  reported a malformed config annotation and generated only 9 paths; treated
  as incomplete validation. Fixed annotation. Final run PASS, exit 0,
  34/34 pages, compilation 5.3s; docs generation clean with 10 paths.
- `node -e 'const d=require("./public/openapi.json"); for (const p of
  ["/api/auth/login","/api/auth/logout","/api/config"]) {
  if (!d.paths[p]) throw Error(p); } console.log("All three changed OpenAPI
  paths present")'`: PASS; all three paths present.
- `rg -n 'verifyPassword|createUser|updateUserPassword|bcrypt.compare' src
  scripts`: only remaining comparison is bcrypt.compare(password,
  admin.password) in verifyFallbackAdmin. No local-user password checks.
- `git diff --check`: PASS, no whitespace errors.
- UI validation: build plus source inspection/manual flow description only;
  no interactive browser or screenshot validation was performed.
- CONTRACT-001 validation item 4: NOT PERFORMED. Deployed shared-domain
  browser end-to-end remains an acceptance blocker.

### Acceptance criteria evidence

- Login tests insert a local user with a real bcrypt password into a temporary
  SQLite file and confirm correct credentials return 401. Correct fallback
  returns 200, signs an accepted fallback token, and works with AUTH_DB_PATH
  pointing to a directory. Wrong/unconfigured fallback returns 401; missing
  fields return 400. Temporary fixture files are removed in test teardown.
- Logout tests assert two Set-Cookie headers, exact domain/path/security
  attributes and Max-Age=0 across HTTP, HTTPS, forwarded HTTPS, first-value
  HTTP, both COOKIE_SECURE values, and missing/invalid credentials.
- Config tests cover boolean values, default/custom normalized login URLs,
  invalid/missing URL or issuer, and no fallback credential leakage.
- Landing-page checkbox is supported by source inspection and successful build:
  native details defaults closed, config controls rendering, hostname is read
  after mount, labels/focus/busy states are explicit, flexible card/inputs use
  full available width. Runtime visual/accessibility checks remain manual.
- Inspected src/app/page.tsx and src/app/dashboard/page.tsx: their unsuccessful
  /me checks still route to /login. Dashboard still POSTs /api/auth/logout,
  clears cached user and routes to /login. Neither file was changed.
- Documentation and env comments match the implemented flow. Build/lint
  evidence above supports their acceptance checkbox.
- Checkboxes are implementation evidence, not independent review or acceptance.

### Assumptions and deviations

- ASSUMPTION: /login checks /api/auth/me on load and sends an existing valid
  session directly to /dashboard, as requested. Config and session checks run
  independently so a config-fetch failure does not prevent an existing session
  from continuing. Auth-disabled config also redirects to /dashboard.
- Existing environment/hash/verifier configuration is process-scoped; restart
  after configuration changes. The cached fallback helper additionally refuses
  login whenever either fallback variable is absent.
- Non-string, present credentials return the same generic 401.
- The only orchestrator.ts change is the authorized URL helper. No out-of-scope
  infrastructure, Electron, startup-script, proxy or mapping changes.

### Unresolved risks

- No open implementation questions. Independent review and human acceptance
  are pending. Manual browser/shared-domain behavior is not yet demonstrated.
- Operator/reviewer must perform CONTRACT-001 item 4 on the deployed CDMS host:
  1. Enable auth with production orchestrator URL/issuer and clear both cookies.
     Open /dashboard and confirm /login; Continue must announce "Still not
     signed in" before authentication.
  2. Select Sign in with BT Auth, authenticate in the new tab, return to CDMS
     and select Continue. Confirm /dashboard, /api/auth/me 200 with
     authSource=orchestrator and existing preferences loaded.
  3. Open /login again while authenticated; confirm automatic dashboard entry.
  4. Select dashboard sign-out. Inspect both response Set-Cookie headers and
     browser storage; confirm session and .biztechro.com bt_session removed.
     Confirm /me 401, protected page -> /login and another sharing app requires
     authentication on its next check.
  5. Repeat HTTP/HTTPS and forwarded-protocol deployment cases; bt_session
     deletion Secure tracks HTTPS while session tracks COOKIE_SECURE.
  6. Check localhost/IP notice versus domain host; 320px width, dark/light
     themes, keyboard focus, live error announcements and loading controls.
     Test fallback visibility/config errors, emergency login during DB/auth
     outage and auth-disabled redirect as detailed in DEVELOPMENT.md.
- Task moved with plain mv to tasks/review as requested. The pre-existing
  staged rename remains in the read-only index and needs later reconciliation.
  TASK-004 review-to-completed changes were left untouched.

### Documentation updated

- .env.example
- docs/ARCHITECTURE.md
- docs/DEVELOPMENT.md (including full manual acceptance steps)
- Swagger annotations in login/logout/config routes
- This task's assignment, evidence and handoff.


## Review

Not reviewed.

## Human acceptance

Pending.
