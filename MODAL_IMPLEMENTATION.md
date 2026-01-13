# Modal Implementation Strategy

## Overview

Each modal window will display the complete dataset from its corresponding Excel file with full CRUD (Create, Read, Update, Delete) functionality and advanced search/filter capabilities.

## Modal Structure

### Layout Components

```
┌─────────────────────────────────────────────────────────────┐
│ Modal Header                                                 │
│  - Title                                                     │
│  - Close Button                                              │
├─────────────────────────────────────────────────────────────┤
│ Toolbar                                                      │
│  - Search Bar (global search across all fields)             │
│  - Filter Dropdowns (per column)                            │
│  - Add New Button (CRUD - Create)                           │
│  - Export Button (CSV/Excel)                                │
│  - Refresh Button                                            │
├─────────────────────────────────────────────────────────────┤
│ Data Table                                                   │
│  - All columns from Excel file                              │
│  - Sortable headers (click to sort asc/desc)                │
│  - Inline actions per row:                                  │
│    • Edit button (CRUD - Update)                            │
│    • Delete button (CRUD - Delete)                          │
│    • Copy button (duplicate row)                            │
│  - Row selection (checkboxes for bulk operations)           │
│  - Password masking (show/hide toggle)                      │
│  - Pagination (50/100/200 rows per page)                    │
├─────────────────────────────────────────────────────────────┤
│ Footer                                                       │
│  - Row count (showing X of Y records)                       │
│  - Pagination controls                                      │
│  - Close button                                              │
└─────────────────────────────────────────────────────────────┘
```

## Features Breakdown

### 1. Search Functionality

**Global Search:**
- Single search input in toolbar
- Searches across ALL text fields in the dataset
- Real-time filtering as user types
- Debounced (300ms) to prevent excessive re-renders
- Case-insensitive matching
- Highlights matching text in results (optional)

**Column-Specific Filters:**
- Dropdown filters for each column
- Filter types based on data type:
  - **Text fields:** Contains, Starts with, Equals
  - **Select fields:** Multi-select dropdown (Active, Status, etc.)
  - **Numeric fields:** Range slider or min/max inputs
  - **Date fields:** Date range picker

**Combined Filters:**
- Multiple filters work together (AND logic)
- "Clear All Filters" button
- Filter tags showing active filters (removable)

### 2. CRUD Operations

#### CREATE (Add New Record)
1. Click "Add New" button in toolbar
2. Opens inline form or side panel
3. Form fields based on Excel columns:
   - Required fields marked with *
   - Auto-populate Client field with selected client
   - Dropdowns for predefined values (Status, Active, etc.)
   - Text inputs with validation
   - Password fields with show/hide toggle
4. "Save" creates new row
5. "Cancel" discards changes
6. Success message on save
7. Table auto-refreshes with new record

#### READ (View)
- Default view shows all data in table
- Click row to expand details (optional)
- Password fields masked by default with eye icon to reveal
- Responsive table that scrolls horizontally on small screens

#### UPDATE (Edit Record)
1. Click "Edit" button on row
2. Row becomes editable inline OR opens edit form
3. All fields become input fields
4. "Save" button commits changes
5. "Cancel" button reverts changes
6. Validation before save
7. Success message on update
8. Table auto-refreshes

#### DELETE (Remove Record)
1. Click "Delete" button on row
2. Confirmation dialog appears:
   - "Are you sure you want to delete [Name]?"
   - Shows key details about record
   - "Cancel" and "Delete" buttons
3. On confirm, record is deleted
4. Success message
5. Table auto-refreshes
6. Optional: Soft delete (mark as inactive) vs hard delete

**Bulk Operations:**
- Select multiple rows via checkboxes
- Bulk actions toolbar appears:
  - Delete selected
  - Export selected
  - Mark as active/inactive (if applicable)

### 3. Table Features

#### Sorting
- Click column header to sort ascending
- Click again to sort descending
- Click third time to remove sort
- Arrow indicator shows sort direction
- Multi-column sort (hold Shift while clicking)

#### Pagination
- Configurable rows per page: 50, 100, 200, All
- Page navigation: First, Previous, Next, Last
- Jump to page input
- Shows "Showing X-Y of Z records"

#### Column Management
- Show/Hide columns (dropdown menu)
- Reorder columns (drag & drop headers)
- Resize columns (drag column dividers)
- Save column preferences per user (localStorage)

#### Responsive Design
- Desktop: Full table with all columns
- Tablet: Scrollable table with fixed first column
- Mobile: Card layout (stacked rows)

### 4. Data Presentation

