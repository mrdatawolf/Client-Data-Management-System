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

### Phase 1: PowerBI Replacement (Current)
- Read-only data visualization
- 4 priority dashboard views
- Multi-select filters
- Authentication system
- Export functionality

### Phase 2: Data Entry (Planned)
- Create/Update/Delete operations
- Form-based data entry
- Inline table editing
- Audit trail
- Validation and error handling

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
  - Misc, Devices, Containers, VMs, Billing, Sonicwall, SLG Email Issues (placeholders)

### Interactive Data Tables (All 5 Modals)
Each modal includes a fully-featured data table with:
- ✅ **Real-time search** - Search across all fields instantly
- ✅ **Sortable columns** - Click headers to sort ascending/descending
- ✅ **Pagination** - Navigate large datasets (50/100/200 rows per page)
- ✅ **Password masking** - Show/hide toggle for sensitive fields
- ✅ **Export CSV** - Download filtered data
- ✅ **CRUD operations** (mockup UI - writes to Excel pending):
  - Add New button (green)
  - Edit button per row (blue)
  - Delete button per row (red with confirmation)

### Data Sections
1. **Core Infrastructure** (Blue) - Servers, routers, switches
   - 14 columns including IP addresses, login credentials, service tags
   - Password masking for Login, Password, Alt Login, Alt Passwd

2. **Workstations + Users** (Green) - PC inventory and user accounts
   - 10 columns combining workstation and user data
   - Computer names, locations, users, emails, IP addresses

3. **External Info** (Amber) - Firewalls and VPN connections
   - 16 columns including firewall configs, VPN settings
   - Password masking for admin and VPN passwords

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

### Authentication
- JWT-based login system
- User session management
- Protected routes
- Session persistence

### Components
- **DataTable** - Reusable table component with search, sort, filter, pagination
- **FullPageModal** - Modal overlay system with keyboard shortcuts (ESC to close)
- **Responsive design** - Works on desktop, tablet, mobile

**Status:** Phase 1 Complete - Full read-only dashboard with CRUD mockups
**Next Phase:** Implement actual write operations to Excel files
**Last Updated:** 2026-01-13
