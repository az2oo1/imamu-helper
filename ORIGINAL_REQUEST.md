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
