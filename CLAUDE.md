# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HR360Flow is a multi-tenant SaaS HR platform with three components in a monorepo:

- **`backend/`** — Express + TypeScript API with Prisma ORM (PostgreSQL)
- **`admin/`** — Next.js 16 admin dashboard (React 19, shadcn/ui, Tailwind 4)
- **`app/`** — Flutter mobile app for employee attendance (flutter_bloc)

## Common Commands

### Backend (`cd backend`)
```bash
npm run dev                  # Start dev server (ts-node-dev, auto-reload)
npm run build                # Generate Prisma client + compile TypeScript
npm run prisma:migrate       # Run Prisma migrations (dev)
npm run prisma:seed          # Seed database
npm run prisma:studio        # Open Prisma Studio GUI
npm run prisma:generate      # Regenerate Prisma client after schema changes
```

### Admin (`cd admin`)
```bash
npm run dev                  # Start Next.js dev server
npm run build                # Production build (standalone output)
npm run lint                 # ESLint (next/core-web-vitals + typescript)
npx shadcn@latest add <component>  # Add shadcn/ui component
```

### Flutter App (`cd app`)
```bash
flutter run                  # Run on connected device/emulator
flutter build apk            # Build Android APK
flutter build ios            # Build iOS
flutter analyze              # Run Dart analyzer
flutter test                 # Run tests
```

## Architecture

### Multi-Tenancy & Roles
Three user roles drive the entire system: **super_admin**, **org_admin**, **employee**. Each organisation is isolated — the `orgScope` middleware enforces that org_admins and employees can only access their own org's data. Super admins are exempt from org scoping.

### Backend Structure
- **Routes** mount under `/api` with role-based prefixes: `/api/auth`, `/api/public`, `/api/super-admin`, `/api/org`, `/api/employee`
- **Middleware chain**: `authenticate` → `requireRole(...)` → `requireOrgScope`/`enforceOrgAccess` → controller
- **Prisma models**: `Organisation`, `User`, `Attendance` — schema at `backend/prisma/schema.prisma`
- **Validation**: Zod schemas defined inline in controllers
- **Response format**: Standardized via `response.utils.ts` (success/error/pagination helpers)
- **File uploads**: Multer middleware for CSV bulk import and selfie photos

### Admin Frontend Structure
- Next.js App Router with `src/app/` directory
- Two context providers wrap the app: `AuthContext` (JWT + auto-refresh) and `BrandingContext` (org-specific theming via subdomain slug)
- API client at `src/lib/api.ts` — Axios instance with automatic Bearer token injection and 401 → token refresh → retry logic
- Route groups: `/org/*` (org admin pages), `/super-admin/*` (platform admin pages)
- `ProtectedRoute` component enforces auth + role checks
- UI built with shadcn/ui (Base Nova style), icons from Lucide

### Flutter App Structure
- **State management**: flutter_bloc with three blocs — `AuthBloc`, `AttendanceBloc`, `ProfileBloc`
- **Data layer**: `data/repositories/` wrap API calls; `data/models/` define User, Attendance, Auth models
- **API client**: Dio with interceptors for Bearer token and automatic 401 refresh at `core/api/api_client.dart`
- **Storage**: SharedPreferences for tokens and cached user data (not FlutterSecureStorage — removed due to grey screen crash)
- **Key flow**: Check-in captures GPS location (geolocator) + front camera selfie (image_picker), uploads as multipart

### Deployment
- Hosted on **Coolify** (self-hosted PaaS)
- Domain: **hr360flow.com**
- Super admin panel: `https://admin.hr360flow.com/login`
- Org-specific admin portals: `https://<org-slug>.hr360flow.com/login` (e.g. `flebo-in.hr360flow.com`)
- API: `https://api.hr360flow.com`

### Backend Environment
Copy `backend/.env.example` to `backend/.env`. Required vars: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `PORT`.

## Key Conventions

- Backend uses Zod for request validation, not Express validators
- Admin uses React Hook Form + Zod for form validation
- Flutter models handle both snake_case and camelCase JSON fields from the API
- Attendance has a unique constraint on (orgId, userId, date) — one record per employee per day
- The admin reads `NEXT_PUBLIC_API_URL` env var for the backend URL (defaults to `http://localhost:3001`)
- The Flutter app's production API base URL is hardcoded in `app/lib/core/constants/`
- Next.js AGENTS.md warns that this version (16.x) may have breaking changes vs training data — read `node_modules/next/dist/docs/` when in doubt
