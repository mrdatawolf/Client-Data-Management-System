# Claude AI Context - Client Data Management System

This file provides context for AI assistants working on this project.

## Project Overview

A Next.js web application that manages IT infrastructure data for multiple clients. It reads from Excel files stored on a network drive and provides a modern dashboard interface. The system replaced a PowerBI dashboard and supports both web and Electron desktop deployment.

**Primary Use Case:** IT technicians view and manage client infrastructure data including servers, workstations, users, credentials, VPN configs, and admin accounts.

## Technology Stack

- **Framework:** Next.js 16 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS with dark mode support (`dark:` variants)
- **Components:** Radix UI primitives
- **Data Source:** Excel files (xlsx library)
- **Auth:** JWT-based with SQLite (libsql)
- **Desktop:** Electron (optional)

## Directory Structure

```
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/data/           # API routes for each data type
│   │   │   ├── companies/      # Client list
│   │   │   ├── core/           # Core infrastructure
│   │   │   ├── vms/            # Virtual machines
│   │   │   ├── containers/     # Docker containers
│   │   │   ├── daemons/        # Application servers
│   │   │   └── ...             # Other data endpoints
│   │   ├── dashboard/          # Main dashboard page
│   │   └── login/              # Authentication
│   ├── components/
│   │   ├── DataTable.tsx       # Reusable data table with search/sort/pagination
│   │   ├── FullPageModal.tsx   # Modal overlay system
│   │   ├── HostGroupedView.tsx # VM/Container/Daemon grouped by host
│   │   ├── ThemeToggle.tsx     # Light/Dark/System theme toggle
│   │   └── ui/                 # Radix UI components
│   ├── lib/
│   │   ├── excel/reader.ts     # Excel file reading and caching
│   │   ├── auth/               # Authentication utilities
│   │   └── preferences/db.ts   # User preferences database operations
│   ├── context/
│   │   └── ThemeContext.tsx    # Theme provider for dark mode
│   ├── hooks/
│   │   └── useTheme.ts         # Hook to access theme context
│   └── types/
│       ├── data.ts             # TypeScript interfaces and Excel file config
│       └── preferences.ts      # Theme and preferences types
├── Examples/                   # Sample Excel files for development
├── electron-app/               # Electron main process
└── data/                       # SQLite databases (auth, misc)
```

## Key Files

| File | Purpose |
|------|---------|
| `src/types/data.ts` | All TypeScript interfaces + EXCEL_FILES config mapping |
| `src/lib/excel/reader.ts` | Excel reading, caching, filtering utilities |
| `src/app/dashboard/page.tsx` | Main dashboard with client selector and data views |
| `src/components/HostGroupedView.tsx` | VMs/Containers/Daemons grouped by host with resource tracking |
| `src/components/DataTable.tsx` | Generic data table component |
| `src/components/FullPageModal.tsx` | Modal wrapper for data views |

## Data Model

### Excel Files → TypeScript Interfaces

All data comes from Excel files. The mapping is defined in `src/types/data.ts`:

```typescript
export const EXCEL_FILES: Record<string, ExcelFileConfig> = {
  companies: { fileName: "companies.xlsx", sheetName: "Companies" },
  core: { fileName: "Core.xlsx", sheetName: "Infrastructure" },
  vms: { fileName: "VMs.xlsx", sheetName: "Clients" },
  containers: { fileName: "Containers.xlsx", sheetName: "Containers" },
  daemons: { fileName: "Daemons.xlsx", sheetName: "Sheet1" },
  // ... more files
};
```

### Key Interfaces

- **Company** - Client master list (Abbrv is the foreign key for all data)
- **CoreInfrastructure** - Servers, routers, hosts with credentials
- **VirtualMachine** - VMs with host assignment, resources
- **Container** - Docker containers with ports
- **Daemon** - Self-contained application servers
- **Workstation** - PC inventory
- **User** - User accounts

### Common Fields

- `Client` - Foreign key to companies.Abbrv (e.g., "BT", "AE")
- `Active` / `Inactive` - Status flags (1 = active, 0 = inactive)
- `"On Landing Page"` - Featured items flag
- `Grouping` - Custom categorization
- `"Startup Notes"` - Special startup instructions

## Environment Variables

```bash
# Data paths (production uses network drive)
EXCEL_BASE_PATH=\\\\192.168.203.207\\Shared Folders\\PBIData\\NetDoc\\Manual
COMPANIES_FILE_PATH=\\\\192.168.203.207\\Shared Folders\\PBIData\\Biztech\\companies.xlsx

# For development, use local Examples folder:
# EXCEL_BASE_PATH=./Examples
# COMPANIES_FILE_PATH=./Examples/companies.xlsx

# Resource defaults (for HostGroupedView)
NEXT_PUBLIC_CONTAINER_DEFAULT_CORES=0
NEXT_PUBLIC_CONTAINER_DEFAULT_RAM=1
NEXT_PUBLIC_DAEMON_DEFAULT_CORES=1
NEXT_PUBLIC_DAEMON_DEFAULT_RAM=2
NEXT_PUBLIC_WINDOWS_OS_RAM=4           # OS overhead for Windows hosts
NEXT_PUBLIC_OTHER_OS_RAM=1             # OS overhead for Linux/other

# Cache
EXCEL_CACHE_TTL=300000                  # 5 minutes in ms (restart server to clear)

# Auth
JWT_SECRET=your-secret-here
DISABLE_AUTH=true                       # Set to true to bypass login for development
AUTH_DB_PATH=./data/auth.db
```

