# TASK-007: Copy buttons replace double-click copy

Owner role: Implementer
Assigned agent: Claude
Proposed by: Patrick (request in chat)
Proposed date: 2026-11-24
Approved by: Patrick (directed in chat)
Approved date: 2026-11-24
Related contracts: none
Related ADRs: none
Dependencies: none

## Desired outcome

Double-clicking a cell in a group modal (e.g. "Core Infrastructure
(Servers/Routers/Switches)") no longer copies anything to the clipboard. Instead,
every editable cell in those modal tables shows a small copy button that copies
the cell's value, whether or not the cell is being edited.

## Context

- Copy-on-double-click lived in `handleCellDoubleClick` in
  `src/components/DataTable.tsx` and only applied to `password` columns.
- Every `DataTable` on the dashboard is rendered inside a `FullPageModal`, so
  the landing page is unaffected by changes to `DataTable`.
- `HostGroupedView` used a bare `navigator.clipboard.writeText`, which is
  unavailable over plain HTTP on the LAN deployment (insecure context), so its
  Copy buttons silently failed there. `DataTable` already had a fallback.

## Scope

### Included

- Remove the clipboard copy from double-click; double-click still opens the
  inline editor.
- Add a copy button to every editable, non-checkbox cell with a value in a
  `DataTable` with `editable` + `onCellEdit` (i.e. the modal tables). Passwords
  copy the real value while staying masked.
- Short "copied" feedback on the button.
- Clicking or double-clicking the button must not start an edit.
- Move the HTTP-safe `copyToClipboard` to `src/lib/clipboard.ts` and use it in
  both `DataTable` and `HostGroupedView`.

### Excluded

- Landing page / dashboard summary cards.
- Non-editable tables and non-editable columns.
- Any other change to `HostGroupedView` behaviour or layout.

## Plan

1. Create `src/lib/clipboard.ts` with the existing fallback helper.
2. `DataTable`: drop copy from the double-click handler; render the cell
   content plus a copy button; update the password tooltip.
3. `HostGroupedView`: use the shared helper.

## Acceptance criteria

- [ ] Double-clicking any modal cell opens the editor and copies nothing.
- [ ] Editable cells with a value show a copy button without entering edit mode.
- [ ] The button copies the raw value (including masked passwords) and shows
      brief confirmation.
- [ ] Clicking/double-clicking the button does not open the editor.
- [ ] Non-editable tables/columns, checkbox cells, and empty cells show no button.
- [ ] `HostGroupedView` Copy buttons work over plain HTTP.
- [ ] Lint and type-check pass.

## Validation requirements

`npm run lint`, `npx tsc --noEmit`, `npm test`; manual check in a modal.

## Risks and assumptions

- Assumes "editable" means columns that are inline-editable (`editable` table
  with `onCellEdit`, column not `editable: false`).
- Copy button adds a little width to narrow cells; text still truncates.

## Blocker

None.

## Implementation handoff

Implemented 2026-11-24 by Claude.

- `src/lib/clipboard.ts`: shared HTTP-safe `copyToClipboard` (moved from
  `DataTable`).
- `src/components/DataTable.tsx`: double-click only opens the editor; new
  `handleCopyCell` and an icon copy button (check mark for 1.5 s on success)
  after the value in every editable, non-checkbox, non-empty cell. The button
  stops click/double-click propagation. Password tooltip now "Double-click to
  reveal & edit". The button is hidden while that cell is in edit mode.
- `src/components/HostGroupedView.tsx`: uses the shared helper.

Validation: `npx tsc --noEmit` clean, eslint on changed files clean,
`npm test` 46/46 pass. Not checked in a browser (the app needs SSO and a
database). A manual check in a modal over plain HTTP is still needed.

## Review

Not reviewed.

## Human acceptance

Pending.
