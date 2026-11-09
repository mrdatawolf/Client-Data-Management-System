# Development Guide

## Technology stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS** + **Radix UI** primitives
- **better-sqlite3** for local auth/preferences data
- **jsonwebtoken** / **jose** for JWT session auth (Node.js runtime)
- **Electron** for optional desktop packaging
- **next-swagger-doc** / **swagger-ui-dist** for the generated `/docs` API
  reference

## Repository layout

```
src/
  app/            Next.js App Router pages and API routes (src/app/api/**)
  components/     React components (DataTable, modals, host-grouped view, ...)
  lib/
    auth/         JWT + session handling, auth SQLite DB
    data/         Dataset registry, BTClientDataAPI client, data-source health
    db/           SQLite connection helper (auth/preferences)
    preferences/  User preferences SQLite access
  proxy.ts        Global auth enforcement (Node.js proxy)
  types/          Shared data/preferences types
scripts/          DB init/migrate/seed, docs generation, packaging scripts
electron-app/     Electron shell for desktop builds
docs/             Project, architecture, and DbC-process documentation (this system)
tasks/            DbC task lifecycle (proposed -> approved -> in-progress -> review -> completed)
```

## Setup and commands

```bash
npm install
cp .env.example .env.local   # or edit .env directly; see below
npm run auth:init            # initialize the auth SQLite database
npm run dev                  # http://localhost:6030
```

Key scripts (see `package.json` for the full list):

- `npm run dev` / `npm run build` / `npm run start` — standard Next.js
  lifecycle (port 6030).
- `npm run lint` — ESLint with Next.js core-web-vitals rules.
- `npm run db:init` / `db:migrate` / `db:seed` — local SQLite setup.
- `npm run auth:init`, `npm run preferences:init` — initialize the
  auth/preferences SQLite databases.
- Users are provisioned on first orchestrator sign-in. Operator commands:
  `npm run users -- list` (includes linked status), `remove <username>`,
  `role <username> <admin|user>`, and
  `link <username> <orchestrator-username>` (each after `npm run users --`).
  `link` merges the source orchestrator row into the named target, retaining
  target ID, role and preferences; source preferences are deleted. It can
  replace a target's prior identity after an Entra move. Source lookup is
  case-insensitive and rejects ambiguous matches; target names are exact.
  Use `list` to find collision-disambiguated source names. `add` and `passwd`
  are retired. CLI operations run the idempotent identity migration.
- `npm run docs:generate` — regenerate the Swagger/OpenAPI docs from
  `@swagger` JSDoc annotations on `src/app/api/**/route.ts` handlers (runs
  automatically as part of `npm run build`).
- `npm run electron:start` / `electron:build` / `build:all` — desktop
  packaging.

Relevant environment variables (see `.env`):

- `DATA_API_BASE_URL` — the BTClientDataAPI instance this app reads/writes
  client-infrastructure data through; see `docs/ARCHITECTURE.md`.
- `JWT_SECRET`, `JWT_EXPIRES_IN` — fallback-admin session signing and lifetime only.
- `COOKIE_SECURE` — Secure attribute for the fallback `session` only.
- `AUTH_DB_PATH` — local identities/preferences; `DISABLE_AUTH` — dev-only bypass.
- `AUTH_ORCHESTRATOR_URL` — absolute HTTP(S) orchestrator base URL.
- `AUTH_EXPECTED_ISSUER` — exact trusted token issuer.
- `AUTH_LOGIN_PATH` — orchestrator login path (default `/auth/local-login`).
- `FALLBACK_ADMIN_USERNAME` / `FALLBACK_ADMIN_PASSWORD` — break-glass admin;
  unset to disable.

## Coding conventions

- TypeScript throughout; prefer explicit types on exported functions and
  public data shapes (see `src/lib/data/silver-datasets.ts` for the existing
  style of typed dataset definitions).
- New API routes are protected by `src/proxy.ts` automatically — do not add
  per-route auth checks; add an entry to `PUBLIC_PATHS` in `src/proxy.ts`
  only when a route genuinely needs to be public.
- Annotate new/changed API routes with `@swagger` JSDoc comments so
  `npm run docs:generate` picks them up.
- When adding or changing a client-infrastructure dataset, update its
  `DATASETS` entry (`src/lib/data/silver-datasets.ts`) — the API table name,
  the field mapping, and which fields are numeric.

## Testing philosophy

Run `npm test` (`tsx --test tests/*.test.ts`) for the Node test suite.
Auth tests use locally generated RSA keys, stub fetches, and an injected clock
to exercise token validation, JWKS rotation/outages, and fallback precedence.
Validate changes further by:

- Running `npm run lint` and `npx tsc --noEmit` (or equivalent) for type
  safety.
- Exercising the affected dataset(s) through the dashboard UI in the browser,
  including the golden path and at least one edit/create/archive action.
- For data-source changes, checking `/api/health` (backed by
  `src/lib/data/registry.ts`) to confirm the relevant source reports `ok`.

Document required test levels here as they are established (e.g. if/when
integration or unit tests are introduced).

## Security and privacy

- Client datasets contain credentials (server/router logins, admin
  passwords, VPN credentials). Never log full row contents; mask passwords in
  UI and avoid writing them to error messages.
- `JWT_SECRET` and the break-glass admin credentials live only in `.env`
  (never commit real values); `DISABLE_AUTH=true` must never be set outside
  local development.
- BTClientDataAPI is reached over plain HTTP inside the corporate firewall;
  treat that boundary as trusted-network-only, not internet-facing.

## Session identity

`getSessionUser(request)` is async; routes must await it. It reuses
`authenticateRequestCookies` and returns only `id`, `username`, `email`, `role`
and `authSource`. Disabled auth returns the guest admin; fallback auth returns
its configured admin without accessing SQLite. Orchestrator auth maps verified
(`iss`, `sub`) to a local row, or links exactly one unlinked username matching
`upn` case-insensitively (excluding fallback admin). Existing roles and
preferences survive linking. New identities receive role `user` and an unusable
password sentinel. A username collision keeps an existing row's name; new rows
use `<upn>#<first-eight-sub-characters>` then `-2`, `-3`, etc. as needed.
Database failures return a transient `orchestrator:<sub>` identity; preference
failure handling is unchanged. `/api/auth/me` exposes only the session fields.

## Login flow and manual validation

Configure AUTH_ORCHESTRATOR_URL and AUTH_EXPECTED_ISSUER (production:
https://orca.biztechro.com), with AUTH_LOGIN_PATH defaulting to
`/auth/local-login` (`/auth/login` for Entra). Missing/invalid orchestrator
configuration produces no sign-in link. Both FALLBACK_ADMIN_USERNAME and
FALLBACK_ADMIN_PASSWORD enable the collapsed emergency form on `/login`;
this login works even when the orchestrator and database are unavailable.
Local DB passwords no longer authenticate. Restart after environment changes.

The landing page fetches public config and checks `/api/auth/me` on load.
Disabled auth or an existing valid session leads to `/dashboard`. Otherwise,
select Sign in with BT Auth, complete sign-in in the new tab, return, and select
Continue. Failed checks announce "Still not signed in"; browser storage failure
does not prevent authentication. Bare IP/localhost access shows an off-domain
notice because browsers cannot send the shared cookie there.

Manual browser acceptance (requires a deployed CDMS *.biztechro.com hostname):

1. With auth enabled, clear both cookies and open CDMS /dashboard. Confirm
   redirect to /login. Select Continue before signing in: confirm the live
   status reads "Still not signed in".
2. Select Sign in with BT Auth; confirm a separate tab opens the configured
   orchestrator. Sign in with an administrator-provisioned account, return to
   CDMS, and select Continue. Confirm /dashboard and /api/auth/me 200 with
   authSource=orchestrator; confirm existing user preferences load.
3. Open /login while authenticated: confirm automatic /dashboard navigation.
4. Use dashboard sign-out. Inspect the response's two Set-Cookie headers and
   browser storage: both session and shared .biztechro.com bt_session disappear.
   Confirm /api/auth/me returns 401 and /dashboard redirects to /login. Confirm
   another app sharing bt_session requires sign-in on its next auth check.
5. Repeat cookie deletion over HTTP and HTTPS (including the deployed reverse
   proxy): bt_session deletion is Secure only for HTTPS; session follows
   COOKIE_SECURE. Off-domain logout succeeds but cannot delete the shared cookie.
6. At localhost/IP confirm the off-domain notice; on the CDMS hostname confirm
   it is absent. At 320px width, light/dark themes and keyboard-only navigation,
   confirm no overflow, visible focus, labelled fields, live errors and disabled
   buttons during requests.
7. With fallback configured, expand Emergency admin sign-in and test wrong then
   correct credentials. Confirm success with orchestrator/DB unavailable.
   Unset either fallback variable and restart: confirm the form is absent and
   direct valid-input login attempts return 401. Legacy local passwords return
   401. Invalid orchestrator config shows a configuration message, not a link.
8. With DISABLE_AUTH=true in local development, confirm /login goes to /dashboard.