#### Sensitive Data
- Password fields:
  - Masked as "••••••••" by default
  - Eye icon to toggle visibility
  - Copy to clipboard button
  - Never shown in exports unless explicitly requested

#### Special Fields
- **IP Addresses:** Monospace font, clickable to copy
- **URLs:** Clickable links that open in new tab
- **Phone Numbers:** Click to call (if supported)
- **Email Addresses:** Click to open email client
- **Dates:** Formatted consistently (MM/DD/YYYY)
- **Status/Active:** Badge styling (green/red)
- **Notes:** Truncated with "..." and hover to expand

#### Empty States
- No data: "No records found"
- No search results: "No results for '[query]'" with clear filters button
- Loading: Skeleton loaders

### 5. Advanced Features

#### Export
- Export visible data (with current filters)
- Export all data
- Format options: CSV, Excel, JSON
- Include/exclude sensitive fields option

#### Import
- Bulk upload via CSV/Excel
- Validation before import
- Preview changes
- Rollback on error

#### History/Audit Trail
- Track who created/modified/deleted records
- Timestamp all changes
- View history per record
- Revert to previous version (optional)

#### Keyboard Shortcuts
- `Ctrl/Cmd + F`: Focus search
- `Ctrl/Cmd + N`: New record
- `Esc`: Close modal or cancel edit
- `Enter`: Save when editing
- Arrow keys: Navigate table

## Modal Implementation Plan

### Phase 1: Core Infrastructure Modal (First Implementation)

**Priority:** Highest - Template for all other modals

**Columns to display:**
- Client (read-only, auto-filled)
- SubName (Location)
- Name
- IP address
- Machine Name / MAC
- Service Tag
- Description
- Login (with show/hide)
- Password (masked with show/hide)
- Alt Login (with show/hide)
- Alt Passwd (masked with show/hide)
- Notes
- Notes 2
- On Landing Page (checkbox)
- Grouping
- Asset ID

**Search fields:** All text fields
**Filters:**
- SubName (dropdown)
- Grouping (dropdown)
- On Landing Page (yes/no)

**Special handling:**
- Password fields masked by default
- IP addresses in monospace font
- Service Tag as clickable (could link to vendor support)

### Phase 2: Other Data Modals

Apply same pattern to:
1. **Workstations + Users** - Combined data from workstations and users
2. **External Info** - Firewall/VPN data
3. **Managed WAN Info** - ISP provider data
4. **Admin Credentials** - All admin login data (4 sub-tables)

### Phase 3: Navigation Modals

Implement modals for navigation buttons:
1. Misc
2. Devices
3. Containers
4. VMs
5. Billing
6. Sonicwall
7. SLG Email Issues

(Data sources for these TBD)

## Technical Architecture

### Component Structure

```typescript
// Main modal component
<FullPageModal>
  <ModalHeader />
  <ModalToolbar>
    <SearchBar />
    <FilterControls />
    <ActionButtons />
  </ModalToolbar>
  <DataTable>
    <TableHeader />
    <TableBody>
      {rows.map(row => (
        <TableRow>
          <TableCell />
          <RowActions />
        </TableRow>
      ))}
    </TableBody>
  </DataTable>
  <ModalFooter>
    <Pagination />
  </ModalFooter>
</FullPageModal>

// Reusable components
- SearchBar
- FilterDropdown
- DataTable (generic, reusable)
- EditForm (generated from data types)
- PasswordField (with show/hide)
- ConfirmDialog
```

### State Management

```typescript
const [data, setData] = useState([]);           // Full dataset
const [filteredData, setFilteredData] = useState([]); // After filters/search
const [searchQuery, setSearchQuery] = useState('');
const [filters, setFilters] = useState({});
const [sortConfig, setSortConfig] = useState({ field: null, direction: null });
const [currentPage, setCurrentPage] = useState(1);
const [rowsPerPage, setRowsPerPage] = useState(50);
const [editingRow, setEditingRow] = useState(null);
const [isLoading, setIsLoading] = useState(false);
```

### API Endpoints Required

```typescript
// Read
GET /api/data/core?client=BT&search=server&subName=Office

// Create
POST /api/data/core
Body: { Client: "BT", Name: "New Server", ... }

// Update
PUT /api/data/core/:id
Body: { Name: "Updated Server", ... }

// Delete
DELETE /api/data/core/:id
```

### Data Validation

```typescript
const coreInfraSchema = {
  Client: { required: true, type: 'string' },
  SubName: { type: 'string' },
  Name: { required: true, type: 'string', minLength: 1 },
  'IP address': { type: 'ip', optional: true },
  // ... etc
};
```

