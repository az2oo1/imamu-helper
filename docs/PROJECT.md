# Project: imamu-helper Whole-App Admin Management & Access Control

## Architecture
- Framework: Next.js / Node.js backend server (`server.ts` or `app/api`)
- Frontend: React AuthContext (`dbUser?.role === 'ADMIN' || dbUser?.isAdmin`), pages (`PlansToolPage.tsx`, `Tools.tsx`, `Resources.tsx`, `AdminPage.tsx`, `AdminLogsPage.tsx`, `TopBar.tsx`)
- Database: Dual DB setup (PGlite & CockroachDB) with Drizzle ORM
- Authorization: Middleware & route handlers checking `checkAdmin(req, db)`, UI components checking `dbUser?.role === 'ADMIN' || dbUser?.isAdmin`

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Auth API & Session Infrastructure | R1 (Phase 1): Auth & Session recovery | None | DONE |
| M2 | DB Schema & Dual DB Sync | R2 (Phase 1): User schema & sync | M1 | DONE |
| M3 | Frontend Auth Hydration & Route Guards | R3 (Phase 1): React AuthContext & protected routes | M1, M2 | DONE |
| M4 | Comprehensive E2E Verification & Hardening | R4 (Phase 1): 100% test pass & audit | M1, M2, M3 | DONE |
| M5 | Plans Tool PDF Admin Restriction | R1 (Phase 2): Restrict "إضافة ملف PDF" UI and endpoints to Admin | M3 | DONE |
| M6 | Admin Editing & Management for Tools | R2 (Phase 2): Admin backend endpoints & UI for Tools and Tool links | M5 | DONE |
| M7 | Admin Editing & Management for Resources | R3 (Phase 2): Backend CRUD (/api/admin/resources & /api/resources) & UI for course resources | M6 | DONE |
| M8 | Whole-App Admin Protection & UI Guarding | R4 (Phase 2): Enforce dbUser?.role === 'ADMIN' across all management controls | M5, M6, M7 | DONE |
| M9 | E2E Verification, Type Check & Forensic Audit | Verification: npx tsc --noEmit, npm test, Forensic Integrity Audit | M5, M6, M7, M8 | DONE |

## Interface Contracts
### Admin Authorization Contract
- `dbUser?.role === 'ADMIN' || dbUser?.isAdmin` check required in UI before rendering any management/editing button or modal.
- Backend API endpoints (`/api/admin/*`, `/api/resources`, `/api/tools`, `/upload`) MUST verify authenticated session AND `checkAdmin(req, db)`. Return 403 Forbidden for non-admins.

## Code Layout
- Frontend Views: `src/views/` (`PlansToolPage.tsx`, `Tools.tsx`, `Resources.tsx`, `AdminPage.tsx`, `AdminLogsPage.tsx`, `TopBar.tsx`)
- Context: `src/lib/AuthContext.tsx`
- Backend API Routes: `src/server/routes/admin.ts`, `src/server/routes/tutorials.ts`, `server.ts`
- Database Schema & Client: `src/db/schema.ts`, `src/db/index.ts`
- Tests: `tests/admin_management.test.ts`, `tests/m5_m6.test.ts`, `tests/auth_tier*.test.ts`, `tests/challenger2_stress.test.ts`