## API Pattern

All data APIs follow this pattern:

```typescript
// GET /api/data/{type}?client=XXX
export async function GET(request: NextRequest) {
  const client = searchParams.get("client");
  if (!client) return error 400;

  const data = readExcelFile("{type}");      // From EXCEL_FILES config
  const filtered = filterByClient(data, client);
  return { data: filtered, count: filtered.length };
}
```

## Recent Features

### Dashboard Layout
The main dashboard has a compact header (h-16 = 64px) with integrated controls:
- **Logo/Title** - Company logo that toggles to "Infrastructure Dashboard" text (easter egg)
- **Client Selector** - Dropdown with grouped clients (uses `Group` column from companies.xlsx)
  - Groups with 2+ clients display as `<optgroup>` sections
  - Single-client groups appear ungrouped
- **Domain Display** - Clickable div showing domain info, opens Domain/AD modal
  - Stacked layout: "Domain:" label on top, domain name below
- **Refresh Button** - Reloads client data
- **Navigation Buttons** - Quick access to Guacamole, Misc, Devices, VMs, Emails, Services, Users modals
- **User Menu** - Clickable username dropdown with theme toggle and logout

**Dashboard Panels (70% top / 30% bottom):**
- Top row: Servers/Switches (Core) | Workstations + Users (50/50 split)
- Bottom row: Firewalls/Routers (External) | Managed WAN Info | Admin Credentials (3-column grid)

### User Preferences & Dark Mode
- Persists user preferences in SQLite database (linked to user accounts)
- Falls back to localStorage for guests (or when DISABLE_AUTH=true)
- Theme options: Light, Dark, System (follows OS preference)
- Flash-prevention script in layout.tsx prevents white flash on dark theme
- All components use Tailwind `dark:` variants for styling

**API Endpoints:**
- `GET/POST /api/preferences` - Get/set all preferences
- `GET/PUT/DELETE /api/preferences/[key]` - Manage specific preference

**Theme Usage:**
```typescript
import { useTheme } from '@/hooks/useTheme';
const { theme, setTheme } = useTheme();
// theme: 'light' | 'dark' | 'system'
```

### Authentication
- Session cookie-based authentication
- `DISABLE_AUTH=true` in `.env` bypasses login for development
- Fallback admin user (admin/admin123) when database unavailable
- Foreign key constraint errors silently handled for guest users

### Data Modals
| Modal | Data Source | Key Fields |
|-------|-------------|------------|
| Emails | Email.xlsx | Username, Email, Password, MFA, Active |
| Services | Services.xlsx | Service, Username, Password, Host/URL |
| Users | Users.xlsx | Name, Login, Password, Computer, Phone |
| VMs/Containers | VMs.xlsx, Containers.xlsx, Daemons.xlsx | Grouped by host server |
| Domain/AD | Core.xlsx (AD Server=1), Domains.xlsx | Server Name, IP, Login, Password |

### Host Grouped View (HostGroupedView.tsx)
- Groups VMs, Containers, and Daemons by their host server
- Resource allocation tracking (cores, RAM)
- OS overhead calculation (Windows 4GB, others 1GB)
- Connection buttons (RDP, VNC, SSH, Web) controlled by Core.xlsx fields:
  - `"RDP?"` - Show RDP button if 1
  - `"VNC?"` - Show VNC button if 1
  - `"SSH?"` - Show SSH button if 1
  - `"Web?"` - Show Web button if 1
- Startup Notes displayed on cards
- Host credentials modal

### Connection Handlers
```typescript
openRDP(ip)   // Downloads .rdp file
openVNC(ip)   // Opens vnc://ip:5900
openSSH(ip)   // Opens ssh://user@ip
openWebUI(ip) // Opens http://ip
```

### Easter Egg System
Extensible easter egg system for fun surprises:

**Files:**
- `src/lib/easterEggs/registry.ts` - Configuration registry
- `src/components/EasterEggs/` - Easter egg components

**Current Easter Eggs:**
| Name | Trigger | Description |
|------|---------|-------------|
| Title Eater | 1 min or click logo/title | Random creature eats content, toggles between logo and text |

**Logo/Text Toggle Behavior:**
- Starts with company logo (`/smaller_logo.png`)
- Click logo → creature eats it (fades out) → shows "Infrastructure Dashboard" text
- Click text → creature eats it (letter by letter) → shows logo again
- Container has fixed dimensions to prevent layout shift

