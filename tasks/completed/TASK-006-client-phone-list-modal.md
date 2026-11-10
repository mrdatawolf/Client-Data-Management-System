# TASK-006: Client phone list button and modal

Owner role: Implementer (UI parts may go to interface-designer)
Assigned agent: Claude (reassigned from Codex 2026-11-10: Codex sandbox could not write)
Proposed by: Claude
Proposed date: 2026-11-09
Approved by: Patrick
Approved date: 2026-11-10
Related contracts: none
Related ADRs: none (see Decision D1; an ADR may be needed)
Dependencies: none

## Desired outcome

From the dashboard, with a client selected, a user can click a **Phones**
button (between **Sites** and **Reports**) and see that client's phone-system
user list in a full-page modal.

## Context

- Phone-system user exports are saved as one `.xlsx` per client in a shared
  folder. The folder is configured by the new `PHONE_LIST` env variable
  (already in `.env` and `.env.example`), e.g.
  `/mnt/SharedFolders/Data/Phone Lists/Mills phone user lists`.
- Each file is named `<client abbreviation>.xlsx` (`GLC.xlsx`, `NFL.xlsx`,
  `SLI.xlsx`, `SRM.xlsx`, `STL.xlsx`, `TRL.xlsx`), matching the `Abbrv` the
  dashboard uses as `selectedClient`. The folder also has `All Users.xlsx`,
  which does not match any client.
- Each workbook has two sheets:
  - **Users**: row 1 contains `%Placeholder%` tokens, row 2 the readable
    headers (Mailbox ID, First Name, Last Name, Extension, Email, Mobile Phone,
    Department, Job Title, Roles, User Groups, Site, MS Teams Mobile Mode,
    Cost Center Code, Direct Number (DID), Unread Messages, All Messages,
    Phone Make/Model, Ship-to address fields, Emergency Address, Emergency
    Response Location, Fax Cover Page Address, User Language, Time Zone,
    Status, Video Provider, Engaged Call Queues), then data rows.
  - **Call Queues**: five columns.
- No `.xlsx` parser is currently a dependency; TASK-001 retired the Excel data
  path.

## Decisions (resolved by Patrick, 2026-11-09)

- **D1 – How to read `.xlsx`:** add `exceljs` as a dependency. It is used
  read-only, for this feature only.
- **D2 – Columns shown:** Name (first + last), Extension, Direct Number (DID),
  Mobile Phone, Email, Department, Job Title, Site, Status. Skip the
  `%Placeholder%` row.
- **D3 – Call Queues sheet:** show it in a second modal, opened by a
  "Call Queues" button inside the Phones modal.
- **D4 – No file for the selected client:** the Phones button stays visible
  but is greyed out, disabled and labelled "N/A". The dashboard therefore
  needs to know whether the file exists when the client is loaded.
- **D5 – `All Users.xlsx`:** ignored.

## Scope

### Included

- `GET /api/data/phone-list?client=<ABBRV>` (authenticated like other data
  routes). It reads `${PHONE_LIST}/<ABBRV>.xlsx` and returns the rows for each
  sheet. The abbreviation is validated (e.g. `^[A-Za-z0-9_-]+$`) and the
  resolved path must stay inside `PHONE_LIST`. A missing file returns
  `{ available: false }`, not an error. If `PHONE_LIST` is not set, the route
  returns a clear error.
- `exceljs` added to `dependencies`.
- Swagger annotation for the route.
- Dashboard **Phones** button between Sites and Reports, styled like the
  neighbouring buttons. It is fetched along with the other client data. If no
  file exists, it is greyed out, disabled and labelled "N/A" (D4).
- A Phones `FullPageModal` that uses the existing `DataTable` (sortable), with
  the D2 columns and a "Call Queues" button that opens a second modal showing
  the Call Queues sheet (D3).
- `.env.example` comment for `PHONE_LIST` and a `docs/DEVELOPMENT.md` /
  `docs/ARCHITECTURE.md` note.
- Tests for the route: valid client, missing file, path-traversal attempt, and
  unset env.

### Excluded

