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
# Data paths
EXCEL_BASE_PATH=./Examples              # Base path for Excel files
COMPANIES_FILE_PATH=./Examples/companies.xlsx

# Resource defaults (for HostGroupedView)
NEXT_PUBLIC_CONTAINER_DEFAULT_CORES=0
NEXT_PUBLIC_CONTAINER_DEFAULT_RAM=1
NEXT_PUBLIC_DAEMON_DEFAULT_CORES=1
NEXT_PUBLIC_DAEMON_DEFAULT_RAM=2
NEXT_PUBLIC_WINDOWS_OS_RAM=4           # OS overhead for Windows hosts
NEXT_PUBLIC_OTHER_OS_RAM=1             # OS overhead for Linux/other

# Cache
EXCEL_CACHE_TTL=300000                  # 5 minutes in ms

# Auth
JWT_SECRET=your-secret-here
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

### User Preferences & Dark Mode
- Persists user preferences in SQLite database (linked to user accounts)
- Falls back to localStorage for guests
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

- User preferences system with dark mode support (completed)
- VM/Container/Daemon management with host grouping
- Resource allocation visibility
- Connection button integration (RDP/VNC/SSH/Web)
- Server/Client executable packaging (planned - reference multi-user-timesheet)