**Creatures:** 🐛 caterpillar (150ms), 🐌 snail (250ms), 🐁 mouse (100ms), 👾 alien (120ms), 🦖 dinosaur (80ms), 🦈 shark (60ms), 🐢 turtle (300ms)

**Adding New Easter Eggs:**
1. Add config to `registry.ts`:
```typescript
newEgg: {
  id: 'newEgg',
  name: 'New Easter Egg',
  enabled: true,
  triggerDelay: 0,      // ms (0 = immediate)
  probability: 1,       // 0-1 chance
},
```
2. Create component in `src/components/EasterEggs/`
3. Export from `index.tsx`

### Domain/Active Directory Modal
Clicking the Domain display in the header opens a modal showing:
- Primary Domain and Alt Domain header
- DataTable of AD servers filtered from Core.xlsx where `AD Server` = 1
- Columns: Server Name, Location, AD IP Address, Administrator Login, Password, Description, Notes

**Core.xlsx AD Server Field:**
- Add column `AD Server` with value `1` for domain controllers
- These servers appear in the Domain/AD modal

### User Menu Dropdown
The username in the header is now a clickable dropdown containing:
- **Theme selection** - Light ☀️, Dark 🌙, System 💻 (with checkmark on active)
- **Logout button** - Styled in red

### Firewalls/Routers Internal IP
The external-info API enriches firewall/router data with internal IP addresses:
- Reads both `externalInfo` and `core` Excel files
- Matches by `SubName` (location) and device type keywords
- Adds `IntIP` field from matching Core item's IP address
- Displayed in the Firewalls/Routers dashboard panel

## Common Tasks

### Adding a New Excel File

1. Add interface to `src/types/data.ts`
2. Add entry to `EXCEL_FILES` config in `src/types/data.ts`
3. Create API route in `src/app/api/data/{name}/route.ts`
4. Add UI component or integrate into existing view

### Adding Fields to Existing Data

1. Update interface in `src/types/data.ts`
2. Update any local interfaces in components (e.g., HostGroupedView has local copies)
3. Update UI to display/use new fields

### Modifying Modals

- `FullPageModal.tsx` - Full-page overlay with 3em top padding
- Host credentials modal is inline in `HostGroupedView.tsx`
- Both have 3em top padding to keep company selector visible

## Code Patterns

### Excel Reading with Cache
```typescript
const data = readExcelFile("core");  // Uses EXCEL_FILES config
const filtered = filterByClient(data, client);
```

### Component Props Pattern
```typescript
interface Props {
  vms: VM[];
  containers: Container[];
  daemons: Daemon[];
  coreInfra: CoreInfrastructure[];
}
```

### Conditional Button Rendering
```typescript
{hostInfo?.["IP address"] && hostInfo["RDP?"] === 1 && (
  <button onClick={() => openRDP(hostInfo["IP address"])}>RDP</button>
)}
```

## NPM Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run auth:init` | Initialize auth database |
| `npm run preferences:init` | Initialize preferences database |
| `npm run electron:start` | Start Electron app |
| `npm run electron:build` | Build Electron installer |
| `npm run build:all` | Full production build |

## Testing

- Use `Examples/` folder with sample Excel files
- Set `EXCEL_BASE_PATH=./Examples` in `.env.local`
- Default auth: admin / admin123

## Important Notes

1. **Excel as Data Store** - System reads/writes Excel files directly, no database migration planned
2. **Password Fields** - Mask in UI, show/hide toggle, never log plaintext
3. **Client Filter** - Nearly all data is filtered by client abbreviation
4. **Modal Top Padding** - 3em padding keeps company selector visible on 1080p
5. **Resource Tracking** - VMs use actual values, containers/daemons use configurable defaults

## Files to Review First

1. `src/types/data.ts` - Understand data model
2. `src/lib/excel/reader.ts` - Understand data access
3. `src/app/dashboard/page.tsx` - Main dashboard structure
4. `src/components/HostGroupedView.tsx` - Complex view with resource tracking

## Current Development Focus

**Completed:**
- User preferences system with dark mode support
- VM/Container/Daemon management with host grouping
- Resource allocation visibility
- Connection button integration (RDP/VNC/SSH/Web)
- Dashboard layout with grouped client selector
- Domain display in header (clickable to open AD modal)
- Emails, Services, Users modals
- DISABLE_AUTH for development mode
- Easter egg system (Title Eater with logo/text toggle)
- Dark mode hover fix in DataTable
- Internal IP enrichment for Firewalls/Routers
- Domain/Active Directory modal
- User menu dropdown with theme selector
- Dashboard section renaming (Servers/Switches, Firewalls/Routers)

**In Progress:**
- Server/Client executable packaging (reference multi-user-timesheet project)

## Client Grouping

The client dropdown groups clients based on the `Group` column in companies.xlsx:
- Only groups with 2+ clients show as `<optgroup>` sections
- Single-client groups appear in the ungrouped list
- Groups are sorted alphabetically
- Cache must be cleared (restart server) after modifying companies.xlsx