## UI/UX Considerations

### Performance
- Virtual scrolling for large datasets (>1000 rows)
- Lazy loading images/icons
- Debounced search
- Memoized computed values
- Pagination to limit DOM size

### Accessibility
- Keyboard navigation
- Screen reader support
- Focus management
- ARIA labels
- High contrast mode support

### Mobile Responsiveness
- Touch-friendly buttons (min 44px)
- Swipe gestures for row actions
- Bottom sheet for forms on mobile
- Simplified table view (cards)

## Security Considerations

### Authentication & Authorization
- Verify user is authenticated
- Check permissions before showing CRUD buttons
- Phase 1: Read-only for all users
- Phase 2: Role-based access (admin can edit, users read-only)

### Data Protection
- Passwords encrypted in transit (HTTPS)
- Passwords masked in UI by default
- Audit log for sensitive operations
- CSRF protection for mutations
- Input sanitization

## Next Steps

1. **Create reusable DataTable component** with:
   - Search, filter, sort, pagination
   - Generic interface for any data type

2. **Implement Core Infrastructure modal** as template:
   - Full CRUD operations
   - All features listed above

3. **Test thoroughly** with actual data

4. **Clone template for other modals**:
   - Adjust columns per data type
   - Customize validation rules
   - Maintain consistent UX

5. **Add advanced features**:
   - Export/import
   - Bulk operations
   - History tracking

## Questions to Resolve

1. **Write permissions**: Should all data modifications write back to Excel files, or migrate to database?
2. **Concurrency**: How to handle multiple users editing same data?
3. **Backup**: Auto-backup Excel files before modifications?
4. **Validation**: Strict validation rules per field?
5. **Navigation modals**: What data sources for Misc, Devices, Containers, etc.?

---

## ✅ IMPLEMENTATION COMPLETE - Phase 1

### What's Been Built:

**Reusable Components:**
- ✅ **DataTable component** ([src/components/DataTable.tsx](src/components/DataTable.tsx))
  - Global search across all fields
  - Column sorting (click headers for asc/desc)
  - Pagination with configurable page sizes (50/100/200)
  - Password masking with show/hide toggle
  - CSV export
  - CRUD button handlers (mockup mode)
  - Row counters and stats
  - Empty state handling

**Completed Modals:**

1. ✅ **Core Infrastructure** - COMPLETE
   - 14 columns from Core.xlsx
   - Password masking: Login, Password, Alt Login, Alt Passwd
   - IP addresses in monospace font
   - Full search, sort, export capabilities

2. ✅ **Workstations + Users** - COMPLETE
   - 10 columns (fusion of Workstations.xlsx and Users.xlsx)
   - Combined view of PC inventory and user accounts
   - Full search, sort, export capabilities

3. ✅ **External Info (Firewalls/VPN)** - COMPLETE
   - 16 columns from External_Info.xlsx
   - Password masking: Password, VPN Password
   - Firewall and VPN configuration details
   - Full search, sort, export capabilities

4. ✅ **Managed WAN Info (ISP)** - COMPLETE
   - 11 columns from Managed_Info.xlsx
   - Provider, IPs, account numbers, support contacts
   - Full search, sort, export capabilities

5. ✅ **Admin Credentials** - COMPLETE (Special Layout)
   - **Split-panel design** with 4 sections:
     - Admin Emails (top, full width)
     - Mitel Logins (bottom left)
     - Acronis Backups (bottom middle)
     - Cloudflare Admins (bottom right)
   - Each section has independent DataTable
   - Color-coded borders matching dashboard theme
   - All passwords masked with show/hide

### Current State:

**CRUD Operations:** Mockup Mode
- **Create**: Shows alert "Add New functionality (mockup)"
- **Update**: Shows alert "Edit functionality (mockup)" with row data
- **Delete**: Shows confirmation dialog, then alert
- **No data is modified** - safe for testing

### Navigation Modals (Placeholders):
- Misc
- Devices
- Containers
- VMs
- Billing
- Sonicwall
- SLG Email Issues

*Awaiting Excel files for these sections*

### Answers to Questions:

1. ✅ **Data persistence**: Write back to Excel files (planned for Phase 2)
2. ✅ **Write permissions**: CRUD UI implemented as mockups for now
3. ⏳ **Navigation modals**: Will use separate Excel files when provided
4. ✅ **Priority order**: Core Infrastructure completed first as template

---

**Status:** Phase 1 COMPLETE - All 5 main modals functional with mockup CRUD
**Next Phase:** Implement actual Excel write operations (Phase 2)
**Last Updated:** 2026-01-13
