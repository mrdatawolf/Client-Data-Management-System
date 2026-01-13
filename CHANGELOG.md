# Changelog

All notable changes to the Client Data Management System will be documented in this file.

## [Phase 1 Complete] - 2026-01-13

### 🎉 Major Milestone: Full Dashboard with Interactive Modals

This release completes Phase 1 of the project - a fully functional read-only dashboard that replaces the PowerBI solution.

### Added

#### Dashboard Features
- **Single-page dashboard** with real-time client data filtering
- **Client selector** dropdown in header
- **Color-coded section headers** that open full-page modals:
  - Core Infrastructure (Blue)
  - Workstations + Users (Green)
  - External Info - Firewalls/VPN (Amber)
  - Managed WAN Info - ISP (Purple)
  - Admin Credentials (Rose)
- **Navigation buttons** in header:
  - Guacamole (opens remote access URL from Excel)
  - Misc, Devices, Containers, VMs, Billing, Sonicwall, SLG Email Issues (placeholders)
- **Refresh button** to reload client data

#### DataTable Component (Reusable)
- **Real-time search** across all fields with debouncing
- **Sortable columns** - Click headers to sort ascending/descending/none
- **Pagination** with configurable page sizes (50/100/200 rows)
- **Password masking** with show/hide toggle (eye icon)
- **CSV export** of filtered/sorted data
- **CRUD buttons**:
  - Add New (green button in toolbar)
  - Edit (blue button per row)
  - Delete (red button per row with confirmation)
- **Row statistics** - "Showing X to Y of Z records"
- **Empty states** for no data and no search results
- **Responsive design** with horizontal scrolling

#### Modal Windows (All 5 Complete)

**1. Core Infrastructure Modal**
- 14 columns from Core.xlsx
- Displays: Location, Name, IP, Machine Name/MAC, Service Tag, Description, Login, Password, Alt Login, Alt Password, Notes, Grouping, Asset ID
- Password masking for 4 password fields
- IP addresses in monospace font
- Full search, sort, pagination, export

**2. Workstations + Users Modal**
- 10 columns (fusion data from Workstations.xlsx and Users.xlsx)
- Displays: Computer Name, Location, Username, Full Name, Email, OS, IP Address, Service Tag, CPU, Description
- Combined view of hardware and user assignments
- Full search, sort, pagination, export

**3. External Info Modal**
- 16 columns from External_Info.xlsx
- Displays: Location, Connection Type, Device Type, IP, Port, Username, Password, VPN Port, VPN Username, VPN Password, VPN Domain, Firmware Version, Notes, Grouping, Asset ID
- Password masking for admin and VPN passwords
- Full search, sort, pagination, export

**4. Managed WAN Info Modal**
- 11 columns from Managed_Info.xlsx
- Displays: Provider, Connection Type, Primary IP, Secondary IP, Account Number, 4 Support Phone fields, 2 Notes fields
- Support contact escalation numbers
- Full search, sort, pagination, export

**5. Admin Credentials Modal** (Special Layout)
- **Split-panel design** with 4 independent sections:
  - **Admin Emails** (top panel, full width): Name, Email, Password, Notes
  - **Mitel Logins** (bottom left): Login, Password
  - **Acronis Backups** (bottom middle): Username, Password
  - **Cloudflare Admins** (bottom right): Username, Password
- Each section has its own DataTable with independent search/sort/pagination
- Color-coded borders matching dashboard theme
- All password fields masked by default

#### Authentication System
- JWT-based authentication with HttpOnly cookies
- Login page with username/password
- Session persistence
- Protected routes (redirect to login if not authenticated)
- User session management
- Logout functionality

#### API Routes
- `/api/auth/login` - User login
- `/api/auth/logout` - User logout
- `/api/auth/me` - Get current user
- `/api/data/clients` - List all active companies
- `/api/data/core` - Core infrastructure data
- `/api/data/external-info` - Firewall/VPN data
- `/api/data/managed-info` - ISP/WAN data
- `/api/data/workstations-users` - Fusion of workstation and user data
- `/api/data/admin-credentials` - All admin credentials (4 types)
- `/api/data/guacamole` - Guacamole remote access hosts

#### Components
- `FullPageModal` - Reusable modal overlay with keyboard support (ESC to close)
- `DataTable` - Fully-featured data table with search, sort, filter, pagination
- Radix UI components for form elements (Button, Card, Input, Label)

#### Documentation
- Complete `README.md` with current features and setup instructions
- `DATA_DICTIONARY.md` - Comprehensive data model documentation
- `MODAL_IMPLEMENTATION.md` - Modal architecture and implementation plan
- `PROJECT_PLAN.md` - Full project roadmap and technical architecture
- `CHANGELOG.md` - This file

### Technical Details

#### Data Sources
- Reads from Excel files (.xlsx) in `Examples/` directory
- Excel parsing via `xlsx` library
- In-memory caching with configurable TTL
- Client-side filtering and sorting

#### Technology Stack
- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + inline styles
- **UI Components**: Radix UI
- **Excel**: xlsx (SheetJS)
- **Authentication**: JWT with jose library
- **Database**: SQLite for user management

#### File Structure
```
src/
├── app/
│   ├── api/              # API routes
│   ├── dashboard/        # Main dashboard page
│   ├── login/            # Login page
│   └── layout.tsx        # Root layout
├── components/
│   ├── DataTable.tsx     # Reusable data table
│   ├── FullPageModal.tsx # Modal component
│   └── ui/               # Radix UI components
├── lib/
│   ├── auth/             # Authentication utilities
│   └── excel/            # Excel reading utilities
└── types/
    └── data.ts           # TypeScript interfaces
```

### Current Limitations (By Design - Phase 1)

- **Read-only**: All CRUD operations show mockup alerts only
- **No Excel writes**: Data modifications not yet implemented
- **No column filters**: Only global search implemented
- **No inline editing**: Edit opens alert, not inline form
- **Navigation modals**: Placeholders only (awaiting Excel files)

### Next Steps (Phase 2)

Planned features for the next phase:
1. Implement actual CRUD operations that write to Excel files
2. Add edit forms (modal or inline)
3. Add column-specific filters (dropdowns per column)
4. Implement validation rules
5. Add audit trail/change logging
6. Auto-backup Excel files before modifications
7. Handle concurrent editing scenarios
8. Add more advanced export options (Excel, JSON)

---

## [Initial Setup] - 2026-01-12

### Added
- Project scaffolding with Next.js 16
- TypeScript configuration
- Tailwind CSS setup
- Sample Excel files in `Examples/` directory
- Basic authentication system
- Excel reading utilities
- Type definitions for all data models

---

**Legend:**
- 🎉 Major milestone
- ✨ New feature
- 🐛 Bug fix
- 📝 Documentation
- 🔧 Configuration
- ⚡ Performance improvement
- 🎨 UI/styling changes
