# TASK-006: Client phone list button and modal

Owner role: Implementer (UI parts may go to interface-designer)
Assigned agent: Codex
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

- [ ] Phones button appears between Sites and Reports when a client is
      selected.
- [ ] The modal lists that client's users with the agreed columns and is
      sortable.
- [ ] For a client with no file, the button is greyed out, disabled and reads
      "N/A".
- [ ] The Call Queues button in the Phones modal opens a second modal with
      that sheet.
- [ ] An abbreviation such as `../x` is rejected; no file outside `PHONE_LIST`
      can be read.
- [ ] Unauthenticated requests to the route are rejected like the other data
      routes.
- [ ] Docs and `.env.example` describe `PHONE_LIST`.
- [ ] Tests, `npm run build` and `npm run lint` pass.
