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

Open [http://localhost:6029](http://localhost:6029) in your browser.

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
npm run dev              # Start development server (port 6029)
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
- Admin Emails.xlsx, Admin Mitel Logins.xlsx, Cloudflare_Admins.xlsx - Admin credentials
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

**Status:** Phase 1 Development
**Last Updated:** 2026-01-12
