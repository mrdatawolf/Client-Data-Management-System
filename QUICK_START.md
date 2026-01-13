# Quick Start Guide

This guide will get you up and running with the Client Data Management System in minutes.

## Prerequisites Check

Before starting, ensure you have:
- [ ] Node.js 20+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Git installed
- [ ] Access to the S:\ network drive (or sample data in Examples/)

## 5-Minute Setup

### 1. Clone and Install
```bash
git clone <your-repo-url>
cd Client-Data-Management-System
npm install
```

### 2. Configure Environment
```bash
# Windows
copy .env.example .env.local

# Mac/Linux
cp .env.example .env.local
```

Edit `.env.local`:
```bash
# For development with sample data
EXCEL_BASE_PATH=./Examples
COMPANIES_FILE_PATH=./Examples/companies.xlsx

# For production with real data
# EXCEL_BASE_PATH=S:/PBIData/NetDoc/Manual
# COMPANIES_FILE_PATH=S:/PBIData/Biztech/companies.xlsx

JWT_SECRET=your-dev-secret-change-for-production
NEXT_PUBLIC_ENABLE_EDITING=false
```

### 3. Initialize Database
```bash
npm run auth:init
```

This creates the auth database with a default user:
- **Username:** admin
- **Password:** admin123 (change this!)

### 4. Start Development Server
```bash
npm run dev
```

Open [http://localhost:6029](http://localhost:6029)

## What You'll See

After starting the dev server, you should see:
1. **Login page** - Use admin/admin123
2. **Dashboard** - Overview of client data
3. **Navigation** - Links to different data views

## Directory Structure

```
client-data-management/
├── Examples/              ← Sample Excel files (use for development)
├── src/
│   ├── app/              ← Pages and routes (Next.js App Router)
│   ├── components/       ← React components
│   ├── lib/              ← Utilities (Excel reader, auth, etc.)
│   └── types/            ← TypeScript types
├── .env.local            ← Your local config (don't commit!)
├── .env.example          ← Template for .env.local
└── PROJECT_PLAN.md       ← Full documentation
```

## Common Commands

```bash
# Development
npm run dev              # Start dev server on port 6029
npm run lint             # Check code quality

# Building
npm run build            # Build for production
npm run start            # Run production build

# Authentication
npm run auth:init        # Create auth database
# (Add more auth scripts as needed)

# Electron (Desktop App)
npm run electron:start   # Run as desktop app
npm run electron:build   # Build desktop installer

# Full Build
npm run build:all        # Build web + desktop
```

## Development Workflow

### Working on a New Feature

1. **Create a branch**
```bash
git checkout -b feature/your-feature-name
```

2. **Make changes** to files in `src/`

3. **Test locally**
```bash
npm run dev
# Open http://localhost:6029
```

4. **Commit and push**
```bash
git add .
git commit -m "Add your feature"
git push origin feature/your-feature-name
```

### Testing with Sample Data

Sample Excel files in `Examples/` folder:
- `companies.xlsx` - Master client list
- `Core.xlsx` - Infrastructure (servers, routers)
- `Workstations.xlsx` - PC inventory
- `Users.xlsx` - User accounts
- `Emails.xlsx` - Email configurations

To use samples in development:
```bash
# .env.local
EXCEL_BASE_PATH=./Examples
COMPANIES_FILE_PATH=./Examples/companies.xlsx
```

### Testing with Real Data

Once ready to test with production data:
```bash
# .env.local
EXCEL_BASE_PATH=S:/PBIData/NetDoc/Manual
COMPANIES_FILE_PATH=S:/PBIData/Biztech/companies.xlsx
```

Make sure you have network access to S:\ drive!

## Troubleshooting

### Port Already in Use
```bash
# Change port in .env.local
PORT=3000

# Or specify when running
npm run dev -- -p 3000
```

### Can't Access Excel Files
```bash
# Error: ENOENT: no such file or directory

# Check your .env.local paths
# For development, use:
EXCEL_BASE_PATH=./Examples

# For production, ensure S:\ drive is mounted
```

### Database Not Initialized
```bash
# Error: Cannot find auth.db

# Run initialization:
npm run auth:init

# Check that data/ folder was created
```

### Module Not Found
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors
```bash
# Restart TypeScript server (VS Code)
# Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"

# Or rebuild
npm run build
```

## Next Steps

### Phase 1: Reading Data
- [ ] Understand the data model ([PROJECT_PLAN.md](./PROJECT_PLAN.md))
- [ ] Create Excel reader utilities (`src/lib/excel/reader.ts`)
- [ ] Build API routes (`src/app/api/data/`)
- [ ] Create data table components
- [ ] Add filters and search

### Phase 2: Writing Data
- [ ] Implement Excel writer (`src/lib/excel/writer.ts`)
- [ ] Create form components
- [ ] Add validation
- [ ] Build audit trail
- [ ] Test concurrent access

## Important Files

| File | Purpose |
|------|---------|
| [PROJECT_PLAN.md](./PROJECT_PLAN.md) | Complete project documentation |
| [README.md](./README.md) | Project overview |
| `.env.local` | Your local configuration (create from .env.example) |
| `package.json` | Dependencies and scripts |
| `src/app/layout.tsx` | Root layout |
| `src/app/page.tsx` | Home page |

## Getting Help

1. **Read the docs**: Start with [PROJECT_PLAN.md](./PROJECT_PLAN.md)
2. **Check examples**: Look at sample Excel files in `Examples/`
3. **Search issues**: Look for similar problems on GitHub
4. **Ask for help**: Create a new issue with:
   - What you're trying to do
   - What's happening
   - Error messages
   - Your environment (OS, Node version, etc.)

## Development Tips

### VS Code Extensions (Recommended)
- ESLint
- Prettier
- TypeScript + JavaScript
- Tailwind CSS IntelliSense
- Excel Viewer (for viewing .xlsx files)

### Hot Reload
Next.js automatically reloads when you save files. If it doesn't:
```bash
# Restart dev server
# Ctrl+C then npm run dev
```

### Debugging
```typescript
// Add console.logs
console.log('Debug:', yourVariable);

// Use VS Code debugger
// Add breakpoints in .ts/.tsx files
// Press F5 or use Run > Start Debugging
```

### Code Quality
```bash
# Run linter
npm run lint

# Auto-fix issues
npm run lint -- --fix

# Format code (if Prettier is configured)
npx prettier --write .
```

## Production Deployment

When ready to deploy:

1. **Update environment variables**
```bash
# .env.production
EXCEL_BASE_PATH=S:/PBIData/NetDoc/Manual
COMPANIES_FILE_PATH=S:/PBIData/Biztech/companies.xlsx
JWT_SECRET=<generate-secure-random-string>
NEXT_PUBLIC_ENABLE_EDITING=true  # For Phase 2
```

2. **Build**
```bash
npm run build
```

3. **Test production build locally**
```bash
npm run start
```

4. **Deploy** (method depends on hosting choice)

## Useful Resources

- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Radix UI](https://www.radix-ui.com/primitives)

---

**Ready to start coding?**

Check the [PROJECT_PLAN.md](./PROJECT_PLAN.md) for architecture details and implementation phases!