- Editing or writing phone lists.
- `All Users.xlsx` (unless D5 changes).
- Changing the existing `phone-numbers` header display.

## Plan

1. Add `exceljs`, then add the route and parser.
2. Add the button and both modals.
3. Update docs and `.env.example`.
4. Run tests, build and lint, then check manually with GLC and with a client
   that has no file.

## Acceptance criteria

- [x] Phones button appears between Sites and Reports when a client is
      selected.
- [x] The modal lists that client's users with the agreed columns and is
      sortable.
- [x] For a client with no file, the button is greyed out, disabled and reads
      "N/A".
- [x] The Call Queues button in the Phones modal opens a second modal with
      that sheet.
- [x] An abbreviation such as `../x` is rejected; no file outside `PHONE_LIST`
      can be read.
- [x] Unauthenticated requests to the route are rejected like the other data
      routes.
- [x] Docs and `.env.example` describe `PHONE_LIST`.
- [x] Tests, `npm run build` and `npm run lint` pass.

## Implementation report

Task: TASK-006
Implementer: Claude (reassigned from Codex: its sandbox could not write to `.git` or the npm cache)
Date: 2026-11-10

### Changes made

- `package.json` / `package-lock.json`: added `exceljs` ^4.4.0.
- `src/lib/data/phone-list.ts` (new): `resolvePhoneListPath` validates the
  abbreviation (`^[A-Za-z0-9_-]+$`) and requires the resolved file to sit
  directly in `PHONE_LIST`. `readPhoneList` returns `{ available: false }`
  for a missing file, otherwise `{ available, users, callQueues }`. Users are
  mapped to the D2 columns, with Name = First + Last. Cell values (rich text,
  hyperlinks, formulas, dates) are converted to plain text.
- `src/app/api/data/phone-list/route.ts` (new): GET route with a Swagger
  annotation. Errors: 400 for a missing or invalid client, 500 if
  `PHONE_LIST` is unset or the read fails. Auth comes from `src/proxy.ts` as
  for every other data route.
- `src/app/dashboard/page.tsx`: `phoneList` state, fetched with the other
  client data. Its fetch has its own `.catch`, so a share outage cannot blank
  the rest of the dashboard. The Phones button sits between Sites and
  Reports and is disabled and greyed with the label "N/A" when unavailable.
  The Phones modal is a sortable, searchable and exportable `DataTable`. Its
  "Call Queues (n)" button opens the second modal; closing that modal returns
  to Phones. Default sorts: Name, and Assigned Call Queues.
- `tests/phone-list.test.ts` (new).
- `.env.example`, `docs/ARCHITECTURE.md`, `docs/DEVELOPMENT.md`: `PHONE_LIST`
  documented.

### Validation performed

- `npm test`: 46/46 pass. The new tests use temporary fixture workbooks and
  cover a valid client (with and without a placeholder row), a missing file,
  traversal attempts (`../x`, `..`, `a/b`, `a\b`, `GLC.xlsx`, empty), and
  an unset env.
- `npm run lint`: clean. `npm run build`: passes.
- Built server (`next start`): unauthenticated GET returns 401. With auth
  bypassed against the real share: GLC returns 22 users and 13 queue rows,
  `ACME` returns `{"available":false}`, and `../x` returns 400.
- Not done: a visual click-through of the dashboard in a browser.

### Assumptions and deviations

- The task notes said row 1 of the Users sheet holds `%Placeholder%` tokens.
  In the real files, row 1 is the readable header (the tokens only exist in
  the shared-strings table). The parser skips a placeholder row only when one
  is present, so both layouts work.
- Call Queues shows all five sheet columns as-is (Mailbox ID, First Name,
  Last Name, Extension, Assigned Call Queues). D3 did not pick columns.
- The Call Queues button inside the Phones modal is disabled when that sheet
  is empty.
- `PHONE_LIST` unset or the share unreachable: the button shows "N/A", the
  same as a missing file. The route still returns 500 for diagnosis.

### Unresolved risks

- The phone list is re-read from the share on every client load (no
  caching). This is fine at the current file sizes (~10–30 KB).
- `npm install` reported existing audit warnings. These were not
  investigated and are out of scope.
