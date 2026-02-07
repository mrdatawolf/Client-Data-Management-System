# Client Data Management System

A Next.js web application that replaces PowerBI for visualizing and managing client IT infrastructure data. This system provides a modern interface for viewing and editing data currently stored in Excel files, with support for both web and desktop (Electron) deployment.

## Overview

This application manages IT infrastructure data for multiple clients, including:
- Servers, routers, and network infrastructure
- Workstations and PC inventory
- User accounts and credentials
- Email configurations
- External connections and VPNs
- Contact information

## Quick Start

### Prerequisites
- Node.js 20 or higher
- Access to network drive (S:\PBIData) or modify paths in .env
- Git

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd Client-Data-Management-System

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your specific paths

# Initialize authentication database
npm run auth:init

# Start development server
npm run dev
```

Open [http://localhost:6030](http://localhost:6030) in your browser.

## Project Documentation

For complete project documentation, implementation plan, and technical details, see:

**[PROJECT_PLAN.md](./PROJECT_PLAN.md)**

This comprehensive document includes:
- Data model and relationships
- Phase 1 & 2 implementation details
- Technical architecture
- Deployment options
- Security considerations
- Testing strategy

## Project Structure

```
├── Examples/              # Sample Excel files for development
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   ├── lib/              # Utilities and helpers
│   └── types/            # TypeScript type definitions
├── scripts/              # Build and setup scripts
├── .env.example          # Environment variables template
└── PROJECT_PLAN.md       # Complete project documentation
```

## Development Phases

### Phase 1: PowerBI Replacement (Complete)
- Read-only data visualization
- Dashboard with 7+ data sections
- Client selector with grouped dropdown
- Authentication system
- CSV export functionality
- Dark mode with user preferences

### Phase 2: Data Entry (Complete)
- Inline table editing (double-click cells)
- Add Record modal for creating new entries
- Archive/Inactive system (soft delete with Inactive=1)
- Excel write-back (updates .xlsx files directly)
- Many-to-many workstation-user relationships with expandable rows

## Available Scripts

```bash
npm run dev              # Start development server (port 6030)
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run auth:init        # Initialize auth database
npm run electron:start   # Start Electron app
npm run electron:build   # Build Electron desktop app
npm run build:all        # Build web and desktop versions
```

## Technology Stack

- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Radix UI** - Component library
- **xlsx** - Excel file handling
- **Electron** - Desktop app (optional)

## Configuration

Key environment variables (see `.env.example`):

- `EXCEL_BASE_PATH` - Path to main Excel files
- `COMPANIES_FILE_PATH` - Path to companies master file
- `JWT_SECRET` - Secret for JWT authentication
- `NEXT_PUBLIC_ENABLE_EDITING` - Enable/disable editing features

## Sample Data

The `Examples/` folder contains sample Excel files demonstrating the data structure:
- companies.xlsx - Client master list
- Core.xlsx - Infrastructure assets
- Workstations.xlsx - PC inventory
- Users.xlsx - User accounts
- Emails.xlsx - Email configurations
- External_Info.xlsx - External connections/VPNs
- Managed_Info.xlsx - Managed WAN/ISP provider info
- Admin Emails.xlsx, Admin Mitel Logins.xlsx, Cloudflare_Admins.xlsx, Acronis Backups.xlsx - Admin credentials
- GuacamoleHosts.xlsx - Guacamole remote access URLs
- Phone Numbers.xlsx - Contact information
- logo.png - Company logo

## Contributing

1. Review [PROJECT_PLAN.md](./PROJECT_PLAN.md) for architecture and guidelines
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

For questions or issues:
- Review the [PROJECT_PLAN.md](./PROJECT_PLAN.md) documentation
- Check existing GitHub issues
- Create a new issue with details

## License

[Your License Here]

---

## Current Features (Phase 1 - Complete!)

### Dashboard
- **Single-page dashboard** with 5 data sections
- **Client selector** to filter all data by selected client
- **Color-coded clickable section headers** that open full-page modals
- **Navigation buttons** for quick access to:
  - **Guacamole** - Opens remote access URL from GuacamoleHosts.xlsx
  - **Misc** - Miscellaneous data
  - **Devices** - Workstations modal
  - **VMs** - Virtual Machines, Containers & Daemons
  - **Emails** - Email configurations
  - **Services** - Service credentials
  - **Users** - User accounts

### Interactive Data Tables (All 5 Modals)
Each modal includes a fully-featured data table with:
- ✅ **Real-time search** - Search across all fields instantly
- ✅ **Sortable columns** - Click headers to sort ascending/descending
- ✅ **Pagination** - Navigate large datasets (50/100/200 rows per page)
- ✅ **Password masking** - Show/hide toggle for sensitive fields
- ✅ **Export CSV** - Download filtered data
- ✅ **Inline editing** - Double-click any cell to edit, saves directly to Excel
- ✅ **Add Record** - Modal form for creating new entries
- ✅ **Archive/Delete** - Set Inactive flag (soft delete) with confirmation
- ✅ **Expandable rows** - Expand to see related data (e.g., all users on a workstation)

### Host Grouped View (VMs, Containers, Daemons)
- **Grouped by host** - VMs, containers, and daemons organized under their host servers
- **Resource allocation tracking** - Shows allocated cores and RAM vs host capacity
- **OS overhead calculation** - Accounts for Windows (4GB) vs Linux (1GB) OS memory
- **Card-based layout** - Visual cards for each VM, container, and daemon
- **Connection buttons** - RDP, VNC, SSH, Web buttons based on Core.xlsx flags
- **Startup Notes** - Special instructions displayed on cards
- **Host credentials modal** - Quick access to host login info
- **Configurable defaults** via environment variables:
  - Container resources (default: 0 cores, 1GB RAM)
  - Daemon resources (default: 1 core, 2GB RAM)
  - OS overhead (Windows: 4GB, Other: 1GB)

### Data Sections
1. **Servers/Switches (Core)** (Blue) - Servers, routers, switches
   - 14+ columns including IP addresses, login credentials, service tags
   - Password masking for Login, Password, Alt Login, Alt Passwd
   - Resource info: Cores, RAM (GB), Inactive status
   - Connection flags: RDP?, VNC?, SSH?, Web?
   - AD Server flag for Domain Controller identification

2. **Workstations + Users** (Green) - PC inventory and user accounts (many-to-many)
   - Workstation-centric view with expandable rows to show all assigned users
   - User count badge ("2 users", single username, or "No user")
   - Click expand arrow to see full user details (Name, Login, Phone, Cell, Location)

3. **Firewalls/Routers (External)** (Amber) - Firewalls and VPN connections
   - 16 columns including firewall configs, VPN settings
   - Password masking for admin and VPN passwords
   - Internal IP enrichment from Core.xlsx matching

4. **Managed WAN Info** (Purple) - ISP provider information
   - 11 columns including provider details, IPs, support contacts
   - Multiple phone numbers for support escalation

5. **Admin Credentials** (Rose) - Admin logins for various services
   - **Split-panel layout** with 4 sub-sections:
     - Admin Emails (top panel) - Name, Email, Password, Notes
     - Mitel Logins (bottom left) - Login, Password
     - Acronis Backups (bottom middle) - Username, Password
     - Cloudflare Admins (bottom right) - Username, Password
   - Each section independently searchable/sortable

6. **Virtual Machines, Containers & Daemons**
   - VMs from VMs.xlsx with host, resources, type
   - Containers from Containers.xlsx with ports
   - Daemons from Daemons.xlsx (self-contained app servers)
   - All grouped by host server with resource tracking

7. **Domain / Active Directory** (Cyan) - Domain controllers
   - Accessible by clicking the Domain display in header
   - Shows AD servers from Core.xlsx where AD Server = 1
   - Displays server name, IP, administrator credentials

### User Menu
- Click username in header to open dropdown menu
- **Theme selection**: Light ☀️, Dark 🌙, System 💻
- **Logout**: Sign out of the application

### Authentication
- JWT-based login system
- User session management
- Protected routes
- Session persistence

### Additional Modals
- **Workstations** - Raw workstation data with expandable rows showing assigned users
- **Users** - User accounts with expandable rows showing assigned workstations
- **Emails** - Email configurations with credentials
- **Services** - Service credentials with host/URL info

### Components
- **DataTable** - Reusable table component with search, sort, filter, pagination, inline editing, and expandable rows
- **FullPageModal** - Modal overlay system with keyboard shortcuts (ESC to close)
- **HostGroupedView** - VM/Container/Daemon grouped display with resource tracking
- **AddRecordModal** - Form-based modal for creating new records
- **Responsive design** - Works on desktop, tablet, mobile

### Recent Updates (2026-02-06)

- **Many-to-Many Relationships** - Workstations and Users now properly handle many-to-many via expandable rows
- **Expandable Rows** - Generic DataTable feature; click arrow to expand sub-rows with related data
- **Inline Editing** - Double-click any editable cell to modify values, saves directly to Excel
- **Add Record** - Modal form for creating new entries across all data types
- **Archive System** - Soft delete via Inactive flag instead of permanent deletion
- **Standalone Modals** - Workstations and Users available as separate modals with cross-referenced data
- **User Menu Dropdown** - Username is now clickable, showing theme selector (Light/Dark/System) and logout
- **Domain/AD Modal** - Click the Domain display to see Active Directory servers with credentials
- **Internal IP Display** - Firewalls/Routers now show internal IP from Core.xlsx

**Status:** Phase 1 & Phase 2 Complete - Full dashboard with read/write capabilities
**Last Updated:** 2026-02-06
