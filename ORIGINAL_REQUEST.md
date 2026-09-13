# Original User Request

## 2026-09-02T13:46:41Z

Refactor, simplify, and improve the maintainability of the imamu-helper codebase by eliminating dead code, consolidating duplicate date parsing logic into src/lib/date-utils.ts, optimizing server boot performance, and cleaning legacy settings.

Working directory: /home/interstellar/Documents/GitHub/imamu-helper
Integrity mode: development

## Requirements

### R1. Remove Dead & Abandoned Code
- Remove unreferenced files: src/components/TopBar.tsx and scripts/seed-test-data.ts.
- Remove dead variables and unused imports across src/views/AdminPage.tsx and src/server/routes/admin.ts.

### R2. Consolidate Centralized Date Utilities
- Create src/lib/date-utils.ts providing unified helpers for parsing and formatting academic calendar date strings (YYYY-MM-DD, DD/MM/YYYY, ranges, and Hijri date descriptors).
- Update Home.tsx, AdminPage.tsx, and CalendarPage.tsx to consume src/lib/date-utils.ts.

### R3. Optimize Server Boot Performance
- Make syncExternalImagesToStorage in src/server/services/seed.ts run asynchronously in the background so server.ts starts instantly without blocking on network image downloads.

### R4. Build & Type Integrity
- Ensure type-checking (npx tsc --noEmit) passes with zero errors.
- Ensure production build (npm run build) completes cleanly across all 18 application routes.

## Acceptance Criteria

### Code Quality & Build Verification
- [ ] src/components/TopBar.tsx and scripts/seed-test-data.ts are safely deleted.
- [ ] src/lib/date-utils.ts is created and used across Home.tsx, AdminPage.tsx, and CalendarPage.tsx.
- [ ] npx tsc --noEmit succeeds with status code 0.
- [ ] npm run build compiles all 18 static/dynamic routes successfully without errors.

## 2026-09-13T13:36:04Z

Comprehensive engineering overhaul of the IMAMU Helper application: modularize monolithic route and frontend files, cleanly excise @google/genai and AI dependencies, introduce Zod runtime validation and strict TypeScript types, modernize database schema columns with native JSONB, harden JWT session security against banned/revoked accounts, and simplify the server architecture while keeping all test tiers passing.

Working directory: /home/interstellar/Documents/GitHub/imamu-helper
Integrity mode: development

## Requirements

### R1. Modular File & Component Decomposition
Decompose monolithic files into single-responsibility modules:
- Break `src/server/routes/admin.ts` (~2,000 lines) into dedicated controllers/routers under `src/server/controllers/admin/` (e.g., `users`, `logs`, `backups`, `resources`, `academic`).
- Decompose frontend monoliths (`src/views/AdminPage.tsx`, `src/components/TutorialsTab.tsx`, `src/components/AuthenticatedAccountDashboardModal.tsx`) into subcomponents with custom hooks.

### R2. Complete Removal of `@google/genai`
Exorcise all Gemini AI code and dependencies per user instruction:
- Remove `@google/genai` from `package.json` and `package-lock.json`.
- Remove `/api/admin/ai_parse` endpoint from `admin.ts`, along with related tests in `tests/challenger_phase2_adversarial.test.ts`.
- Clean up unused environment variable references (`GEMINI_API_KEY`) from `.env.example` and `docker-compose.yml`.

### R3. End-to-End Type Safety & Runtime Validation (Zod)
- Introduce `zod` schemas for incoming payload validation across all API endpoints (auth, subjects, news, resources, admin).
- Eliminate untyped `any` across Express router handlers, database queries (`createAuthRouter(db: any)`), and request objects.
- Ensure all API endpoints return standardized, typed error responses on invalid input.

### R4. Database Schema & Persistence Enhancements
- Update `src/db/schema.ts` to convert text-serialized JSON fields (`completedCourses`, `adminPermissions`, `images`, `tags`) to native Drizzle `jsonb` columns.
- Update all consumers and tests that query or write these fields to use native objects instead of manual `JSON.parse` / `JSON.stringify`.
- Add explicit indexes on foreign keys and search query columns.

### R5. Security & Session Hardening
- Harden authentication middleware (`requireAuth` / `requireAdmin`) to actively check account status (`isBanned`, role revocation) rather than trusting stateless JWT tokens indefinitely.
- Replace the in-memory `authRateLimitMap` in `auth.ts` with a self-expiring or persistent mechanism that prevents unbounded memory growth.

### R6. Server Architecture Simplification
- Streamline `server.ts` and Express routing: cleanly separate API route registration, middleware, static file serving, and Next.js SSR request handling.
- Ensure all API routes are structured into clean, decoupled modular routers without leaking route logic into the main server entrypoint.

## Verification Resources & Acceptance Criteria

### Verification Commands
- `npm run lint` (`tsc --noEmit`): Compiles with 0 type errors.
- `npm test`: All test suites pass (tier1, tier2, tier3, tier4, admin management, challenger tests).
- `npm run build`: Production build completes cleanly without errors.

### Acceptance Criteria
- [ ] No references to `@google/genai` or Gemini remain in dependencies, server routes, or configuration.
- [ ] Monolithic files (`admin.ts`, `AdminPage.tsx`, `TutorialsTab.tsx`) are split into modules under 500 lines each.
- [ ] All API input payloads are validated with Zod schemas with appropriate 400 Bad Request error messages.
- [ ] Schema fields previously using `text` for JSON now use `jsonb` with automatic type inference.
- [ ] Banned users with valid JWT signatures are blocked with 401/403 upon status change.
- [ ] Server starts cleanly in both development (`npm run dev`) and production (`npm run build && npm start`).
- [ ] 100% of existing automated tests pass without regressions.
